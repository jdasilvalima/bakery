-- Demo data. No real names or addresses.
--
-- Reference data (materials, recipes, products, bake limits) is adapted from
-- the bakery's original Google Sheet, anonymized. The events (deliveries,
-- productions) are a fictional two-week scenario that exercises the full
-- chain: delivery -> dough/topping batches -> pie bakes -> packing.
--
-- Events go through record_delivery / record_production so the seed obeys the
-- same rules as the app.

-- Reference data ----------------------------------------------------------------

insert into staff (display_name, role) values
  ('Owner', 'owner'),
  ('Manager', 'manager'),
  ('Operator 1', 'operator'),
  ('Operator 2', 'operator'),
  ('Operator 3', 'operator'),
  ('Operator 4', 'operator');

insert into suppliers (name) values
  ('Supplier A'), ('Supplier B'), ('Supplier C'), ('Supplier D');

insert into ingredients (name, allergens, lot_tracked) values
  ('Pastry Flour', '{wheat}', true),
  ('Kosher Salt', '{}', true),
  ('Sugar, Organic', '{}', true),
  ('Butter', '{milk}', true),
  ('Water', '{}', false),
  ('Vinegar White', '{}', true),
  ('Sunflower Oil', '{}', true),
  ('Potato Starch', '{}', true),
  ('Light Brown Sugar', '{}', true),
  ('Oats', '{}', true),
  ('Cherry Filling', '{}', true),
  ('Apple Filling', '{}', true),
  ('Pecans', '{tree_nuts}', true),
  ('Eggs', '{eggs}', true),
  ('Dried Cranberries', '{}', true),
  ('Chocolate Chips', '{milk,soy}', true),
  ('Baking Soda', '{}', true),
  ('Honey', '{}', true);

insert into materials (kind, code, name, package_unit, qty_per_package, base_unit, ingredient_id)
select 'raw_material', m.code, m.name, m.package_unit, m.qty, 'lb', i.id
from (values
  ('76289', 'Pastry flour, untreated - 50 lb bag', 'bag', 50, 'Pastry Flour'),
  ('6040760', 'Kosher salt, coarse flake - 3 lb bag', 'bag', 3, 'Kosher Salt'),
  ('30095', 'Organic cane sugar - 50 lb bag', 'bag', 50, 'Sugar, Organic'),
  ('43155', 'Unsalted butter, bulk - 55.1 lb case', 'cs', 55.1, 'Butter'),
  ('43130', 'Unsalted butter AA - 36 lb case', 'cs', 36, 'Butter'),
  ('SUN-35', 'Sunflower oil - 35 lb case', 'cs', 35, 'Sunflower Oil'),
  ('VIN-4G', 'White vinegar - 4 x 1 gal case', 'cs', 33.4, 'Vinegar White'),
  ('PST-50', 'Potato starch - 50 lb bag', 'bag', 50, 'Potato Starch'),
  ('30099', 'Light brown sugar - 50 lb bag', 'bag', 50, 'Light Brown Sugar'),
  ('13080', 'Quick-cooking oats - 50 lb bag', 'bag', 50, 'Oats'),
  ('PS00534', 'Red tart cherry filling - 50 lb pail', 'pail', 50, 'Cherry Filling'),
  ('PS00514', 'Apple filling with wedges - 50 lb pail', 'pail', 50, 'Apple Filling'),
  ('145909', 'Pecan pieces, medium - 30 lb case', 'cs', 30, 'Pecans'),
  ('81447-91063', 'Cage-free liquid eggs - 40 lb case', 'cs', 40, 'Eggs'),
  ('640', 'Sweet dried cranberries - 10 lb case', 'cs', 10, 'Dried Cranberries'),
  ('87042', 'Semi-sweet chocolate chips - 30 lb case', 'cs', 30, 'Chocolate Chips'),
  ('438344', 'Baking soda - 50 lb bag', 'bag', 50, 'Baking Soda'),
  ('32000', 'Honey - 60 lb pail', 'pail', 60, 'Honey')
) as m (code, name, package_unit, qty, ingredient)
join ingredients i on i.name = m.ingredient;

