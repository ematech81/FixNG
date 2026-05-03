import axios from 'axios';
import { getToken } from '../utils/storage';

const BASE_URL = 'https://fixngbackend-production.up.railway.app/api';
const APP_KEY = '6b1fd0eb36ca9c691c4329dff758606f1e51ca8d1dcd2f0f1e57c2504beab6f9';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s — Nigerian networks can be slow
  headers: {
    'x-app-key': APP_KEY,
  },
});

// Attach JWT to every request
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      // SecureStore unavailable — proceed without token (user will get 401 if route requires auth)
      console.warn('getToken failed in interceptor:', e?.message);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Normalize error messages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      const isTimeout = error.code === 'ECONNABORTED';
      console.warn('Axios network error:', error.code, error.message);
      return Promise.reject({
        message: isTimeout
          ? 'Request timed out. Please try again on a faster connection or switch to WiFi.'
          : 'No internet connection. Please check your network and try again.',
        isNetworkError: !isTimeout,
        isTimeout,
      });
    }
    return Promise.reject(error.response.data || { message: 'Something went wrong.' });
  }
);

export default api;
