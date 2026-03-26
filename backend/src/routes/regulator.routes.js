const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { getStats, getAllPrescriptions, updateDoctorStatus, getDisputes, markDisputeReviewed } = require('../controllers/regulator.controller');

router.get('/stats', authenticate, authorize('REGULATOR', 'ADMIN'), getStats);
router.get('/prescriptions', authenticate, authorize('REGULATOR', 'ADMIN'), getAllPrescriptions);
router.get('/disputes', authenticate, authorize('REGULATOR', 'ADMIN'), getDisputes);
router.patch('/disputes/:rx_id/review', authenticate, authorize('REGULATOR', 'ADMIN'), markDisputeReviewed);
router.patch('/doctors/:doctor_id/status', authenticate, authorize('REGULATOR'), updateDoctorStatus);

module.exports = router;
