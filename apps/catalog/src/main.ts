/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: AppModule.CONFIGURATION.TCP_SERV.TCP_CATALOG_SERVICE.options.host,
      port: AppModule.CONFIGURATION.TCP_SERV.TCP_CATALOG_SERVICE.options.port,
    },
  });

  const globalPrefix = AppModule.CONFIGURATION.GLOBAL_PREFIX || 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.CATALOG_PORT || 3005;

  await app.startAllMicroservices();
  await app.listen(port);
  Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
