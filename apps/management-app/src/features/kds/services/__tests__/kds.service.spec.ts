const mockAuthApiClient = jest.fn();

jest.mock('@/lib/api/authenticated-client', () => ({
  authApiClient: (...args: unknown[]) => mockAuthApiClient(...args),
}));

import { API_CONFIG } from '@/constants/api';
import { PreparationStation } from '@einvoice/types';
import {
  fetchKdsQueue,
  markKdsTicketDone,
  recallKdsTicket,
  setKdsTicketPriority,
  startKdsTicket,
} from '../kds.service';

const { KDS_QUEUE, KDS_TICKET_START, KDS_TICKET_DONE, KDS_TICKET_RECALL, KDS_TICKET_PRIORITY } = API_CONFIG.ENDPOINTS;

describe('kds.service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches queue with station query param', async () => {
    mockAuthApiClient.mockResolvedValue({ tickets: [], revision: 0 });

    await fetchKdsQueue(PreparationStation.KITCHEN);

    expect(mockAuthApiClient).toHaveBeenCalledWith(
      `${KDS_QUEUE}?station=${encodeURIComponent(PreparationStation.KITCHEN)}`,
      { method: 'GET' },
    );
  });

  it('starts ticket with encoded path and request body', async () => {
    mockAuthApiClient.mockResolvedValue({ ticket: {}, revision: 1 });

    await startKdsTicket(PreparationStation.BAR, 'tid-a/b', 'req-1');

    expect(mockAuthApiClient).toHaveBeenCalledWith(
      `${KDS_TICKET_START('tid-a/b')}?station=${encodeURIComponent(PreparationStation.BAR)}`,
      {
        method: 'POST',
        body: JSON.stringify({ requestId: 'req-1' }),
      },
    );
  });

  it('marks done with POST body', async () => {
    mockAuthApiClient.mockResolvedValue({ ticket: {}, revision: 2 });

    await markKdsTicketDone(PreparationStation.KITCHEN, 't1', 'req-2');

    expect(mockAuthApiClient).toHaveBeenCalledWith(
      `${KDS_TICKET_DONE('t1')}?station=${encodeURIComponent(PreparationStation.KITCHEN)}`,
      {
        method: 'POST',
        body: JSON.stringify({ requestId: 'req-2' }),
      },
    );
  });

  it('recalls with optional reason', async () => {
    mockAuthApiClient.mockResolvedValue({ ticket: {}, revision: 3 });

    await recallKdsTicket(PreparationStation.KITCHEN, 't1', 'req-3', 'Khách đổi');

    expect(mockAuthApiClient).toHaveBeenCalledWith(
      `${KDS_TICKET_RECALL('t1')}?station=${encodeURIComponent(PreparationStation.KITCHEN)}`,
      {
        method: 'POST',
        body: JSON.stringify({ requestId: 'req-3', reason: 'Khách đổi' }),
      },
    );
  });

  it('sets priority flag', async () => {
    mockAuthApiClient.mockResolvedValue({ ticket: {}, revision: 4 });

    await setKdsTicketPriority(PreparationStation.KITCHEN, 't1', 'req-4', true);

    expect(mockAuthApiClient).toHaveBeenCalledWith(
      `${KDS_TICKET_PRIORITY('t1')}?station=${encodeURIComponent(PreparationStation.KITCHEN)}`,
      {
        method: 'POST',
        body: JSON.stringify({ requestId: 'req-4', priority: true }),
      },
    );
  });
});
