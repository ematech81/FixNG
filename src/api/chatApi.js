import api from './index';

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
