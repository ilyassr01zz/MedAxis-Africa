const express = require('express');
const router = express.Router();
const { login, getMe, sendOTP, verifyOTP, esignetCallback } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/send-otp', authenticate, sendOTP);
router.post('/verify-otp', authenticate, verifyOTP);
router.post('/esignet/callback', esignetCallback);

module.exports = router;
