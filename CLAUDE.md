# CLAUDE.md — pos-api
## API NestJS — Backend Compartido

Lee primero el `CLAUDE.md` de la raíz del workspace.
Este archivo define las reglas específicas de `pos-api`.

---

## Propósito y Contexto

`pos-api` es el único backend del sistema. Sirve a **dos frontends**:
- `pos-caja` — app del vendedor (mobile, flujo de venta)
- `pos-admin` — panel administrativo (desktop, control total)

El acceso diferenciado entre las dos apps **no se resuelve en el frontend** — se resuelve aquí,
en los guards de NestJS. El backend es la fuente de verdad de seguridad.

**Deploy:** Railway (producción) · `localhost:3001` (desarrollo local — 3000 lo ocupa kama-platform-backend)
**Base de datos:** PostgreSQL 16 (Docker en dev, Railway Postgres en prod)

---

## Filosofía: Angular Way aplicado al Backend

Igual que Angular organiza la UI en módulos cohesivos con responsabilidades claras,
`pos-api` organiza la lógica de negocio en módulos NestJS con el mismo principio:

| Angular | NestJS |
|---------|--------|
| Component (orquesta la vista) | Controller (orquesta la request) |
| Service (lógica de negocio) | Service (lógica de negocio) |
| HttpClient (acceso a datos externos) | Repository (acceso a la BD) |
| Signal / Store (estado) | — (sin estado; la BD es el estado) |
| Módulo standalone | Módulo NestJS |
| DI con `inject()` | DI con `constructor()` o `inject()` |

**Flujo unidireccional obligatorio:**
```
Request HTTP
  → Controller        (recibe, valida DTO, delega)
    → Service         (lógica de negocio, reglas, cálculos)
      → Repository    (queries a TypeORM / PostgreSQL)
        → Database
```
Nunca saltear capas. El controller nunca toca TypeORM. El service nunca importa `Repository<Entity>` directamente.

---

## Estructura del Proyecto

```
pos-api/
  ├── docker-compose.yml        ← PostgreSQL + API
  ├── docker-compose.dev.yml    ← overrides de desarrollo
  ├── .env.example              ← variables globales de entorno
  src/
    ├── modules/
    │   ├── auth/
    │   │   ├── dto/
    │   │   │   ├── login.dto.ts
    │   │   │   ├── auth-response.dto.ts
    │   │   │   └── index.ts
    │   │   ├── strategies/
    │   │   │   └── jwt.strategy.ts
    │   │   ├── auth.controller.ts
    │   │   ├── auth.service.ts
    │   │   ├── auth.module.ts
    │   │   └── index.ts
    │   │
    │   ├── users/
    │   ├── products/
    │   ├── categories/
    │   ├── inventory/
    │   ├── sales/
    │   ├── purchases/
    │   ├── suppliers/
    │   ├── incentives/
    │   └── reports/
    │
    ├── common/
    │   ├── decorators/
    │   │   ├── current-user.decorator.ts
    │   │   ├── roles.decorator.ts
    │   │   └── index.ts
    │   ├── guards/
    │   │   ├── jwt-auth.guard.ts
    │   │   ├── roles.guard.ts
    │   │   └── index.ts
    │   ├── interceptors/
    │   │   ├── audit-log.interceptor.ts
    │   │   ├── transform.interceptor.ts    ← envuelve toda respuesta en { data, message }
    │   │   └── index.ts
    │   ├── filters/
    │   │   └── http-exception.filter.ts   ← formato de error estándar
    │   ├── pipes/
    │   │   └── parse-uuid.pipe.ts
    │   └── interfaces/
    │       ├── user-payload.interface.ts  ← payload decodificado del JWT
    │       └── api-response.interface.ts
    │
    ├── config/
    │   ├── app.config.ts
    │   ├── database.config.ts
    │   └── jwt.config.ts
    │
    ├── database/
    │   └── migrations/                    ← TypeORM migrations (nunca sync en prod)
    │
    ├── app.module.ts
    └── main.ts
```

### Estructura interna de cada módulo

