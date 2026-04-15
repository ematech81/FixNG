import api from './index';

export const getDashboardStats  = ()                        => api.get('/admin/stats');
export const getVerificationQueue = ()                      => api.get('/admin/artisans?status=pending');
export const getArtisanDetail   = (userId)                  => api.get(`/admin/artisans/${userId}`);
export const verifyArtisan      = (userId)                  => api.post(`/admin/artisans/${userId}/verify`);
export const rejectArtisan      = (userId, reason)          => api.post(`/admin/artisans/${userId}/reject`, { reason });
export const warnArtisan        = (userId, reason)          => api.post(`/admin/artisans/${userId}/warn`, { reason });
export const suspendArtisan     = (userId, reason)          => api.post(`/admin/artisans/${userId}/suspend`, { reason });
export const getComplaints      = (params)                  => api.get('/admin/complaints', { params });
export const resolveComplaint   = (complaintId, body)       => api.post(`/admin/complaints/${complaintId}/resolve`, body);
