import assert from 'node:assert/strict';
import { before, describe, test } from 'node:test';
import type { PGlite } from '@electric-sql/pglite';
import { actAs, createDb, idOf, inRollback, linkStaff, lotId } from './db.ts';

let db: PGlite;

before(async () => {
  db = await createDb();
});

const staff = (name: string) => idOf(db, `select id from staff where display_name = $1`, [name]);
const material = (code: string) => idOf(db, `select id from materials where code = $1`, [code]);
const product = (name: string) => idOf(db, `select id from products where name = $1`, [name]);
const recipeVersion = (recipe: string, label: string) =>
  idOf(
    db,
    `select rv.id from recipe_versions rv join recipes r on r.id = rv.recipe_id
     where r.name = $1 and rv.version_label = $2`,
    [recipe, label],
  );

async function codes(sql: string, params: unknown[]): Promise<string[]> {
  const { rows } = await db.query<{ lot_code: string }>(sql, params);
  return rows.map((r) => r.lot_code).sort();
}

async function produce(kind: string, output: object, inputs: object[], details: object = {}) {
  const { rows } = await db.query<{ lot_id: string }>(
    `select record_production($1, date '2026-10-10', $2, $3, $4, $5) as lot_id`,
    [kind, await staff('Operator 1'), output, inputs, details],
  );
  return rows[0].lot_id;
}

describe('recall tracing', () => {
  test('a butter lot leads to every packed product made with it, and only those', async () => {
    const packed = await codes(`select lot_code from trace_forward($1) where kind = 'packed'`, [
      await lotId(db, 'BT-0926'),
    ]);
    assert.deepEqual(packed, ['PCK-20261003-01', 'PCK-20261003-02']);
  });

  test('a packed lot leads back to every delivered lot it contains', async () => {
    const delivered = await codes(
      `select lot_code from trace_backward($1) where kind in ('raw_material', 'packaging')`,
      [await lotId(db, 'PCK-20261009-01')],
    );
    assert.deepEqual(delivered, [
      'BS-2290', 'BT-1006', 'BX9-1187', 'EG-1009', 'KS-1180', 'PC-4410', 'PF-27911',
      'PP9-2231', 'PS-0915', 'SG-4471', 'SO-3312', 'STP-503', 'WV-0821',
    ]);
  });

  test('remaining quantity accounts for every use, across units', async () => {
    const { rows } = await db.query<{ lot_code: string; remaining: string }>(
      `select lot_code, remaining::text from lot_details where lot_code in ('BT-0926', 'SO-3312') order by 1`,
    );
    // Butter: 4 x 55.1 lb - 78 lb (dough) - 15 lb (crumb). Oil: 35 lb - 10 oz - 5 oz.
    assert.deepEqual(
      rows.map((r) => [r.lot_code, Number(r.remaining)]),
      [['BT-0926', 127.4], ['SO-3312', 34.0625]],
    );
  });
});

describe('production rules', () => {
  test('cannot use more of a lot than what is left', async () => {
    await inRollback(db, async () => {
      await assert.rejects(
        produce('pie_bake', { product_id: await product('Cherry Pie 9"'), quantity: 50, unit: 'pc' }, [
          { lot_id: await lotId(db, 'CF-77812'), quantity: 100, unit: 'lb' },
        ]),
        /CF-77812 has 60.000 lb left/,
      );
    });
  });

  test('a dough batch refuses a lot that is not in its recipe', async () => {
    await inRollback(db, async () => {
      await assert.rejects(
        produce('wip_batch', { recipe_version_id: await recipeVersion('Pie Dough', 'v1'), quantity: 10, unit: 'lb' }, [
          { lot_id: await lotId(db, 'EG-1009'), quantity: 5, unit: 'lb' },
        ]),
        /EG-1009 is not an ingredient of this recipe version/,
      );
    });
  });

  test('a dough batch must name a lot for every tracked ingredient', async () => {
    await inRollback(db, async () => {
      await assert.rejects(
        produce('wip_batch', { recipe_version_id: await recipeVersion('Pie Dough', 'v1'), quantity: 10, unit: 'lb' }, [
          { lot_id: await lotId(db, 'PF-27911'), quantity: 5, unit: 'lb' },
        ]),
        /Missing lots for: Butter, Kosher Salt, Potato Starch, Sugar, Organic, Sunflower Oil, Vinegar White/,
      );
    });
  });

  test('retired recipe versions cannot be produced', async () => {
    await inRollback(db, async () => {
      await assert.rejects(
        produce('wip_batch', { recipe_version_id: await recipeVersion('Pie Dough', 'v0'), quantity: 10, unit: 'lb' }, [
          { lot_id: await lotId(db, 'PF-27911'), quantity: 5, unit: 'lb' },
        ]),
        /Recipe version v0 is retired/,
      );
    });
  });

  test('packing cannot mix up products', async () => {
    await inRollback(db, async () => {
      await assert.rejects(
        produce('packaging', { product_id: await product('Apple Pie 9"'), quantity: 1, unit: 'pc' }, [
          { lot_id: await lotId(db, 'FIN-20261002-01'), quantity: 1, unit: 'pc' },
        ]),
        /different product than the one being packed/,
      );
    });
  });

  test('expired lots cannot go into production', async () => {
    await inRollback(db, async () => {
      // WIP-20261001-01 expired on Oct 6; produce() records on Oct 10.
      await assert.rejects(
        produce('pie_bake', { product_id: await product('Cherry Pie 9"'), quantity: 1, unit: 'pc' }, [
          { lot_id: await lotId(db, 'WIP-20261001-01'), quantity: 1, unit: 'lb' },
        ]),
        /WIP-20261001-01 expired on 2026-10-06/,
      );
    });
  });

  test('stages only move forward', async () => {
    await inRollback(db, async () => {
      await assert.rejects(
        produce('pie_bake', { product_id: await product('Cherry Pie 9"'), quantity: 1, unit: 'pc' }, [
          { lot_id: await lotId(db, 'PCK-20261003-01'), quantity: 1, unit: 'pc' },
        ]),
        /A finished lot cannot be made from a packed lot/,
      );
    });
  });

  test('finished lots get an expiry date from the product shelf life', async () => {
    const { rows } = await db.query<{ expires_on: string }>(
      `select expires_on::text from lots where lot_code = 'FIN-20261002-01'`,
    );
    assert.equal(rows[0].expires_on, '2026-10-09');
  });

  test('bakes below the critical limits are flagged', async () => {
    const flagged = await codes(`select lot_code from bake_ccp_checks where deviation or missing_record`, []);
    assert.deepEqual(flagged, ['FIN-20261008-01']);
  });
});

