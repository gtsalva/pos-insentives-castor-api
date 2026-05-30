import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

const isProd = __filename.endsWith('.js');

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5434'),
  username: process.env.DB_USER ?? 'pos_user',
  password: process.env.DB_PASSWORD ?? 'pos_password_segura',
  database: process.env.DB_NAME ?? 'pos_castor',
  synchronize: false,
  entities: isProd ? ['dist/**/*.entity.js'] : ['src/**/*.entity.ts'],
});

// ─── helpers ───────────────────────────────────────────────────────────────

const q = AppDataSource;

async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q.query(sql, params);
  return rows[0] ?? null;
}

async function run(sql: string, params: unknown[] = []): Promise<void> {
  await q.query(sql, params);
}

/** Returns existing id or inserts row and returns new id */
async function upsertReturn(
  table: string,
  uniqueCol: string,
  uniqueVal: unknown,
  idCol: string,
  insertSql: string,
  insertParams: unknown[],
): Promise<string> {
  const existing = await one(`SELECT ${idCol} FROM ${table} WHERE ${uniqueCol} = $1`, [uniqueVal]);
  if (existing) return (existing as Record<string, string>)[idCol];
  const row = await one<Record<string, string>>(insertSql, insertParams);
  return row![idCol];
}

// ─── seed ──────────────────────────────────────────────────────────────────

