import api from './index';

export const updateUserProfile    = (data) => api.put('/auth/profile', data);
export const updateArtisanProfile = (data) => api.put('/artisan/profile', data);