describe('deliveries', () => {
  test('packages are converted to the base unit', async () => {
    await inRollback(db, async () => {
      await db.query(`select record_delivery($1, 'T-1', date '2026-10-10', $2, $3)`, [
        await idOf(db, `select id from suppliers where name = 'Supplier A'`),
        await staff('Operator 2'),
        JSON.stringify([{ material_id: await material('43155'), lot_code: 'BT-TEST', packages: 3 }]),
      ]);
      const { rows } = await db.query<{ quantity: string; unit: string }>(
        `select quantity::text, unit from lots where lot_code = 'BT-TEST'`,
      );
      assert.deepEqual([Number(rows[0].quantity), rows[0].unit], [165.3, 'lb']);
    });
  });

  test('a quantity in a unit of the wrong kind is refused', async () => {
    await inRollback(db, async () => {
      await assert.rejects(
        db.query(`select record_delivery($1, 'T-2', date '2026-10-10', $2, $3)`, [
          await idOf(db, `select id from suppliers where name = 'Supplier C'`),
          await staff('Operator 2'),
          JSON.stringify([{ material_id: await material('MN-PP55'), lot_code: 'X', quantity: 45, unit: 'oz' }]),
        ]),
        /must be given in packages or in a pc unit/,
      );
    });
  });
});

describe('access rules', () => {
  test('anonymous visitors see nothing', async () => {
    await inRollback(db, async () => {
      await actAs(db, null);
      await assert.rejects(db.query(`select count(*) from lots`), /permission denied/);
    });
  });

  test('signed-in users who are not staff see no rows', async () => {
    await inRollback(db, async () => {
      const userId = crypto.randomUUID();
      await db.query(`insert into auth.users (id) values ($1)`, [userId]);
      await actAs(db, userId);
      const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from lots`);
      assert.equal(rows[0].n, 0);
      await assert.rejects(
        db.query(`select record_delivery(null, 'X', current_date, null, '[]')`),
        /Permission denied/,
      );
    });
  });

  test('operators read and record events but cannot write tables directly', async () => {
    await inRollback(db, async () => {
      const userId = await linkStaff(db, 'Operator 1');
      const operator = await staff('Operator 1');
      const supplier = await idOf(db, `select id from suppliers where name = 'Supplier A'`);
      const flour = await material('76289');
      await actAs(db, userId);

      const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from lots`);
      assert.ok(rows[0].n > 0);

      await db.query(`select record_delivery($1, 'T-3', date '2026-10-10', $2, $3)`, [
        supplier,
        operator,
        JSON.stringify([{ material_id: flour, lot_code: 'PF-TEST', packages: 1 }]),
      ]);
      const { rows: created } = await db.query(`select 1 from lots where lot_code = 'PF-TEST'`);
      assert.equal(created.length, 1);

      const { affectedRows } = await db.query(`update suppliers set name = 'Renamed' where name = 'Supplier A'`);
      assert.equal(affectedRows, 0);

      // Last: a failed statement aborts the transaction.
      await assert.rejects(
        db.query(`insert into lots (lot_code, kind, quantity, unit) values ('X', 'wip', 1, 'lb')`),
        /permission denied/,
      );
    });
  });

  test('managers maintain reference data', async () => {
    await inRollback(db, async () => {
      const userId = await linkStaff(db, 'Manager');
      await actAs(db, userId);
      const { affectedRows } = await db.query(`update suppliers set name = 'Renamed' where name = 'Supplier A'`);
      assert.equal(affectedRows, 1);
    });
  });
});
