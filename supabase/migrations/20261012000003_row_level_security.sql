-- Access rules for the Supabase API.
--
-- * anon: nothing.
-- * Any active staff member: read everything.
-- * Owner / manager: maintain reference data (suppliers, materials, recipes...).
-- * Owner: manage staff and delete reference data.
-- * Traceability events (deliveries, productions, lots, lot_inputs) are
--   append-only and only written through record_delivery / record_production.
--
-- Supabase grants new public tables to anon and authenticated by default:
-- any table added later must get its own RLS and grants.

do $$
declare
  t text;
begin
  foreach t in array array[
    'units', 'staff', 'suppliers', 'ingredients', 'materials', 'recipes',
    'recipe_versions', 'recipe_lines', 'products', 'deliveries', 'productions',
    'lots', 'lot_inputs'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format(
      'create policy "staff can read" on %I for select to authenticated
         using (current_staff_role() is not null)', t);
  end loop;

  foreach t in array array[
    'suppliers', 'ingredients', 'materials', 'recipes', 'recipe_versions',
    'recipe_lines', 'products'
  ] loop
    execute format(
      'create policy "managers can add" on %I for insert to authenticated
         with check (current_staff_role() in (''owner'', ''manager''))', t);
    execute format(
      'create policy "managers can edit" on %I for update to authenticated
         using (current_staff_role() in (''owner'', ''manager''))
         with check (current_staff_role() in (''owner'', ''manager''))', t);
    execute format(
      'create policy "owner can delete" on %I for delete to authenticated
         using (current_staff_role() = ''owner'')', t);
  end loop;
end;
$$;

create policy "owner can add staff" on staff for insert to authenticated
  with check (current_staff_role() = 'owner');
create policy "owner can edit staff" on staff for update to authenticated
  using (current_staff_role() = 'owner')
  with check (current_staff_role() = 'owner');

-- Table privileges (RLS filters rows on top of these).
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated;
grant select on all tables in schema public to authenticated;
grant insert, update, delete on
  suppliers, ingredients, materials, recipes, recipe_versions, recipe_lines, products
  to authenticated;
grant insert, update on staff to authenticated;

-- Functions are executable by PUBLIC by default.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function
  convert_qty(numeric, text, text),
  current_staff_role(),
  current_staff_id(),
  trace_forward(uuid),
  trace_backward(uuid),
  record_delivery(uuid, text, date, uuid, jsonb),
  record_production(production_kind, date, uuid, jsonb, jsonb, jsonb)
  to authenticated;
