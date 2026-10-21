import { createApiClient } from './createApiClient';
import { ECOMMERCE_ENDPOINTS } from '../config/endpointAccess';

export const ECOMMERCE_API_BASE_URL = import.meta.env.VITE_ECOMMERCE_API_BASE_URL || 'http://localhost:9091/api';

export const ecommerceAxiosClient = createApiClient(ECOMMERCE_API_BASE_URL, 'Ecommerce API', ECOMMERCE_ENDPOINTS);
