import api from './index';

export const getMySubscription      = ()                       => api.get('/subscriptions/me');
export const initializeSubscription = (cycle)                  => api.post('/subscriptions/initialize', { cycle });
export const verifySubscription     = (reference)              => api.get(`/subscriptions/verify/${encodeURIComponent(reference)}`);
export const cancelSubscription     = ()                       => api.post('/subscriptions/cancel');
export const requestRefund          = (transactionId, reason)  => api.post('/subscriptions/refund', { transactionId, reason });
