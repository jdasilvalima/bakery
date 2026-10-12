-- Read models and the only write paths for traceability events.
--
-- Clients (web app, MCP server) never insert lots directly: they call
-- record_delivery / record_production, which validate the whole event and
-- run it in one transaction.

-- Roles -------------------------------------------------------------------------

create function current_staff_role()
returns staff_role
language sql
stable
security definer
set search_path = public
as $$
  select role from staff where user_id = auth.uid() and active;
$$;

create function current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from staff where user_id = auth.uid() and active;
$$;

-- API requests carry JWT claims. Sessions without claims are direct database
-- connections (migrations, seed, SQL editor) and are trusted, like the
-- service role.
create function assert_staff_role(p_allowed staff_role[])
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_claims jsonb := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
begin
  if v_claims is null or v_claims ->> 'role' = 'service_role' then
    return;
  end if;
  if coalesce(current_staff_role() = any (p_allowed), false) then
    return;
  end if;
  raise exception 'Permission denied' using errcode = '42501';
end;
$$;

-- Read models -------------------------------------------------------------------

create view lot_details with (security_invoker = true) as
select
  l.id,
  l.lot_code,
  l.kind,
  coalesce(m.name, r.name || ' (' || rv.version_label || ')', p.name) as item_name,
  m.ingredient_id,
  l.product_id,
  l.quantity,
  l.unit,
  l.quantity - coalesce(used.quantity, 0) as remaining,
  coalesce(d.received_on, pr.produced_on) as made_on,
  l.expires_on,
  s.name as supplier_name,
  d.invoice_number,
  l.delivery_id,
  l.production_id
from lots l
left join materials m on m.id = l.material_id
left join recipe_versions rv on rv.id = l.recipe_version_id
left join recipes r on r.id = rv.recipe_id
left join products p on p.id = l.product_id
left join deliveries d on d.id = l.delivery_id
left join suppliers s on s.id = d.supplier_id
left join productions pr on pr.id = l.production_id
left join lateral (
  select sum(convert_qty(li.quantity, li.unit, l.unit)) as quantity
  from lot_inputs li
  where li.input_lot_id = l.id
) used on true;

-- Bakes missing a record or below the product's minimum time/temperature.
create view bake_ccp_checks with (security_invoker = true) as
select
  pr.id as production_id,
  l.lot_code,
  pr.produced_on,
  p.name as product_name,
  pr.bake_minutes,
  p.min_bake_minutes,
  pr.bake_temperature_f,
  p.min_bake_temperature_f,
  (pr.bake_minutes is null or pr.bake_temperature_f is null) as missing_record,
  coalesce(pr.bake_minutes < p.min_bake_minutes, false)
    or coalesce(pr.bake_temperature_f < p.min_bake_temperature_f, false) as deviation
from productions pr
join products p on p.id = pr.product_id
join lots l on l.production_id = pr.id
where pr.kind in ('pie_bake', 'cookie_deposit');

-- Everything made from a lot, directly or not (recall direction).
create function trace_forward(p_lot_id uuid)
returns table (
  lot_id uuid,
  lot_code text,
  kind lot_kind,
  item_name text,
  depth int,
  quantity numeric,
  unit text,
  made_on date,
  expires_on date
)
language sql
stable
set search_path = public
as $$
  with recursive walk (lot_id, depth) as (
    select p_lot_id, 0
    union
    select li.output_lot_id, w.depth + 1
    from walk w
    join lot_inputs li on li.input_lot_id = w.lot_id
  )
  select d.id, d.lot_code, d.kind, d.item_name, min(w.depth)::int,
         d.quantity, d.unit, d.made_on, d.expires_on
  from walk w
  join lot_details d on d.id = w.lot_id
  group by d.id, d.lot_code, d.kind, d.item_name, d.quantity, d.unit, d.made_on, d.expires_on
  order by 5, 2;
$$;

-- Everything a lot was made from, directly or not.
create function trace_backward(p_lot_id uuid)
returns table (
  lot_id uuid,
  lot_code text,
  kind lot_kind,
  item_name text,
  depth int,
  quantity numeric,
  unit text,
  made_on date,
  expires_on date
)
language sql
stable
set search_path = public
as $$
  with recursive walk (lot_id, depth) as (
    select p_lot_id, 0
    union
    select li.input_lot_id, w.depth + 1
    from walk w
    join lot_inputs li on li.output_lot_id = w.lot_id
  )
  select d.id, d.lot_code, d.kind, d.item_name, min(w.depth)::int,
         d.quantity, d.unit, d.made_on, d.expires_on
  from walk w
  join lot_details d on d.id = w.lot_id
  group by d.id, d.lot_code, d.kind, d.item_name, d.quantity, d.unit, d.made_on, d.expires_on
  order by 5, 2;
$$;

-- Write paths -------------------------------------------------------------------

create function next_lot_code(p_prefix text, p_on date)
returns text
language sql
stable
set search_path = public
as $$
  select p_prefix || '-' || to_char(p_on, 'YYYYMMDD') || '-'
         || lpad((count(*) + 1)::text, 2, '0')
  from lots
  where lot_code like p_prefix || '-' || to_char(p_on, 'YYYYMMDD') || '-%';
$$;

