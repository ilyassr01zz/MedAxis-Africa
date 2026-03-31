import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

// ── Legacy ────────────────────────────────────────────────────────────────────

export async function getDispensedTodayAPI(token) {
  const res = await axios.get(`${API_URL}/pharmacy/stats/dispensed-today`, authHeader(token));
  return res.data;
}

export async function getPendingVerificationsAPI(token) {
  const res = await axios.get(`${API_URL}/pharmacy/stats/pending-verifications`, authHeader(token));
  return res.data;
}

export async function getStockAlertsAPI(token) {
  const res = await axios.get(`${API_URL}/pharmacy/stats/stock-alerts`, authHeader(token));
  return res.data;
}

export async function getTodaySummaryAPI(token) {
  const res = await axios.get(`${API_URL}/pharmacy/stats/today-summary`, authHeader(token));
  return res.data;
}

export async function getRecentPharmacyActivityAPI(token) {
  const res = await axios.get(`${API_URL}/pharmacy/activity/recent`, authHeader(token));
  return res.data;
}

// ── New ───────────────────────────────────────────────────────────────────────

export async function getDashboardKPIsAPI(token) {
  const res = await axios.get(`${API_URL}/pharmacy/dashboard/kpis`, authHeader(token));
  return res.data;
}

export async function getDashboardActivityAPI(token, hours = 24) {
  const res = await axios.get(
    `${API_URL}/pharmacy/dashboard/activity?hours=${hours}`,
    authHeader(token),
  );
  return res.data;
}

export async function getActiveQueueAPI(token) {
  const res = await axios.get(`${API_URL}/pharmacy/active-queue`, authHeader(token));
  return res.data;
}

export async function getDispensingHistoryAPI(token, params = {}) {
  const {
    timeRange      = 'LAST_7_DAYS',
    startDate      = '',
    endDate        = '',
    medicationQuery = '',
    page           = 1,
    pageSize       = 50,
  } = params;

  const query = new URLSearchParams({ timeRange, page, pageSize });
  if (startDate)       query.set('startDate', startDate);
  if (endDate)         query.set('endDate', endDate);
  if (medicationQuery) query.set('medicationQuery', medicationQuery);

  const res = await axios.get(
    `${API_URL}/pharmacy/dispensing-history?${query.toString()}`,
    authHeader(token),
  );
  return res.data;
}
