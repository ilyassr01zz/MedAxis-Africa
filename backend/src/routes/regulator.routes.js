const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const {
  getStats,
  getAllPrescriptions,
  getDoctors,
  approveDoctor,
  revokeDoctor,
  getPharmacists,
  getDisputes,
  markDisputeReviewed,
  updateDoctorStatus,
} = require('../controllers/regulator.controller');

router.get('/stats',                             authenticate, authorize('REGULATOR', 'ADMIN'), getStats);
router.get('/prescriptions',                     authenticate, authorize('REGULATOR', 'ADMIN'), getAllPrescriptions);
router.get('/doctors',                           authenticate, authorize('REGULATOR', 'ADMIN'), getDoctors);
router.patch('/doctors/:doctor_id/approve',      authenticate, authorize('REGULATOR', 'ADMIN'), approveDoctor);
router.patch('/doctors/:doctor_id/revoke',       authenticate, authorize('REGULATOR', 'ADMIN'), revokeDoctor);
router.patch('/doctors/:doctor_id/status',       authenticate, authorize('REGULATOR'),          updateDoctorStatus);
router.get('/pharmacists',                       authenticate, authorize('REGULATOR', 'ADMIN'), getPharmacists);
router.get('/disputes',                          authenticate, authorize('REGULATOR', 'ADMIN'), getDisputes);
router.patch('/disputes/:rx_id/review',          authenticate, authorize('REGULATOR', 'ADMIN'), markDisputeReviewed);

module.exports = router;