insert into materials (kind, code, name, package_unit, qty_per_package, base_unit) values
  ('packaging', '4-4004', '9" extra-deep pie pan - 500/cs', 'cs', 500, 'pc'),
  ('packaging', 'H-4006', '6" aluminum pie plate - 1000/cs', 'cs', 1000, 'pc'),
  ('packaging', 'PB-992', 'Pie box 9 x 9 x 2 - 125/cs', 'cs', 125, 'pc'),
  ('packaging', 'MN-PP55', '5-1/2" patty paper - 1000/cs', 'cs', 1000, 'pc'),
  ('packaging', 'SG04309', 'Foldover bottom bag 4 x 3.25 x 9.5 - 1000/cs', 'cs', 1000, 'pc'),
  ('packaging', 'CB-20206', 'Corrugated shipping box 20 x 20 x 6 - 34/cs', 'cs', 34, 'pc'),
  ('packaging', 'LBL-CH9', 'Label - Cherry Pie 9"', 'cs', 1000, 'pc'),
  ('packaging', 'LBL-AP9', 'Label - Apple Pie 9"', 'cs', 1000, 'pc'),
  ('packaging', 'LBL-PC9', 'Label - Pecan Pie 9"', 'cs', 1000, 'pc');

-- Bake limits come from the sheet: fruit pies 35 min, lemon coconut 50 min,
-- pecan pies 70 min, all at 360F; cookie cake 45 min at 300F.
insert into products (name, category, shelf_life_days, min_bake_minutes, min_bake_temperature_f) values
  ('Cherry Pie 6"', 'pie', 7, 35, 360),
  ('Cherry Pie 9"', 'pie', 7, 35, 360),
  ('Apple Pie 6"', 'pie', 7, 35, 360),
  ('Apple Pie 9"', 'pie', 7, 35, 360),
  ('Lemon Coconut Pie 6"', 'pie', 7, 50, 360),
  ('Lemon Coconut Pie 9"', 'pie', 7, 50, 360),
  ('Pecan Pie 6"', 'pie', 7, 70, 360),
  ('Pecan Pie 9"', 'pie', 7, 70, 360),
  ('Bourbon Pecan Pie 6"', 'pie', 7, 70, 360),
  ('Bourbon Pecan Pie 9"', 'pie', 7, 70, 360),
  ('Cookie Cake', 'cookie', 7, 45, 300),
  ('Chocolate Chip Cookies - 6 pack', 'cookie', 14, null, null),
  ('Vegan Chocolate Chip Cookies - 6 pack', 'cookie', 14, null, null),
  ('Vegan Oatmeal Chip Cookies - 6 pack', 'cookie', 14, null, null),
  ('Chocolate Blackout Cookies - 6 pack', 'cookie', 14, null, null),
  ('Snickerdoodle Cookies - 6 pack', 'cookie', 14, null, null),
  ('Molasses Spice Cookies - 6 pack', 'cookie', 14, null, null),
  ('Salty Oatmeal Cookies - 6 pack', 'cookie', 14, null, null),
  ('Pretzel Cookies - 6 pack', 'cookie', 14, null, null),
  ('Lemon Poppy Seed Cookies - 6 pack', 'cookie', 14, null, null);

insert into recipes (name, category) values
  ('Pie Dough', 'dough'),
  ('Crumb Topping', 'topping');

-- Pie Dough v0 and v1 are the two versions from the sheet (v1 changed the oil).
insert into recipe_versions (recipe_id, version_label, created_at, retired_at)
select r.id, v.label, v.created_at, v.retired_at
from (values
  ('Pie Dough', 'v0', timestamptz '2024-12-03 14:57', timestamptz '2024-12-16 16:18'),
  ('Pie Dough', 'v1', timestamptz '2024-12-16 16:18', null),
  ('Crumb Topping', 'v1', timestamptz '2026-09-01 09:00', null)
) as v (recipe, label, created_at, retired_at)
join recipes r on r.name = v.recipe;

