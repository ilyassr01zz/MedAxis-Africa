const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { getStats, getAllPrescriptions, updateDoctorStatus } = require('../controllers/regulator.controller');

router.get('/stats', authenticate, authorize('REGULATOR', 'ADMIN'), getStats);
router.get('/prescriptions', authenticate, authorize('REGULATOR', 'ADMIN'), getAllPrescriptions);
router.patch('/doctors/:doctor_id/status', authenticate, authorize('REGULATOR'), updateDoctorStatus);

module.exports = router;
