const jwt = require('jsonwebtoken');
const fs = require('fs');
const crypto = require('crypto');
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

// Build RS256 signed JWT for eSignet client assertion
function buildClientAssertion() {
  try {
    const privateKey = fs.readFileSync('./esignet_private.pem', 'utf8');
    const now = Math.floor(Date.now() / 1000);

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({
      iss: 'medaxis-client',
      sub: 'medaxis-client',
      aud: 'http://localhost:8088/v1/esignet/oauth/v2/token',
      jti: crypto.randomUUID(),
      iat: now,
      exp: now + 60
    })).toString('base64url');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(`${header}.${payload}`);
    const signature = sign.sign(privateKey, 'base64url');

    return `${header}.${payload}.${signature}`;
  } catch (err) {
    console.warn('Failed to build client assertion:', err.message);
    return null;
  }
}

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

const esignetCallback = async (req, res) => {
  try {
    const { code, state } = req.body;
    if (!code || !state) return error(res, 'Code and state are required', 400);

    // Try to exchange code for token from eSignet
    let userData = null;
    try {
      const clientAssertion = buildClientAssertion();
      if (!clientAssertion) {
        throw new Error('Failed to build client assertion');
      }

      const tokenResponse = await fetch('http://localhost:8088/v1/esignet/oauth/v2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: 'http://localhost:5173/login',
          client_id: 'medaxis-client',
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: clientAssertion
        }).toString()
      });

      console.log('eSignet token response status:', tokenResponse.status);
      const responseText = await tokenResponse.text();
      console.log('eSignet token response:', responseText);

      if (tokenResponse.ok) {
        const tokenData = JSON.parse(responseText);
        if (tokenData.access_token) {
          // Try to fetch user info using access token
          const userInfoResponse = await fetch('http://localhost:8088/v1/esignet/oidc/userinfo', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
          });

          console.log('eSignet userinfo response status:', userInfoResponse.status);
          if (userInfoResponse.ok) {
            const userInfoText = await userInfoResponse.text();
            // Decode JWT payload (eSignet returns signed JWT, not plain JSON)
            // We decode but don't verify the signature for this prototype
            try {
              const parts = userInfoText.split('.');
              if (parts.length !== 3) {
                throw new Error('Invalid JWT format');
              }
              const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
              userData = payload;
              console.log('eSignet userinfo payload:', JSON.stringify(userData));
            } catch (decodeErr) {
              console.error('Failed to decode eSignet userinfo JWT:', decodeErr.message);
            }
          } else {
            const userInfoText = await userInfoResponse.text();
            console.log('eSignet userinfo error:', userInfoText);
          }
        }
      }
    } catch (err) {
      console.error('eSignet token exchange error:', err.message, err.stack);
    }

    // No fallback - return error so we can debug
    if (!userData) {
      console.error('eSignet token exchange failed - no user data retrieved');
      return error(res, 'Authentication failed - could not exchange code with eSignet', 401);
    }

    // Known pairwise sub → CNIE mappings (built from successful logins)
    // eSignet returns a different sub for each user - we map them to MedAxis CNIEs
    const SUB_TO_CNIE = {
      'VROorzS2gtbCtXcJb4EHYiB6Sr821i3lPYmkH-Y5FxA': 'DOCTOR001',
      '_ymzghguVGeGgVI9KLdysCKVOFMwfpKXL1e14EEcd0g': 'PATIENT001',
      'HnL065qfvi0r1upSefInH2keSxHyGr3Px-dhAFUUwXI': 'PHARM001',
      'h62fKx9fhr_5YYffQcSo1E1mQO2wBCQaRqgUuSy50vw': 'REGULATOR001',
    };

    // First try sub mapping (most reliable)
    let cnie = SUB_TO_CNIE[userData.sub] || null;

    // Then try name matching as fallback
    if (!cnie) {
      const mockEntry = Object.entries(MOCK_USERS).find(([id, u]) =>
        userData.name?.includes(u.first_name)
      );
      cnie = mockEntry ? mockEntry[0] : null;
    }

    // Log unmapped subs for future mapping
    if (!cnie) {
      console.error('UNMAPPED SUB - add to SUB_TO_CNIE:', userData.sub, 'name:', userData.name);
      return error(res, 'User not found - please contact admin', 401);
    }

    const mockUser = MOCK_USERS[cnie];
    const role = mockUser.role;
    const firstName = mockUser.first_name;

    console.log(`Mapped eSignet user "${userData.name}" (sub: ${userData.sub}) to MedAxis user ${cnie} (${role})`);

    // Look up user in database by hashing the mapped CNIE
    const cnie_hash = hashCNIE(cnie);
    let user = await prisma.user.findUnique({ where: { cnie_hash } });

    // If user not found, create a new one
    if (!user) {
      user = await prisma.user.create({
        data: {
          cnie_hash,
          role: role,
          first_name: firstName
        }
      });
    }

    // Auto-create role-specific records
    if (role === 'PATIENT') {
      let patient = await prisma.patient.findUnique({ where: { user_id: user.id } });
      if (!patient) {
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

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, role: user.role, first_name: user.first_name, cnie_hash },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    return success(res, { token, role: user.role, first_name: user.first_name });
  } catch (err) {
    console.error('eSignet callback error:', err);
    return error(res, 'eSignet authentication failed', 500);
  }
};

module.exports = { login, getMe, sendOTP, verifyOTP, esignetCallback };
