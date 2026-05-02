import api from './index';

export const getOnboardingStatus = () => api.get('/artisan/onboarding/status');

// Upgrade a customer account to artisan (creates ArtisanProfile, sets role)
export const becomeArtisan = () => api.post('/auth/become-artisan');

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
    timeout: 300000, // 5 min — matches the backend's per-route timeout for large videos on slow connections
  });
};

export const updateBio = (bio) => api.post('/artisan/bio', { bio });

export const getSkillsList = () => api.get('/artisan/skills-list');

// Skip optional onboarding steps
export const skipVerificationId = () => api.post('/artisan/onboarding/skip-verification-id');
export const skipSkillVideo = () => api.post('/artisan/onboarding/skip-skill-video');

// Called after the frontend uploads directly to Cloudinary — just saves the URL
export const saveProfilePhotoUrl = ({ url, publicId }) =>
  api.post('/artisan/onboarding/profile-photo-url', { url, publicId });

export const saveSkillVideoUrl = ({ url, publicId }) =>
  api.post('/artisan/onboarding/skill-video-url', { url, publicId });
