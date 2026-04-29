// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './modules/users/entities/user.entity';
import { Category } from './modules/categories/entities/category.entity';
import { Product } from './modules/products/entities/product.entity';
import { ProductResource } from './modules/products/entities/product-resource.entity';
import { Sale } from './modules/sales/entities/sale.entity';
import { SaleItem } from './modules/sales/entities/sale-item.entity';
import { InventoryMovement } from './modules/inventory/entities/inventory-movement.entity';
import { Client } from './modules/clients/entities/client.entity';
import { Supplier } from './modules/suppliers/entities/supplier.entity';
import { PurchaseOrder } from './modules/purchases/entities/purchase-order.entity';
import { PurchaseOrderItem } from './modules/purchases/entities/purchase-order-item.entity';
import { IncentivePeriod } from './modules/incentives/entities/incentive-period.entity';
import { IncentiveLiquidation } from './modules/incentives/entities/incentive-liquidation.entity';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ProductsModule } from './modules/products/products.module';
import { SalesModule } from './modules/sales/sales.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ClientsModule } from './modules/clients/clients.module';
import { StorageModule } from './modules/storage/storage.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { IncentivesModule } from './modules/incentives/incentives.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5433),
        username: config.get<string>('DB_USER', 'pos_user'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME', 'pos_castor'),
        entities: [
          User, Category, Product, ProductResource, Sale, SaleItem,
          InventoryMovement, Client,
          Supplier, PurchaseOrder, PurchaseOrderItem,
          IncentivePeriod, IncentiveLiquidation,
        ],
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    SalesModule,
    InventoryModule,
    ClientsModule,
    StorageModule,
    SuppliersModule,
    PurchasesModule,
    IncentivesModule,
    ReportsModule,
  ],
})
export class AppModule {}
