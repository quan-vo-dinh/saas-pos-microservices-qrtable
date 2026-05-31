import { TCP_SERVICES, TcpProvider } from '@common/configuration/tcp.config';
import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { DashboardStaffController } from './controllers/dashboard-staff.controller';
import { UserController } from './controllers/user.controller';

@Module({
  imports: [ClientsModule.registerAsync([TcpProvider(TCP_SERVICES.USER_ACCESS_SERVICE)])],
  controllers: [UserController, DashboardStaffController],
  providers: [],
  exports: [],
})
export class UserModule {}
