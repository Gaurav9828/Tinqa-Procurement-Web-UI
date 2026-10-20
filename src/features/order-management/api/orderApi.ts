import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse, OrderStatus } from '../../../types/common.types';
import type { ProcessApprovalPayload } from '../../approvals/types/approval.types';
import type {
    CreateOrderRequest,
    OrderChangeRequest,
    OrderInvoice,
    OrderResponse,
    UpdateOrderRequest,
    UpdateOrderStatusRequest,
} from '../types/order.types';

const BASE_URL = '/v1/orders';

export const orderApi = {
    createOrder: async (payload: CreateOrderRequest): Promise<ApiResponse<OrderResponse>> => {
        const response = await axiosClient.post<ApiResponse<OrderResponse>>(BASE_URL, payload);
        return response.data;
    },

    updateOrderStatus: async (
        id: number,
        payload: UpdateOrderStatusRequest
    ): Promise<ApiResponse<OrderResponse>> => {
        const response = await axiosClient.patch<ApiResponse<OrderResponse>>(
            `${BASE_URL}/${id}/status`,
            payload
        );
        return response.data;
    },

    getOrderById: async (id: number): Promise<ApiResponse<OrderResponse>> => {
        const response = await axiosClient.get<ApiResponse<OrderResponse>>(`${BASE_URL}/${id}`);
        return response.data;
    },

    getAllOrders: async (): Promise<ApiResponse<OrderResponse[]>> => {
        const response = await axiosClient.get<ApiResponse<OrderResponse[]>>(BASE_URL);
        return response.data;
    },

    getOrdersByDealerId: async (dealerId: number): Promise<ApiResponse<OrderResponse[]>> => {
        const response = await axiosClient.get<ApiResponse<OrderResponse[]>>(
            `${BASE_URL}/dealer/${dealerId}`
        );
        return response.data;
    },

    getOrdersByStatus: async (status: OrderStatus): Promise<ApiResponse<OrderResponse[]>> => {
        const response = await axiosClient.get<ApiResponse<OrderResponse[]>>(
            `${BASE_URL}/status/${status}`
        );
        return response.data;
    },

    updateOrder: async (id: number, payload: UpdateOrderRequest): Promise<ApiResponse<OrderResponse>> => {
        const response = await axiosClient.put(`/v1/orders/${id}`, payload);
        return response.data;
    },

    processAdminL2Approval: async (id: number, payload: ProcessApprovalPayload): Promise<ApiResponse<OrderResponse>> => {
        const response = await axiosClient.patch(`/v1/orders/${id}/approval`, payload);
        return response.data;
    },

    /** The dealer's invoice that counts for the order, or null before one is uploaded. */
    getInvoice: async (orderId: number): Promise<ApiResponse<OrderInvoice | null>> => {
        const response = await axiosClient.get<ApiResponse<OrderInvoice | null>>(`${BASE_URL}/${orderId}/invoice`);
        return response.data;
    },

    /** Uploads the dealer's invoice PDF; the server reads it and checks it against the quotation. */
    uploadInvoice: async (orderId: number, file: File): Promise<ApiResponse<OrderInvoice>> => {
        const formData = new FormData();
        formData.append('file', file);
        // Content-Type (with boundary) is set by the browser for FormData.
        const response = await axiosClient.post<ApiResponse<OrderInvoice>>(`${BASE_URL}/${orderId}/invoice`, formData);
        return response.data;
    },

    downloadInvoice: async (orderId: number): Promise<Blob> => {
        const response = await axiosClient.get<Blob>(`${BASE_URL}/${orderId}/invoice/file`, { responseType: 'blob' });
        return new Blob([response.data], { type: (response.headers['content-type'] as string) || 'application/pdf' });
    },

    /** Dealers' quotation changes waiting for a decision (DEALER_QUOTATION_CHANGE_APPROVE). */
    listChangeRequests: async (status: OrderChangeRequest['status'] = 'PENDING'): Promise<ApiResponse<OrderChangeRequest[]>> => {
        const response = await axiosClient.get<ApiResponse<OrderChangeRequest[]>>(`${BASE_URL}/change-requests`, { params: { status } });
        return response.data;
    },

    getOrderChangeRequests: async (orderId: number): Promise<ApiResponse<OrderChangeRequest[]>> => {
        const response = await axiosClient.get<ApiResponse<OrderChangeRequest[]>>(`${BASE_URL}/${orderId}/change-requests`);
        return response.data;
    },

    decideChangeRequest: async (
        requestId: number,
        decision: 'APPROVED' | 'REJECTED',
        reason?: string
    ): Promise<ApiResponse<OrderChangeRequest>> => {
        const response = await axiosClient.patch<ApiResponse<OrderChangeRequest>>(
            `${BASE_URL}/change-requests/${requestId}/decision`,
            { decision, reason }
        );
        return response.data;
    },
};