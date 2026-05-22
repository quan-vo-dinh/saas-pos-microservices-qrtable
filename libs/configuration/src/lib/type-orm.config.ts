import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { DatabaseType } from 'typeorm';
import { DynamicModule } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';

type PgTypes = {
  setTypeParser: (oid: number, parser: (value: string) => Date) => void;
};

export type TypeOrmEntityTarget = Extract<NonNullable<TypeOrmModuleOptions['entities']>, readonly unknown[]>[number];

const POSTGRES_TIMESTAMP_OID = 1114;
let pgTimestampParserConfigured = false;

export function configurePostgresTimestampParser(): void {
  if (pgTimestampParserConfigured) {
    return;
  }

  const pg = require('pg') as { types: PgTypes };
  pg.types.setTypeParser(POSTGRES_TIMESTAMP_OID, (value: string) => new Date(`${value}Z`));
  pgTimestampParserConfigured = true;
}

configurePostgresTimestampParser();

export class TypeOrmConfiguration {
  @IsString()
  @IsNotEmpty()
  HOST: string;

  @IsNumber()
  PORT: number;

  @IsString()
  @IsNotEmpty()
  USERNAME: string;

  @IsString()
  @IsNotEmpty()
  PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DATABASE: string;

  @IsNotEmpty()
  TYPE: DatabaseType;

  constructor(data?: Partial<TypeOrmConfiguration>) {
    this.HOST = data?.HOST || process.env['TYPEORM_HOST'] || 'localhost';
    this.PORT = data?.PORT || Number(process.env['TYPEORM_PORT']) || 5432;
    this.USERNAME = data?.USERNAME || process.env['TYPEORM_USERNAME'] || 'postgres';
    this.PASSWORD = data?.PASSWORD || process.env['TYPEORM_PASSWORD'] || 'postgres';
    this.DATABASE = data?.DATABASE || process.env['TYPEORM_DATABASE'] || 'qrtable';
    this.TYPE = (data?.TYPE as DatabaseType) || (process.env['TYPEORM_TYPE'] as DatabaseType) || 'postgres';
  }
}

function shouldSynchronizeSchema(configService: ConfigService): boolean {
  const nodeEnv = configService.get<string>('NODE_ENV') ?? '';
  const configured = configService.get<boolean | string>('TYPEORM_SYNCHRONIZE');
  const isSynchronizationEnabled = configured === true || configured === 'true';

  return isSynchronizationEnabled && ['development', 'test'].includes(nodeEnv);
}

function getPostgresDatabaseType(configService: ConfigService): 'postgres' {
  const databaseType = configService.get<DatabaseType>('TYPEORM_CONFIG.TYPE');
  if (databaseType !== 'postgres') {
    throw new Error(`Unsupported TypeORM database type: ${databaseType}`);
  }

  return databaseType;
}

export function createTypeOrmProvider(entities: TypeOrmEntityTarget[]): DynamicModule {
  return TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (configService: ConfigService): Promise<TypeOrmModuleOptions> => {
      return {
        type: getPostgresDatabaseType(configService),
        host: configService.get<string>('TYPEORM_CONFIG.HOST'),
        port: configService.get<number>('TYPEORM_CONFIG.PORT'),
        username: configService.get<string>('TYPEORM_CONFIG.USERNAME'),
        password: configService.get<string>('TYPEORM_CONFIG.PASSWORD'),
        database: configService.get<string>('TYPEORM_CONFIG.DATABASE'),
        entities,
        synchronize: shouldSynchronizeSchema(configService),
        autoLoadEntities: false,
      };
    },
  });
}
