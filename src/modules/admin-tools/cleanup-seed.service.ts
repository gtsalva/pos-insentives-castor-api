import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

export interface CleanupReport {
  dry_run: boolean;
  deleted: {
    inventory_movements: number;
    sale_payments: number;
    sale_items: number;
    sales: number;
    purchase_order_items: number;
    purchase_orders: number;
    custom_order_print_receipts: number;
    custom_order_commission_payments: number;
    custom_order_payments: number;
    custom_order_items: number;
    custom_orders: number;
    reconciliations: number;
    shift_closes: number;
    incentive_liquidations: number;
    incentive_periods: number;
    clients: number;
    suppliers: number;
    product_resources: number;
    products: number;
    categories: number;
  };
}

const SEED_SKUS = [
  'SOF-001', 'SOF-002', 'SOF-003',
  'COM-001', 'COM-002', 'COM-003',
  'CUA-001', 'CUA-002', 'CUA-003',
  'OFI-001', 'OFI-002', 'OFI-003',
  'BOD-001', 'DEC-001', 'DEC-002',
];

const SEED_SUPPLIERS = [
  'Maderas del Norte S.A.',
  'Tapicería Guatemalteca',
  'Herrajes y Accesorios GT',
  'Importadora Mueblex',
];

const SEED_CLIENT_NITS  = ['1234567-8', '9876543-2', '5555555-5'];
const SEED_CLIENT_NAMES = ['Ana Patricia Salazar', 'Familia Morales Castillo'];

const SEED_PERIOD_NAMES = [
  'Meta Marzo 2026',
  'Meta Abril 2026',
  'Meta Mayo 2026',
];

const SEED_CATEGORY_NAMES = [
  'Salas', 'Comedores', 'Cuartos', 'Oficinas', 'Bodegas', 'Decoración',
];

const SEED_VENDOR_EMAILS = [
  'vendedor1@castor.gt',
  'vendedor2@castor.gt',
  'vendedor3@castor.gt',
  'cajero@castor.gt',
];

const SEED_SHIFT_DATES = ['2026-05-27', '2026-05-23', '2026-05-20'];

@Injectable()
export class CleanupSeedService {
  constructor(private readonly dataSource: DataSource) {}

