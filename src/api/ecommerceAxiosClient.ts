import axios from 'axios';

const ECOMMERCE_API_BASE_URL = import.meta.env.VITE_ECOMMERCE_API_BASE_URL || 'http://localhost:9091/api';

// Helper function to clear all stored authentication tokens
const clearAuthSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('tokenExpiry');
  sessionStorage.clear();
  localStorage.clear();
};

export const ecommerceAxiosClient = axios.create({
  baseURL: ECOMMERCE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Token & Expiry Checking
ecommerceAxiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const expiry = localStorage.getItem('tokenExpiry');

    if (token && expiry) {
      if (Date.now() >= Number(expiry)) {
        console.warn('⚠️ [Ecommerce Axios Interceptor]: Client token expired. Clearing session.');
        clearAuthSession();
        window.location.href = '/login?expired=true';
        return Promise.reject(new Error('Session expired'));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('🚨 [Ecommerce Axios Request Error]:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Global Exception & Error Interception
ecommerceAxiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url;
    const requestMethod = error.config?.method?.toUpperCase();

    console.error(`🚨 [Ecommerce Axios Response Exception] ${requestMethod} ${requestUrl}:`, {
      status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      message: error.message,
    });

    // 1. Network / Server Unreachable Error (e.g., CORS, offline, backend down)
    if (!error.response || error.code === 'ERR_NETWORK') {
      clearAuthSession();
      window.location.href = '/error?type=network';
      return Promise.reject(error);
    }

    // 2. Authentication / Authorization Failure (401 / 403)
    if (status === 401 || status === 403) {
      clearAuthSession();
      window.location.href = '/login?expired=true';
      return Promise.reject(error);
    }

    // 3. Server-side Exceptions (500, 502, 503, 504)
    if (status && status >= 500) {
      clearAuthSession();
      window.location.href = '/error?type=server_error';
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);