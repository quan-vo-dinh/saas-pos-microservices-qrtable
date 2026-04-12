import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Table } from '@common/entities/table.entity';
import { Area } from '@common/entities/area.entity';
import { TableController } from './table.controller';
import { TableService } from './table.service';
import { TableRepository } from './table.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Table, Area])],
  controllers: [TableController],
  providers: [TableService, TableRepository],
  exports: [TableService],
})
export class TableModule {}