```
modules/<nombre>/
  ├── dto/
  │   ├── create-<nombre>.dto.ts
  │   ├── update-<nombre>.dto.ts
  │   ├── <nombre>-query.dto.ts          ← filtros y paginación
  │   └── index.ts
  ├── entities/
  │   ├── <nombre>.entity.ts
  │   └── index.ts
  ├── interfaces/
  │   ├── <nombre>-response.interface.ts ← nunca exponer la entidad cruda
  │   └── index.ts
  ├── <nombre>.controller.ts
  ├── <nombre>.service.ts
  ├── <nombre>.repository.ts
  ├── <nombre>.module.ts
  └── index.ts                           ← barrel export
```

---

## Módulos y sus Responsabilidades

### `auth`
- `POST /api/auth/login` — recibe email + password, retorna JWT
- `POST /api/auth/me` — retorna el usuario autenticado desde el token
- Sin refresh token en v1 — sesión de 8h

### `users`
- CRUD de usuarios
- Asignación de roles: `ADMIN`, `MANAGER`, `CASHIER`, `SALESPERSON`
- Activar / desactivar cuenta
- Acceso: `ADMIN` para CRUD completo; `MANAGER` puede ver pero no crear admins

### `products`
- CRUD de productos con SKU único
- Relación con `categories`
- Activar / desactivar producto (soft delete)
- Acceso: `MANAGER+` para escritura; `CASHIER+` para lectura (búsqueda en caja)

### `categories`
- CRUD simple de categorías de productos
- Acceso: `MANAGER+`

### `inventory`
- Stock actual por producto (1 registro por producto en tabla `inventory`)
- `PATCH /api/inventory/:productId/adjust` — ajuste manual con motivo
- `GET /api/inventory/low-stock` — productos con stock ≤ mínimo configurado
- Los movimientos se registran automáticamente en `inventory_movements`
- El stock nunca se modifica directamente — siempre a través del servicio de inventario

### `sales`
- `POST /api/sales` — crear venta (usado por `pos-caja`)
  - Valida stock disponible antes de confirmar
  - Crea `sale` + `sale_items`
  - Llama a `InventoryService.deductStock()` dentro de una transacción
  - Genera `sale_number` automático
- `GET /api/sales` — historial con filtros (usado por `pos-admin`)
- `GET /api/sales/my-sales` — ventas del turno del vendedor autenticado (usado por `pos-caja`)
- `PATCH /api/sales/:id/void` — anular venta con motivo (solo `MANAGER+`)
  - Revierte el stock automáticamente
- `POST /api/sales/close-shift` — cierre de turno (genera resumen)

### `purchases`
- CRUD de órdenes de compra con estados: `PENDING → RECEIVED | CANCELLED`
- `PATCH /api/purchases/:id/receive` — marcar como recibida
  - Actualiza el inventario automáticamente
- Relación con `suppliers`

### `suppliers`
- CRUD de proveedores
- Acceso: `MANAGER+`

### `incentives`
- CRUD de metas (`incentive_goals`): nombre, período, monto objetivo, % comisión
- `GET /api/incentives/my-progress` — progreso del vendedor autenticado (usado por `pos-caja`)
- `GET /api/incentives/progress` — progreso de todos los vendedores (usado por `pos-admin`)
- `POST /api/incentives/:goalId/liquidate` — calcular y registrar comisiones del período
- Acceso: `SALESPERSON` solo puede ver su propio progreso

### `reports`
- `GET /api/reports/sales` — ventas por período con totales
- `GET /api/reports/inventory` — rotación de productos (más/menos vendidos)
- `GET /api/reports/salesperson-performance` — desempeño y comisiones por vendedor
- `GET /api/reports/dashboard` — métricas del día para el dashboard de admin
- Acceso: `MANAGER+` en todos

---

## Autenticación y RBAC

### JWT Payload

```typescript
// common/interfaces/user-payload.interface.ts
export interface UserPayload {
  sub: string;       // user UUID — nombre estándar JWT, no snake_case
  email: string;
  role: UserRole;
  name: string;
  iat: number;
  exp: number;
}
// Nota: los campos del JWT payload siguen el estándar RFC 7519 (sub, iat, exp).
// El resto de propiedades de dominio sí usan snake_case.
```

### Roles

```typescript
// modules/users/entities/user.entity.ts
export enum UserRole {
  ADMIN       = 'ADMIN',
  MANAGER     = 'MANAGER',
  CASHIER     = 'CASHIER',
  SALESPERSON = 'SALESPERSON',
}
```

### Aplicar guards en controladores

