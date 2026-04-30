import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: AppModule.CONFIGURATION.TCP_SERV.TCP_ORDER_SERVICE.options.host,
      port: AppModule.CONFIGURATION.TCP_SERV.TCP_ORDER_SERVICE.options.port,
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const globalPrefix = AppModule.CONFIGURATION.GLOBAL_PREFIX || 'api/v1';
  app.setGlobalPrefix(globalPrefix);

  await app.startAllMicroservices();
  await app.listen(AppModule.CONFIGURATION.APP_CONFIG.PORT);

  Logger.log(`Order HTTP: http://localhost:${AppModule.CONFIGURATION.APP_CONFIG.PORT}/${globalPrefix}`);
  Logger.log(
    `Order TCP: ${AppModule.CONFIGURATION.TCP_SERV.TCP_ORDER_SERVICE.options.host}:${AppModule.CONFIGURATION.TCP_SERV.TCP_ORDER_SERVICE.options.port}`,
  );
}

bootstrap();
