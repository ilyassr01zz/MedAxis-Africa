const jwt = require('jsonwebtoken');

// Mock eSignet service — Week 1-2 implementation
// Returns hardcoded JWT for demo purposes
// Replace with real OIDC integration in Week 3

const MOCK_USERS = {
  'DR001': {
    id: 'doctor-user-001',
    cnie_hash: 'mock-doctor-cnie-hash-001',
    role: 'DOCTOR',
    first_name: 'Dr. Karim',
    doctor: {
      id: 'doctor-001',
      license_number: 'MED-2024-001',
      specialty: 'General Medicine',
      facility: 'CHU Ibn Sina',
      region: 'Rabat-Salé-Kénitra',
      status: 'ACTIVE'
    }
  },
  'PH001': {
    id: 'pharmacist-user-001',
    cnie_hash: 'mock-pharmacist-cnie-hash-001',
    role: 'PHARMACIST',
    first_name: 'Fatima',
    pharmacist: {
      id: 'pharmacist-001',
      license_number: 'PHARM-2024-001',
      pharmacy_id: 'pharmacy-001'
    }
  },
  'REG001': {
    id: 'regulator-user-001',
    cnie_hash: 'mock-regulator-cnie-hash-001',
    role: 'REGULATOR',
    first_name: 'Hassan',
    regulator: {
      id: 'regulator-001',
      region: 'National'
    }
  },
  'INS001': {
    id: 'insurer-001',
    cnie_hash: 'mock-insurer-cnie-hash-001',
    role: 'INSURER',
    first_name: 'Amina'
  }
};

const mockAuthenticate = (credential) => {
  const user = MOCK_USERS[credential];
  if (!user) return null;

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      first_name: user.first_name,
      cnie_hash: user.cnie_hash
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  return { token, user };
};

module.exports = { mockAuthenticate, MOCK_USERS };