insert into recipe_lines (recipe_version_id, ingredient_id, quantity_per_batch, unit)
select rv.id, i.id, l.qty, l.unit
from (values
  ('Pie Dough', 'v0', 'Pastry Flour', 100, 'lb'),
  ('Pie Dough', 'v0', 'Kosher Salt', 0.8, 'lb'),
  ('Pie Dough', 'v0', 'Sugar, Organic', 1.35, 'lb'),
  ('Pie Dough', 'v0', 'Butter', 39, 'lb'),
  ('Pie Dough', 'v0', 'Water', 20, 'lb'),
  ('Pie Dough', 'v0', 'Vinegar White', 0.15, 'lb'),
  ('Pie Dough', 'v0', 'Sunflower Oil', 10.5, 'lb'),
  ('Pie Dough', 'v0', 'Potato Starch', 8.5, 'lb'),
  ('Pie Dough', 'v1', 'Pastry Flour', 100, 'lb'),
  ('Pie Dough', 'v1', 'Kosher Salt', 0.8, 'lb'),
  ('Pie Dough', 'v1', 'Sugar, Organic', 1.35, 'lb'),
  ('Pie Dough', 'v1', 'Butter', 39, 'lb'),
  ('Pie Dough', 'v1', 'Water', 20, 'lb'),
  ('Pie Dough', 'v1', 'Vinegar White', 0.15, 'lb'),
  ('Pie Dough', 'v1', 'Sunflower Oil', 5, 'oz'),
  ('Pie Dough', 'v1', 'Potato Starch', 8.5, 'lb'),
  ('Crumb Topping', 'v1', 'Pastry Flour', 20, 'lb'),
  ('Crumb Topping', 'v1', 'Butter', 15, 'lb'),
  ('Crumb Topping', 'v1', 'Light Brown Sugar', 15, 'lb'),
  ('Crumb Topping', 'v1', 'Oats', 10, 'lb')
) as l (recipe, version, ingredient, qty, unit)
join recipes r on r.name = l.recipe
join recipe_versions rv on rv.recipe_id = r.id and rv.version_label = l.version
join ingredients i on i.name = l.ingredient;

-- Scenario helpers (session only) -------------------------------------------

create function pg_temp.staff(p_name text) returns uuid language sql as
  $$ select id from public.staff where display_name = p_name $$;
create function pg_temp.supplier(p_name text) returns uuid language sql as
  $$ select id from public.suppliers where name = p_name $$;
create function pg_temp.product(p_name text) returns uuid language sql as
  $$ select id from public.products where name = p_name $$;
create function pg_temp.recipe_version(p_recipe text, p_label text) returns uuid language sql as
  $$ select rv.id from public.recipe_versions rv join public.recipes r on r.id = rv.recipe_id
     where r.name = p_recipe and rv.version_label = p_label $$;
create function pg_temp.line(p_material text, p_lot text, p_packages numeric, p_expires date) returns jsonb language sql as
  $$ select jsonb_build_object('material_id', (select id from public.materials where code = p_material),
       'lot_code', p_lot, 'packages', p_packages, 'expires_on', p_expires) $$;
create function pg_temp.input(p_lot text, p_qty numeric, p_unit text) returns jsonb language sql as
  $$ select jsonb_build_object('lot_id', (select id from public.lots where lot_code = p_lot),
       'quantity', p_qty, 'unit', p_unit) $$;

-- Week 1 ------------------------------------------------------------------------