  async run(dry_run: boolean): Promise<CleanupReport> {
    const report: CleanupReport = {
      dry_run,
      deleted: {
        inventory_movements: 0,
        sale_payments: 0,
        sale_items: 0,
        sales: 0,
        purchase_order_items: 0,
        purchase_orders: 0,
        custom_order_print_receipts: 0,
        custom_order_commission_payments: 0,
        custom_order_payments: 0,
        custom_order_items: 0,
        custom_orders: 0,
        reconciliations: 0,
        shift_closes: 0,
        incentive_liquidations: 0,
        incentive_periods: 0,
        clients: 0,
        suppliers: 0,
        product_resources: 0,
        products: 0,
        categories: 0,
      },
    };

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const skuParams    = SEED_SKUS.map((_, i) => `$${i + 1}`).join(', ');
      const supParams    = SEED_SUPPLIERS.map((_, i) => `$${i + 1}`).join(', ');
      const nitParams    = SEED_CLIENT_NITS.map((_, i) => `$${i + 1}`).join(', ');
      const nameParams   = SEED_CLIENT_NAMES.map((_, i) => `$${SEED_CLIENT_NITS.length + i + 1}`).join(', ');
      const prdParams    = SEED_PERIOD_NAMES.map((_, i) => `$${i + 1}`).join(', ');
      const catParams    = SEED_CATEGORY_NAMES.map((_, i) => `$${i + 1}`).join(', ');
      const vendorParams = SEED_VENDOR_EMAILS.map((_, i) => `$${i + 1}`).join(', ');
      const dateParams   = SEED_SHIFT_DATES.map((_, i) => `$${SEED_VENDOR_EMAILS.length + i + 1}`).join(', ');

      // ── Resolve seed IDs ─────────────────────────────────────────────────────

      const saleRows: { sale_id: string }[] = await qr.query(
        `SELECT sale_id FROM sales WHERE sale_number ~ '^V-[0-9]{5}$'`,
      );
      const saleIds = saleRows.map(r => r.sale_id);

      const poRows: { purchase_order_id: string }[] = await qr.query(
        `SELECT purchase_order_id FROM purchase_orders WHERE order_number ~ '^OC-[0-9]{5}$'`,
      );
      const poIds = poRows.map(r => r.purchase_order_id);

      const coRows: { custom_order_id: string }[] = await qr.query(
        `SELECT custom_order_id FROM custom_orders WHERE order_number ~ '^COT-[0-9]{5}$'`,
      );
      const coIds = coRows.map(r => r.custom_order_id);

      const prodRows: { product_id: string }[] = await qr.query(
        `SELECT product_id FROM products WHERE sku IN (${skuParams})`,
        SEED_SKUS,
      );
      const prodIds = prodRows.map(r => r.product_id);

      const periodRows: { period_id: string }[] = await qr.query(
        `SELECT period_id FROM incentive_periods WHERE name IN (${prdParams})`,
        SEED_PERIOD_NAMES,
      );
      const periodIds = periodRows.map(r => r.period_id);

      const vendorRows: { user_id: string }[] = await qr.query(
        `SELECT user_id FROM users WHERE email IN (${vendorParams})`,
        SEED_VENDOR_EMAILS,
      );
      const vendorIds = vendorRows.map(r => r.user_id);

      // Seed shift_close IDs (needed to delete reconciliations first)
      let shiftCloseIds: string[] = [];
      if (vendorIds.length) {
        const vLit = this.lit(vendorIds);
        const dLit = this.lit(SEED_SHIFT_DATES);
        const scRows: { shift_close_id: string }[] = await qr.query(
          `SELECT shift_close_id FROM shift_closes
           WHERE salesperson_id IN (${vLit}) AND shift_date IN (${dLit})`,
        );
        shiftCloseIds = scRows.map(r => r.shift_close_id);
      }

      // ── DELETE in FK-safe order ───────────────────────────────────────────────

      // 1. All inventory_movements for seed products (covers sales, POs, and manual adjustments)
      if (prodIds.length) {
        const idsLit = this.lit(prodIds);
        report.deleted.inventory_movements += await this.del(qr, dry_run,
          `DELETE FROM inventory_movements WHERE product_id IN (${idsLit}) RETURNING 1`,
        );
      }

      // 2. sale_payments → sale_items → sales
      if (saleIds.length) {
        const idsLit = this.lit(saleIds);
        report.deleted.sale_payments += await this.del(qr, dry_run,
          `DELETE FROM sale_payments WHERE sale_id IN (${idsLit}) RETURNING 1`,
        );
        report.deleted.sale_items += await this.del(qr, dry_run,
          `DELETE FROM sale_items WHERE sale_id IN (${idsLit}) RETURNING 1`,
        );
      }
      report.deleted.sales += await this.del(qr, dry_run,
        `DELETE FROM sales WHERE sale_number ~ '^V-[0-9]{5}$' RETURNING 1`,
      );

      // 3. purchase_order_items → purchase_orders
      if (poIds.length) {
        const idsLit = this.lit(poIds);
        report.deleted.purchase_order_items += await this.del(qr, dry_run,
          `DELETE FROM purchase_order_items WHERE purchase_order_id IN (${idsLit}) RETURNING 1`,
        );
      }
      report.deleted.purchase_orders += await this.del(qr, dry_run,
        `DELETE FROM purchase_orders WHERE order_number ~ '^OC-[0-9]{5}$' RETURNING 1`,
      );

      // 4. custom order cascade
      if (coIds.length) {
        const idsLit = this.lit(coIds);
        report.deleted.custom_order_print_receipts += await this.del(qr, dry_run,
          `DELETE FROM custom_order_print_receipts WHERE custom_order_id IN (${idsLit}) RETURNING 1`,
        );
        report.deleted.custom_order_commission_payments += await this.del(qr, dry_run,
          `DELETE FROM custom_order_commission_payments WHERE custom_order_id IN (${idsLit}) RETURNING 1`,
        );
        report.deleted.custom_order_payments += await this.del(qr, dry_run,
          `DELETE FROM custom_order_payments WHERE custom_order_id IN (${idsLit}) RETURNING 1`,
        );
        report.deleted.custom_order_items += await this.del(qr, dry_run,
          `DELETE FROM custom_order_items WHERE custom_order_id IN (${idsLit}) RETURNING 1`,
        );
      }
      report.deleted.custom_orders += await this.del(qr, dry_run,
        `DELETE FROM custom_orders WHERE order_number ~ '^COT-[0-9]{5}$' RETURNING 1`,
      );

      // 5. reconciliations → shift_closes  (reconciliation has FK to shift_close_id)
      if (shiftCloseIds.length) {
        const idsLit = this.lit(shiftCloseIds);
        report.deleted.reconciliations += await this.del(qr, dry_run,
          `DELETE FROM reconciliations WHERE shift_close_id IN (${idsLit}) RETURNING 1`,
        );
        report.deleted.shift_closes += await this.del(qr, dry_run,
          `DELETE FROM shift_closes WHERE shift_close_id IN (${idsLit}) RETURNING 1`,
        );
      }

      // 6. incentive_liquidations → incentive_periods
      if (periodIds.length) {
        const idsLit = this.lit(periodIds);
        report.deleted.incentive_liquidations += await this.del(qr, dry_run,
          `DELETE FROM incentive_liquidations WHERE period_id IN (${idsLit}) RETURNING 1`,
        );
      }
      report.deleted.incentive_periods += await this.del(qr, dry_run,
        `DELETE FROM incentive_periods WHERE name IN (${prdParams}) RETURNING 1`,
        SEED_PERIOD_NAMES,
      );

      // 7. clients — NULL out client_id on real (non-seed) sales and custom_orders first
      if (!dry_run) {
        await qr.query(
          `UPDATE sales SET client_id = NULL
           WHERE client_id IN (
             SELECT client_id FROM clients
             WHERE nit IN (${nitParams}) OR full_name IN (${nameParams})
           )`,
          [...SEED_CLIENT_NITS, ...SEED_CLIENT_NAMES],
        );
        await qr.query(
          `UPDATE custom_orders SET client_id = NULL
           WHERE client_id IN (
             SELECT client_id FROM clients
             WHERE nit IN (${nitParams}) OR full_name IN (${nameParams})
           )`,
          [...SEED_CLIENT_NITS, ...SEED_CLIENT_NAMES],
        );
      }
      report.deleted.clients += await this.del(qr, dry_run,
        `DELETE FROM clients WHERE nit IN (${nitParams}) OR full_name IN (${nameParams}) RETURNING 1`,
        [...SEED_CLIENT_NITS, ...SEED_CLIENT_NAMES],
      );

      // 8. suppliers — NULL out supplier_id on real (non-seed) purchase_orders first
      if (!dry_run) {
        await qr.query(
          `UPDATE purchase_orders SET supplier_id = NULL
           WHERE supplier_id IN (
             SELECT supplier_id FROM suppliers WHERE name IN (${supParams})
           )`,
          SEED_SUPPLIERS,
        );
        await qr.query(
          `UPDATE inventory_movements SET supplier_id = NULL
           WHERE supplier_id IN (
             SELECT supplier_id FROM suppliers WHERE name IN (${supParams})
           )`,
          SEED_SUPPLIERS,
        );
      }
      report.deleted.suppliers += await this.del(qr, dry_run,
        `DELETE FROM suppliers WHERE name IN (${supParams}) RETURNING 1`,
        SEED_SUPPLIERS,
      );

      // 9. product_resources → products
      if (prodIds.length) {
        const idsLit = this.lit(prodIds);
        report.deleted.product_resources += await this.del(qr, dry_run,
          `DELETE FROM product_resources WHERE product_id IN (${idsLit}) RETURNING 1`,
        );
      }
      report.deleted.products += await this.del(qr, dry_run,
        `DELETE FROM products WHERE sku IN (${skuParams}) RETURNING 1`,
        SEED_SKUS,
      );

      // 10. categories — only those with no remaining products
      report.deleted.categories += await this.del(qr, dry_run,
        `DELETE FROM categories
         WHERE name IN (${catParams})
           AND NOT EXISTS (SELECT 1 FROM products WHERE category_id = categories.category_id)
         RETURNING 1`,
        SEED_CATEGORY_NAMES,
      );

      if (dry_run) {
        await qr.rollbackTransaction();
      } else {
        await qr.commitTransaction();
      }
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    return report;
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async del(
    qr: QueryRunner,
    dry_run: boolean,
    sql: string,
    params: unknown[] = [],
  ): Promise<number> {
    if (dry_run) {
      const countSql = sql.replace(
        /^DELETE FROM (\S+)([\s\S]*?) RETURNING 1$/,
        'SELECT COUNT(*)::int AS n FROM $1$2',
      );
      const rows: { n: number }[] = await qr.query(countSql, params);
      return Number(rows[0]?.n ?? 0);
    }

    const rows: unknown[] = await qr.query(sql, params);
    return Array.isArray(rows) ? rows.length : 0;
  }

  private lit(ids: string[]): string {
    return ids.map(id => `'${id.replace(/'/g, "''")}'`).join(', ');
  }
}