**Siempre** aplicar `JwtAuthGuard` + `RolesGuard` a nivel de controlador, no a nivel de método.
Sobreescribir por método solo cuando una ruta del mismo controlador necesita permiso diferente.

```typescript
@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)   // ← a nivel de controlador
export class InventoryController {

  @Get()
  @Roles(UserRole.CASHIER, UserRole.MANAGER, UserRole.ADMIN)
  findAll() { ... }

  @Patch(':productId/adjust')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)   // ← más restrictivo
  adjust() { ... }
}
```

### Decorador CurrentUser

```typescript
// common/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: keyof UserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return data ? request.user?.[data] : request.user;
  },
);

// Uso en controlador
@Get('my-sales')
@Roles(UserRole.SALESPERSON, UserRole.CASHIER)
getMySales(@CurrentUser('sub') userId: string) {
  return this.salesService.findBySalesperson(userId);
}
```

---

## Respuesta Estándar — TransformInterceptor

Toda respuesta exitosa se envuelve en:

```json
{
  "data": { ... },
  "message": "OK",
  "statusCode": 200
}
```

Para listas paginadas el `TransformInterceptor` envuelve el `PaginatedResult` completo bajo `data`:
```json
{
  "data": {
    "data": [ ... ],
    "total": 150,
    "page": 1,
    "limit": 20
  },
  "message": "OK",
  "statusCode": 200
}
```
Los frontends deben mapear `res.data` (tipo `PaginatedResult<T>`), NO `res.data.data`.

```typescript
// common/interceptors/transform.interceptor.ts
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const statusCode = context.switchToHttp().getResponse().statusCode;
    return next.handle().pipe(
      map((data) => ({
        data,
        message: 'OK',
        statusCode,
      })),
    );
  }
}
```

---

## Manejo de Errores — HttpExceptionFilter

Toda excepción se formatea igual:

```json
{
  "statusCode": 404,
  "message": "Producto con id abc-123 no encontrado",
  "error": "Not Found",
  "timestamp": "2026-02-15T14:30:00.000Z",
  "path": "/api/products/abc-123"
}
```

```typescript
// common/filters/http-exception.filter.ts
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx    = host.switchToHttp();
    const res    = ctx.getResponse<Response>();
    const req    = ctx.getRequest<Request>();
    const status = exception.getStatus();

    res.status(status).json({
      statusCode: status,
      message:   exception.message,
      error:     exception.name,
      timestamp: new Date().toISOString(),
      path:      req.url,
    });
  }
}
```

Registrar ambos globalmente en `main.ts`:
```typescript
app.useGlobalInterceptors(new TransformInterceptor());
app.useGlobalFilters(new HttpExceptionFilter());
```

---

## Transacciones TypeORM

Toda operación que modifica más de una tabla usa `QueryRunner` — nunca operaciones separadas sin transacción:

```typescript
// sales.repository.ts
async createWithItems(dto: CreateSaleDto, cashierId: string): Promise<SaleEntity> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const sale = queryRunner.manager.create(SaleEntity, {
      cashier_id:      cashierId,
      salesperson_id:  dto.salesperson_id,
      payment_method:  dto.payment_method,
      sale_number:     await this.generateSaleNumber(queryRunner),
      status:          SaleStatus.COMPLETED,
    });
    const savedSale = await queryRunner.manager.save(sale);

    const items = dto.items.map(item =>
      queryRunner.manager.create(SaleItemEntity, {
        sale_id:    savedSale.id,
        product_id: item.product_id,
        quantity:   item.quantity,
        unit_price: item.unit_price,
        subtotal:   item.quantity * item.unit_price,
      })
    );
    await queryRunner.manager.save(items);

    savedSale.total = items.reduce((sum, i) => sum + i.subtotal, 0);
    await queryRunner.manager.save(savedSale);

    await queryRunner.commitTransaction();
    return savedSale;

  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  } finally {
    await queryRunner.release();
  }
}
```

---

## Nomenclatura

