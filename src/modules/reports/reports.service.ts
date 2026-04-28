import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Sale, SaleStatus } from '../sales/entities/sale.entity';
import { SaleItem } from '../sales/entities/sale-item.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import {
  TopSellersFilterDto,
  TopProductsFilterDto,
  ProductMarginsFilterDto,
  RevenueFilterDto,
  ReportPeriod,
} from './dto/report-filters.dto';
import {
  TopSellerRow,
  TopProductRow,
  ProductMarginRow,
  RevenueReportResponse,
} from './interfaces/report-responses.interface';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Sale) private readonly saleRepo: Repository<Sale>,
    @InjectRepository(SaleItem) private readonly saleItemRepo: Repository<SaleItem>,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  private defaultDateRange(): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from, to };
  }

  async getTopSellers(filters: TopSellersFilterDto): Promise<TopSellerRow[]> {
    const { from, to } = this.defaultDateRange();
    const dateFrom = filters.date_from ? new Date(filters.date_from) : from;
    const dateTo = filters.date_to ? new Date(filters.date_to) : to;
    const limit = filters.limit ?? 10;

    const rows = await this.saleRepo
      .createQueryBuilder('s')
      .select('u.user_id', 'salesperson_id')
      .addSelect('u.full_name', 'salesperson_name')
      .addSelect('COUNT(s.sale_id)', 'total_sales')
      .addSelect('SUM(s.total)', 'total_revenue')
      .addSelect('AVG(s.total)', 'avg_sale_value')
      .innerJoin(User, 'u', 'u.user_id = s.salesperson_id')
      .where('s.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('s.created_at >= :dateFrom', { dateFrom })
      .andWhere('s.created_at <= :dateTo', { dateTo })
      .groupBy('u.user_id')
      .addGroupBy('u.full_name')
      .orderBy('SUM(s.total)', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((r) => ({
      salesperson_id: r.salesperson_id,
      salesperson_name: r.salesperson_name,
      total_sales: Number(r.total_sales),
      total_revenue: parseFloat(r.total_revenue) || 0,
      avg_sale_value: parseFloat(r.avg_sale_value) || 0,
    }));
  }

  async getTopProducts(filters: TopProductsFilterDto): Promise<TopProductRow[]> {
    const { from, to } = this.defaultDateRange();
    const dateFrom = filters.date_from ? new Date(filters.date_from) : from;
    const dateTo = filters.date_to ? new Date(filters.date_to) : to;
    const limit = filters.limit ?? 10;

    const qb = this.saleItemRepo
      .createQueryBuilder('si')
      .select('si.product_id', 'product_id')
      .addSelect('si.product_name', 'product_name')
      .addSelect('si.product_sku', 'product_sku')
      .addSelect('p.category_id', 'category_id')
      .addSelect('c.name', 'category_name')
      .addSelect('SUM(si.quantity)', 'units_sold')
      .addSelect('SUM(si.subtotal)', 'total_revenue')
      .innerJoin(Sale, 's', 's.sale_id = si.sale_id')
      .innerJoin(Product, 'p', 'p.product_id = si.product_id')
      .leftJoin('categories', 'c', 'c.category_id = p.category_id')
      .where('s.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('s.created_at >= :dateFrom', { dateFrom })
      .andWhere('s.created_at <= :dateTo', { dateTo });

    if (filters.category_id) {
      qb.andWhere('p.category_id = :catId', { catId: filters.category_id });
    }

    const rows = await qb
      .groupBy('si.product_id')
      .addGroupBy('si.product_name')
      .addGroupBy('si.product_sku')
      .addGroupBy('p.category_id')
      .addGroupBy('c.name')
      .orderBy('SUM(si.quantity)', 'DESC')
      .limit(limit)
      .getRawMany();

    return rows.map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      product_sku: r.product_sku,
      category_id: r.category_id ?? null,
      category_name: r.category_name ?? null,
      units_sold: Number(r.units_sold),
      total_revenue: parseFloat(r.total_revenue) || 0,
    }));
  }

  async getProductMargins(filters: ProductMarginsFilterDto): Promise<ProductMarginRow[]> {
    const { from, to } = this.defaultDateRange();
    const dateFrom = filters.date_from ? new Date(filters.date_from) : from;
    const dateTo = filters.date_to ? new Date(filters.date_to) : to;

    const qb = this.saleItemRepo
      .createQueryBuilder('si')
      .select('si.product_id', 'product_id')
      .addSelect('si.product_name', 'product_name')
      .addSelect('si.product_sku', 'product_sku')
      .addSelect('c.name', 'category_name')
      .addSelect('p.cost_price', 'cost_price')
      .addSelect('si.unit_price', 'sale_price')
      .addSelect('SUM(si.quantity)', 'units_sold')
      .addSelect('SUM(si.subtotal)', 'total_revenue')
      .addSelect(
        `CASE WHEN p.cost_price > 0
          THEN ROUND(((si.unit_price - p.cost_price) / p.cost_price * 100)::numeric, 2)
          ELSE NULL END`,
        'margin_pct',
      )
      .addSelect(
        `CASE WHEN p.cost_price IS NOT NULL
          THEN ROUND((si.unit_price - p.cost_price)::numeric, 2)
          ELSE NULL END`,
        'margin_amount',
      )
      .innerJoin(Sale, 's', 's.sale_id = si.sale_id')
      .innerJoin(Product, 'p', 'p.product_id = si.product_id')
      .leftJoin('categories', 'c', 'c.category_id = p.category_id')
      .where('s.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('s.created_at >= :dateFrom', { dateFrom })
      .andWhere('s.created_at <= :dateTo', { dateTo });

    if (filters.category_id) {
      qb.andWhere('p.category_id = :catId', { catId: filters.category_id });
    }

    if (filters.min_margin_pct !== undefined) {
      qb.andWhere(
        `CASE WHEN p.cost_price > 0
          THEN ((si.unit_price - p.cost_price) / p.cost_price * 100) >= :minMargin
          ELSE false END`,
        { minMargin: filters.min_margin_pct },
      );
    }

    const rows = await qb
      .groupBy('si.product_id')
      .addGroupBy('si.product_name')
      .addGroupBy('si.product_sku')
      .addGroupBy('c.name')
      .addGroupBy('p.cost_price')
      .addGroupBy('si.unit_price')
      .orderBy('margin_pct', 'DESC', 'NULLS LAST')
      .getRawMany();

    return rows.map((r) => ({
      product_id: r.product_id,
      product_name: r.product_name,
      product_sku: r.product_sku,
      category_name: r.category_name ?? null,
      cost_price: r.cost_price !== null ? parseFloat(r.cost_price) : null,
      sale_price: parseFloat(r.sale_price) || 0,
      margin_amount: r.margin_amount !== null ? parseFloat(r.margin_amount) : null,
      margin_pct: r.margin_pct !== null ? parseFloat(r.margin_pct) : null,
      units_sold: Number(r.units_sold),
      total_revenue: parseFloat(r.total_revenue) || 0,
    }));
  }

  async getRevenue(filters: RevenueFilterDto): Promise<RevenueReportResponse> {
    const { from, to } = this.defaultDateRange();
    const dateFrom = filters.date_from ? new Date(filters.date_from) : from;
    const dateTo = filters.date_to ? new Date(filters.date_to) : to;
    const period = filters.period ?? ReportPeriod.DAY;
    const truncFn = `DATE_TRUNC('${period}', s.created_at)`;

    // Trend
    const trendQb = this.saleRepo
      .createQueryBuilder('s')
      .select(truncFn, 'period')
      .addSelect('SUM(s.total)', 'revenue')
      .addSelect('COUNT(s.sale_id)', 'sales_count')
      .where('s.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('s.created_at >= :dateFrom', { dateFrom })
      .andWhere('s.created_at <= :dateTo', { dateTo });
    if (filters.payment_method) trendQb.andWhere('s.payment_method = :pm', { pm: filters.payment_method });
    if (filters.salesperson_id) trendQb.andWhere('s.salesperson_id = :spId', { spId: filters.salesperson_id });
    const trendRows = await trendQb
      .groupBy(truncFn)
      .orderBy('period', 'ASC')
      .getRawMany();

    // By payment method
    const pmRows = await this.saleRepo
      .createQueryBuilder('s')
      .select('s.payment_method', 'payment_method')
      .addSelect('SUM(s.total)', 'revenue')
      .addSelect('COUNT(s.sale_id)', 'sales_count')
      .where('s.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('s.created_at >= :dateFrom', { dateFrom })
      .andWhere('s.created_at <= :dateTo', { dateTo })
      .groupBy('s.payment_method')
      .getRawMany();

    // By category
    const catQb = this.saleItemRepo
      .createQueryBuilder('si')
      .select('p.category_id', 'category_id')
      .addSelect('c.name', 'category_name')
      .addSelect('SUM(si.subtotal)', 'revenue')
      .addSelect('SUM(si.quantity)', 'units_sold')
      .innerJoin(Sale, 's', 's.sale_id = si.sale_id')
      .innerJoin(Product, 'p', 'p.product_id = si.product_id')
      .leftJoin('categories', 'c', 'c.category_id = p.category_id')
      .where('s.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('s.created_at >= :dateFrom', { dateFrom })
      .andWhere('s.created_at <= :dateTo', { dateTo });
    if (filters.category_id) catQb.andWhere('p.category_id = :catId', { catId: filters.category_id });
    if (filters.salesperson_id) catQb.andWhere('s.salesperson_id = :spId', { spId: filters.salesperson_id });
    const catRows = await catQb
      .groupBy('p.category_id')
      .addGroupBy('c.name')
      .orderBy('SUM(si.subtotal)', 'DESC')
      .getRawMany();

    // Totals
    const totRow = await this.saleRepo
      .createQueryBuilder('s')
      .select('SUM(s.total)', 'total_revenue')
      .addSelect('COUNT(s.sale_id)', 'total_sales')
      .addSelect('AVG(s.total)', 'avg_ticket')
      .where('s.status = :status', { status: SaleStatus.COMPLETED })
      .andWhere('s.created_at >= :dateFrom', { dateFrom })
      .andWhere('s.created_at <= :dateTo', { dateTo })
      .getRawOne();

    return {
      trend: trendRows.map((r) => ({
        period: r.period instanceof Date ? r.period.toISOString() : String(r.period),
        revenue: parseFloat(r.revenue) || 0,
        sales_count: Number(r.sales_count),
      })),
      by_payment_method: pmRows.map((r) => ({
        payment_method: r.payment_method,
        revenue: parseFloat(r.revenue) || 0,
        sales_count: Number(r.sales_count),
      })),
      by_category: catRows.map((r) => ({
        category_id: r.category_id ?? null,
        category_name: r.category_name ?? 'Sin categoría',
        revenue: parseFloat(r.revenue) || 0,
        units_sold: Number(r.units_sold),
      })),
      totals: {
        total_revenue: parseFloat(totRow?.total_revenue) || 0,
        total_sales: Number(totRow?.total_sales) || 0,
        avg_ticket: parseFloat(totRow?.avg_ticket) || 0,
      },
    };
  }
}
