/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { RedisIoAdapter } from './app/modules/realtime/adapters/redis-io.adapter';
import { createCorsOriginValidator } from './configuration/cors-origins';

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule, { rawBody: true });
    const redisHost = AppModule.CONFIGURATION.REDIS_CONFIG.HOST;
    const redisPort = AppModule.CONFIGURATION.REDIS_CONFIG.PORT;
    const corsOrigin = createCorsOriginValidator(AppModule.CONFIGURATION.BFF_CORS_CONFIG.CORS_ORIGINS);
    const redisIoAdapter = new RedisIoAdapter(app, corsOrigin);
    await redisIoAdapter.connectToRedis(`redis://${redisHost}:${redisPort}`);
    app.useWebSocketAdapter(redisIoAdapter);

    const globalPrefix = AppModule.CONFIGURATION.GLOBAL_PREFIX;
    app.setGlobalPrefix(globalPrefix);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    app.enableCors({
      origin: corsOrigin,
    });

    const config = new DocumentBuilder()
      .setTitle('EInvoice-bff API')
      .setDescription('The E-bff API description')
      .setVersion('1.0.0')
      .addBearerAuth({
        description: 'Default JWT Authorization',
        type: 'http',
        in: 'header',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
      })
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${globalPrefix}/docs`, app, documentFactory);

    const port = AppModule.CONFIGURATION.APP_CONFIG.PORT;
    await app.listen(port);
    Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
    Logger.log(`📚 Swagger docs available at: http://localhost:${port}/${globalPrefix}/docs`);
  } catch (error) {
    Logger.error(`❌ Error starting server: ${error.message}`);
  }
}

void bootstrap();
