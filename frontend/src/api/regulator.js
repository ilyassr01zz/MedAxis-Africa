// MedAxis Africa — Regulator API (Mock Layer)
// Week 1-2: Returns mock national stats and prescription list.
// Week 3+:  Replace function bodies with Axios calls to /api/regulator/*.
//           All real calls require role: REGULATOR in the JWT.

import {
  MOCK_REGULATOR_STATS,
  mutablePrescriptions,
  MOCK_DOCTORS,
  MOCK_PHARMACIES,
} from "../utils/mock-data.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function simulateLatency(ms = 350) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// getStats
// Returns the top-level national dashboard figures and monthly trend data.
// Used by the Regulator Dashboard stats cards and bar chart.
// ---------------------------------------------------------------------------

export async function getStats() {
  await simulateLatency(400);

  return {
    success: true,
    data: MOCK_REGULATOR_STATS,
  };
}

// ---------------------------------------------------------------------------
// getPrescriptionList
// Returns a filtered and paginated list of prescriptions for the regulator
// audit table. Supported filters:
//   - status   (string)  — e.g. "ACTIVE", "DISPENSED", "FLAGGED"
//   - doctorId (string)  — filters to a single doctor
//   - dateFrom (string)  — ISO date string, inclusive lower bound
//   - dateTo   (string)  — ISO date string, inclusive upper bound
//   - query    (string)  — free-text search against rxId, drugName, doctorName
//   - page     (number)  — 1-based page index (default 1)
//   - pageSize (number)  — records per page (default 20)
// ---------------------------------------------------------------------------

export async function getPrescriptionList(filters = {}) {
  await simulateLatency(350);

  const {
    status,
    doctorId,
    dateFrom,
    dateTo,
    query,
    page = 1,
    pageSize = 20,
  } = filters;

  let results = [...mutablePrescriptions];

  // Filter by status
  if (status && status !== "ALL") {
    results = results.filter(
      (rx) => rx.status.toUpperCase() === status.toUpperCase()
    );
  }

  // Filter by doctor
  if (doctorId) {
    results = results.filter((rx) => rx.doctorId === doctorId);
  }

  // Filter by date range (against issuedAt)
  if (dateFrom) {
    const from = new Date(dateFrom).getTime();
    results = results.filter(
      (rx) => new Date(rx.issuedAt).getTime() >= from
    );
  }

  if (dateTo) {
    const to = new Date(dateTo).getTime();
    results = results.filter(
      (rx) => new Date(rx.issuedAt).getTime() <= to
    );
  }

  // Free-text search
  if (query && query.trim().length > 0) {
    const q = query.trim().toLowerCase();
    results = results.filter(
      (rx) =>
        rx.rxId.toLowerCase().includes(q) ||
        rx.drugName.toLowerCase().includes(q) ||
        rx.doctorName.toLowerCase().includes(q) ||
        rx.patientToken.toLowerCase().includes(q)
    );
  }

  // Sort newest first
  results.sort(
    (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
  );

  // Pagination
  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;
  const paginated = results.slice(offset, offset + pageSize);

  return {
    success: true,
    data: {
      prescriptions: paginated,
      pagination: {
        total,
        totalPages,
        currentPage: safePage,
        pageSize,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// getDoctorList
// Returns the registered doctor list for the regulator license management
// table. Filters: status, city, specialty.
// ---------------------------------------------------------------------------

export async function getDoctorList(filters = {}) {
  await simulateLatency(300);

  const { status, city, specialty, query } = filters;
  let results = [...MOCK_DOCTORS];

  if (status && status !== "ALL") {
    results = results.filter(
      (d) => d.status.toUpperCase() === status.toUpperCase()
    );
  }

  if (city) {
    results = results.filter(
      (d) => d.city.toLowerCase() === city.toLowerCase()
    );
  }

  if (specialty) {
    results = results.filter((d) =>
      d.specialty.toLowerCase().includes(specialty.toLowerCase())
    );
  }

  if (query && query.trim().length > 0) {
    const q = query.trim().toLowerCase();
    results = results.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.licenseId.toLowerCase().includes(q) ||
        d.facility.toLowerCase().includes(q)
    );
  }

  return {
    success: true,
    data: results,
  };
}

// ---------------------------------------------------------------------------
// getPharmacyList
// Returns the registered pharmacy list for the regulator.
// ---------------------------------------------------------------------------

export async function getPharmacyList(filters = {}) {
  await simulateLatency(300);

  const { status, city, query } = filters;
  let results = [...MOCK_PHARMACIES];

  if (status && status !== "ALL") {
    results = results.filter(
      (p) => p.status.toUpperCase() === status.toUpperCase()
    );
  }

  if (city) {
    results = results.filter(
      (p) => p.city.toLowerCase() === city.toLowerCase()
    );
  }

  if (query && query.trim().length > 0) {
    const q = query.trim().toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.licenseId.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q)
    );
  }

  return {
    success: true,
    data: results,
  };
}