### Archivos
| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Módulo | `<nombre>.module.ts` | `sales.module.ts` |
| Controlador | `<nombre>.controller.ts` | `sales.controller.ts` |
| Servicio | `<nombre>.service.ts` | `sales.service.ts` |
| Repositorio | `<nombre>.repository.ts` | `sales.repository.ts` |
| Entidad | `<nombre>.entity.ts` | `sale.entity.ts` |
| DTO crear | `create-<nombre>.dto.ts` | `create-sale.dto.ts` |
| DTO actualizar | `update-<nombre>.dto.ts` | `update-sale.dto.ts` |
| DTO query | `<nombre>-query.dto.ts` | `sale-query.dto.ts` |
| Interface respuesta | `<nombre>-response.interface.ts` | `sale-response.interface.ts` |
| Guard | `<nombre>.guard.ts` | `roles.guard.ts` |
| Interceptor | `<nombre>.interceptor.ts` | `audit-log.interceptor.ts` |
| Decorator | `<nombre>.decorator.ts` | `current-user.decorator.ts` |

### Tablas de base de datos
- Plural, `snake_case`: `sales`, `sale_items`, `inventory_movements`, `purchase_orders`
- Columnas y propiedades TypeScript: `snake_case` en ambos lados — `sale_id`, `unit_price`, `created_at`. No usar `camelCase` en propiedades de entidades. El `name:` en `@Column` es redundante cuando el nombre TS ya es `snake_case`
- PKs: siempre `uuid` con `@PrimaryGeneratedColumn('uuid')`
- Timestamps: siempre `created_at` y `updated_at` con decoradores TypeORM

---

## DTOs — Reglas

```typescript
// create-sale.dto.ts
export class CreateSaleDto {
  @ApiProperty()
  @IsUUID()
  salesperson_id: string;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  payment_method: PaymentMethod;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];
}

// update usa PartialType — nunca duplicar campos
export class UpdateSaleDto extends PartialType(CreateSaleDto) {}

// query dto para filtros y paginación
export class SaleQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  salesperson_id?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
```

---

## Entidades TypeORM — Reglas

```typescript
@Entity('sale_items')
export class SaleItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('sale_id')
  sale_id: string;

  @ManyToOne(() => SaleEntity, (sale) => sale.items)
  @JoinColumn({ name: 'sale_id' })
  sale: SaleEntity;

  @Column('product_id')
  product_id: string;

  @ManyToOne(() => ProductEntity)
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unit_price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @CreateDateColumn({ name: 'created_at' })
  created_at: Date;
}
```

**Reglas:**
- Nunca `synchronize: true` en producción — solo migrations
- Soft delete con `@DeleteDateColumn()` donde aplique (productos, usuarios)
- Decimales monetarios: `precision: 10, scale: 2` siempre
- Enums: definir en el mismo archivo de la entidad que los usa primero

---

## CORS

Configurado explícitamente en `main.ts` para aceptar solo los dominios registrados:

```typescript
// main.ts
app.enableCors({
  origin: [
    configService.get('CORS_ORIGIN_CAJA'),    // pos-caja URL
    configService.get('CORS_ORIGIN_ADMIN'),   // pos-admin URL
  ],
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
```

---

## Swagger / OpenAPI

Toda la API está documentada con Swagger. Configurar en `main.ts`:

```typescript
const config = new DocumentBuilder()
  .setTitle('POS Mueblería El Castor — API')
  .setDescription('API compartida para pos-caja y pos-admin')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

Acceso en desarrollo: `http://localhost:3001/api/docs`

---

## Auditoría — AuditLogInterceptor

Toda operación de escritura (`POST`, `PATCH`, `DELETE`) se registra automáticamente en `audit_log`:

```typescript
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req    = ctx.switchToHttp().getRequest<Request>();
    const method = req.method;

    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = req['user'] as UserPayload;

    return next.handle().pipe(
      tap((responseData) => {
        this.auditService.log({
          userId:    user?.sub,
          action:    method,
          entity:    req.path,
          entityId:  responseData?.data?.id,
          ipAddress: req.ip,
        }).catch(() => {});   // auditoría nunca bloquea el flujo principal
      }),
    );
  }
}
```

---

## Reglas Generales

| Regla | Descripción |
|-------|-------------|
| **No `any`** | TypeScript estricto. Crear la interface si no existe el tipo |
| **No lógica en controllers** | Solo recibe, delega, retorna |
| **No TypeORM directo en services** | Siempre vía el repository del módulo |
| **No entidades crudas en HTTP** | Mapear siempre a una interface de respuesta |
| **No `console.log`** | `new Logger(ClassName.name)` de NestJS |
| **No `process.env` directo** | Siempre `ConfigService` |
| **No instanciar con `new`** | Todo se inyecta vía DI de NestJS |
| **Transacciones para multi-tabla** | Nunca saves separados sin `QueryRunner` |
| **Mensajes de error en español** | El negocio opera en Guatemala |
| **Migrations siempre** | Nunca `synchronize: true` en producción |
| **Auditoría en toda escritura** | `AuditLogInterceptor` en todas las rutas write |
| **Swagger en todo endpoint** | `@ApiProperty`, `@ApiOperation`, `@ApiBearerAuth` |
| **ValidationPipe global** | `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))` |

