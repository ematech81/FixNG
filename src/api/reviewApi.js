import api from './index';

// Customer rates an artisan after job completion
export const rateJob = (jobId, data) => api.post(`/jobs/${jobId}/rate`, data);
