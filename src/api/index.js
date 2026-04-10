import axios from 'axios';
import { getToken } from '../utils/storage';
import { ApiIPAddress } from '../utils/AppIPAdress';

// Change this to your machine's local IP when testing on a physical device
// e.g. http://192.168.1.100:5000/api
const BASE_URL =ApiIPAddress;
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30s — Nigerian networks can be slow
});

// Attach JWT to every request
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      // ECONNABORTED = Axios request timeout; other codes = genuine connectivity loss
      const isTimeout = error.code === 'ECONNABORTED';
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
