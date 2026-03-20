// MedAxis Africa — Mock Data Layer
// All data is representative of Moroccan healthcare infrastructure.
// No real PII is stored or exposed. CNIE values are masked tokens only.

// ---------------------------------------------------------------------------
// Doctors
// ---------------------------------------------------------------------------

export const MOCK_DOCTORS = [
  {
    id: "DOC-001",
    name: "Dr. Ahmed Benali",
    specialty: "General Medicine",
    licenseId: "LIC-MA-10042",
    facility: "Hôpital Ibn Sina",
    city: "Rabat",
    status: "ACTIVE",
    vcStatus: "VALID",
  },
  {
    id: "DOC-002",
    name: "Dr. Fatima Zahra",
    specialty: "Cardiology",
    licenseId: "LIC-MA-20188",
    facility: "Clinique Al Farabi",
    city: "Casablanca",
    status: "ACTIVE",
    vcStatus: "VALID",
  },
  {
    id: "DOC-003",
    name: "Dr. Yassine Raissi",
    specialty: "Endocrinology",
    licenseId: "LIC-MA-30577",
    facility: "CHU Mohammed VI",
    city: "Marrakech",
    status: "ACTIVE",
    vcStatus: "VALID",
  },
  {
    id: "DOC-004",
    name: "Dr. Leila Benjelloun",
    specialty: "Pulmonology",
    licenseId: "LIC-MA-41203",
    facility: "Hôpital Razi",
    city: "Tangier",
    status: "ACTIVE",
    vcStatus: "VALID",
  },
  {
    id: "DOC-005",
    name: "Dr. Omar Khaldi",
    specialty: "Gastroenterology",
    licenseId: "LIC-MA-55891",
    facility: "Polyclinique Nord",
    city: "Fes",
    status: "ACTIVE",
    vcStatus: "VALID",
  },
  {
    id: "DOC-006",
    name: "Dr. Sarah Mansouri",
    specialty: "Neurology",
    licenseId: "LIC-MA-67340",
    facility: "Clinique du Sud",
    city: "Agadir",
    status: "ACTIVE",
    vcStatus: "VALID",
  },
];

// ---------------------------------------------------------------------------
// Patients
// First name only displayed. CNIE is always a masked token — never raw.
// ---------------------------------------------------------------------------

export const MOCK_PATIENTS = [
  {
    id: "PAT-001",
    firstName: "Youssef",
    cniaToken: "A•••••31",
    cniaHash: "a3f9b2c1d8e745f0aa31",
    phoneHash: "ph_hash_001",
    insuranceId: "MGPAP-Y001",
  },
  {
    id: "PAT-002",
    firstName: "Nadia",
    cniaToken: "B•••••42",
    cniaHash: "b7c4e1f2a9d036b8bb42",
    phoneHash: "ph_hash_002",
    insuranceId: "MGPAP-N002",
  },
  {
    id: "PAT-003",
    firstName: "Karim",
    cniaToken: "C•••••57",
    cniaHash: "c1d8a7b5e2f490c9cc57",
    phoneHash: "ph_hash_003",
    insuranceId: "MGPAP-K003",
  },
  {
    id: "PAT-004",
    firstName: "Houda",
    cniaToken: "D•••••68",
    cniaHash: "d5e2c9a4b7f103d8dd68",
    phoneHash: "ph_hash_004",
    insuranceId: "MGPAP-H004",
  },
];

// ---------------------------------------------------------------------------
// Prescriptions
// RxID format: RX-[3 digits]-[4 digits]-[2 digits]
// Statuses: ACTIVE | DISPENSED | EXPIRED | PENDING | CANCELLED | FLAGGED
// ---------------------------------------------------------------------------

