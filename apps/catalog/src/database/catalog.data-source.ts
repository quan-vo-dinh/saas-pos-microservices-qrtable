import { createServicePostgresDataSource } from '@common/configuration/type-orm.config';
import { Area } from '@common/entities/area.entity';
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { StockReservation } from '@common/entities/stock-reservation.entity';
import { Table } from '@common/entities/table.entity';
import { join } from 'node:path';

const catalogDataSource = createServicePostgresDataSource({
  dedicatedEnvName: 'CATALOG_TYPEORM_DATABASE',
  defaultDatabase: 'qrtable_catalog',
  entities: [Area, Category, MenuItem, StockReservation, Table],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
});

export default catalogDataSource;
