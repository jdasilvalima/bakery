-- Core schema for bakery lot traceability.
--
-- Everything that can be traced is a lot. Raw materials and packaging enter as
-- lots through deliveries; productions consume lots and create a new lot.
-- `lot_inputs` stores the "made from" edges, so a recall is a graph walk.

create type staff_role as enum ('owner', 'manager', 'operator');
create type material_kind as enum ('raw_material', 'packaging');
create type recipe_category as enum ('dough', 'filling', 'topping', 'cookie_dough', 'other');
create type product_category as enum ('pie', 'cookie', 'other');
create type production_kind as enum ('wip_batch', 'pie_bake', 'cookie_deposit', 'packaging');
create type lot_kind as enum ('raw_material', 'packaging', 'wip', 'finished', 'packed');

-- Units -----------------------------------------------------------------------

-- Measurement units a lot can be counted in. Package units (case, bag, pail)
-- are not here: deliveries convert them to the material's base unit.
create table units (
  code text primary key,
  dimension text not null check (dimension in ('mass', 'count')),
  to_base numeric not null check (to_base > 0) -- base: lb for mass, pc for count
);

insert into units (code, dimension, to_base) values
  ('lb', 'mass', 1),
  ('oz', 'mass', 0.0625),
  ('kg', 'mass', 2.20462262185),
  ('g', 'mass', 0.00220462262185),
  ('pc', 'count', 1);

-- Returns null when the units are not of the same dimension.
create function convert_qty(p_qty numeric, p_from text, p_to text)
returns numeric
language sql
stable
set search_path = public
as $$
  select case
    when p_from = p_to then p_qty
    else (
      select p_qty * f.to_base / t.to_base
      from units f
      join units t on t.dimension = f.dimension
      where f.code = p_from and t.code = p_to
    )
  end;
$$;

-- People ----------------------------------------------------------------------

-- Operators are recorded on every event even if they never log in, so
-- `user_id` is optional.
create table staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  display_name text not null unique,
  role staff_role not null default 'operator',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Reference data ----------------------------------------------------------------

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Generic ingredients as they appear in recipes ("Butter", "Pastry Flour").
create table ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  allergens text[] not null default '{}',
  -- Water and similar inputs are not lot-tracked.
  lot_tracked boolean not null default true,
  created_at timestamptz not null default now()
);

-- What suppliers actually deliver ("55.1# Unsalted Butter Bulk"). Raw
-- materials map to a recipe ingredient; this mapping is what links a delivered
-- lot to the recipes that may consume it.
create table materials (
  id uuid primary key default gen_random_uuid(),
  kind material_kind not null,
  code text not null unique,
  name text not null,
  package_unit text not null check (package_unit in ('cs', 'bag', 'pail', 'pc')),
  qty_per_package numeric not null check (qty_per_package > 0),
  base_unit text not null references units (code),
  ingredient_id uuid references ingredients (id),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint packaging_has_no_ingredient check (kind = 'raw_material' or ingredient_id is null),
  constraint packaging_counted_in_pieces check (kind = 'raw_material' or base_unit = 'pc')
);

create table recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category recipe_category not null,
  created_at timestamptz not null default now()
);

-- Recipes are versioned: productions point at the exact version used.
create table recipe_versions (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references recipes (id),
  version_label text not null,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  unique (recipe_id, version_label)
);

-- At most one current version per recipe.
create unique index recipe_versions_one_current
  on recipe_versions (recipe_id) where retired_at is null;

