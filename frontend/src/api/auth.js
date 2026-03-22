// MedAxis Africa — Auth API (Real Backend Layer)
// Connects to Express backend on port 3001.
// JWT is stored in memory only — NEVER in localStorage or sessionStorage.

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// ---------------------------------------------------------------------------
// login
// POST /api/auth/login — returns { success, data: { token, role, first_name } }
// ---------------------------------------------------------------------------

export async function login(username, password, role) {
  const response = await axios.post(`${API_URL}/auth/login`, {
    cnie: username,
    password,
    role,
  });
  const result = response.data;

  if (!result.success) {
    throw new Error(result.error || 'Authentication failed');
  }

  // Normalise to the shape that use-auth.jsx expects:
  // { success: true, data: { token, user: { id, name, role, ... } } }
  return {
    success: true,
    data: {
      token: result.data.token,
      user: {
        id: result.data.id || result.data.user?.id,
        name: result.data.first_name || result.data.user?.first_name || username,
        first_name: result.data.first_name || result.data.user?.first_name,
        role: result.data.role || result.data.user?.role,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// getMeAPI
// GET /api/auth/me — fetch current user profile using a stored token
// ---------------------------------------------------------------------------

export async function getMeAPI(token) {
  const response = await axios.get(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

// ---------------------------------------------------------------------------
// sendOtp / sendOTPAPI
// POST /api/auth/send-otp
// ---------------------------------------------------------------------------

export async function sendOtp(patientId, token) {
  const response = await axios.post(
    `${API_URL}/auth/send-otp`,
    { phone: patientId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

export const sendOTPAPI = sendOtp;

// ---------------------------------------------------------------------------
// verifyOtp / verifyOTPAPI
// POST /api/auth/verify-otp
// ---------------------------------------------------------------------------

export async function verifyOtp(patientId, otp, token) {
  const response = await axios.post(
    `${API_URL}/auth/verify-otp`,
    { phone: patientId, otp },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return response.data;
}

export const verifyOTPAPI = verifyOtp;

// ---------------------------------------------------------------------------
// logout — no backend call needed for stateless JWT; kept for API compat
// ---------------------------------------------------------------------------

export function logout() {
  // Token is held in React state; the AuthProvider wipes it on logout().
  // This export exists so existing imports from this module don't break.
}

// ---------------------------------------------------------------------------
// getCurrentUser — not needed with real backend; kept for API compat
// ---------------------------------------------------------------------------

export function getCurrentUser() {
  return { success: false, error: 'Use AuthContext token.' };
}

// ---------------------------------------------------------------------------
// getSessionToken — not needed with real backend; kept for API compat
// ---------------------------------------------------------------------------

export function getSessionToken() {
  return null;
}
