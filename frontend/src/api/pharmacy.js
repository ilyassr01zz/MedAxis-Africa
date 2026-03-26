import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

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