create table recipe_lines (
  id uuid primary key default gen_random_uuid(),
  recipe_version_id uuid not null references recipe_versions (id) on delete cascade,
  ingredient_id uuid not null references ingredients (id),
  quantity_per_batch numeric not null check (quantity_per_batch > 0),
  unit text not null references units (code),
  unique (recipe_version_id, ingredient_id)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category product_category not null,
  shelf_life_days int check (shelf_life_days > 0),
  -- Critical control point for baked products.
  min_bake_minutes int check (min_bake_minutes > 0),
  min_bake_temperature_f int check (min_bake_temperature_f > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Events ------------------------------------------------------------------------

create table deliveries (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references suppliers (id),
  invoice_number text not null,
  received_on date not null,
  received_by uuid not null references staff (id),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (supplier_id, invoice_number)
);

create table productions (
  id uuid primary key default gen_random_uuid(),
  kind production_kind not null,
  produced_on date not null,
  operator_id uuid not null references staff (id),
  recipe_version_id uuid references recipe_versions (id),
  product_id uuid references products (id),
  batches numeric check (batches > 0),
  bake_temperature_f numeric,
  bake_minutes numeric,
  started_at time,
  ended_at time,
  waste_lbs numeric check (waste_lbs >= 0),
  comment text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  constraint wip_needs_recipe check (
    (kind = 'wip_batch') = (recipe_version_id is not null)
  ),
  constraint product_steps_need_product check (
    (kind = 'wip_batch') = (product_id is null)
  )
);

create table lots (
  id uuid primary key default gen_random_uuid(),
  lot_code text not null,
  kind lot_kind not null,
  material_id uuid references materials (id),
  recipe_version_id uuid references recipe_versions (id),
  product_id uuid references products (id),
  quantity numeric not null check (quantity > 0),
  unit text not null references units (code),
  expires_on date,
  delivery_id uuid references deliveries (id),
  production_id uuid unique references productions (id),
  created_at timestamptz not null default now(),
  constraint one_source check (num_nonnulls(delivery_id, production_id) = 1),
  constraint delivered_lots_are_materials check (
    (kind in ('raw_material', 'packaging'))
      = (delivery_id is not null and material_id is not null)
  ),
  constraint wip_lots_have_recipe check (
    (kind = 'wip') = (recipe_version_id is not null)
  ),
  constraint product_lots_have_product check (
    (kind in ('finished', 'packed')) = (product_id is not null)
  )
);

-- Supplier lot codes are only unique within a delivery line; internal codes
-- (WIP-/FIN-/PCK-) are unique.
create unique index lots_delivered_code
  on lots (delivery_id, material_id, lot_code) where delivery_id is not null;
create unique index lots_internal_code
  on lots (lot_code) where production_id is not null;
create index lots_lot_code on lots (lot_code);

-- "output lot was made from input lot".
create table lot_inputs (
  id uuid primary key default gen_random_uuid(),
  output_lot_id uuid not null references lots (id),
  input_lot_id uuid not null references lots (id),
  quantity numeric not null check (quantity > 0),
  unit text not null references units (code),
  created_at timestamptz not null default now(),
  unique (output_lot_id, input_lot_id),
  check (output_lot_id <> input_lot_id)
);

create index lot_inputs_input on lot_inputs (input_lot_id);

-- Integrity rules every write path goes through (app, MCP, seed, SQL editor).
create function check_lot_input()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_out lots%rowtype;
  v_in lots%rowtype;
  v_in_ingredient uuid;
  v_qty numeric;
  v_used numeric;
begin
  select * into v_out from lots where id = new.output_lot_id;
  -- Lock the input lot so two concurrent productions cannot overdraw it.
  select * into v_in from lots where id = new.input_lot_id for update;

  if v_out.kind in ('raw_material', 'packaging') then
    raise exception 'Lot % comes from a delivery and cannot have inputs', v_out.lot_code;
  end if;

  -- Inputs always come from an earlier stage (delivered -> wip -> finished ->
  -- packed), so the graph cannot loop.
  if not (
    (v_out.kind = 'wip' and v_in.kind = 'raw_material')
    or (v_out.kind = 'finished' and v_in.kind in ('wip', 'raw_material', 'packaging'))
    or (v_out.kind = 'packed' and v_in.kind in ('finished', 'packaging'))
  ) then
    raise exception 'A % lot cannot be made from a % lot (%)', v_out.kind, v_in.kind, v_in.lot_code;
  end if;

  if v_out.kind = 'packed' and v_in.kind = 'finished' and v_in.product_id <> v_out.product_id then
    raise exception 'Lot % is a different product than the one being packed', v_in.lot_code;
  end if;

  -- A WIP batch may only consume ingredients of its recipe version.
  if v_out.kind = 'wip' then
    select m.ingredient_id into v_in_ingredient from materials m where m.id = v_in.material_id;
    if v_in_ingredient is null or not exists (
      select 1 from recipe_lines rl
      where rl.recipe_version_id = v_out.recipe_version_id
        and rl.ingredient_id = v_in_ingredient
    ) then
      raise exception 'Lot % is not an ingredient of this recipe version', v_in.lot_code;
    end if;
  end if;

  v_qty := convert_qty(new.quantity, new.unit, v_in.unit);
  if v_qty is null then
    raise exception 'Cannot use % of lot % (counted in %)', new.unit, v_in.lot_code, v_in.unit;
  end if;

  select coalesce(sum(convert_qty(li.quantity, li.unit, v_in.unit)), 0) into v_used
  from lot_inputs li where li.input_lot_id = v_in.id;

  if v_used + v_qty > v_in.quantity * 1.000001 then
    raise exception 'Lot % has % % left, cannot use %',
      v_in.lot_code, round(v_in.quantity - v_used, 3), v_in.unit, round(v_qty, 3);
  end if;

  return new;
end;
$$;

create trigger lot_inputs_check
  before insert on lot_inputs
  for each row execute function check_lot_input();
