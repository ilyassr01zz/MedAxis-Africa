// Mock Inji Certify service — issues doctor license VCs
// Replace with real Inji Certify HTTP calls in Week 3

const { v4: uuidv4 } = require('uuid');

const issueDocLicenseVC = async (doctor) => {
  // Mock W3C Verifiable Credential for doctor license
  const vc = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://medaxis.ma/credentials/v1'
    ],
    id: `urn:uuid:${uuidv4()}`,
    type: ['VerifiableCredential', 'MedicalLicenseCredential'],
    issuer: 'did:web:medaxis.ma',
    issuanceDate: new Date().toISOString(),
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    credentialSubject: {
      id: `did:medaxis:doctor:${doctor.id}`,
      licenseNumber: doctor.license_number,
      specialty: doctor.specialty,
      facility: doctor.facility,
      region: doctor.region,
      status: doctor.status
    },
    proof: {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: 'did:web:medaxis.ma#key-1',
      proofPurpose: 'assertionMethod',
      proofValue: `mock-proof-${uuidv4()}`
    }
  };

  return vc;
};

const verifyLicenseVC = async (vcJson) => {
  // Mock verification — always returns true for demo
  // Replace with real Inji Verify SDK call in Week 3
  try {
    const vc = JSON.parse(vcJson);
    const expirationDate = new Date(vc.expirationDate);
    const isExpired = expirationDate < new Date();
    return {
      valid: !isExpired,
      issuer: vc.issuer,
      expirationDate: vc.expirationDate
    };
  } catch {
    return { valid: false, error: 'Invalid VC format' };
  }
};

module.exports = { issueDocLicenseVC, verifyLicenseVC };
