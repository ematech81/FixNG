import api from './index';

export const getNotifications  = (params) => api.get('/notifications', { params });
export const getUnreadCount    = ()       => api.get('/notifications/unread-count');
export const getUnreadMsgCount = ()       => api.get('/notifications/unread-count', { params: { type: 'new_message' } });
export const markRead          = (id)     => api.patch(`/notifications/${id}/read`);
export const markAllRead       = ()       => api.patch('/notifications/read-all');
export const deleteNotification = (id)   => api.delete(`/notifications/${id}`);
export const clearAll          = ()       => api.delete('/notifications/clear-all');
