import api from './index';

// Artisan search (with location + filters)
export const searchArtisans = (params) => api.get('/artisans', { params });

// Public artisan profile
export const getArtisanProfile = (artisanId) => api.get(`/artisans/${artisanId}`);

// Reviews for an artisan
export const getArtisanReviews = (artisanId, params) =>
  api.get(`/artisans/${artisanId}/reviews`, { params });

// Submit complaint
export const submitComplaint = (jobId, reason) =>
  api.post('/artisans/complaints', { jobId, reason });

// Update artisan bio
export const updateBio = (bio) => api.post('/artisan/bio', { bio });
