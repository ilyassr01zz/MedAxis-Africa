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
} = require('../controllers/pharmacy.controller');

router.get('/stats/dispensed-today',      authenticate, authorize('PHARMACIST'), getDispensedToday);
router.get('/stats/pending-verifications', authenticate, authorize('PHARMACIST'), getPendingVerifications);
router.get('/stats/stock-alerts',         authenticate, authorize('PHARMACIST'), getStockAlerts);
router.get('/stats/today-summary',        authenticate, authorize('PHARMACIST'), getTodaySummary);
router.get('/activity/recent',            authenticate, authorize('PHARMACIST'), getRecentActivity);

module.exports = router;
