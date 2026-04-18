import api from './index';

export const getDashboardStats    = ()                       => api.get('/admin/stats');
export const getVerificationQueue = ()                       => api.get('/admin/artisans?status=pending');
export const getArtisanDetail     = (userId)                 => api.get(`/admin/artisans/${userId}`);
export const verifyArtisan        = (userId)                 => api.post(`/admin/artisans/${userId}/verify`);
export const rejectArtisan        = (userId, reason)         => api.post(`/admin/artisans/${userId}/reject`, { reason });
export const warnArtisan          = (userId, reason)         => api.post(`/admin/artisans/${userId}/warn`, { reason });
export const suspendArtisan       = (userId, reason)         => api.post(`/admin/artisans/${userId}/suspend`, { reason });
export const getComplaints        = (params)                 => api.get('/admin/complaints', { params });
export const resolveComplaint     = (complaintId, body)      => api.post(`/admin/complaints/${complaintId}/resolve`, body);

// User management
export const listUsers            = (params)                 => api.get('/admin/users/list', { params });
export const toggleUserActive     = (userId)                 => api.post(`/admin/users/${userId}/toggle-active`);
export const grantPro             = (userId)                 => api.post(`/admin/artisans/${userId}/grant-pro`);
export const revokePro            = (userId)                 => api.post(`/admin/artisans/${userId}/revoke-pro`);

// Customer moderation
export const warnCustomer         = (userId, reason)         => api.post(`/admin/customers/${userId}/warn`, { reason });
export const suspendCustomer      = (userId, reason)         => api.post(`/admin/customers/${userId}/suspend`, { reason });
export const unsuspendCustomer    = (userId)                 => api.post(`/admin/customers/${userId}/unsuspend`);
