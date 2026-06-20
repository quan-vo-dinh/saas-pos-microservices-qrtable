import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuItem } from '@common/entities/menu-item.entity';
import { Category } from '@common/entities/category.entity';
import { StockReservation } from '@common/entities/stock-reservation.entity';
import { MenuItemController } from './controllers/menu-item.controller';
import { MenuItemService } from './services/menu-item.service';
import { MenuItemRepository } from './repositories/menu-item.repository';
import { StockReservationRepository } from './repositories/stock-reservation.repository';
import { StockReservationService } from './services/stock-reservation.service';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem, Category, StockReservation])],
  controllers: [MenuItemController],
  providers: [MenuItemService, MenuItemRepository, StockReservationRepository, StockReservationService],
  exports: [MenuItemService, MenuItemRepository],
})
export class MenuItemModule {}
