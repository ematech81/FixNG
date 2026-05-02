import axios from 'axios';

// ─── Cloudinary direct-upload config ─────────────────────────────────────────
// CLOUD_NAME: your Cloudinary cloud name (visible in the dashboard top-right)
// UPLOAD_PRESET: create an *unsigned* upload preset in:
//   Cloudinary Dashboard → Settings → Upload → Upload presets → Add preset
//   Name it "fixng_unsigned", set Signing mode = Unsigned
const CLOUD_NAME    = 'dz4hyzn6';   // ← replace with your cloud name
const UPLOAD_PRESET = 'fixng_unsigned';    // ← replace with your preset name

export const uploadImageToCloudinary = async (uri, onProgress) => {
  const filename = uri.split('/').pop();
  const ext      = filename.split('.').pop().toLowerCase();

  const formData = new FormData();
  formData.append('file', { uri, type: `image/${ext === 'jpg' ? 'jpeg' : ext}`, name: filename });
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'fixng/artisans');

  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    }
  );

  return { url: res.data.secure_url, publicId: res.data.public_id };
};

export const uploadVideoToCloudinary = async (uri, onProgress) => {
  const filename = uri.split('/').pop();
  const ext      = filename.split('.').pop().toLowerCase();

  const formData = new FormData();
  formData.append('file', { uri, type: `video/${ext}`, name: filename });
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', 'fixng/skill-videos');

  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 300_000, // 5 min — large videos on mobile data
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      },
    }
  );

  return { url: res.data.secure_url, publicId: res.data.public_id };
};