-- p_lines: [{ material_id, lot_code, packages | (quantity, unit), expires_on? }]
-- Quantities are stored in the material's base unit (lb or pc).
create function record_delivery(
  p_supplier_id uuid,
  p_invoice_number text,
  p_received_on date,
  p_received_by uuid,
  p_lines jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delivery uuid;
  v_line jsonb;
  v_material materials%rowtype;
  v_qty numeric;
begin
  perform assert_staff_role(array['owner', 'manager', 'operator']::staff_role[]);

  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'A delivery needs at least one line';
  end if;

  insert into deliveries (supplier_id, invoice_number, received_on, received_by)
  values (p_supplier_id, p_invoice_number, p_received_on, p_received_by)
  returning id into v_delivery;

  for v_line in select value from jsonb_array_elements(p_lines) loop
    select * into v_material from materials where id = (v_line ->> 'material_id')::uuid;
    if not found then
      raise exception 'Unknown material %', v_line ->> 'material_id';
    end if;
    if nullif(trim(v_line ->> 'lot_code'), '') is null then
      raise exception 'Lot code is required for %', v_material.name;
    end if;

    if v_line ? 'packages' then
      v_qty := (v_line ->> 'packages')::numeric * v_material.qty_per_package;
    else
      v_qty := convert_qty((v_line ->> 'quantity')::numeric, v_line ->> 'unit', v_material.base_unit);
      if v_qty is null then
        raise exception 'Quantity for % must be given in packages or in a % unit',
          v_material.name, v_material.base_unit;
      end if;
    end if;

    insert into lots (lot_code, kind, material_id, quantity, unit, expires_on, delivery_id)
    values (
      trim(v_line ->> 'lot_code'),
      v_material.kind::text::lot_kind,
      v_material.id,
      v_qty,
      v_material.base_unit,
      (v_line ->> 'expires_on')::date,
      v_delivery
    );
  end loop;

  return v_delivery;
end;
$$;

-- p_output:  { recipe_version_id (wip_batch) | product_id, quantity, unit, batches?, expires_on? }
-- p_inputs:  [{ lot_id, quantity, unit }]
-- p_details: { bake_temperature_f?, bake_minutes?, started_at?, ended_at?, waste_lbs?, comment? }
-- Returns the id of the lot created.
create function record_production(
  p_kind production_kind,
  p_produced_on date,
  p_operator_id uuid,
  p_output jsonb,
  p_inputs jsonb,
  p_details jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipe_version recipe_versions%rowtype;
  v_product products%rowtype;
  v_lot_kind lot_kind;
  v_prefix text;
  v_expires date := (p_output ->> 'expires_on')::date;
  v_production uuid;
  v_lot uuid;
  v_missing text;
begin
  perform assert_staff_role(array['owner', 'manager', 'operator']::staff_role[]);

  if jsonb_typeof(p_inputs) is distinct from 'array' or jsonb_array_length(p_inputs) = 0 then
    raise exception 'A production needs at least one input lot';
  end if;

  if p_kind = 'wip_batch' then
    select * into v_recipe_version from recipe_versions
    where id = (p_output ->> 'recipe_version_id')::uuid;
    if not found then
      raise exception 'Unknown recipe version';
    end if;
    if v_recipe_version.retired_at is not null then
      raise exception 'Recipe version % is retired', v_recipe_version.version_label;
    end if;
    v_lot_kind := 'wip';
    v_prefix := 'WIP';
  else
    select * into v_product from products where id = (p_output ->> 'product_id')::uuid;
    if not found then
      raise exception 'Unknown product';
    end if;
    v_lot_kind := case when p_kind = 'packaging' then 'packed' else 'finished' end;
    v_prefix := case when p_kind = 'packaging' then 'PCK' else 'FIN' end;
    v_expires := coalesce(v_expires, p_produced_on + v_product.shelf_life_days);
  end if;

  insert into productions (
    kind, produced_on, operator_id, recipe_version_id, product_id, batches,
    bake_temperature_f, bake_minutes, started_at, ended_at, waste_lbs, comment
  )
  values (
    p_kind, p_produced_on, p_operator_id, v_recipe_version.id, v_product.id,
    (p_output ->> 'batches')::numeric,
    (p_details ->> 'bake_temperature_f')::numeric,
    (p_details ->> 'bake_minutes')::numeric,
    (p_details ->> 'started_at')::time,
    (p_details ->> 'ended_at')::time,
    (p_details ->> 'waste_lbs')::numeric,
    p_details ->> 'comment'
  )
  returning id into v_production;

  insert into lots (lot_code, kind, recipe_version_id, product_id, quantity, unit, expires_on, production_id)
  values (
    next_lot_code(v_prefix, p_produced_on), v_lot_kind, v_recipe_version.id, v_product.id,
    (p_output ->> 'quantity')::numeric, p_output ->> 'unit', v_expires, v_production
  )
  returning id into v_lot;

  -- check_lot_input validates each line.
  insert into lot_inputs (output_lot_id, input_lot_id, quantity, unit)
  select v_lot, (i ->> 'lot_id')::uuid, (i ->> 'quantity')::numeric, i ->> 'unit'
  from jsonb_array_elements(p_inputs) i;

  if p_kind = 'wip_batch' then
    select string_agg(ing.name, ', ' order by ing.name) into v_missing
    from recipe_lines rl
    join ingredients ing on ing.id = rl.ingredient_id
    where rl.recipe_version_id = v_recipe_version.id
      and ing.lot_tracked
      and not exists (
        select 1
        from lot_inputs li
        join lots l on l.id = li.input_lot_id
        join materials m on m.id = l.material_id
        where li.output_lot_id = v_lot and m.ingredient_id = rl.ingredient_id
      );
    if v_missing is not null then
      raise exception 'Missing lots for: %', v_missing;
    end if;
  end if;

  return v_lot;
end;
$$;
