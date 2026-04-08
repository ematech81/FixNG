import api from './index';

export const getOnboardingStatus = () => api.get('/artisan/onboarding/status');

export const uploadProfilePhoto = (imageUri) => {
  const formData = new FormData();
  const filename = imageUri.split('/').pop();
  const ext = filename.split('.').pop();
  const mimeType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  formData.append('profilePhoto', {
    uri: imageUri,
    name: filename,
    type: mimeType,
  });

  return api.post('/artisan/onboarding/profile-photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // 60s for uploads on slow networks
  });
};

export const updateSkills = (skills) => api.post('/artisan/onboarding/skills', { skills });

export const updateLocation = (locationData) =>
  api.post('/artisan/onboarding/location', locationData);

export const uploadVerificationId = (imageUri, idType) => {
  const formData = new FormData();
  const filename = imageUri.split('/').pop();
  const ext = filename.split('.').pop().toLowerCase();
  const mimeType = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  formData.append('verificationId', {
    uri: imageUri,
    name: filename,
    type: mimeType,
  });
  formData.append('idType', idType);

  return api.post('/artisan/onboarding/verification-id', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });
};

export const uploadSkillVideo = (videoUri) => {
  const formData = new FormData();
  const filename = videoUri.split('/').pop();
  const ext = filename.split('.').pop().toLowerCase();

  formData.append('skillVideo', {
    uri: videoUri,
    name: filename,
    type: `video/${ext}`,
  });

  return api.post('/artisan/onboarding/skill-video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000, // 2 min — videos can be large on slow connections
  });
};

export const getSkillsList = () => api.get('/artisan/skills-list');
