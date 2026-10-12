# Audit of the original Google Sheet

The bakery tracked traceability in a 20-tab Google Sheet: forms for deliveries,
recipes, production, cookie depositing and packaging, each appending rows to a
log tab, plus a dashboard that traces a raw-material lot forward.

This audit was run on the sheet's backup copy, which holds the test data
entered while the sheet was set up. The numbers therefore show **what the
structure allows**, not error rates at the bakery.

## Findings

| # | What the sheet allows | Evidence in the backup |
|---|---|---|
| 1 | Lot numbers are typed by hand, so production can cite lots that were never received. | Production Log: 42 ingredient lines, 41 flagged "No match". |
| 2 | The lot check compares lot codes only, not what the lot is. | The single "Match": lot `sdf34r` was used as *Pastry Flour* on 12/3/2024, but was received that day as *40# Eggs Cage Free*. |
| 3 | Nothing stops one lot code from covering a whole batch. | The 12/11/2024 dough batch lists lot `wef` for all 9 ingredients. |
| 4 | Duplicate submissions are not detected. | Two 12/9/2024 dough entries share 8 lot codes. |
| 5 | Intermediate batches are identified by their production date, not by a lot. | Pie Baking Log: "Batch # Pie shell = 12/3/2024". Two batches on one day cannot be told apart. |
| 6 | References to batches are not checked. | A Pecan 9" bake on 12/5/2024 uses the dough batch of 12/9/2024; a cherry bake uses a filling batch from 11/4/2024 that does not exist; one bake has no date. |
| 7 | Supplier items and recipe ingredients are not linked. | Deliveries say "50# Quik Cookings Oats", recipes say "Butter", "Pastry Flour". The dashboard returns "No production found" for oats lot `EJ56DGH`. |
| 8 | Units are not checked against the item. | Patty paper (counted in pieces) received as "45 oz". |
| 9 | Untracked inputs still require a lot. | Water has a lot code in every dough batch. |
| 10 | No audit trail or signature. | The sheet's own instructions advise against using it as a CCP record, and warn not to rename tabs or insert rows. |

## How the new system closes each gap

| # | Rule | Where | Test |
|---|---|---|---|
| 1, 3 | Inputs are lots that exist, picked by id, with enough quantity left. | `check_lot_input` trigger | *cannot use more of a lot than what is left* |
| 2, 7 | Delivered materials map to a recipe ingredient; a batch only accepts lots of its recipe's ingredients. | `materials.ingredient_id`, `check_lot_input` | *a dough batch refuses a lot that is not in its recipe* |
| 1 | A batch must name a lot for every lot-tracked ingredient. | `record_production` | *a dough batch must name a lot for every tracked ingredient* |
| 4 | Invoice numbers are unique per supplier. | `deliveries` unique key | — |
| 5, 6 | Every production creates its own lot (`WIP-20261001-01`), and inputs reference lots, not dates. | `record_production`, `lot_inputs` | *a packed lot leads back to every delivered lot it contains* |
| 8 | Quantities are converted to the material's unit, and refused if the unit does not fit. | `convert_qty`, `record_delivery` | *a quantity in a unit of the wrong kind is refused* |
| 9 | Ingredients can be marked as not lot-tracked. | `ingredients.lot_tracked` | — |
| 10 | Events are append-only, record who entered them, and bake times are checked against limits. | RLS, `created_by`, `bake_ccp_checks` | *bakes below the critical limits are flagged* |
