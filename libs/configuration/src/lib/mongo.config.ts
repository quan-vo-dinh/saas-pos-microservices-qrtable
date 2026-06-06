import { Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Connection } from 'mongoose';

const DEPLOYED_ENVIRONMENTS = new Set(['production', 'staging']);

export function resolveServiceMongoDatabase(dedicatedEnvName: string, defaultDatabase: string): string {
  const dedicatedDatabase = process.env[dedicatedEnvName]?.trim();
  const nodeEnv = process.env['NODE_ENV'] || 'development';

  if (DEPLOYED_ENVIRONMENTS.has(nodeEnv) && !dedicatedDatabase) {
    throw new Error(`${dedicatedEnvName} is required in staging/production`);
  }

  const sharedFallback =
    process.env['DATABASE_SHARED_FALLBACK_ENABLED'] === 'true' ? process.env['MONGO_DB_NAME']?.trim() : undefined;

  return dedicatedDatabase || sharedFallback || defaultDatabase;
}

export class MongoConfiguration {
  @IsString()
  @IsNotEmpty()
  URL: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  @IsNumber()
  @IsNotEmpty()
  POOL_SIZE: number;

  @IsNumber()
  @IsOptional()
  CONNECT_TIMEOUT_MS?: number;

  @IsNumber()
  @IsOptional()
  SOCKET_TIMEOUT_MS?: number;
  constructor(data?: Partial<MongoConfiguration>) {
    this.URL = data?.URL || process.env['MONGODB_URI'] || '';
    this.DB_NAME = data?.DB_NAME || process.env['MONGO_DB_NAME'] || 'test';
    this.POOL_SIZE = data?.POOL_SIZE || Number(process.env['MONGO_POOL_SIZE']) || 10;
    this.CONNECT_TIMEOUT_MS = data?.CONNECT_TIMEOUT_MS || Number(process.env['MONGO_CONNECT_TIMEOUT_MS']) || 15000;
    this.SOCKET_TIMEOUT_MS = data?.SOCKET_TIMEOUT_MS || Number(process.env['MONGO_SOCKET_TIMEOUT_MS']) || 360000;
  }
}

export const MongoProvider = MongooseModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    uri: configService.get<string>('MONGO_CONFIG.URL'),
    dbName: configService.get<string>('MONGO_CONFIG.DB_NAME'),
    maxPoolSize: configService.get<number>('MONGO_CONFIG.POOL_SIZE'),
    connectTimeoutMS: configService.get<number>('MONGO_CONFIG.CONNECT_TIMEOUT_MS'),
    socketTimeoutMS: configService.get<number>('MONGO_CONFIG.SOCKET_TIMEOUT_MS'),

    onConnectionCreate: (connection: Connection) => {
      connection.on('connected', () => {
        Logger.log('🔗 MongoDB connected >>>');
      });
      connection.on('open', () => {
        Logger.log('🚪 MongoDB connection opened >>>');
      });
      connection.on('disconnected', () => {
        Logger.log('❌ MongoDB disconnected >>>');
      });
      connection.on('reconnected', () => {
        Logger.log('🔄 MongoDB reconnected >>>');
      });
      connection.on('error', (error) => {
        Logger.log('⚠️ MongoDB error', error);
      });
    },
  }),
  inject: [ConfigService],
});
