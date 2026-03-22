// MedAxis Africa — Prescriptions API (Real Backend Layer)
// All calls go to the Express backend on port 3001.
// All requests include Authorization: Bearer <token> headers.

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// ---------------------------------------------------------------------------
// createPrescription / createPrescriptionAPI
// POST /api/prescriptions
// Accepts the mock-layer shape (patientCniaHash, drugCode, etc.) and maps it
// to the backend shape (patient_cnie_hash, drug_code, etc.) so the doctor
// portal does not need to be changed.
// ---------------------------------------------------------------------------

export async function createPrescription(data, token) {
  const payload = {
    patient_cnie_hash: data.patientCniaHash || data.patient_cnie_hash || data.patientCNIEHash,
    drug_code: data.drugCode || data.drug_code || data.medication,
    drug_name: data.drugName || data.drug_name || data.medication,
    dosage: data.dosage,
    frequency: data.frequency || 'As prescribed',
    duration_days: parseInt(data.durationDays || data.duration_days || data.duration || 30, 10),
  };

  const response = await axios.post(`${API_URL}/prescriptions`, payload, authHeader(token));
  const result = response.data;

  if (!result.success) throw new Error(result.error || 'Failed to create prescription');

  // Normalise to the shape the doctor portal success card expects
  return {
    success: true,
    data: {
      rxId: result.data.rx_id || result.data.rxId,
      ...result.data,
    },
  };
}

export const createPrescriptionAPI = (token, data) => createPrescription(data, token);

// ---------------------------------------------------------------------------
// getMyPrescriptions / getMyPrescriptionsAPI
// GET /api/prescriptions/my
// ---------------------------------------------------------------------------

export async function getMyPrescriptions(doctorId, token) {
  // doctorId arg is ignored; the backend derives it from the JWT.
  const response = await axios.get(`${API_URL}/prescriptions/my`, authHeader(token));
  const result = response.data;

  if (!result.success) throw new Error(result.error || 'Failed to load prescriptions');

  // Normalise array: backend returns result.data.prescriptions or result.data (array)
  const prescriptions = result.data?.prescriptions || result.data || [];

  return {
    success: true,
    data: prescriptions.map(normaliseRx),
  };
}

export const getMyPrescriptionsAPI = (token) => getMyPrescriptions(null, token);

// ---------------------------------------------------------------------------
// getByPatientCnie / getByPatientCNIEAPI
// GET /api/prescriptions/by-patient/:cnie_hash
// ---------------------------------------------------------------------------

export async function getByPatientCnie(cnieHash, token) {
  const response = await axios.get(
    `${API_URL}/prescriptions/by-patient/${cnieHash}`,
    authHeader(token)
  );
  const result = response.data;

  if (!result.success) throw new Error(result.error || 'Patient not found');

  const prescriptions = result.data?.prescriptions || result.data || [];

  return {
    success: true,
    data: {
      prescriptions: prescriptions.map(normaliseRx),
      patient_first_name: result.data?.patient_first_name || null,
      patient_token: result.data?.patient_token || null,
    },
  };
}

export const getByPatientCNIEAPI = (token, cnie_hash) => getByPatientCnie(cnie_hash, token);

// ---------------------------------------------------------------------------
// getPatientPrescriptions / getPatientViewAPI
// GET /api/prescriptions/patient-view
// ---------------------------------------------------------------------------

export async function getPatientPrescriptions(patientId, token) {
  const response = await axios.get(`${API_URL}/prescriptions/patient-view`, authHeader(token));
  const result = response.data;

  if (!result.success) throw new Error(result.error || 'Failed to load history');

  const prescriptions = result.data?.prescriptions || result.data || [];

  return {
    success: true,
    data: { prescriptions: prescriptions.map(normaliseRx) },
  };
}

export const getPatientViewAPI = (token) => getPatientPrescriptions(null, token);

// ---------------------------------------------------------------------------
// cancelPrescription / cancelPrescriptionAPI
// PATCH /api/prescriptions/:rx_id/cancel
// ---------------------------------------------------------------------------

export async function cancelPrescription(rxId, token) {
  const response = await axios.patch(
    `${API_URL}/prescriptions/${rxId}/cancel`,
    {},
    authHeader(token)
  );
  return response.data;
}

export const cancelPrescriptionAPI = (token, rx_id) => cancelPrescription(rx_id, token);

// ---------------------------------------------------------------------------
// dispensePrescription / dispensePrescriptionAPI
// POST /api/prescriptions/:rx_id/dispense
// ---------------------------------------------------------------------------

export async function dispensePrescription(rxId, data = {}, token) {
  const response = await axios.post(
    `${API_URL}/prescriptions/${rxId}/dispense`,
    data,
    authHeader(token)
  );
  const result = response.data;

  if (!result.success) throw new Error(result.error || 'Dispense failed');

  return {
    success: true,
    data: {
      ...result.data,
      status: 'DISPENSED',
    },
  };
}

export const dispensePrescriptionAPI = (token, rx_id, data) =>
  dispensePrescription(rx_id, data, token);

// ---------------------------------------------------------------------------
// disputePrescriptionAPI
// POST /api/prescriptions/:rx_id/dispute
// ---------------------------------------------------------------------------

export async function disputePrescriptionAPI(token, rx_id) {
  const response = await axios.post(
    `${API_URL}/prescriptions/${rx_id}/dispute`,
    {},
    authHeader(token)
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// getAuditTrail
// GET /api/prescriptions/:rx_id/audit
// ---------------------------------------------------------------------------

export async function getAuditTrail(rxId, token) {
  const response = await axios.get(
    `${API_URL}/prescriptions/${rxId}/audit`,
    authHeader(token)
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// normaliseRx — maps backend snake_case fields to camelCase fields the
// frontend portals expect, while keeping backend fields as fallbacks.
// ---------------------------------------------------------------------------

function normaliseRx(rx) {
  return {
    // Keep original fields
    ...rx,
    // camelCase aliases
    rxId: rx.rx_id || rx.rxId,
    drugCode: rx.drug_code || rx.drugCode,
    drugName: rx.drug_name || rx.drugName,
    durationDays: rx.duration_days || rx.durationDays,
    issuedAt: rx.created_at || rx.issuedAt,
    expiresAt: rx.expiry_date || rx.expiresAt,
    patientToken: rx.patient_cnie_hash
      ? `PAT-**-${rx.patient_cnie_hash.slice(-4)}`
      : rx.patientToken,
    patientFirstName: rx.patient?.user?.first_name || rx.patientFirstName || 'Patient',
    doctorName:
      rx.doctor?.user?.first_name
        ? `Dr. ${rx.doctor.user.first_name}`
        : rx.doctorName || 'Unknown Doctor',
    // Status normalisation: backend uses ACTIVE, frontend also uses VALID
    status: rx.status,
  };
}
