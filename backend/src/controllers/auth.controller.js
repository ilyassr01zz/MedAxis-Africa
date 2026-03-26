const jwt = require('jsonwebtoken');
const { success, error } = require('../utils/response.utils');
const { hashCNIE } = require('../utils/hash.utils');
const prisma = require('../utils/prisma');

const MOCK_USERS = {
  'DOCTOR001': { role: 'DOCTOR', first_name: 'Ahmed', cnie: 'DOCTOR001' },
  'PHARM001': { role: 'PHARMACIST', first_name: 'Youssef', cnie: 'PHARM001' },
  'PATIENT001': { role: 'PATIENT', first_name: 'Karima', cnie: 'PATIENT001' },
  'REGULATOR001': { role: 'REGULATOR', first_name: 'Fatima', cnie: 'REGULATOR001' },
  'ADMIN001': { role: 'ADMIN', first_name: 'Hassan', cnie: 'ADMIN001' }
};

const login = async (req, res) => {
  try {
    const { cnie, password, role } = req.body;
    if (!cnie || !role) return error(res, 'CNIE and role are required', 400);

    const mockUser = MOCK_USERS[cnie.toUpperCase()];
    if (!mockUser) return error(res, 'Invalid credentials', 401);
    if (mockUser.role !== role) return error(res, 'Invalid credentials for the selected role', 401);

    const cnie_hash = hashCNIE(cnie);

    let user = await prisma.user.findUnique({ where: { cnie_hash } });
    if (!user) {
      user = await prisma.user.create({
        data: { cnie_hash, role: mockUser.role, first_name: mockUser.first_name }
      });
    }

    // AUTO-CREATE / FIX ROLE RECORDS ON EVERY LOGIN
    if (role === 'PATIENT') {
      let patient = await prisma.patient.findUnique({ where: { user_id: user.id } });
      if (!patient) {
        // Patient record may exist with a stale user_id (from seed) — fix it
        patient = await prisma.patient.findUnique({ where: { cnie_hash } });
        if (patient && patient.user_id !== user.id) {
          await prisma.patient.update({ where: { cnie_hash }, data: { user_id: user.id } });
        } else if (!patient) {
          await prisma.patient.create({ data: { user_id: user.id, cnie_hash } });
        }
      }
    }

    if (role === 'DOCTOR') {
      const doctor = await prisma.doctor.findUnique({ where: { user_id: user.id } });
      if (!doctor) {
        await prisma.doctor.create({
          data: {
            user_id: user.id,
            license_number: `LIC-${user.id.slice(0, 8).toUpperCase()}`,
            specialty: 'General Medicine',
            facility: 'MedAxis Demo Clinic',
            region: 'Casablanca-Settat'
          }
        });
      }
    }

    if (role === 'PHARMACIST') {
      let pharmacist = await prisma.pharmacist.findUnique({ where: { user_id: user.id } });
      if (!pharmacist) {
        let pharmacy = await prisma.pharmacy.findFirst();
        if (!pharmacy) {
          pharmacy = await prisma.pharmacy.create({
            data: { name: 'Pharmacie Atlas', license_number: 'PHARM-DEMO-001', region: 'Casablanca-Settat', city: 'Casablanca' }
          });
        }
        await prisma.pharmacist.create({
          data: { user_id: user.id, license_number: `PHARM-LIC-${user.id.slice(0, 8).toUpperCase()}`, pharmacy_id: pharmacy.id }
        });
      }
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, first_name: user.first_name, cnie_hash },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return success(res, { token, role: user.role, first_name: user.first_name });
  } catch (err) {
    console.error('Login error:', err);
    return error(res, 'Login failed', 500);
  }
};

const getMe = async (req, res) => {
  return success(res, { user: req.user });
};

const sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return error(res, 'Phone number required', 400);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires_at = new Date(Date.now() + 5 * 60 * 1000);
    const { hashPhone } = require('../utils/hash.utils');
    const phone_hash = hashPhone(phone);
    await prisma.oTPSession.deleteMany({ where: { phone_hash } });
    await prisma.oTPSession.create({
      data: { phone_hash, otp_code: otp, expires_at }
    });
    console.log(`[MedAxis OTP] Phone: ${phone} — OTP: ${otp}`);
    return success(res, { message: 'OTP sent successfully', otp_preview: otp });
  } catch (err) {
    return error(res, 'Failed to send OTP', 500);
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return error(res, 'Phone and OTP required', 400);
    const { hashPhone } = require('../utils/hash.utils');
    const phone_hash = hashPhone(phone);
    const session = await prisma.oTPSession.findFirst({
      where: { phone_hash, is_used: false }
    });
    if (!session) return error(res, 'No active OTP session', 400);
    if (new Date() > session.expires_at) return error(res, 'OTP expired', 400);
    if (session.attempts >= 3) return error(res, 'Too many attempts', 400);
    if (session.otp_code !== otp) {
      await prisma.oTPSession.update({
        where: { id: session.id },
        data: { attempts: session.attempts + 1 }
      });
      return error(res, 'Invalid OTP', 400);
    }
    await prisma.oTPSession.update({
      where: { id: session.id },
      data: { is_used: true }
    });
    return success(res, { verified: true });
  } catch (err) {
    return error(res, 'Failed to verify OTP', 500);
  }
};

module.exports = { login, getMe, sendOTP, verifyOTP };
