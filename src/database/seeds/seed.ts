import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5433'),
  username: process.env.DB_USER ?? 'pos_user',
  password: process.env.DB_PASSWORD ?? 'pos_password_segura',
  database: process.env.DB_NAME ?? 'pos_castor',
  synchronize: false,
  entities: ['src/**/*.entity.ts'],
});

async function seed(): Promise<void> {
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository('users');
  const catRepo = AppDataSource.getRepository('categories');
  const prodRepo = AppDataSource.getRepository('products');

  console.log('Seeding users...');
  const users = [
    { email: 'admin@castor.gt', full_name: 'Administrador', role: 'ADMIN', password: 'Admin1234!' },
    { email: 'gerente@castor.gt', full_name: 'Gerente García', role: 'MANAGER', password: 'Gerente1234!' },
    { email: 'cajero@castor.gt', full_name: 'Cajero López', role: 'CASHIER', password: 'Cajero1234!' },
    { email: 'vendedor1@castor.gt', full_name: 'Vendedor Uno', role: 'SALESPERSON', password: 'Vendedor1234!' },
    { email: 'vendedor2@castor.gt', full_name: 'Vendedor Dos', role: 'SALESPERSON', password: 'Vendedor1234!' },
  ];

  for (const u of users) {
    const exists = await userRepo.findOne({ where: { email: u.email } });
    if (!exists) {
      const password_hash = await bcrypt.hash(u.password, 10);
      await userRepo.save(userRepo.create({ ...u, password_hash, is_active: true }));
      console.log(`  Created ${u.email}`);
    } else {
      console.log(`  Skipped ${u.email} (exists)`);
    }
  }

  console.log('Seeding categories...');
  const categories = ['Salas', 'Comedores', 'Cuartos', 'Oficinas', 'Bodegas'];
  const savedCats: Record<string, string> = {};
  for (const name of categories) {
    const exists = await catRepo.findOne({ where: { name } });
    if (!exists) {
      const cat = await catRepo.save(catRepo.create({ name, is_active: true }));
      savedCats[name] = cat.category_id;
      console.log(`  Created ${name}`);
    } else {
      savedCats[name] = exists.category_id;
      console.log(`  Skipped ${name} (exists)`);
    }
  }

  console.log('Seeding products...');
  const products = [
    { sku: 'SOF-001', name: 'Sofá de 3 Plazas', unit_price: 3500, stock: 5, min_stock: 2, category: 'Salas' },
    { sku: 'SOF-002', name: 'Loveseat Gris', unit_price: 2200, stock: 3, min_stock: 1, category: 'Salas' },
    { sku: 'COM-001', name: 'Comedor 6 sillas', unit_price: 4800, stock: 2, min_stock: 1, category: 'Comedores' },
    { sku: 'COM-002', name: 'Mesa de comedor vidrio', unit_price: 2900, stock: 4, min_stock: 2, category: 'Comedores' },
    { sku: 'CUA-001', name: 'Cama matrimonial con cabecera', unit_price: 3200, stock: 3, min_stock: 1, category: 'Cuartos' },
    { sku: 'OFI-001', name: 'Escritorio ejecutivo', unit_price: 1800, stock: 6, min_stock: 2, category: 'Oficinas' },
    { sku: 'OFI-002', name: 'Silla ejecutiva ergonómica', unit_price: 950, stock: 10, min_stock: 3, category: 'Oficinas' },
  ];

  for (const p of products) {
    const exists = await prodRepo.findOne({ where: { sku: p.sku } });
    if (!exists) {
      await prodRepo.save(
        prodRepo.create({
          sku: p.sku,
          name: p.name,
          unit_price: p.unit_price,
          stock: p.stock,
          min_stock: p.min_stock,
          category_id: savedCats[p.category],
          is_active: true,
        }),
      );
      console.log(`  Created ${p.sku} — ${p.name}`);
    } else {
      console.log(`  Skipped ${p.sku} (exists)`);
    }
  }

  await AppDataSource.destroy();
  console.log('Seed complete.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
