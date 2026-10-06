import { createApiClient } from './createApiClient';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9090/api';

export const axiosClient = createApiClient(API_BASE_URL, 'Procurement API');
