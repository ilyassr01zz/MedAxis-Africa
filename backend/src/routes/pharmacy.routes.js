const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const {
  getDispensedToday,
  getPendingVerifications,
  getStockAlerts,
  getTodaySummary,
  getRecentActivity,
  getDashboardKPIs,
  getDashboardActivity,
  getActiveQueue,
  getDispensingHistory,
} = require('../controllers/pharmacy.controller');

// Legacy routes
router.get('/stats/dispensed-today',      authenticate, authorize('PHARMACIST'), getDispensedToday);
router.get('/stats/pending-verifications', authenticate, authorize('PHARMACIST'), getPendingVerifications);
router.get('/stats/stock-alerts',         authenticate, authorize('PHARMACIST'), getStockAlerts);
router.get('/stats/today-summary',        authenticate, authorize('PHARMACIST'), getTodaySummary);
router.get('/activity/recent',            authenticate, authorize('PHARMACIST'), getRecentActivity);

// New routes
router.get('/dashboard/kpis',        authenticate, authorize('PHARMACIST'), getDashboardKPIs);
router.get('/dashboard/activity',    authenticate, authorize('PHARMACIST'), getDashboardActivity);
router.get('/active-queue',          authenticate, authorize('PHARMACIST'), getActiveQueue);
router.get('/dispensing-history',    authenticate, authorize('PHARMACIST'), getDispensingHistory);

module.exports = router;
