import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse, OrderStatus } from '../../../types/common.types';
import type { ProcessApprovalPayload } from '../../approvals/types/approval.types';
import type {
    CreateOrderRequest,
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
};