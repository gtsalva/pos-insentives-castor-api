process.env.TZ = 'America/Guatemala';

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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());

  const corsOrigins = [
    ...config.get<string>('CORS_ORIGINS_CAJA', '').split(','),
    ...config.get<string>('CORS_ORIGINS_ADMIN', '').split(','),
  ].map(o => o.trim()).filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
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

  // health check for Railway — bypasses global interceptors
  app.getHttpAdapter().get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  await app.listen(config.get<number>('API_PORT') ?? 3000);
}

bootstrap();
