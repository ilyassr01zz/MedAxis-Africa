// MedAxis Africa — Patients API (Real Backend Layer)
// Privacy rule: Raw CNIE numbers are NEVER returned from any function here.
// Only masked tokens and first names are exposed.

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

// ---------------------------------------------------------------------------
// searchPatient / searchPatientAPI
// GET /api/patients/search?cnie=xxx
// Returns: { token, firstName, patientId, insuranceId }
// ---------------------------------------------------------------------------

export async function searchPatient(cnie, token) {
  const response = await axios.get(`${API_URL}/patients/search?cnie=${cnie}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = response.data;

  if (!result.success) throw new Error(result.error || 'Patient not found');

  const d = result.data;

  // Normalise to the shape the doctor portal patient lookup expects
  return {
    success: true,
    data: {
      token: d.token || d.cnie_token || `PAT-**-${cnie.slice(-4)}`,
      firstName: d.first_name || d.firstName,
      patientId: d.id || d.patientId,
      insuranceId: d.insurance_id || d.insuranceId,
    },
  };
}

export const searchPatientAPI = (token, cnie) => searchPatient(cnie, token);

// ---------------------------------------------------------------------------
// getPatientSummary
// Returns a minimal patient profile for display in the pharmacy verification
// card. Same privacy constraints apply: no raw CNIE, no last name.
// ---------------------------------------------------------------------------

export async function getPatientSummary(patientId, token) {
  const response = await axios.get(`${API_URL}/patients/search?id=${patientId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const result = response.data;

  if (!result.success) return { success: false, error: 'Patient not found' };

  return {
    success: true,
    data: {
      token: result.data.token,
      firstName: result.data.first_name || result.data.firstName,
      patientId: result.data.id || result.data.patientId,
      insuranceId: result.data.insurance_id || result.data.insuranceId,
    },
  };
}
