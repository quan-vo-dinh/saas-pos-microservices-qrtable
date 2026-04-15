/**
 * Unit tests for tablesService
 *
 * Every method delegates to `authApiClient` with the right
 * endpoint, HTTP method, and JSON body. We mock `authApiClient`
 * once and verify each call individually.
 */

const mockAuthApiClient = jest.fn();

jest.mock('@/lib/api/authenticated-client', () => ({
  authApiClient: (...args: unknown[]) => mockAuthApiClient(...args),
}));

import { tablesService } from '../tables.service';
import { API_CONFIG } from '@/constants/api';

const { AREAS, AREAS_REORDER, TABLES } = API_CONFIG.ENDPOINTS;

describe('tablesService', () => {
  afterEach(() => jest.clearAllMocks());

  // ─── Areas ───────────────────────────────────────────────

  describe('getAreas', () => {
    it('should GET /admin/areas', async () => {
      const mockAreas = [{ id: 'a1', name: 'Main Hall' }];
      mockAuthApiClient.mockResolvedValue(mockAreas);

      const result = await tablesService.getAreas();

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(AREAS);
      expect(result).toEqual(mockAreas);
    });
  });

  describe('getArea', () => {
    it('should GET /admin/areas/:id', async () => {
      const mockArea = { id: 'a1', name: 'Main Hall' };
      mockAuthApiClient.mockResolvedValue(mockArea);

      const result = await tablesService.getArea('a1');

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${AREAS}/a1`);
      expect(result).toEqual(mockArea);
    });

    it('should encode special characters in the id', async () => {
      mockAuthApiClient.mockResolvedValue({});

      await tablesService.getArea('id/with spaces');

      expect(mockAuthApiClient).toHaveBeenCalledWith(`${AREAS}/${encodeURIComponent('id/with spaces')}`);
    });
  });

  describe('createArea', () => {
    it('should POST /admin/areas with body', async () => {
      const payload = { name: 'Patio', sortOrder: 2 };
      const created = { id: 'a2', ...payload };
      mockAuthApiClient.mockResolvedValue(created);

      const result = await tablesService.createArea(payload);

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(AREAS, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(created);
    });
  });

  describe('updateArea', () => {
    it('should PATCH /admin/areas/:id with body', async () => {
      const payload = { name: 'Updated Hall', sortOrder: 1 };
      const updated = { id: 'a1', ...payload };
      mockAuthApiClient.mockResolvedValue(updated);

      const result = await tablesService.updateArea('a1', payload);

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${AREAS}/a1`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteArea', () => {
    it('should DELETE /admin/areas/:id', async () => {
      mockAuthApiClient.mockResolvedValue(undefined);

      await tablesService.deleteArea('a1');

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${AREAS}/a1`, {
        method: 'DELETE',
      });
    });
  });

  describe('reorderAreas', () => {
    it('should PATCH /admin/areas/reorder with orderedIds', async () => {
      const orderedIds = ['a2', 'a1', 'a3'];
      mockAuthApiClient.mockResolvedValue(undefined);

      await tablesService.reorderAreas(orderedIds);

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(AREAS_REORDER, {
        method: 'PATCH',
        body: JSON.stringify({ orderedIds }),
      });
    });
  });

  // ─── Tables ──────────────────────────────────────────────

  describe('getTables', () => {
    it('should GET /admin/tables when no areaId is provided', async () => {
      const mockTables = [{ id: 't1', name: 'Table 1' }];
      mockAuthApiClient.mockResolvedValue(mockTables);

      const result = await tablesService.getTables();

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(TABLES);
      expect(result).toEqual(mockTables);
    });

    it('should GET /admin/tables?areaId=x when areaId is provided', async () => {
      const mockTables = [{ id: 't2', name: 'Table 2' }];
      mockAuthApiClient.mockResolvedValue(mockTables);

      const result = await tablesService.getTables('area-1');

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${TABLES}?areaId=area-1`);
      expect(result).toEqual(mockTables);
    });

    it('should encode special characters in areaId query param', async () => {
      mockAuthApiClient.mockResolvedValue([]);

      await tablesService.getTables('area with spaces');

      expect(mockAuthApiClient).toHaveBeenCalledWith(`${TABLES}?areaId=${encodeURIComponent('area with spaces')}`);
    });
  });

  describe('getTable', () => {
    it('should GET /admin/tables/:id', async () => {
      const mockTable = { id: 't1', name: 'Table 1' };
      mockAuthApiClient.mockResolvedValue(mockTable);

      const result = await tablesService.getTable('t1');

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${TABLES}/t1`);
      expect(result).toEqual(mockTable);
    });
  });

  describe('createTable', () => {
    it('should POST /admin/tables with body', async () => {
      const payload = { name: 'Table 5', areaId: 'a1', capacity: 4 };
      const created = { id: 't5', ...payload };
      mockAuthApiClient.mockResolvedValue(created);

      const result = await tablesService.createTable(payload);

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(TABLES, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(created);
    });
  });

  describe('updateTable', () => {
    it('should PATCH /admin/tables/:id with body', async () => {
      const payload = { name: 'VIP Table', areaId: 'a2', capacity: 6 };
      const updated = { id: 't1', ...payload };
      mockAuthApiClient.mockResolvedValue(updated);

      const result = await tablesService.updateTable('t1', payload);

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${TABLES}/t1`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteTable', () => {
    it('should DELETE /admin/tables/:id', async () => {
      mockAuthApiClient.mockResolvedValue(undefined);

      await tablesService.deleteTable('t1');

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${TABLES}/t1`, {
        method: 'DELETE',
      });
    });
  });

  describe('updateTableStatus', () => {
    it('should PATCH /admin/tables/:id/status with { status }', async () => {
      const updated = { id: 't1', name: 'Table 1', status: 'occupied' };
      mockAuthApiClient.mockResolvedValue(updated);

      const result = await tablesService.updateTableStatus('t1', 'occupied');

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${TABLES}/t1/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'occupied' }),
      });
      expect(result).toEqual(updated);
    });
  });

  describe('regenerateQr', () => {
    it('should POST /admin/tables/:id/regenerate-qr', async () => {
      const updated = { id: 't1', name: 'Table 1', qrCode: 'new-qr' };
      mockAuthApiClient.mockResolvedValue(updated);

      const result = await tablesService.regenerateQr('t1');

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${TABLES}/t1/regenerate-qr`, {
        method: 'POST',
      });
      expect(result).toEqual(updated);
    });
  });
});