select record_delivery(pg_temp.supplier('Supplier A'), 'A-24817', '2026-09-28', pg_temp.staff('Operator 2'),
  jsonb_build_array(
    pg_temp.line('76289', 'PF-26271', 6, '2027-03-28'),
    pg_temp.line('43155', 'BT-0926', 4, '2027-01-26'),
    pg_temp.line('6040760', 'KS-1180', 2, '2028-09-01'),
    pg_temp.line('30095', 'SG-4471', 1, '2028-09-01'),
    pg_temp.line('30099', 'BS-2290', 1, '2027-09-01'),
    pg_temp.line('13080', 'OT-5612', 1, '2027-06-01'),
    pg_temp.line('PST-50', 'PS-0915', 1, '2027-09-01'),
    pg_temp.line('SUN-35', 'SO-3312', 1, '2027-04-01'),
    pg_temp.line('VIN-4G', 'WV-0821', 1, '2028-09-01')));

select record_delivery(pg_temp.supplier('Supplier B'), 'B-7781', '2026-09-29', pg_temp.staff('Operator 2'),
  jsonb_build_array(
    pg_temp.line('PS00534', 'CF-77812', 6, '2027-03-29'),
    pg_temp.line('PS00514', 'AF-55120', 5, '2027-03-29'),
    pg_temp.line('145909', 'PC-4410', 2, '2027-03-29'),
    pg_temp.line('81447-91063', 'EG-1009', 1, '2026-10-20')));

select record_delivery(pg_temp.supplier('Supplier C'), 'C-3302', '2026-09-30', pg_temp.staff('Operator 4'),
  jsonb_build_array(
    pg_temp.line('4-4004', 'PP9-2231', 1, null),
    pg_temp.line('PB-992', 'BX9-1187', 4, null),
    pg_temp.line('LBL-CH9', 'STC-501', 1, null),
    pg_temp.line('LBL-AP9', 'STA-502', 1, null),
    pg_temp.line('LBL-PC9', 'STP-503', 1, null)));

-- WIP-20261001-01: two batches of pie dough.
select record_production('wip_batch', '2026-10-01', pg_temp.staff('Operator 1'),
  jsonb_build_object('recipe_version_id', pg_temp.recipe_version('Pie Dough', 'v1'),
    'batches', 2, 'quantity', 340, 'unit', 'lb', 'expires_on', '2026-10-06'),
  jsonb_build_array(
    pg_temp.input('PF-26271', 200, 'lb'),
    pg_temp.input('KS-1180', 1.6, 'lb'),
    pg_temp.input('SG-4471', 2.7, 'lb'),
    pg_temp.input('BT-0926', 78, 'lb'),
    pg_temp.input('WV-0821', 0.3, 'lb'),
    pg_temp.input('SO-3312', 10, 'oz'),
    pg_temp.input('PS-0915', 17, 'lb')));

-- WIP-20261001-02: crumb topping for the apple pies.
select record_production('wip_batch', '2026-10-01', pg_temp.staff('Operator 1'),
  jsonb_build_object('recipe_version_id', pg_temp.recipe_version('Crumb Topping', 'v1'),
    'batches', 1, 'quantity', 60, 'unit', 'lb', 'expires_on', '2026-10-15'),
  jsonb_build_array(
    pg_temp.input('PF-26271', 20, 'lb'),
    pg_temp.input('BT-0926', 15, 'lb'),
    pg_temp.input('BS-2290', 15, 'lb'),
    pg_temp.input('OT-5612', 10, 'lb')));

-- FIN-20261002-01: cherry pies.
select record_production('pie_bake', '2026-10-02', pg_temp.staff('Operator 3'),
  jsonb_build_object('product_id', pg_temp.product('Cherry Pie 9"'), 'quantity', 120, 'unit', 'pc'),
  jsonb_build_array(
    pg_temp.input('WIP-20261001-01', 108, 'lb'),
    pg_temp.input('CF-77812', 240, 'lb'),
    pg_temp.input('PP9-2231', 120, 'pc')),
  jsonb_build_object('bake_temperature_f', 360, 'bake_minutes', 40));

