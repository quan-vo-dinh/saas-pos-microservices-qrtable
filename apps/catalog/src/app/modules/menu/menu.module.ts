import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { MenuController } from './controllers/menu.controller';
import { MenuService } from './services/menu.service';
import { MenuRepository } from './repositories/menu.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Category, MenuItem])],
  controllers: [MenuController],
  providers: [MenuService, MenuRepository],
})
export class MenuModule {}
