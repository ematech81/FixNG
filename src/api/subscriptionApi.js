import api from './index';

export const getPlans           = ()           => api.get('/subscriptions/plans');
export const getMySubscription  = ()           => api.get('/subscriptions/me');
export const initiateSubscription = (planId)   => api.post('/subscriptions/initiate', { planId });
export const verifySubscription   = (reference)=> api.post('/subscriptions/verify', { reference });
export const cancelSubscription   = ()         => api.post('/subscriptions/cancel');