export const MOCK_PRESCRIPTIONS = [
  {
    rxId: "RX-889-2624-01",
    doctorId: "DOC-001",
    doctorName: "Dr. Ahmed Benali",
    patientId: "PAT-001",
    patientToken: "A•••••31",
    patientFirstName: "Youssef",
    drugCode: "J01CA04",
    drugName: "Amoxicillin 500mg",
    dosage: "500mg",
    frequency: "3x daily",
    duration: "7 days",
    status: "ACTIVE",
    issuedAt: "2026-03-18T09:15:00Z",
    expiresAt: "2026-04-18T09:15:00Z",
    notes: null,
  },
  {
    rxId: "RX-441-3817-02",
    doctorId: "DOC-002",
    doctorName: "Dr. Fatima Zahra",
    patientId: "PAT-002",
    patientToken: "B•••••42",
    patientFirstName: "Nadia",
    drugCode: "C09AA03",
    drugName: "Lisinopril 10mg",
    dosage: "10mg",
    frequency: "1x daily",
    duration: "30 days",
    status: "DISPENSED",
    issuedAt: "2026-03-10T14:30:00Z",
    expiresAt: "2026-04-10T14:30:00Z",
    dispensedAt: "2026-03-11T10:05:00Z",
    notes: null,
  },
  {
    rxId: "RX-207-5531-03",
    doctorId: "DOC-003",
    doctorName: "Dr. Yassine Raissi",
    patientId: "PAT-003",
    patientToken: "C•••••57",
    patientFirstName: "Karim",
    drugCode: "A10BA02",
    drugName: "Metformin 850mg",
    dosage: "850mg",
    frequency: "2x daily",
    duration: "60 days",
    status: "ACTIVE",
    issuedAt: "2026-03-17T11:00:00Z",
    expiresAt: "2026-05-17T11:00:00Z",
    notes: null,
  },
  {
    rxId: "RX-563-9142-04",
    doctorId: "DOC-004",
    doctorName: "Dr. Leila Benjelloun",
    patientId: "PAT-004",
    patientToken: "D•••••68",
    patientFirstName: "Houda",
    drugCode: "R03AC02",
    drugName: "Ventolin Inhaler",
    dosage: "100mcg",
    frequency: "As needed",
    duration: "90 days",
    status: "ACTIVE",
    issuedAt: "2026-03-15T08:45:00Z",
    expiresAt: "2026-06-15T08:45:00Z",
    notes: null,
  },
  {
    rxId: "RX-712-6380-05",
    doctorId: "DOC-001",
    doctorName: "Dr. Ahmed Benali",
    patientId: "PAT-001",
    patientToken: "A•••••31",
    patientFirstName: "Youssef",
    drugCode: "M01AE01",
    drugName: "Ibuprofen 400mg",
    dosage: "400mg",
    frequency: "3x daily",
    duration: "5 days",
    status: "EXPIRED",
    issuedAt: "2026-02-01T10:00:00Z",
    expiresAt: "2026-03-01T10:00:00Z",
    notes: null,
  },
  {
    rxId: "RX-334-7724-06",
    doctorId: "DOC-006",
    doctorName: "Dr. Sarah Mansouri",
    patientId: "PAT-002",
    patientToken: "B•••••42",
    patientFirstName: "Nadia",
    drugCode: "N05BA01",
    drugName: "Diazepam 5mg",
    dosage: "5mg",
    frequency: "1x daily",
    duration: "14 days",
    status: "PENDING",
    issuedAt: "2026-03-19T16:20:00Z",
    expiresAt: "2026-04-19T16:20:00Z",
    notes: null,
  },
  {
    rxId: "RX-991-1058-07",
    doctorId: "DOC-005",
    doctorName: "Dr. Omar Khaldi",
    patientId: "PAT-003",
    patientToken: "C•••••57",
    patientFirstName: "Karim",
    drugCode: "A02BC01",
    drugName: "Omeprazole 20mg",
    dosage: "20mg",
    frequency: "1x daily",
    duration: "28 days",
    status: "DISPENSED",
    issuedAt: "2026-03-05T09:30:00Z",
    expiresAt: "2026-04-05T09:30:00Z",
    dispensedAt: "2026-03-06T11:15:00Z",
    notes: null,
  },
  {
    rxId: "RX-650-4491-08",
    doctorId: "DOC-002",
    doctorName: "Dr. Fatima Zahra",
    patientId: "PAT-004",
    patientToken: "D•••••68",
    patientFirstName: "Houda",
    drugCode: "N02BE01",
    drugName: "Paracetamol 1g",
    dosage: "1g",
    frequency: "4x daily",
    duration: "3 days",
    status: "ACTIVE",
    issuedAt: "2026-03-20T07:00:00Z",
    expiresAt: "2026-04-20T07:00:00Z",
    notes: null,
  },
];

// ---------------------------------------------------------------------------
// Pharmacies
// ---------------------------------------------------------------------------

