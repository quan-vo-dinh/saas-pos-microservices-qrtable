import { MenuItem } from '@common/entities/menu-item.entity';
import type { EntityManager, Repository } from 'typeorm';
import { MenuItemRepository } from '../repositories/menu-item.repository';

describe('MenuItemRepository', () => {
  let repository: MenuItemRepository;
  let manager: jest.Mocked<Pick<EntityManager, 'getRepository'>>;
  let queryBuilder: {
    setLock: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(() => {
    repository = new MenuItemRepository({} as Repository<MenuItem>);
    queryBuilder = {
      setLock: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };
    manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
      }),
    };
  });

  it('locks tenant stock rows with a pessimistic write lock and stable id ordering', async () => {
    await repository.findByIdsForUpdate('tenant-1', ['item-b', 'item-a'], manager as unknown as EntityManager);

    expect(manager.getRepository).toHaveBeenCalledWith(MenuItem);
    expect(queryBuilder.setLock).toHaveBeenCalledWith('pessimistic_write');
    expect(queryBuilder.where).toHaveBeenCalledWith('menuItem.tenantId = :tenantId', { tenantId: 'tenant-1' });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('menuItem.id IN (:...ids)', { ids: ['item-b', 'item-a'] });
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('menuItem.deletedAt IS NULL');
    expect(queryBuilder.orderBy).toHaveBeenCalledWith('menuItem.id', 'ASC');
    expect(queryBuilder.getMany).toHaveBeenCalled();
  });

  it('skips query builder setup when no ids are provided', async () => {
    await expect(repository.findByIdsForUpdate('tenant-1', [], manager as unknown as EntityManager)).resolves.toEqual(
      [],
    );

    expect(manager.getRepository).not.toHaveBeenCalled();
  });
});
