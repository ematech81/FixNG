import api from './index';

export const createJob = (jobData, imageUris = []) => {
  const formData = new FormData();

  formData.append('category', jobData.category);
  formData.append('description', jobData.description);
  formData.append('urgency', jobData.urgency);
  formData.append('latitude', String(jobData.latitude));
  formData.append('longitude', String(jobData.longitude));
  if (jobData.address) formData.append('address', jobData.address);
  if (jobData.state) formData.append('state', jobData.state);
  if (jobData.lga) formData.append('lga', jobData.lga);
  if (jobData.artisanId) formData.append('artisanId', jobData.artisanId);

  imageUris.forEach((uri) => {
    const filename = uri.split('/').pop();
    const ext = filename.split('.').pop().toLowerCase();
    formData.append('images', {
      uri,
      name: filename,
      type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
    });
  });

  return api.post('/jobs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
};

export const getAvailableJobs = () => api.get('/jobs/artisan/available');
export const getMyJobs = (params) => api.get('/jobs/my', { params });
export const getJob = (jobId) => api.get(`/jobs/${jobId}`);

export const acceptJob = (jobId, data) => api.post(`/jobs/${jobId}/accept`, data);
export const declineJob = (jobId) => api.post(`/jobs/${jobId}/decline`);
export const markArrived = (jobId) => api.post(`/jobs/${jobId}/arrived`);
export const markCompleted = (jobId) => api.post(`/jobs/${jobId}/complete`);
export const raiseDispute = (jobId, reason) => api.post(`/jobs/${jobId}/dispute`, { reason });
export const cancelJob = (jobId, reason) => api.post(`/jobs/${jobId}/cancel`, { reason });