export const MOCK_PHARMACIES = [
  {
    id: "PH-001",
    name: "Pharmacie Centrale",
    city: "Casablanca",
    licenseId: "PH-LIC-CA-001",
    address: "Boulevard Mohammed V, Casablanca",
    status: "ACTIVE",
  },
  {
    id: "PH-002",
    name: "Pharmacie Al Amal",
    city: "Rabat",
    licenseId: "PH-LIC-RB-002",
    address: "Avenue Hassan II, Rabat",
    status: "ACTIVE",
  },
  {
    id: "PH-003",
    name: "Pharmacie Ibn Rochd",
    city: "Marrakech",
    licenseId: "PH-LIC-MR-003",
    address: "Rue Bab Doukkala, Marrakech",
    status: "ACTIVE",
  },
  {
    id: "PH-004",
    name: "Pharmacie du Nord",
    city: "Tangier",
    licenseId: "PH-LIC-TG-004",
    address: "Avenue de Fès, Tangier",
    status: "ACTIVE",
  },
  {
    id: "PH-005",
    name: "Pharmacie Al Andalous",
    city: "Fes",
    licenseId: "PH-LIC-FS-005",
    address: "Rue Talaa Kbira, Fes",
    status: "ACTIVE",
  },
];

// ---------------------------------------------------------------------------
// Regulator Dashboard Stats
// ---------------------------------------------------------------------------

export const MOCK_REGULATOR_STATS = {
  totalPrescriptions: 1284902,
  registeredDoctors: 42150,
  activePharmacies: 18294,
  dispensedThisMonth: 94730,
  flaggedPrescriptions: 312,
  expiredUnused: 8217,
  averageDispensingTime: "18 min",
  fraudAlertsThisWeek: 7,
  monthlyTrend: [
    { month: "Oct", count: 82400 },
    { month: "Nov", count: 88100 },
    { month: "Dec", count: 91200 },
    { month: "Jan", count: 86700 },
    { month: "Feb", count: 90500 },
    { month: "Mar", count: 94730 },
  ],
};

// ---------------------------------------------------------------------------
// Login Credentials
// Used exclusively by the mock auth layer — never exposed to the UI directly.
// ---------------------------------------------------------------------------

export const MOCK_LOGIN_CREDENTIALS = [
  {
    username: "DR-AHMED",
    password: "demo",
    role: "DOCTOR",
    name: "Dr. Ahmed Benali",
    id: "DOC-001",
    doctorId: "DOC-001",
    licenseId: "LIC-MA-10042",
    facility: "Hôpital Ibn Sina",
    city: "Rabat",
    specialty: "General Medicine",
  },
  {
    username: "DR-FATIMA",
    password: "demo",
    role: "DOCTOR",
    name: "Dr. Fatima Zahra",
    id: "DOC-002",
    doctorId: "DOC-002",
    licenseId: "LIC-MA-20188",
    facility: "Clinique Al Farabi",
    city: "Casablanca",
    specialty: "Cardiology",
  },
  {
    username: "PH-CENTRAL",
    password: "demo",
    role: "PHARMACIST",
    name: "Pharmacie Centrale",
    id: "PH-001",
    pharmacyId: "PH-001",
    city: "Casablanca",
    licenseId: "PH-LIC-CA-001",
  },
  {
    username: "PH-AMAL",
    password: "demo",
    role: "PHARMACIST",
    name: "Pharmacie Al Amal",
    id: "PH-002",
    pharmacyId: "PH-002",
    city: "Rabat",
    licenseId: "PH-LIC-RB-002",
  },
  {
    username: "PATIENT-01",
    password: "demo",
    role: "PATIENT",
    name: "Youssef",
    id: "PAT-001",
    patientId: "PAT-001",
    cniaToken: "A•••••31",
  },
  {
    username: "PATIENT-02",
    password: "demo",
    role: "PATIENT",
    name: "Nadia",
    id: "PAT-002",
    patientId: "PAT-002",
    cniaToken: "B•••••42",
  },
  {
    username: "REG-ADMIN",
    password: "demo",
    role: "REGULATOR",
    name: "Regulatory Admin",
    id: "REG-001",
    regulatorId: "REG-001",
    department: "Direction du Médicament et de la Pharmacie",
  },
  {
    username: "ADMIN",
    password: "demo",
    role: "ADMIN",
    name: "System Administrator",
    id: "ADM-001",
    adminId: "ADM-001",
  },
];