async function seed(): Promise<void> {
  await AppDataSource.initialize();
  console.log('Connected. Seeding…\n');

  // ── 1. USERS ──────────────────────────────────────────────────────────────
  console.log('── Users');
  const rawUsers = [
    { email: 'admin@castor.gt',      full_name: 'Administrador Sistema',  role: 'ADMIN',       pw: 'Admin1234!' },
    { email: 'gerente@castor.gt',    full_name: 'Roberto García',          role: 'MANAGER',     pw: 'Gerente1234!' },
    { email: 'cajero@castor.gt',     full_name: 'Ana López',               role: 'CASHIER',     pw: 'Cajero1234!' },
    { email: 'vendedor1@castor.gt',  full_name: 'Carlos Pérez',            role: 'SALESPERSON', pw: 'Vendedor1234!' },
    { email: 'vendedor2@castor.gt',  full_name: 'María Rodríguez',         role: 'SALESPERSON', pw: 'Vendedor1234!' },
    { email: 'vendedor3@castor.gt',  full_name: 'José Hernández',          role: 'SALESPERSON', pw: 'Vendedor1234!' },
  ];

  const userIds: Record<string, string> = {};
  for (const u of rawUsers) {
    const id = await upsertReturn(
      'users', 'email', u.email, 'user_id',
      `INSERT INTO users (email, full_name, role, password_hash, is_active)
       VALUES ($1,$2,$3,$4,true) RETURNING user_id`,
      [u.email, u.full_name, u.role, await bcrypt.hash(u.pw, 10)],
    );
    userIds[u.email] = id;
    console.log(`  ${u.email}`);
  }

  const ADMIN   = userIds['admin@castor.gt'];
  const GERENTE = userIds['gerente@castor.gt'];
  const CAJERO  = userIds['cajero@castor.gt'];
  const V1      = userIds['vendedor1@castor.gt'];
  const V2      = userIds['vendedor2@castor.gt'];
  const V3      = userIds['vendedor3@castor.gt'];

  // ── 2. CATEGORIES ─────────────────────────────────────────────────────────
  console.log('\n── Categories');
  const catNames = ['Salas', 'Comedores', 'Cuartos', 'Oficinas', 'Bodegas', 'Decoración'];
  const catIds: Record<string, string> = {};
  for (const name of catNames) {
    const id = await upsertReturn(
      'categories', 'name', name, 'category_id',
      `INSERT INTO categories (name, is_active) VALUES ($1, true) RETURNING category_id`,
      [name],
    );
    catIds[name] = id;
    console.log(`  ${name}`);
  }

  // ── 3. PRODUCTS ───────────────────────────────────────────────────────────
  console.log('\n── Products');
  const rawProducts = [
    { sku: 'SOF-001', name: 'Sofá 3 Plazas Gris',         price: 3500, cost: 2100, stock: 8,  min: 2, cat: 'Salas' },
    { sku: 'SOF-002', name: 'Sofá 2 Plazas Café',          price: 2800, cost: 1680, stock: 5,  min: 2, cat: 'Salas' },
    { sku: 'SOF-003', name: 'Loveseat Beige',              price: 2200, cost: 1320, stock: 4,  min: 1, cat: 'Salas' },
    { sku: 'COM-001', name: 'Comedor 6 Sillas Madera',     price: 4800, cost: 2880, stock: 3,  min: 1, cat: 'Comedores' },
    { sku: 'COM-002', name: 'Comedor 4 Sillas Vidrio',     price: 3200, cost: 1920, stock: 4,  min: 2, cat: 'Comedores' },
    { sku: 'COM-003', name: 'Mesa de Comedor Redonda',     price: 2500, cost: 1500, stock: 2,  min: 1, cat: 'Comedores' },
    { sku: 'CUA-001', name: 'Cama Matrimonial con Cab.',   price: 3200, cost: 1920, stock: 3,  min: 1, cat: 'Cuartos' },
    { sku: 'CUA-002', name: 'Cama Individual Juvenil',     price: 1800, cost: 1080, stock: 5,  min: 2, cat: 'Cuartos' },
    { sku: 'CUA-003', name: 'Ropero 4 Puertas',           price: 4200, cost: 2520, stock: 2,  min: 1, cat: 'Cuartos' },
    { sku: 'OFI-001', name: 'Escritorio Ejecutivo',        price: 1800, cost: 1080, stock: 6,  min: 2, cat: 'Oficinas' },
    { sku: 'OFI-002', name: 'Silla Ejecutiva Ergonómica', price: 950,  cost: 570,  stock: 10, min: 3, cat: 'Oficinas' },
    { sku: 'OFI-003', name: 'Archivero 4 Gavetas',        price: 1200, cost: 720,  stock: 4,  min: 2, cat: 'Oficinas' },
    { sku: 'BOD-001', name: 'Estantería Industrial',       price: 1600, cost: 960,  stock: 1,  min: 1, cat: 'Bodegas' },
    { sku: 'DEC-001', name: 'Espejo Decorativo Grande',    price: 650,  cost: 390,  stock: 7,  min: 2, cat: 'Decoración' },
    { sku: 'DEC-002', name: 'Mesa de Centro Madera',       price: 890,  cost: 534,  stock: 6,  min: 2, cat: 'Decoración' },
  ];

  const prodIds: Record<string, string> = {};
  for (const p of rawProducts) {
    const id = await upsertReturn(
      'products', 'sku', p.sku, 'product_id',
      `INSERT INTO products (sku, name, unit_price, cost_price, min_sale_price, stock, min_stock, category_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true) RETURNING product_id`,
      [p.sku, p.name, p.price, p.cost, p.cost * 1.1, p.stock, p.min, catIds[p.cat]],
    );
    prodIds[p.sku] = id;
    console.log(`  ${p.sku} ${p.name}`);
  }

  // ── 4. SUPPLIERS ──────────────────────────────────────────────────────────
  console.log('\n── Suppliers');
  const rawSuppliers = [
    { name: 'Maderas del Norte S.A.',  contact: 'Luis Morales',    phone: '2345-6789', email: 'ventas@maderasnorte.gt' },
    { name: 'Tapicería Guatemalteca',  contact: 'Sandra Vásquez',  phone: '5567-8901', email: 'info@tapiceriagt.com' },
    { name: 'Herrajes y Accesorios GT',contact: 'Pedro Contreras', phone: '4478-9012', email: 'pedidos@herrajesgt.gt' },
    { name: 'Importadora Mueblex',     contact: 'Diana Castro',    phone: '3389-0123', email: 'compras@mueblex.com' },
  ];

  const supIds: Record<string, string> = {};
  for (const s of rawSuppliers) {
    const id = await upsertReturn(
      'suppliers', 'name', s.name, 'supplier_id',
      `INSERT INTO suppliers (name, contact_name, phone, email, is_active)
       VALUES ($1,$2,$3,$4,true) RETURNING supplier_id`,
      [s.name, s.contact, s.phone, s.email],
    );
    supIds[s.name] = id;
    console.log(`  ${s.name}`);
  }

  // ── 5. CLIENTS ────────────────────────────────────────────────────────────
  console.log('\n── Clients');
  const rawClients = [
    { nit: '1234567-8', name: 'Restaurante El Buen Sabor',  phone: '2234-5678', email: 'admin@buensabor.gt' },
    { nit: '9876543-2', name: 'Hotel Casa Grande',          phone: '2345-6789', email: 'compras@casagrande.gt' },
    { nit: '5555555-5', name: 'Oficinas Corporativas GT',   phone: '4456-7890', email: 'gerencia@oficinasgt.com' },
    { nit: 'CF',        name: 'Ana Patricia Salazar',       phone: '5567-8901', email: 'ana.salazar@gmail.com' },
    { nit: null,        name: 'Familia Morales Castillo',   phone: '3378-9012', email: null },
  ];

  const clientIds: string[] = [];
  for (const c of rawClients) {
    let id: string;
    if (c.nit && c.nit !== 'CF') {
      id = await upsertReturn(
        'clients', 'nit', c.nit, 'client_id',
        `INSERT INTO clients (nit, full_name, phone, email, is_active)
         VALUES ($1,$2,$3,$4,true) RETURNING client_id`,
        [c.nit, c.name, c.phone, c.email],
      );
    } else {
      const existing = await one<{ client_id: string }>(
        `SELECT client_id FROM clients WHERE full_name = $1`, [c.name],
      );
      if (existing) {
        id = existing.client_id;
      } else {
        const row = await one<{ client_id: string }>(
          `INSERT INTO clients (nit, full_name, phone, email, is_active)
           VALUES ($1,$2,$3,$4,true) RETURNING client_id`,
          [c.nit, c.name, c.phone, c.email],
        );
        id = row!.client_id;
      }
    }
    clientIds.push(id);
    console.log(`  ${c.name}`);
  }

  // ── 6. INCENTIVE PERIODS ──────────────────────────────────────────────────
  console.log('\n── Incentive periods');
  const rawPeriods = [
    { name: 'Meta Marzo 2026',  start: '2026-03-01', end: '2026-03-31', goal: 80000,  rate: 3.5 },
    { name: 'Meta Abril 2026',  start: '2026-04-01', end: '2026-04-30', goal: 90000,  rate: 3.5 },
    { name: 'Meta Mayo 2026',   start: '2026-05-01', end: '2026-05-31', goal: 100000, rate: 4.0 },
  ];

  const periodIds: Record<string, string> = {};
  for (const p of rawPeriods) {
    const id = await upsertReturn(
      'incentive_periods', 'name', p.name, 'period_id',
      `INSERT INTO incentive_periods (name, start_date, end_date, goal_amount, commission_rate, is_active, created_by_id)
       VALUES ($1,$2,$3,$4,$5,true,$6) RETURNING period_id`,
      [p.name, p.start, p.end, p.goal, p.rate, GERENTE],
    );
    periodIds[p.name] = id;
    console.log(`  ${p.name}`);
  }

  // ── 7. PURCHASE ORDERS ────────────────────────────────────────────────────
  console.log('\n── Purchase orders');

  type PurchaseInput = {
    num: string; supplier: string; status: 'RECEIVED' | 'PENDING'; date: string;
    receivedAt?: string; items: { sku: string; qty: number; cost: number }[];
  };

  const rawPurchases: PurchaseInput[] = [
    {
      num: 'OC-00001', supplier: 'Maderas del Norte S.A.', status: 'RECEIVED', date: '2026-03-05',
      receivedAt: '2026-03-10',
      items: [
        { sku: 'SOF-001', qty: 5, cost: 2100 },
        { sku: 'COM-001', qty: 3, cost: 2880 },
        { sku: 'CUA-001', qty: 4, cost: 1920 },
      ],
    },
    {
      num: 'OC-00002', supplier: 'Tapicería Guatemalteca', status: 'RECEIVED', date: '2026-04-02',
      receivedAt: '2026-04-08',
      items: [
        { sku: 'SOF-002', qty: 4, cost: 1680 },
        { sku: 'SOF-003', qty: 3, cost: 1320 },
        { sku: 'CUA-002', qty: 5, cost: 1080 },
      ],
    },
    {
      num: 'OC-00003', supplier: 'Herrajes y Accesorios GT', status: 'RECEIVED', date: '2026-04-15',
      receivedAt: '2026-04-20',
      items: [
        { sku: 'OFI-001', qty: 6, cost: 1080 },
        { sku: 'OFI-002', qty: 8, cost: 570  },
        { sku: 'OFI-003', qty: 4, cost: 720  },
      ],
    },
    {
      num: 'OC-00004', supplier: 'Importadora Mueblex', status: 'PENDING', date: '2026-05-20',
      items: [
        { sku: 'COM-002', qty: 5, cost: 1920 },
        { sku: 'DEC-001', qty: 6, cost: 390  },
        { sku: 'DEC-002', qty: 8, cost: 534  },
      ],
    },
  ];

  for (const po of rawPurchases) {
    const exists = await one(`SELECT purchase_order_id FROM purchase_orders WHERE order_number = $1`, [po.num]);
    if (exists) { console.log(`  skip ${po.num}`); continue; }

    const totalCost = po.items.reduce((s, i) => s + i.qty * i.cost, 0);

    const row = await one<{ purchase_order_id: string }>(
      `INSERT INTO purchase_orders
         (order_number, supplier_id, status, total_cost, ordered_by, received_by, received_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::date,$9::date) RETURNING purchase_order_id`,
      [
        po.num, supIds[po.supplier], po.status, totalCost, GERENTE,
        po.status === 'RECEIVED' ? CAJERO : null,
        po.receivedAt ?? null,
        po.date, po.receivedAt ?? po.date,
      ],
    );
    const poId = row!.purchase_order_id;

    for (const item of po.items) {
      const prod = rawProducts.find(p => p.sku === item.sku)!;
      await run(
        `INSERT INTO purchase_order_items
           (purchase_order_id, product_id, product_sku, product_name, quantity_ordered, quantity_received, unit_cost, subtotal, unit_price)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          poId, prodIds[item.sku], item.sku, prod.name,
          item.qty, po.status === 'RECEIVED' ? item.qty : null,
          item.cost, item.qty * item.cost, prod.price,
        ],
      );
    }

    if (po.status === 'RECEIVED') {
      for (const item of po.items) {
        await run(
          `INSERT INTO inventory_movements
             (product_id, movement_type, quantity, notes, reference_id, supplier_id, created_by, created_at)
           VALUES ($1,'IN',$2,$3,$4,$5,$6,$7::date)`,
          [
            prodIds[item.sku], item.qty,
            `Recepción OC ${po.num}`, poId,
            supIds[po.supplier], CAJERO, po.receivedAt,
          ],
        );
      }
    }

    console.log(`  ${po.num} — ${po.supplier} (${po.status})`);
  }

  // ── 8. SALES ──────────────────────────────────────────────────────────────
  console.log('\n── Sales');

  type SaleInput = {
    num: string; method: string; date: string; sp: string;
    clientId?: string; items: { sku: string; qty: number }[];
  };

  const rawSales: SaleInput[] = [
    // Marzo
    { num: 'V-00001', method: 'CASH',     date: '2026-03-12', sp: V1,
      items: [{ sku: 'SOF-001', qty: 1 }, { sku: 'DEC-002', qty: 1 }] },
    { num: 'V-00002', method: 'CARD',     date: '2026-03-14', sp: V2, clientId: clientIds[0],
      items: [{ sku: 'COM-001', qty: 1 }] },
    { num: 'V-00003', method: 'TRANSFER', date: '2026-03-18', sp: V1, clientId: clientIds[1],
      items: [{ sku: 'OFI-001', qty: 2 }, { sku: 'OFI-002', qty: 4 }] },
    { num: 'V-00004', method: 'CASH',     date: '2026-03-22', sp: V3,
      items: [{ sku: 'CUA-001', qty: 1 }, { sku: 'CUA-002', qty: 1 }] },
    { num: 'V-00005', method: 'CARD',     date: '2026-03-28', sp: V2,
      items: [{ sku: 'SOF-002', qty: 1 }] },
    // Abril
    { num: 'V-00006', method: 'CASH',     date: '2026-04-03', sp: V1,
      items: [{ sku: 'DEC-001', qty: 2 }, { sku: 'DEC-002', qty: 2 }] },
    { num: 'V-00007', method: 'TRANSFER', date: '2026-04-08', sp: V3, clientId: clientIds[2],
      items: [{ sku: 'OFI-001', qty: 3 }, { sku: 'OFI-002', qty: 5 }, { sku: 'OFI-003', qty: 2 }] },
    { num: 'V-00008', method: 'CARD',     date: '2026-04-11', sp: V1, clientId: clientIds[3],
      items: [{ sku: 'COM-002', qty: 1 }] },
    { num: 'V-00009', method: 'CASH',     date: '2026-04-15', sp: V2,
      items: [{ sku: 'SOF-001', qty: 1 }] },
    { num: 'V-00010', method: 'CARD',     date: '2026-04-19', sp: V3,
      items: [{ sku: 'CUA-001', qty: 1 }] },
    { num: 'V-00011', method: 'CASH',     date: '2026-04-24', sp: V1,
      items: [{ sku: 'SOF-003', qty: 1 }, { sku: 'DEC-001', qty: 1 }] },
    { num: 'V-00012', method: 'VISACUOTAS', date: '2026-04-28', sp: V2, clientId: clientIds[1],
      items: [{ sku: 'CUA-003', qty: 1 }] },
    // Mayo
    { num: 'V-00013', method: 'CASH',     date: '2026-05-02', sp: V1,
      items: [{ sku: 'DEC-002', qty: 3 }] },
    { num: 'V-00014', method: 'CARD',     date: '2026-05-05', sp: V3, clientId: clientIds[0],
      items: [{ sku: 'COM-001', qty: 1 }] },
    { num: 'V-00015', method: 'TRANSFER', date: '2026-05-08', sp: V2, clientId: clientIds[2],
      items: [{ sku: 'OFI-002', qty: 8 }] },
    { num: 'V-00016', method: 'CASH',     date: '2026-05-12', sp: V1,
      items: [{ sku: 'SOF-001', qty: 1 }, { sku: 'SOF-003', qty: 1 }] },
    { num: 'V-00017', method: 'CARD',     date: '2026-05-16', sp: V3,
      items: [{ sku: 'CUA-002', qty: 2 }] },
    { num: 'V-00018', method: 'CASH',     date: '2026-05-20', sp: V2, clientId: clientIds[4],
      items: [{ sku: 'COM-003', qty: 1 }] },
    { num: 'V-00019', method: 'VISACUOTAS', date: '2026-05-23', sp: V1, clientId: clientIds[1],
      items: [{ sku: 'CUA-001', qty: 1 }, { sku: 'CUA-003', qty: 1 }] },
    { num: 'V-00020', method: 'CASH',     date: '2026-05-27', sp: V3,
      items: [{ sku: 'OFI-001', qty: 2 }, { sku: 'DEC-001', qty: 1 }] },
  ];

  for (const s of rawSales) {
    const exists = await one(`SELECT sale_id FROM sales WHERE sale_number = $1`, [s.num]);
    if (exists) { console.log(`  skip ${s.num}`); continue; }

    let total = 0;
    for (const item of s.items) {
      const p = rawProducts.find(x => x.sku === item.sku)!;
      total += p.price * item.qty;
    }

    const row = await one<{ sale_id: string }>(
      `INSERT INTO sales (sale_number, payment_method, status, total, salesperson_id, client_id, created_at, updated_at)
       VALUES ($1,$2,'COMPLETED',$3,$4,$5,$6::date,$7::date) RETURNING sale_id`,
      [s.num, s.method, total, s.sp, s.clientId ?? null, s.date, s.date],
    );
    const saleId = row!.sale_id;

    for (const item of s.items) {
      const p = rawProducts.find(x => x.sku === item.sku)!;
      await run(
        `INSERT INTO sale_items (sale_id, product_id, product_sku, product_name, quantity, unit_price, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [saleId, prodIds[item.sku], item.sku, p.name, item.qty, p.price, p.price * item.qty],
      );
      await run(
        `INSERT INTO inventory_movements (product_id, movement_type, quantity, notes, reference_id, created_by, created_at)
         VALUES ($1,'OUT',$2,$3,$4,$5,$6::date)`,
        [prodIds[item.sku], item.qty, `Venta ${s.num}`, saleId, s.sp, s.date],
      );
    }

    await run(
      `INSERT INTO sale_payments (sale_id, payment_method, amount, created_at)
       VALUES ($1,$2,$3,$4::date)`,
      [saleId, s.method, total, s.date],
    );

    console.log(`  ${s.num}  Q${total.toFixed(0)}  ${s.method}  ${s.date}`);
  }

  // ── 9. CUSTOM ORDERS (cotizaciones) ───────────────────────────────────────
  console.log('\n── Custom orders');

  type COInput = {
    num: string; sp: string; status: string; date: string; delivDate?: string;
    clientId?: string; clientName?: string; clientPhone?: string;
    agreedPrice?: number; totalPaid: number; supplierId?: string;
    items: { desc: string; qty: number; price: number; cost?: number }[];
    clientNotes?: string;
  };

  const rawCOs: COInput[] = [
    {
      num: 'COT-00001', sp: V1, status: 'COMPLETED', date: '2026-03-08', delivDate: '2026-04-01',
      clientId: clientIds[1], totalPaid: 18500, agreedPrice: 18500,
      items: [
        { desc: 'Muebles sala principal - Sofá 3 plazas + loveseat a medida', qty: 1, price: 12000, cost: 7200 },
        { desc: 'Mesa de centro con vidrio templado', qty: 1, price: 3500, cost: 2100 },
        { desc: 'Portarretrato decorativo madera nogal (2 piezas)', qty: 2, price: 1500, cost: 900 },
      ],
      clientNotes: 'Entregar en habitación 401. Contactar al gerente de mantenimiento.',
    },
    {
      num: 'COT-00002', sp: V2, status: 'DELIVERED', date: '2026-04-05', delivDate: '2026-05-15',
      clientId: clientIds[0], totalPaid: 8000, agreedPrice: 14000,
      items: [
        { desc: 'Sillas de madera para comedor (6 unidades)', qty: 6, price: 1200, cost: 720 },
        { desc: 'Mesa de comedor cedro 8 personas', qty: 1, price: 6800, cost: 4080 },
      ],
      clientNotes: 'Coordinar entrega con encargado de cocina.',
    },
    {
      num: 'COT-00003', sp: V3, status: 'IN_PRODUCTION', date: '2026-04-18', delivDate: '2026-06-10',
      clientId: clientIds[2], totalPaid: 15000, agreedPrice: 38000,
      items: [
        { desc: 'Escritorios ejecutivos en L para 10 estaciones', qty: 10, price: 2200, cost: 1320 },
        { desc: 'Sillas ejecutivas ergonómicas con descansabrazos', qty: 10, price: 1200, cost: 720 },
        { desc: 'Mesa de juntas para 12 personas', qty: 1, price: 8000, cost: 4800 },
        { desc: 'Mueble de recepción moderno', qty: 1, price: 6800, cost: 4080 },
      ],
    },
    {
      num: 'COT-00004', sp: V1, status: 'APPROVED', date: '2026-05-03', delivDate: '2026-06-20',
      clientName: 'Familia Mendoza Ortiz', clientPhone: '4456-7890', totalPaid: 5000, agreedPrice: 22000,
      items: [
        { desc: 'Closet empotrado dormitorio principal - 3m ancho', qty: 1, price: 12000, cost: 7200 },
        { desc: 'Cama matrimonial con cabecera tapizada', qty: 1, price: 5500, cost: 3300 },
        { desc: 'Mesitas de noche juego (2 piezas)', qty: 2, price: 2250, cost: 1350 },
      ],
      clientNotes: 'Medir el espacio antes de fabricar el closet.',
    },
    {
      num: 'COT-00005', sp: V2, status: 'SENT', date: '2026-05-10',
      clientId: clientIds[3], totalPaid: 0,
      items: [
        { desc: 'Sala familiar tapizado en cuero café oscuro', qty: 1, price: 9500, cost: 5700 },
        { desc: 'Mesa de centro madera rústica', qty: 1, price: 2200, cost: 1320 },
      ],
    },
    {
      num: 'COT-00006', sp: V3, status: 'DRAFT', date: '2026-05-22',
      clientName: 'Inversiones Xela S.A.', clientPhone: '7789-0123', totalPaid: 0,
      items: [
        { desc: 'Muebles para área de espera (lobby) - 3 sofás 2 plazas', qty: 3, price: 4500, cost: 2700 },
        { desc: 'Mesas auxiliares madera y vidrio', qty: 4, price: 850, cost: 510 },
      ],
    },
    {
      num: 'COT-00007', sp: V1, status: 'CANCELLED', date: '2026-04-25',
      clientId: clientIds[4], totalPaid: 0,
      items: [
        { desc: 'Comedor 4 sillas vidrio templado', qty: 1, price: 5500, cost: 3300 },
      ],
    },
  ];

  for (const co of rawCOs) {
    const exists = await one(`SELECT custom_order_id FROM custom_orders WHERE order_number = $1`, [co.num]);
    if (exists) { console.log(`  skip ${co.num}`); continue; }

    const total = co.items.reduce((s, i) => s + i.qty * i.price, 0);

    const row = await one<{ custom_order_id: string }>(
      `INSERT INTO custom_orders
         (order_number, salesperson_id, client_id, client_name, client_phone,
          status, total, total_paid, agreed_price, delivery_date,
          client_notes, counts_for_incentive, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,$12::date,$13::date)
       RETURNING custom_order_id`,
      [
        co.num, co.sp, co.clientId ?? null, co.clientName ?? null, co.clientPhone ?? null,
        co.status, total, co.totalPaid, co.agreedPrice ?? null, co.delivDate ?? null,
        co.clientNotes ?? null,
        co.date, co.date,
      ],
    );
    const coId = row!.custom_order_id;

    for (const item of co.items) {
      await run(
        `INSERT INTO custom_order_items
           (custom_order_id, description, quantity, unit_price, cost_price, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [coId, item.desc, item.qty, item.price, item.cost ?? null, item.qty * item.price],
      );
    }

    if (co.totalPaid > 0) {
      await run(
        `INSERT INTO custom_order_payments
           (custom_order_id, payment_method, amount, received_by_id, created_at)
         VALUES ($1,'TRANSFER',$2,$3,$4::date)`,
        [coId, co.totalPaid, CAJERO, co.date],
      );
    }

    console.log(`  ${co.num} ${co.status}  Q${total.toFixed(0)}`);
  }

  // ── 10. SHIFT CLOSES ──────────────────────────────────────────────────────
  console.log('\n── Shift closes');

  type ShiftInput = { sp: string; date: string; cash: number; card: number; transfer: number; count: number };

  const rawShifts: ShiftInput[] = [
    { sp: V1, date: '2026-05-27', cash: 3560,  card: 1800,  transfer: 0,     count: 3 },
    { sp: V2, date: '2026-05-27', cash: 2500,  card: 0,     transfer: 7600,  count: 2 },
    { sp: V3, date: '2026-05-27', cash: 4750,  card: 3200,  transfer: 0,     count: 4 },
    { sp: V1, date: '2026-05-23', cash: 7400,  card: 4200,  transfer: 0,     count: 3 },
    { sp: V2, date: '2026-05-20', cash: 2500,  card: 0,     transfer: 0,     count: 1 },
  ];

  for (const sh of rawShifts) {
    const exists = await one(
      `SELECT shift_close_id FROM shift_closes WHERE salesperson_id = $1 AND shift_date = $2`,
      [sh.sp, sh.date],
    );
    if (exists) { console.log(`  skip ${sh.date}`); continue; }

    const total = sh.cash + sh.card + sh.transfer;
    await run(
      `INSERT INTO shift_closes
         (salesperson_id, shift_date, status, total_sales, cash_total, card_total, transfer_total,
          transaction_count, closed_by_id, created_at, updated_at)
       VALUES ($1,$2,'CLOSED',$3,$4,$5,$6,$7,$8,$9::date,$10::date)`,
      [sh.sp, sh.date, total, sh.cash, sh.card, sh.transfer, sh.count, CAJERO, sh.date, sh.date],
    );
    console.log(`  turno ${sh.date}  Q${total}`);
  }

  // ── 11. INVENTORY ADJUSTMENTS (manual) ───────────────────────────────────
  console.log('\n── Manual inventory adjustments');

  const adjExists = await one(
    `SELECT movement_id FROM inventory_movements WHERE notes LIKE 'Ajuste de inventario físico%' LIMIT 1`
  );

  if (!adjExists) {
    const adjs = [
      { sku: 'BOD-001', qty: 2,  dir: 'IN',         notes: 'Ajuste de inventario físico — conteo mayo' },
      { sku: 'DEC-001', qty: -1, dir: 'ADJUSTMENT',  notes: 'Ajuste de inventario físico — merma' },
    ];
    for (const a of adjs) {
      await run(
        `INSERT INTO inventory_movements (product_id, movement_type, quantity, notes, created_by, created_at)
         VALUES ($1,$2::inventory_movements_movement_type_enum,$3,$4,$5,'2026-05-28'::date)`,
        [prodIds[a.sku], a.dir, Math.abs(a.qty), a.notes, ADMIN],
      );
      console.log(`  ${a.sku} ${a.dir} ${a.qty}`);
    }
  } else {
    console.log('  skip (already exist)');
  }

  await AppDataSource.destroy();
  console.log('\n✓ Seed complete.');
}

seed().catch(err => { console.error(err); process.exit(1); });
