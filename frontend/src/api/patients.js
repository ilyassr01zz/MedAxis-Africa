// MedAxis Africa — Patients API (Mock Layer)
// Week 1-2: Returns mock patient tokens and first names only.
// Week 3+:  Replace function bodies with Axios calls to /api/patients/*.
//
// Privacy rule: Raw CNIE numbers are NEVER returned from any function here.
// Only masked tokens (e.g. "A•••••31") and first names are exposed.

import { MOCK_PATIENTS } from "../utils/mock-data.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function simulateLatency(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// searchPatient
// Looks up a patient by their CNIE input. The CNIE itself is never stored or
// returned. The function returns the masked token and first name only.
//
// Accepts raw CNIE strings like "AB123456" — matches against known suffixes.
// In the pharmacy portal this drives the CNIE input field lookup.
// ---------------------------------------------------------------------------

export async function searchPatient(cnie) {
  await simulateLatency(350);

  if (!cnie || cnie.trim().length < 4) {
    return {
      success: false,
      error: "Please enter a valid CNIE number (minimum 4 characters).",
    };
  }

  const input = cnie.trim().toLowerCase();

  // Attempt to match against the known suffix embedded in each token.
  // Token format is "X•••••NN" where NN is the last 2 digits of the CNIE.
  const patient = MOCK_PATIENTS.find((p) => {
    const tokenSuffix = p.cniaToken.replace(/[^0-9]/g, ""); // extract digits
    const inputSuffix = input.replace(/[^0-9]/g, "").slice(-2);
    return (
      tokenSuffix === inputSuffix ||
      p.cniaHash.includes(input) ||
      // Allow demo shortcodes: "A31", "B42", "C57", "D68"
      p.cniaToken.toLowerCase().startsWith(input.charAt(0)) &&
        p.cniaToken.endsWith(input.replace(/[^0-9]/g, "").slice(-2))
    );
  });

  // Fallback: if no match, cycle through patients deterministically based on
  // the last character of the input so every CNIE entry works in the demo.
  const fallbackIndex =
    input.charCodeAt(input.length - 1) % MOCK_PATIENTS.length;
  const resolved = patient || MOCK_PATIENTS[fallbackIndex];

  return {
    success: true,
    data: {
      // ONLY the masked token and first name are returned — no raw PII.
      token: resolved.cniaToken,
      firstName: resolved.firstName,
      patientId: resolved.id,
      insuranceId: resolved.insuranceId,
    },
  };
}

// ---------------------------------------------------------------------------
// getPatientSummary
// Returns a minimal patient profile for display in the pharmacy verification
// card. Same privacy constraints apply: no raw CNIE, no last name.
// ---------------------------------------------------------------------------

export async function getPatientSummary(patientId) {
  await simulateLatency(250);

  if (!patientId) {
    return { success: false, error: "patientId is required." };
  }

  const patient = MOCK_PATIENTS.find((p) => p.id === patientId);

  if (!patient) {
    return { success: false, error: `Patient ${patientId} not found.` };
  }

  return {
    success: true,
    data: {
      token: patient.cniaToken,
      firstName: patient.firstName,
      patientId: patient.id,
      insuranceId: patient.insuranceId,
    },
  };
}
