import { ecommerceAxiosClient } from '../../../api/ecommerceAxiosClient';
import type { ApiResponse, PageResponse } from '../../../types/common.types';
import type { AdminSettableStatus, TicketDetail, TicketSummary } from '../types/supportTicket.types';

// Relative to VITE_ECOMMERCE_API_BASE_URL (already includes `/api`). The shared client sends
// the admin bearer token; the backend restricts /api/admin/** to ADMIN_L1/ADMIN_L2.
const BASE_URL = '/admin/support/queries';

const ticketPath = (referenceNumber: string) => `${BASE_URL}/${encodeURIComponent(referenceNumber)}`;

export interface TicketListParams {
  /** Optional status filter; omitted when empty. */
  status?: string;
  page: number;
  size: number;
}

export const supportTicketsApi = {
  /** GET /api/admin/support/queries?status=&page=&size= — newest activity first. */
  listTickets: async ({ status, page, size }: TicketListParams): Promise<ApiResponse<PageResponse<TicketSummary>>> => {
    const params: Record<string, string | number> = { page, size };
    if (status) params.status = status;
    const response = await ecommerceAxiosClient.get<ApiResponse<PageResponse<TicketSummary>>>(BASE_URL, { params });
    return response.data;
  },

  /** GET /api/admin/support/queries/{referenceNumber} — detail with the conversation. */
  getTicket: async (referenceNumber: string): Promise<ApiResponse<TicketDetail>> => {
    const response = await ecommerceAxiosClient.get<ApiResponse<TicketDetail>>(ticketPath(referenceNumber));
    return response.data;
  },

  /** POST …/messages { message } — adds a support reply; the ticket becomes AWAITING_CUSTOMER. */
  reply: async (referenceNumber: string, message: string): Promise<ApiResponse<TicketDetail>> => {
    const response = await ecommerceAxiosClient.post<ApiResponse<TicketDetail>>(`${ticketPath(referenceNumber)}/messages`, {
      message,
    });
    return response.data;
  },

  /** PATCH …/status { status } — adds a system note; CLOSED makes the ticket read-only. */
  updateStatus: async (referenceNumber: string, status: AdminSettableStatus): Promise<ApiResponse<TicketDetail>> => {
    const response = await ecommerceAxiosClient.patch<ApiResponse<TicketDetail>>(`${ticketPath(referenceNumber)}/status`, {
      status,
    });
    return response.data;
  },
};
