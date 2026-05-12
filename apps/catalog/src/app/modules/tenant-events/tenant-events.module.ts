import { Module } from '@nestjs/common';
import { AreaModule } from '../area/area.module';
import { TenantCreatedConsumer } from './tenant-created.consumer';

@Module({
  imports: [AreaModule],
  providers: [TenantCreatedConsumer],
})
export class TenantEventsModule {}
