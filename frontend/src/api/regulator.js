// MedAxis Africa — Regulator API
// All calls require role: REGULATOR or ADMIN in the JWT.

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// ---------------------------------------------------------------------------
// GET /api/regulator/stats
// Accepts optional filter params: region, status, dateFrom, dateTo
// ---------------------------------------------------------------------------
export async function getStats(token, filters = {}) {
  const params = new URLSearchParams();
  if (filters.region && filters.region !== 'All Morocco') params.set('region', filters.region);
  if (filters.status && filters.status !== 'All Records') params.set('status', filters.status);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await axios.get(`${API_URL}/regulator/stats${query}`, authHeader(token));
  const result = response.data;
  if (!result.success) throw new Error(result.error || 'Failed to load stats');
  return { success: true, data: result.data };
}

export const getRegulatorStatsAPI = (token, filters) => getStats(token, filters);

// ---------------------------------------------------------------------------
// GET /api/regulator/prescriptions
// Accepts: region, status, search, page, limit
// ---------------------------------------------------------------------------
export async function getPrescriptionList(filters = {}, token) {
  const params = new URLSearchParams();
  if (filters.region && filters.region !== 'All Morocco') params.set('region', filters.region);
  if (filters.status && filters.status !== 'All Records') params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', filters.page);
  params.set('limit', filters.limit || 10);

  const response = await axios.get(
    `${API_URL}/regulator/prescriptions?${params.toString()}`,
    authHeader(token),
  );
  return response.data;
}

export const getAllPrescriptionsAPI = (token) => getPrescriptionList({}, token);

// ---------------------------------------------------------------------------
// GET /api/regulator/doctors
// Accepts: region, license_status, search, page, limit
// ---------------------------------------------------------------------------
export async function getDoctorList(filters = {}, token) {
  const params = new URLSearchParams();
  if (filters.region && filters.region !== 'All Morocco') params.set('region', filters.region);
  if (filters.license_status && filters.license_status !== 'All') params.set('license_status', filters.license_status);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', filters.page);
  params.set('limit', filters.limit || 10);

  const response = await axios.get(
    `${API_URL}/regulator/doctors?${params.toString()}`,
    authHeader(token),
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// PATCH /api/regulator/doctors/:doctor_id/approve
// ---------------------------------------------------------------------------
export async function approveDoctorAPI(doctor_id, token) {
  const response = await axios.patch(
    `${API_URL}/regulator/doctors/${doctor_id}/approve`,
    {},
    authHeader(token),
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// PATCH /api/regulator/doctors/:doctor_id/revoke
// ---------------------------------------------------------------------------
export async function revokeDoctorAPI(doctor_id, token) {
  const response = await axios.patch(
    `${API_URL}/regulator/doctors/${doctor_id}/revoke`,
    {},
    authHeader(token),
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// GET /api/regulator/pharmacists
// ---------------------------------------------------------------------------
export async function getPharmacistsAPI(token) {
  const response = await axios.get(`${API_URL}/regulator/pharmacists`, authHeader(token));
  return response.data;
}

// ---------------------------------------------------------------------------
// GET /api/regulator/disputes
// ---------------------------------------------------------------------------
export const getDisputesAPI = async (token) => {
  const response = await axios.get(`${API_URL}/regulator/disputes`, authHeader(token));
  return response.data;
};

// ---------------------------------------------------------------------------
// PATCH /api/regulator/disputes/:rx_id/review
// ---------------------------------------------------------------------------
export const markDisputeReviewedAPI = async (token, rx_id) => {
  const response = await axios.patch(
    `${API_URL}/regulator/disputes/${rx_id}/review`,
    {},
    authHeader(token),
  );
  return response.data;
};