---

## Inicialización del Proyecto

### Prerequisitos
- Node 20 LTS (`node -v` → `v20.x.x`)
- NestJS CLI 10: `npm install -g @nestjs/cli@10`
- Docker Desktop corriendo

### Crear el proyecto (solo primera vez)
```bash
# Desde la raíz del workspace
nest new pos-api --package-manager npm --strict --skip-git
cd pos-api
```

### Dependencias de producción
```bash
npm install \
  @nestjs/config \
  @nestjs/jwt \
  @nestjs/passport \
  @nestjs/swagger \
  @nestjs/typeorm \
  bcrypt \
  class-transformer \
  class-validator \
  passport \
  passport-jwt \
  pg \
  typeorm \
  uuid
```

### Dependencias de desarrollo
```bash
npm install -D \
  @types/bcrypt \
  @types/passport-jwt \
  @types/uuid
```

### Scripts de migración — agregar a `package.json`
```json
{
  "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/config/database.config.ts",
  "migration:run":      "typeorm-ts-node-commonjs migration:run -d src/config/database.config.ts",
  "migration:revert":   "typeorm-ts-node-commonjs migration:revert -d src/config/database.config.ts"
}
```

### Variables de entorno — copiar y rellenar
```bash
cp .env.example .env
```
Contenido mínimo de `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USER=pos_user
DB_PASSWORD=pos_password_segura
DB_NAME=pos_castor
JWT_SECRET=cambia_esto_min_32_chars_secreto
JWT_EXPIRES_IN=8h
API_PORT=3001
NODE_ENV=development
CORS_ORIGIN_CAJA=http://localhost:4200
CORS_ORIGIN_ADMIN=http://localhost:4201
```

### `docker-compose.yml`
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: pos_castor_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER:-pos_user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-pos_password_segura}
      POSTGRES_DB: ${DB_NAME:-pos_castor}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  pos-api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: pos_api
    restart: unless-stopped
    env_file: .env
    ports:
      - "${API_PORT:-3001}:3000"
    depends_on:
      - postgres

volumes:
  postgres_data:
```

### `docker-compose.dev.yml` (override desarrollo)
```yaml
services:
  postgres:
    ports:
      - "5433:5432"   # 5433 en host, 5432 dentro del contenedor (evita conflicto con kama-platform-backend)
  pos-api:
    build:
      target: development
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run start:dev
```

### `src/config/database.config.ts`
```typescript
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

export default new DataSource({
  type:        'postgres',
  host:        process.env.DB_HOST     ?? 'localhost',
  port:        parseInt(process.env.DB_PORT ?? '5432'),
  username:    process.env.DB_USER     ?? 'pos_user',
  password:    process.env.DB_PASSWORD ?? 'pos_password_segura',
  database:    process.env.DB_NAME     ?? 'pos_castor',
  entities:    ['src/**/*.entity.ts'],
  migrations:  ['src/database/migrations/*.ts'],
  synchronize: false,
});
```

### `src/main.ts` (completo)
```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: [
      config.get<string>('CORS_ORIGIN_CAJA')!,
      config.get<string>('CORS_ORIGIN_ADMIN')!,
    ],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('POS Mueblería El Castor — API')
    .setDescription('API compartida para pos-caja y pos-admin')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(config.get<number>('API_PORT') ?? 3000);
}

bootstrap();
```

### Levantar en desarrollo
```bash
# Solo PostgreSQL (preferido mientras desarrollas la API fuera de Docker)
docker compose up postgres -d

# API fuera de Docker con hot-reload
npm run start:dev

# Stack completo dentro de Docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

### Verificar que funciona
```bash
curl http://localhost:3001/api/docs
# Debe retornar HTML del Swagger UI
```

### Git (repositorio propio de pos-api)
```bash
git init
git add .
git commit -m "chore: initial NestJS scaffold"
```