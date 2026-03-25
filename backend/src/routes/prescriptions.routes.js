const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const ctrl = require('../controllers/prescriptions.controller');

router.post('/', authenticate, authorize('DOCTOR'), ctrl.createPrescription);
router.get('/my', authenticate, authorize('DOCTOR'), ctrl.getMyPrescriptions);
router.get('/doctor-stats', authenticate, authorize('DOCTOR'), ctrl.getDoctorStats);
router.get('/recent-activity', authenticate, authorize('DOCTOR'), ctrl.getRecentActivity);
router.get('/by-patient/:cnie_hash', authenticate, authorize('PHARMACIST'), ctrl.getByPatient);
router.get('/patient-view', authenticate, authorize('PATIENT'), ctrl.getPatientView);
router.patch('/:rx_id/cancel', authenticate, authorize('DOCTOR'), ctrl.cancelPrescription);
router.post('/:rx_id/dispense', authenticate, authorize('PHARMACIST'), ctrl.dispensePrescription);
router.post('/:rx_id/dispute', authenticate, authorize('PATIENT'), ctrl.disputePrescription);
router.post('/:rx_id/flag', authenticate, authorize('PHARMACIST'), ctrl.flagPrescription);
router.get('/:rx_id/audit', authenticate, authorize('REGULATOR', 'ADMIN'), ctrl.getAuditTrail);

module.exports = router;
