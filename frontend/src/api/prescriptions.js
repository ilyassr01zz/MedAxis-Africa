// MedAxis Africa — Prescriptions API (Mock Layer)
// Week 1-2: All functions operate against the mutable in-memory store.
// Week 3+:  Replace each function body with real Axios calls.
//           All real calls must include Authorization: Bearer <token> headers.

import {
  mutablePrescriptions,
  MOCK_AUDIT_ENTRIES,
} from "../utils/mock-data.js";
import { getSessionToken } from "./auth.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function simulateLatency(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let _rxCounter = 900;

function generateRxId() {
  _rxCounter += 1;
  const segment1 = String(_rxCounter).padStart(3, "0");
  const segment2 = String(Math.floor(1000 + Math.random() * 9000));
  const segment3 = String(Math.floor(10 + Math.random() * 90));
  return `RX-${segment1}-${segment2}-${segment3}`;
}

function isoNow() {
  return new Date().toISOString();
}

function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// createPrescription
// Called by the Doctor portal after the form is submitted.
// Expects: { patientCniaHash, patientFirstName, patientToken, drugCode,
//            drugName, dosage, frequency, durationDays }
// Returns: the newly created prescription object.
// ---------------------------------------------------------------------------

export async function createPrescription(data) {
  await simulateLatency(450);

  const session = getSessionToken();
  if (!session) {
    return { success: false, error: "Unauthenticated. Please log in." };
  }

  const {
    patientCniaHash,
    patientFirstName,
    patientToken,
    drugCode,
    drugName,
    dosage,
    frequency,
    durationDays = 30,
    doctorId,
    doctorName,
  } = data;

  if (!patientCniaHash || !drugCode || !drugName || !dosage) {
    return {
      success: false,
      error:
        "Missing required fields: patientCniaHash, drugCode, drugName, dosage.",
    };
  }

  const now = isoNow();
  const prescription = {
    rxId: generateRxId(),
    doctorId: doctorId || "DOC-001",
    doctorName: doctorName || "Dr. Ahmed Benali",
    patientId: patientCniaHash,
    patientToken: patientToken || "•••••",
    patientFirstName: patientFirstName || "Patient",
    drugCode,
    drugName,
    dosage,
    frequency: frequency || "As prescribed",
    duration: `${durationDays} days`,
    status: "ACTIVE",
    issuedAt: now,
    expiresAt: addDays(now, Number(durationDays)),
    notes: null,
  };

  mutablePrescriptions.unshift(prescription);

  return {
    success: true,
    data: prescription,
  };
}

// ---------------------------------------------------------------------------
// getMyPrescriptions
// Returns prescriptions issued by the currently authenticated doctor.
// Filtered by doctorId passed as argument (from the session user object).
// ---------------------------------------------------------------------------

export async function getMyPrescriptions(doctorId) {
  await simulateLatency(300);

  if (!doctorId) {
    return { success: false, error: "doctorId is required." };
  }

  const results = mutablePrescriptions.filter(
    (rx) => rx.doctorId === doctorId
  );

  return {
    success: true,
    data: results,
  };
}

// ---------------------------------------------------------------------------
// getByPatientCnie
// Used by the Pharmacy portal. Returns all non-CANCELLED prescriptions
// belonging to the patient identified by a CNIE hash or masked token.
// ---------------------------------------------------------------------------

export async function getByPatientCnie(cniaHashOrToken) {
  await simulateLatency(400);

  if (!cniaHashOrToken) {
    return { success: false, error: "CNIE hash or token is required." };
  }

  const query = cniaHashOrToken.trim().toLowerCase();

  const results = mutablePrescriptions.filter((rx) => {
    const tokenMatch = rx.patientToken
      ?.toLowerCase()
      .includes(query.replace(/•/g, "").replace(/\*/g, ""));
    const hashMatch = rx.patientId?.toLowerCase().includes(query);
    // Also allow lookup by the original numeric portion at end of masked token
    const suffixMatch =
      query.length <= 4 &&
      (rx.patientToken?.endsWith(query) || rx.patientId?.endsWith(query));
    return (tokenMatch || hashMatch || suffixMatch) && rx.status !== "CANCELLED";
  });

  if (results.length === 0) {
    return {
      success: false,
      error:
        "No prescriptions found for the provided CNIE. Verify the number and try again.",
    };
  }

  return {
    success: true,
    data: results,
  };
}

// ---------------------------------------------------------------------------
// getPatientPrescriptions
// Returns all prescriptions for a specific patient — used by Patient portal.
// ---------------------------------------------------------------------------

