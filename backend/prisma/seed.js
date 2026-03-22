const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { hashCNIE, hashPhone } = require('../src/utils/hash.utils');

const dbPath = path.join(__dirname, 'medaxis.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding MedAxis database...');

  const pharmacy = await prisma.pharmacy.upsert({
    where: { license_number: 'PHARM-CAS-0924' },
    update: {},
    create: {
      name: 'Pharmacie Atlas',
      license_number: 'PHARM-CAS-0924',
      region: 'Casablanca-Settat',
      city: 'Casablanca'
    }
  });

  const doctorUser = await prisma.user.upsert({
    where: { cnie_hash: hashCNIE('DOCTOR001') },
    update: {},
    create: {
      cnie_hash: hashCNIE('DOCTOR001'),
      role: 'DOCTOR',
      first_name: 'Ahmed'
    }
  });

  const doctor = await prisma.doctor.upsert({
    where: { user_id: doctorUser.id },
    update: {},
    create: {
      user_id: doctorUser.id,
      license_number: 'MED-MAR-8829',
      specialty: 'General Medicine',
      facility: 'Clinique Internationale, Casablanca',
      region: 'Casablanca-Settat',
      status: 'ACTIVE'
    }
  });

  await prisma.licenseVC.upsert({
    where: { doctor_id: doctor.id },
    update: {},
    create: {
      doctor_id: doctor.id,
      vc_json: JSON.stringify({
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        id: `urn:uuid:${uuidv4()}`,
        type: ['VerifiableCredential', 'MedicalLicenseCredential'],
        issuer: 'did:web:medaxis.ma',
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        credentialSubject: {
          licenseNumber: 'MED-MAR-8829',
          specialty: 'General Medicine',
          status: 'ACTIVE'
        }
      }),
      issuer_did: 'did:web:medaxis.ma',
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }
  });

  const pharmacistUser = await prisma.user.upsert({
    where: { cnie_hash: hashCNIE('PHARM001') },
    update: {},
    create: {
      cnie_hash: hashCNIE('PHARM001'),
      role: 'PHARMACIST',
      first_name: 'Youssef'
    }
  });

  await prisma.pharmacist.upsert({
    where: { user_id: pharmacistUser.id },
    update: {},
    create: {
      user_id: pharmacistUser.id,
      license_number: 'PHARM-LIC-001',
      pharmacy_id: pharmacy.id
    }
  });

  const patientUser = await prisma.user.upsert({
    where: { cnie_hash: hashCNIE('PATIENT001') },
    update: {},
    create: {
      cnie_hash: hashCNIE('PATIENT001'),
      role: 'PATIENT',
      first_name: 'Karima'
    }
  });

  const patient = await prisma.patient.upsert({
    where: { cnie_hash: hashCNIE('PATIENT001') },
    update: {},
    create: {
      user_id: patientUser.id,
      cnie_hash: hashCNIE('PATIENT001'),
      phone_hash: hashPhone('+212600000001')
    }
  });

  const regulatorUser = await prisma.user.upsert({
    where: { cnie_hash: hashCNIE('REGULATOR001') },
    update: {},
    create: {
      cnie_hash: hashCNIE('REGULATOR001'),
      role: 'REGULATOR',
      first_name: 'Fatima'
    }
  });

  await prisma.regulator.upsert({
    where: { user_id: regulatorUser.id },
    update: {},
    create: {
      user_id: regulatorUser.id,
      region: 'National'
    }
  });

  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);

  await prisma.prescription.upsert({
    where: { rx_id: 'RX-DEMO-0001' },
    update: {},
    create: {
      rx_id: 'RX-DEMO-0001',
      doctor_id: doctor.id,
      patient_id: patient.id,
      drug_code: 'AMX500',
      drug_name: 'Amoxicillin 500mg',
      dosage: '500mg',
      frequency: 'TID',
      duration_days: 7,
      expiry_date: expiry,
      status: 'ACTIVE'
    }
  });

  console.log('Database seeded successfully');
  console.log('Demo credentials:');
  console.log('  Doctor:     CNIE=DOCTOR001, role=DOCTOR');
  console.log('  Pharmacist: CNIE=PHARM001,  role=PHARMACIST');
  console.log('  Patient:    CNIE=PATIENT001, role=PATIENT');
  console.log('  Regulator:  CNIE=REGULATOR001, role=REGULATOR');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
