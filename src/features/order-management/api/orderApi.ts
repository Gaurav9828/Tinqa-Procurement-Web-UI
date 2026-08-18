import { axiosClient } from '../../../api/axiosClient';
import type { ApiResponse } from '../../../types/common.types';
import type {
    CreateOrderRequest,
    OrderResponse,
    OrderStatus,
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
};