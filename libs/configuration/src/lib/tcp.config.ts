import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsProviderAsyncOptions, TcpClientOptions, Transport } from '@nestjs/microservices';
import { IsNotEmpty, IsObject } from 'class-validator';

export enum TCP_SERVICES {
  PRODUCT_SERVICE = 'TCP_PRODUCT_SERVICE',
  USER_ACCESS_SERVICE = 'TCP_USER_ACCESS_SERVICE',
  AUTHORIZER_SERVICE = 'TCP_AUTHORIZER_SERVICE',
  CATALOG_SERVICE = 'TCP_CATALOG_SERVICE',
  SAAS_SERVICE = 'TCP_SAAS_SERVICE',
}

export class TcpConfiguration {
  @IsNotEmpty()
  @IsObject()
  TCP_PRODUCT_SERVICE: TcpClientOptions;

  @IsNotEmpty()
  @IsObject()
  TCP_USER_ACCESS_SERVICE: TcpClientOptions;

  @IsNotEmpty()
  @IsObject()
  TCP_AUTHORIZER_SERVICE: TcpClientOptions;

  @IsNotEmpty()
  @IsObject()
  TCP_CATALOG_SERVICE: TcpClientOptions;

  @IsNotEmpty()
  @IsObject()
  TCP_SAAS_SERVICE: TcpClientOptions;

  constructor() {
    Object.entries(TCP_SERVICES).forEach(([key, serviceName]) => {
      const host = process.env[`${key}_HOST`] || 'localhost';
      const port = Number(process.env[`${serviceName}_PORT`]) || 3301;

      this[serviceName] = TcpConfiguration.setValue(port, host);
    });
  }

  static setValue(port: number, host: string): TcpClientOptions {
    return {
      transport: Transport.TCP,
      options: {
        host,
        port,
      },
    };
  }
}

// note: khi custom provider thì phải dùng ClientsModule.registerAsync
// để có thể inject ConfigService vào factory function

// Chức năng: Tạo async provider cho ClientsModule (để đăng ký client TCP). Nó trả về object theo interface ClientsProviderAsyncOptions, cho phép config động và inject dependencies.
export function TcpProvider(serviceName: keyof TcpConfiguration): ClientsProviderAsyncOptions {
  return {
    name: serviceName,
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: async (configService: ConfigService): Promise<TcpClientOptions> => {
      const host = configService.get<string>(`${serviceName}_HOST`, 'localhost');
      const port = configService.get<number>(`${serviceName}_PORT`, 3301);

      return {
        transport: Transport.TCP,
        options: {
          host,
          port,
        },
      };
    },
  };
}
