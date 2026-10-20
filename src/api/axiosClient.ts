import { createApiClient } from './createApiClient';
import { PROCUREMENT_ENDPOINTS } from '../config/endpointAccess';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9090/api';

export const axiosClient = createApiClient(API_BASE_URL, 'Procurement API', PROCUREMENT_ENDPOINTS);
