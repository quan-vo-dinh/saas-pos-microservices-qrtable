import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule } from '@nestjs/microservices';
import { UserDestination } from '@common/schemas/user.schema';
import { RoleDestination } from '@common/schemas/role.schema';
import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { UserRepository } from './repositories/user.repository';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { UserGrpcController } from './controllers/user-grpc.controller';
import { TenantUserService } from './services/tenant-user.service';
import { StaffManagementService } from './services/staff-management.service';

@Module({
  imports: [
    MongooseModule.forFeature([UserDestination, RoleDestination]),
    ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.AUTHORIZER_SERVICE), TcpProvider(TCP_SERVICES.SAAS_SERVICE)]),
  ],
  controllers: [UserController, UserGrpcController],
  providers: [UserRepository, UserService, TenantUserService, StaffManagementService],
})
export class UserModule {}
