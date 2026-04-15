import api from './index';

// Customer rates an artisan after job completion
export const rateJob = (jobId, data) => api.post(`/jobs/${jobId}/rate`, data);

// Logged-in user's review history (given as customer, or received as artisan)
export const getMyReviews = (params) => api.get('/reviews/mine', { params });
