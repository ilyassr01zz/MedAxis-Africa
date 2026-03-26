// MedAxis Africa — Regulator API (Real Backend Layer)
// All calls require role: REGULATOR in the JWT.

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// ---------------------------------------------------------------------------
// getStats / getRegulatorStatsAPI
// GET /api/regulator/stats
// ---------------------------------------------------------------------------

export async function getStats(token) {
  const response = await axios.get(`${API_URL}/regulator/stats`, authHeader(token));
  const result = response.data;

  if (!result.success) throw new Error(result.error || 'Failed to load stats');

  return {
    success: true,
    data: result.data,
  };
}

export const getRegulatorStatsAPI = (token) => getStats(token);

// ---------------------------------------------------------------------------
// getAllPrescriptions / getAllPrescriptionsAPI
// GET /api/regulator/prescriptions
// ---------------------------------------------------------------------------

export async function getAllPrescriptions(token) {
  const response = await axios.get(`${API_URL}/regulator/prescriptions`, authHeader(token));
  return response.data;
}

export const getAllPrescriptionsAPI = (token) => getAllPrescriptions(token);

// ---------------------------------------------------------------------------
// getPrescriptionList
// GET /api/regulator/prescriptions with query params for filtering
// ---------------------------------------------------------------------------

export async function getPrescriptionList(filters = {}, token) {
  const {
    status,
    doctorId,
    dateFrom,
    dateTo,
    query,
    page = 1,
    pageSize = 20,
  } = filters;

  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.set('status', status);
  if (doctorId) params.set('doctorId', doctorId);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (query) params.set('query', query);
  params.set('page', page);
  params.set('pageSize', pageSize);

  const response = await axios.get(
    `${API_URL}/regulator/prescriptions?${params.toString()}`,
    authHeader(token)
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// getDoctorList
// GET /api/regulator/doctors
// ---------------------------------------------------------------------------

export async function getDoctorList(filters = {}, token) {
  const response = await axios.get(`${API_URL}/regulator/doctors`, authHeader(token));
  return response.data;
}

// ---------------------------------------------------------------------------
// getPharmacyList
// GET /api/regulator/pharmacies
// ---------------------------------------------------------------------------

export async function getPharmacyList(filters = {}, token) {
  const response = await axios.get(`${API_URL}/regulator/pharmacies`, authHeader(token));
  return response.data;
}

// ---------------------------------------------------------------------------
// getDisputesAPI
// GET /api/regulator/disputes
// ---------------------------------------------------------------------------

export const getDisputesAPI = async (token) => {
  const response = await axios.get(`${API_URL}/regulator/disputes`, authHeader(token));
  return response.data;
};

// ---------------------------------------------------------------------------
// markDisputeReviewedAPI
// PATCH /api/regulator/disputes/:rx_id/review
// ---------------------------------------------------------------------------

export const markDisputeReviewedAPI = async (token, rx_id) => {
  console.log('Calling mark reviewed for:', rx_id);
  const response = await axios.patch(
    `${API_URL}/regulator/disputes/${rx_id}/review`,
    {},
    authHeader(token)
  );
  return response.data;
};
