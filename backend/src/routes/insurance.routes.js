const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { submitClaim, getClaims } = require('../controllers/insurance.controller');

router.post('/claims', authenticate, authorize('INSURER', 'PATIENT'), submitClaim);
router.get('/claims', authenticate, authorize('INSURER'), getClaims);

module.exports = router;
