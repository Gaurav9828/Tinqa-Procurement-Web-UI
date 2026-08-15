import { axiosClient } from '../../../api/axiosClient';
import type {
  ApiResponse,
  CreateEmployeeRequest,
  EmployeeFilterParams,
  EmployeeResponse,
  PageableResponse,
  UpdateEmployeeRequest,
} from '../types/employee.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

const BASE_URL = '/v1/admin/employees';

export const employeeApi = {
  createEmployee: async (
    payload: CreateEmployeeRequest
  ): Promise<ApiResponse<EmployeeResponse>> => {
    const response = await axiosClient.post<ApiResponse<EmployeeResponse>>(`${API_BASE_URL}${BASE_URL}`, payload);
    return response.data;
  },

  getEmployees: async (
    params: EmployeeFilterParams
  ): Promise<ApiResponse<PageableResponse<EmployeeResponse>>> => {
    const queryParams = new URLSearchParams();
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());
    if (params.sort) queryParams.append('sort', params.sort);

    const response = await axiosClient.get<ApiResponse<PageableResponse<EmployeeResponse>>>(
      `${BASE_URL}?${queryParams.toString()}`
    );
    return response.data;
  },

  getEmployeeById: async (id: number): Promise<ApiResponse<EmployeeResponse>> => {
    const response = await axiosClient.get<ApiResponse<EmployeeResponse>>(`${API_BASE_URL}${BASE_URL}/${id}`);
    return response.data;
  },

  updateEmployee: async (
    id: number,
    payload: UpdateEmployeeRequest
  ): Promise<ApiResponse<EmployeeResponse>> => {
    const response = await axiosClient.put<ApiResponse<EmployeeResponse>>(
      `${API_BASE_URL}${BASE_URL}/${id}`,
      payload
    );
    return response.data;
  },

  requestEmployeeDeletion: async (id: number): Promise<ApiResponse<EmployeeResponse>> => {
    const response = await axiosClient.patch<ApiResponse<EmployeeResponse>>(
      `${API_BASE_URL}${BASE_URL}/${id}/request-deletion`
    );
    return response.data;
  },

  finalizeDeleteEmployee: async (id: number): Promise<ApiResponse<null>> => {
    const response = await axiosClient.delete<ApiResponse<null>>(`${API_BASE_URL}${BASE_URL}/${id}`);
    return response.data;
  },
};