// ---------------------------------------------------------------------------
// Mock Audit Trail Entries
// Timestamps in Nairobi time (EAT/UTC+3) for realistic Moroccan workflow.
// Note: Casablanca is WET (UTC+0) in winter, WEST (UTC+1) in summer.
// These examples use ISO 8601 UTC format for system storage.
// ---------------------------------------------------------------------------

export const MOCK_AUDIT_ENTRIES = {
  "RX-889-2624-01": [
    {
      id: "AUD-001-A",
      rxId: "RX-889-2624-01",
      action: "PRESCRIPTION_CREATED",
      actorId: "DOC-001",
      actorRole: "DOCTOR",
      actorName: "Dr. Ahmed Benali",
      facility: "Hôpital Ibn Sina, Rabat",
      timestamp: "2026-03-18T08:15:00Z", // 09:15 WET (Casablanca)
      details: "Prescription issued for Amoxicillin 500mg • 3x daily • 7 days",
      ipHash: "ip_hash_clinic_rabat_01",
      deviceInfo: "Windows 10 • Chrome 129",
    },
    {
      id: "AUD-001-B",
      rxId: "RX-889-2624-01",
      action: "PRESCRIPTION_VIEWED",
      actorId: "PH-002",
      actorRole: "PHARMACIST",
      actorName: "Pharmacie Al-Ihsan",
      facility: "Pharmacie Al-Ihsan, Casablanca",
      timestamp: "2026-03-18T10:42:00Z", // 11:42 WET (Casablanca)
      details: "Prescription retrieved via CNIE lookup (Patient token: A•••••31)",
      ipHash: "ip_hash_pharmacy_casa_02",
      deviceInfo: "Android Tablet • Custom POS",
    },
    {
      id: "AUD-001-C",
      rxId: "RX-889-2624-01",
      action: "DOCTOR_VC_VERIFIED",
      actorId:
 "SYSTEM",
      actorRole: "SYSTEM",
      actorName: "MedAxis Ledger",
      timestamp: "2026-03-18T10:42:15Z",
      details: "Doctor License VC verified. Status: VALID. Specialty: General Medicine",
      ipHash: "ip_hash_backend_server",
    },
    {
      id: "AUD-001-D",
      rxId: "RX-889-2624-01",
      action: "OTP_SENT",
      actorId: "SYSTEM",
      actorRole: "SYSTEM",
      actorName: "MedAxis Ledger",
      timestamp: "2026-03-18T10:43:00Z",
      details: "One-Time Password sent to patient phone (hash: ph_hash_001)",
      ipHash: "ip_hash_backend_server",
    },
    {
      id: "AUD-001-E",
      rxId: "RX-889-2624-01",
      action: "OTP_VERIFIED",
      actorId: "PAT-001",
      actorRole: "PATIENT",
      actorName: "Youssef",
      timestamp: "2026-03-18T10:45:30Z",
      details: "Patient OTP verified. Identity token confirmed.",
      ipHash: "ip_hash_patient_mobile_01",
      deviceInfo: "iPhone 14 • MedAxis Mobile App v2.1",
    },
    {
      id: "AUD-001-F",
      rxId: "RX-889-2624-01",
      action: "PRESCRIPTION_DISPENSED",
      actorId: "PH-002",
      actorRole: "PHARMACIST",
      actorName: "Fatima Qadiri",
      facility: "Pharmacie Al-Ihsan, Casablanca",
      timestamp: "2026-03-18T10:46:45Z",
      details: "Medication dispensed: Amoxicillin 500mg x21 tablets. Status: DISPENSED",
      ipHash: "ip_hash_pharmacy_casa_02",
      quantityDispensed: 21,
    },
  ],
  "RX-441-3817-02": [
    {
      id: "AUD-002-A",
      rxId: "RX-441-3817-02",
      action: "PRESCRIPTION_CREATED",
      actorId: "DOC-002",
      actorRole: "DOCTOR",
      actorName: "Dr. Fatima Zahra",
      facility: "Clinique Al Farabi, Casablanca",
      timestamp: "2026-03-10T13:30:00Z", // 14:30 WET
      details: "Prescription issued for Lisinopril 10mg • 1x daily • 30 days",
      ipHash: "ip_hash_clinic_casa_02",
      deviceInfo: "macOS Monterey • Safari 17",
    },
    {
      id: "AUD-002-B",
      rxId: "RX-441-3817-02",
      action: "PRESCRIPTION_VIEWED",
      actorId: "PH-003",
      actorRole: "PHARMACIST",
      actorName: "Pharmacie Miramount",
      facility: "Pharmacie Miramount, Casablanca",
      timestamp: "2026-03-11T09:02:00Z",
      details: "Prescription retrieved via CNIE lookup (Patient token: B•••••42)",
      ipHash: "ip_hash_pharmacy_casa_03",
    },
    {
      id: "AUD-002-C",
      rxId: "RX-441-3817-02",
      action: "DOCTOR_VC_VERIFIED",
      actorId: "SYSTEM",
      actorRole: "SYSTEM",
      actorName: "MedAxis Ledger",
      timestamp: "2026-03-11T09:02:15Z",
      details: "Doctor License VC verified. Status: VALID. Specialty: Cardiology",
      ipHash: "ip_hash_backend_server",
    },
    {
      id: "AUD-002-D",
      rxId: "RX-441-3817-02",
      action: "OTP_SENT",
      actorId: "SYSTEM",
      actorRole: "SYSTEM",
      actorName: "MedAxis Ledger",
      timestamp: "2026-03-11T09:03:00Z",
      details: "One-Time Password sent to patient phone (hash: ph_hash_002)",
      ipHash: "ip_hash_backend_server",
    },
    {
      id: "AUD-002-E",
      rxId: "RX-441-3817-02",
      action: "OTP_VERIFIED",
      actorId: "PAT-002",
      actorRole: "PATIENT",
      actorName: "Nadia",
      timestamp: "2026-03-11T09:05:30Z",
      details: "Patient OTP verified. Identity token confirmed.",
      ipHash: "ip_hash_patient_mobile_02",
      deviceInfo: "Samsung Galaxy S23 • MedAxis Mobile App v2.1",
    },
    {
      id: "AUD-002-F",
      rxId: "RX-441-3817-02",
      action: "PRESCRIPTION_DISPENSED",
      actorId: "PH-003",
      actorRole: "PHARMACIST",
      actorName: "Hani El-Mansouri",
      facility: "Pharmacie Miramount, Casablanca",
      timestamp: "2026-03-11T09:06:15Z",
      details: "Medication dispensed: Lisinopril 10mg x30 tablets. Status: DISPENSED",
      ipHash: "ip_hash_pharmacy_casa_03",
      quantityDispensed: 30,
    },
  ],
  "RX-550-1945-03": [
    {
      id: "AUD-003-A",
      rxId: "RX-550-1945-03",
      action: "PRESCRIPTION_CREATED",
      actorId: "DOC-003",
      actorRole: "DOCTOR",
      actorName: "Dr. Yassine Raissi",
      facility: "CHU Mohammed VI, Marrakech",
      timestamp: "2026-03-19T10:20:00Z",
      details: "Prescription issued for Metformin 1000mg • 2x daily • 30 days",
      ipHash: "ip_hash_clinic_marrakech_03",
      deviceInfo: "Windows 11 Pro • Edge 129",
    },
    {
      id: "AUD-003-B",
      rxId: "RX-550-1945-03",
      action: "PRESCRIPTION_VIEWED",
      actorId: "PH-004",
      actorRole: "PHARMACIST",
      actorName: "Pharmacie Safiya",
      facility: "Pharmacie Safiya, Marrakech",
      timestamp: "2026-03-19T14:15:00Z",
      details: "Prescription retrieved via CNIE lookup (Patient token: C•••••57)",
      ipHash: "ip_hash_pharmacy_marrakech_04",
    },
    {
      id: "AUD-003-C",
      rxId: "RX-550-1945-03",
      action: "DOCTOR_VC_VERIFIED",
      actorId: "SYSTEM",
      actorRole: "SYSTEM",
      actorName: "MedAxis Ledger",
      timestamp: "2026-03-19T14:15:15Z",
      details: "Doctor License VC verified. Status: VALID. Specialty: Endocrinology",
      ipHash: "ip_hash_backend_server",
    },
  ],
};

// ---------------------------------------------------------------------------
// In-memory mutable prescription store (for create/update operations)
// This is a copy that can be mutated during a session.
// ---------------------------------------------------------------------------

export let mutablePrescriptions = [...MOCK_PRESCRIPTIONS];

export function resetMutablePrescriptions() {
  mutablePrescriptions = [...MOCK_PRESCRIPTIONS];
}
