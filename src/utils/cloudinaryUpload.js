const CLOUD_NAME    = 'dz4hyzn6l';
const UPLOAD_PRESET = 'fixng_unsigned';

export const uploadImageToCloudinary = async (uri, onProgress) => {
  onProgress?.(5);

  const ext      = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', { uri, name: `upload_${Date.now()}.${ext}`, type: mimeType });
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}

  if (!response.ok) {
    console.log('Cloudinary image error:', response.status, text.slice(0, 300));
    throw new Error(data?.error?.message || `Upload failed (${response.status})`);
  }

  onProgress?.(100);
  return { url: data.secure_url, publicId: data.public_id };
};

export const uploadVideoToCloudinary = async (uri, onProgress) => {
  onProgress?.(5);

  const ext      = uri.split('.').pop()?.toLowerCase() || 'mp4';
  const mimeType = ext === 'mov' ? 'video/quicktime' : 'video/mp4';

  const formData = new FormData();
  formData.append('file', { uri, name: `upload_${Date.now()}.${ext}`, type: mimeType });
  formData.append('upload_preset', UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    { method: 'POST', body: formData }
  );

  // Cloudinary can return HTML error pages (e.g. 413 too large, 504 timeout).
  // Always read as text first to avoid JSON parse crash.
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}

  if (!response.ok) {
    console.log('Cloudinary video error:', response.status, text.slice(0, 300));
    throw new Error(data?.error?.message || `Upload failed (${response.status}). Check your connection and try again.`);
  }

  onProgress?.(100);
  return { url: data.secure_url, publicId: data.public_id };
};
