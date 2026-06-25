import api from './index';

// ── Email / password ───────────────────────────────────────────────────────────
export const registerUser = (data) => api.post('/auth/register', data);
export const loginUser = (data) => api.post('/auth/login', data);

// ── Phone OTP ─────────────────────────────────────────────────────────────────
// Step 0: check if device is trusted (skips OTP for known devices)
export const checkDevice = (phone, deviceId) =>
  api.post('/auth/check-device', { phone, deviceId });

// Step 1: request OTP (works for both register and login)
// email: optional fallback delivery address
// forceEmail: true → skip SMS, deliver straight to email
export const sendOTP = (phone, email, forceEmail) =>
  api.post('/auth/otp/send', {
    phone,
    email:      email      || undefined,
    forceEmail: forceEmail || undefined,
  });

// Step 2a: submit OTP + create new account
export const verifyRegister = (data) => api.post('/auth/otp/verify-register', data);
// { name, phone, role, otp }

// Step 2b: submit OTP + log in existing account
export const verifyLoginOTP = (data) => api.post('/auth/otp/verify-login', data);
// { phone, otp }

// ── Shared ─────────────────────────────────────────────────────────────────────
export const getMe = () => api.get('/auth/me');

// ── Account changes ────────────────────────────────────────────────────────────
// Abort artisan onboarding — deletes profile, reverts role to customer
export const cancelArtisanRegistration = () => api.post('/auth/cancel-artisan-registration');
 