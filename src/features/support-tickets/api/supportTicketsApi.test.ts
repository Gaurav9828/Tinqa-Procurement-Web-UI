import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import { supportTicketsApi } from './supportTicketsApi';

// Mock only the HTTP client so the exact request shapes are asserted.
vi.mock('../../../api/ecommerceAxiosClient', () => ({
  ecommerceAxiosClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

const client = vi.mocked(ecommerceAxiosClient);
const ok = { data: { success: true, message: 'ok', data: null } };

beforeEach(() => {
  client.get.mockResolvedValue(ok);
  client.post.mockResolvedValue(ok);
  client.patch.mockResolvedValue(ok);
});

describe('supportTicketsApi request shapes', () => {
  it('lists tickets with page/size and omits an empty status filter', async () => {
    await supportTicketsApi.listTickets({ status: '', page: 0, size: 20 });
    expect(client.get).toHaveBeenCalledWith('/admin/support/queries', { params: { page: 0, size: 20 } });
  });

  it('lists tickets filtered by status', async () => {
    await supportTicketsApi.listTickets({ status: 'OPEN', page: 2, size: 20 });
    expect(client.get).toHaveBeenCalledWith('/admin/support/queries', { params: { page: 2, size: 20, status: 'OPEN' } });
  });

  it('URL-encodes the reference number', async () => {
    await supportTicketsApi.getTicket('TQ-Q/7 #1');
    expect(client.get).toHaveBeenCalledWith('/admin/support/queries/TQ-Q%2F7%20%231');
  });

  it('posts a reply as { message }', async () => {
    await supportTicketsApi.reply('TQ-Q-000007', 'Please share a video.');
    expect(client.post).toHaveBeenCalledWith('/admin/support/queries/TQ-Q-000007/messages', { message: 'Please share a video.' });
  });

  it('patches status as { status }', async () => {
    await supportTicketsApi.updateStatus('TQ-Q-000007', 'RESOLVED');
    expect(client.patch).toHaveBeenCalledWith('/admin/support/queries/TQ-Q-000007/status', { status: 'RESOLVED' });
  });
});
