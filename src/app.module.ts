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
import { SalePayment } from './modules/sales/entities/sale-payment.entity';
import { InventoryMovement } from './modules/inventory/entities/inventory-movement.entity';
import { Client } from './modules/clients/entities/client.entity';
import { Supplier } from './modules/suppliers/entities/supplier.entity';
import { PurchaseOrder } from './modules/purchases/entities/purchase-order.entity';
import { PurchaseOrderItem } from './modules/purchases/entities/purchase-order-item.entity';
import { IncentivePeriod } from './modules/incentives/entities/incentive-period.entity';
import { IncentiveLiquidation } from './modules/incentives/entities/incentive-liquidation.entity';
import { AuditLog } from './modules/audit/entities/audit-log.entity';
import { ShiftClose } from './modules/shifts/entities/shift-close.entity';
import { Reconciliation } from './modules/shifts/entities/reconciliation.entity';
import { CustomOrder }                   from './modules/custom-orders/entities/custom-order.entity';
import { CustomOrderItem }              from './modules/custom-orders/entities/custom-order-item.entity';
import { CustomOrderPayment }           from './modules/custom-orders/entities/custom-order-payment.entity';
import { CustomOrderCommissionPayment } from './modules/custom-orders/entities/custom-order-commission-payment.entity';
import { AuditModule } from './modules/audit/audit.module';
import { CustomOrdersModule } from './modules/custom-orders/custom-orders.module';
import { ShiftsModule } from './modules/shifts/shifts.module';
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
          User, Category, Product, ProductResource, Sale, SaleItem, SalePayment,
          InventoryMovement, Client,
          Supplier, PurchaseOrder, PurchaseOrderItem,
          IncentivePeriod, IncentiveLiquidation,
          AuditLog, ShiftClose, Reconciliation,
          CustomOrder, CustomOrderItem, CustomOrderPayment, CustomOrderCommissionPayment,
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
    AuditModule,
    ShiftsModule,
    CustomOrdersModule,
  ],
})
export class AppModule {}
