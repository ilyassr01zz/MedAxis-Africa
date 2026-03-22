const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { searchPatient } = require('../controllers/patients.controller');
const prisma = require('../utils/prisma');

router.get('/search', authenticate, authorize('DOCTOR'), searchPatient);

router.get('/debug-patient', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const patientByCNIE = await prisma.patient.findUnique({ where: { cnie_hash: req.user.cnie_hash } });
  const patientByUserId = req.user.id ? await prisma.patient.findUnique({ where: { user_id: req.user.id } }) : null;
  const allPrescriptions = await prisma.prescription.findMany({ take: 5 });
  res.json({ user, patientByCNIE, patientByUserId, allPrescriptions, jwtUser: req.user });
});

module.exports = router;