export async function getPatientPrescriptions(patientId) {
  await simulateLatency(300);

  if (!patientId) {
    return { success: false, error: "patientId is required." };
  }

  const results = mutablePrescriptions.filter(
    (rx) => rx.patientId === patientId || rx.patientToken?.includes(patientId)
  );

  return {
    success: true,
    data: results,
  };
}

// ---------------------------------------------------------------------------
// dispensePrescription
// Marks a prescription as DISPENSED. Called after the three-check verification.
// Expects: rxId (string), data: { pharmacistId, pharmacyName }
// ---------------------------------------------------------------------------

export async function dispensePrescription(rxId, data = {}) {
  await simulateLatency(400);

  const index = mutablePrescriptions.findIndex((rx) => rx.rxId === rxId);

  if (index === -1) {
    return { success: false, error: `Prescription ${rxId} not found.` };
  }

  const rx = mutablePrescriptions[index];

  if (rx.status === "DISPENSED") {
    return {
      success: false,
      error: `Prescription ${rxId} has already been dispensed. It cannot be reused.`,
    };
  }

  if (rx.status === "EXPIRED") {
    return {
      success: false,
      error: `Prescription ${rxId} has expired and cannot be dispensed.`,
    };
  }

  if (rx.status === "CANCELLED") {
    return {
      success: false,
      error: `Prescription ${rxId} has been cancelled.`,
    };
  }

  const updated = {
    ...rx,
    status: "DISPENSED",
    dispensedAt: isoNow(),
    dispensedBy: data.pharmacistId || "PH-001",
    dispensedPharmacy: data.pharmacyName || "Pharmacie Centrale",
  };

  mutablePrescriptions[index] = updated;

  return {
    success: true,
    data: updated,
  };
}

// ---------------------------------------------------------------------------
// cancelPrescription
// Marks a prescription as CANCELLED. Only the issuing doctor may cancel.
// ---------------------------------------------------------------------------

export async function cancelPrescription(rxId) {
  await simulateLatency(350);

  const index = mutablePrescriptions.findIndex((rx) => rx.rxId === rxId);

  if (index === -1) {
    return { success: false, error: `Prescription ${rxId} not found.` };
  }

  const rx = mutablePrescriptions[index];

  if (rx.status === "DISPENSED") {
    return {
      success: false,
      error:
        "A dispensed prescription cannot be cancelled. Contact a regulator if needed.",
    };
  }

  if (rx.status === "CANCELLED") {
    return {
      success: false,
      error: `Prescription ${rxId} is already cancelled.`,
    };
  }

  const updated = {
    ...rx,
    status: "CANCELLED",
    cancelledAt: isoNow(),
  };

  mutablePrescriptions[index] = updated;

  return {
    success: true,
    data: updated,
  };
}

// ---------------------------------------------------------------------------
// getAuditTrail
// Returns the audit log entries for a specific prescription.
// If no real entries exist for the rxId, a synthetic entry is returned.
// ---------------------------------------------------------------------------

export async function getAuditTrail(rxId) {
  await simulateLatency(300);

  if (!rxId) {
    return { success: false, error: "rxId is required." };
  }

  const entries = MOCK_AUDIT_ENTRIES[rxId];

  if (entries && entries.length > 0) {
    return { success: true, data: entries };
  }

  // Fallback: synthesise a creation entry from the prescription record.
  const rx = mutablePrescriptions.find((r) => r.rxId === rxId);

  if (!rx) {
    return {
      success: false,
      error: `No audit trail found for prescription ${rxId}.`,
    };
  }

  const syntheticEntries = [
    {
      id: `AUD-${rxId}-A`,
      rxId,
      action: "PRESCRIPTION_CREATED",
      actorId: rx.doctorId,
      actorRole: "DOCTOR",
      actorName: rx.doctorName,
      timestamp: rx.issuedAt,
      details: `Prescription issued for ${rx.drugName}.`,
      ipHash: "ip_hash_prototype",
    },
  ];

  if (rx.status === "DISPENSED") {
    syntheticEntries.push({
      id: `AUD-${rxId}-B`,
      rxId,
      action: "PRESCRIPTION_DISPENSED",
      actorId: rx.dispensedBy || "PH-001",
      actorRole: "PHARMACIST",
      actorName: rx.dispensedPharmacy || "Pharmacie Centrale",
      timestamp: rx.dispensedAt || isoNow(),
      details: `Medication dispensed. Status set to DISPENSED.`,
      ipHash: "ip_hash_prototype",
    });
  }

  return { success: true, data: syntheticEntries };
}
