// MedAxis Africa — Auth API (Mock Layer)
// Week 1-2: Returns hardcoded tokens and simulated responses.
// Week 3+:  Replace each function body with real Axios calls to /api/auth/*.
//
// JWT is stored in memory only — NEVER in localStorage or sessionStorage.

import { MOCK_LOGIN_CREDENTIALS } from "../utils/mock-data.js";

// ---------------------------------------------------------------------------
// In-memory session store
// These module-level variables hold the active session for the tab lifetime.
// They are wiped on logout() and are never persisted to any browser storage.
// ---------------------------------------------------------------------------

let _sessionToken = null;
let _sessionUser = null;

// OTP scratch-pad keyed by patientId — overwritten on each sendOtp call.
const _otpStore = {};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function simulateLatency(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateMockJwt(user) {
  // Not a cryptographically valid JWT — prototype identifier only.
  // Replace with a real token from the backend in week 3.
  const payload = btoa(
    JSON.stringify({ sub: user.id, role: user.role, name: user.name })
  );
  return `mock.${payload}.signature`;
}

// ---------------------------------------------------------------------------
// login
// Looks up the username+password pair in the mock credentials table.
// On success stores the token and profile in memory and returns them.
// ---------------------------------------------------------------------------

export async function login(username, password) {
  await simulateLatency(400);

  const credential = MOCK_LOGIN_CREDENTIALS.find(
    (c) =>
      c.username.toLowerCase() === username.toLowerCase() &&
      c.password === password
  );

  if (!credential) {
    return {
      success: false,
      error: "Invalid credentials. Please check your username and password.",
    };
  }

  const user = {
    id: credential.id,
    name: credential.name,
    role: credential.role,
    // Include role-specific fields so portals can read them from the session.
    ...(credential.doctorId && {
      doctorId: credential.doctorId,
      licenseId: credential.licenseId,
      facility: credential.facility,
      city: credential.city,
      specialty: credential.specialty,
    }),
    ...(credential.pharmacyId && {
      pharmacyId: credential.pharmacyId,
      city: credential.city,
      licenseId: credential.licenseId,
    }),
    ...(credential.patientId && {
      patientId: credential.patientId,
      cniaToken: credential.cniaToken,
    }),
    ...(credential.regulatorId && {
      regulatorId: credential.regulatorId,
      department: credential.department,
    }),
    ...(credential.adminId && {
      adminId: credential.adminId,
    }),
  };

  _sessionToken = generateMockJwt(user);
  _sessionUser = user;

  return {
    success: true,
    data: {
      token: _sessionToken,
      user: _sessionUser,
    },
  };
}

// ---------------------------------------------------------------------------
// logout
// Clears the in-memory session. Call this on every logout action.
// ---------------------------------------------------------------------------

export function logout() {
  _sessionToken = null;
  _sessionUser = null;
}

// ---------------------------------------------------------------------------
// getCurrentUser
// Returns the live in-memory session. Used by useAuth hook on app bootstrap.
// ---------------------------------------------------------------------------

export function getCurrentUser() {
  if (!_sessionToken || !_sessionUser) {
    return { success: false, error: "No active session." };
  }
  return {
    success: true,
    data: {
      token: _sessionToken,
      user: _sessionUser,
    },
  };
}

// ---------------------------------------------------------------------------
// sendOtp
// Simulates dispatching a one-time passcode to the patient's phone.
// Console-logs the OTP in prototype mode — no real SMS gateway is called.
// ---------------------------------------------------------------------------

export async function sendOtp(patientId) {
  await simulateLatency(300);

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  _otpStore[patientId] = otp;

  // Prototype-only: log OTP to console so the demo can proceed without SMS.
  // Remove _prototypeOtp from the return value when connecting a real gateway.
  // eslint-disable-next-line no-console
  console.info(
    `[MedAxis OTP] Patient ${patientId} — OTP: ${otp} (prototype console only)`
  );

  return {
    success: true,
    data: {
      message: "OTP sent to registered phone number.",
      _prototypeOtp: otp,
    },
  };
}

// ---------------------------------------------------------------------------
// verifyOtp
// Prototype rule: any well-formed 6-digit code is accepted.
// Week 3+: replace body with POST /api/auth/verify-otp.
// ---------------------------------------------------------------------------

export async function verifyOtp(patientId, otp) {
  await simulateLatency(250);

  const code = otp?.toString().trim();

  if (!code || !/^\d{6}$/.test(code)) {
    return {
      success: false,
      error: "OTP must be exactly 6 digits.",
    };
  }

  return {
    success: true,
    data: {
      verified: true,
      patientId,
      message: "Identity verified successfully.",
    },
  };
}

// ---------------------------------------------------------------------------
// getSessionToken
// Used by other api modules to attach the bearer token to requests.
// Not part of the public API surface — consumed internally only.
// ---------------------------------------------------------------------------

export function getSessionToken() {
  return _sessionToken;
}
