import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuItem } from '@common/entities/menu-item.entity';
import { Category } from '@common/entities/category.entity';
import { MenuItemController } from './menu-item.controller';
import { MenuItemService } from './menu-item.service';
import { MenuItemRepository } from './menu-item.repository';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem, Category])],
  controllers: [MenuItemController],
  providers: [MenuItemService, MenuItemRepository],
  exports: [MenuItemService],
})
export class MenuItemModule {}
