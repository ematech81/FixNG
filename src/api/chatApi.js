import api from './index';

// All job threads the user has chatted in (with last-message preview)
export const getConversations = () => api.get('/chat/conversations');

// Load chat history for a job
export const getChatHistory = (jobId, params) =>
  api.get(`/chat/${jobId}`, { params });

// Send text message
export const sendMessage = (jobId, text) =>
  api.post(`/chat/${jobId}`, { text });

// Send image message
export const sendImageMessage = (jobId, formData) =>
  api.post(`/chat/${jobId}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

// Send voice note message
export const sendVoiceMessage = (jobId, formData) =>
  api.post(`/chat/${jobId}/audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