-- FIN-20261002-02: apple crumb pies.
select record_production('pie_bake', '2026-10-02', pg_temp.staff('Operator 3'),
  jsonb_build_object('product_id', pg_temp.product('Apple Pie 9"'), 'quantity', 100, 'unit', 'pc'),
  jsonb_build_array(
    pg_temp.input('WIP-20261001-01', 90, 'lb'),
    pg_temp.input('AF-55120', 200, 'lb'),
    pg_temp.input('WIP-20261001-02', 50, 'lb'),
    pg_temp.input('PP9-2231', 100, 'pc')),
  jsonb_build_object('bake_temperature_f', 360, 'bake_minutes', 38));

-- PCK-20261003-01 / -02: packing. Two cherry pies were rejected at packing.
select record_production('packaging', '2026-10-03', pg_temp.staff('Operator 4'),
  jsonb_build_object('product_id', pg_temp.product('Cherry Pie 9"'), 'quantity', 118, 'unit', 'pc'),
  jsonb_build_array(
    pg_temp.input('FIN-20261002-01', 118, 'pc'),
    pg_temp.input('BX9-1187', 118, 'pc'),
    pg_temp.input('STC-501', 118, 'pc')),
  jsonb_build_object('comment', '2 pies rejected (cracked crust)'));

select record_production('packaging', '2026-10-03', pg_temp.staff('Operator 4'),
  jsonb_build_object('product_id', pg_temp.product('Apple Pie 9"'), 'quantity', 100, 'unit', 'pc'),
  jsonb_build_array(
    pg_temp.input('FIN-20261002-02', 100, 'pc'),
    pg_temp.input('BX9-1187', 100, 'pc'),
    pg_temp.input('STA-502', 100, 'pc')));

-- Week 2 ------------------------------------------------------------------------

select record_delivery(pg_temp.supplier('Supplier A'), 'A-25102', '2026-10-06', pg_temp.staff('Operator 2'),
  jsonb_build_array(
    pg_temp.line('76289', 'PF-27911', 4, '2027-04-06'),
    pg_temp.line('43130', 'BT-1006', 3, '2027-02-03')));

-- WIP-20261007-01: one batch of pie dough with the new butter lot.
select record_production('wip_batch', '2026-10-07', pg_temp.staff('Operator 2'),
  jsonb_build_object('recipe_version_id', pg_temp.recipe_version('Pie Dough', 'v1'),
    'batches', 1, 'quantity', 170, 'unit', 'lb', 'expires_on', '2026-10-12'),
  jsonb_build_array(
    pg_temp.input('PF-27911', 100, 'lb'),
    pg_temp.input('KS-1180', 0.8, 'lb'),
    pg_temp.input('SG-4471', 1.35, 'lb'),
    pg_temp.input('BT-1006', 39, 'lb'),
    pg_temp.input('WV-0821', 0.15, 'lb'),
    pg_temp.input('SO-3312', 5, 'oz'),
    pg_temp.input('PS-0915', 8.5, 'lb')));

-- FIN-20261008-01: pecan pies, under-baked (55 min, limit 70) -> CCP deviation.
select record_production('pie_bake', '2026-10-08', pg_temp.staff('Operator 3'),
  jsonb_build_object('product_id', pg_temp.product('Pecan Pie 9"'), 'quantity', 80, 'unit', 'pc'),
  jsonb_build_array(
    pg_temp.input('WIP-20261007-01', 72, 'lb'),
    pg_temp.input('PC-4410', 28, 'lb'),
    pg_temp.input('EG-1009', 32, 'lb'),
    pg_temp.input('BS-2290', 12, 'lb'),
    pg_temp.input('PP9-2231', 80, 'pc')),
  jsonb_build_object('bake_temperature_f', 360, 'bake_minutes', 55));

select record_production('packaging', '2026-10-09', pg_temp.staff('Operator 4'),
  jsonb_build_object('product_id', pg_temp.product('Pecan Pie 9"'), 'quantity', 80, 'unit', 'pc'),
  jsonb_build_array(
    pg_temp.input('FIN-20261008-01', 80, 'pc'),
    pg_temp.input('BX9-1187', 80, 'pc'),
    pg_temp.input('STP-503', 80, 'pc')));
