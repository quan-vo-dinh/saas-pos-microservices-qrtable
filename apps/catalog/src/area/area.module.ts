import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Area } from '@common/entities/area.entity';
import { Table } from '@common/entities/table.entity';
import { AreaController } from './area.controller';
import { AreaService } from './area.service';
import { AreaRepository } from './area.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Area, Table])],
  controllers: [AreaController],
  providers: [AreaService, AreaRepository],
  exports: [AreaService],
})
export class AreaModule {}
