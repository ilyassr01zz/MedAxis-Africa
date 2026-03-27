const { success, error } = require('../utils/response.utils');
const prisma = require('../utils/prisma');

// ---------------------------------------------------------------------------
// GET /api/regulator/stats
// Accepts: ?region=X&status=Y&dateFrom=Z&dateTo=W
// ---------------------------------------------------------------------------
const getStats = async (req, res) => {
  try {
    const { region, status, dateFrom, dateTo } = req.query;

    // Base where clause for prescriptions — region + date filters only
    const baseConditions = [];
    if (region && region !== 'All Morocco') {
      baseConditions.push({ doctor: { region } });
    }
    if (dateFrom || dateTo) {
      const dateFilter = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      baseConditions.push({ created_at: dateFilter });
    }
    const baseWhere = baseConditions.length > 0 ? { AND: baseConditions } : {};

    // Total prescriptions respects the optional status filter
    const totalConditions = [...baseConditions];
    if (status && status !== 'All Records') {
      totalConditions.push({ status: status.toUpperCase() });
    }
    const totalWhere = totalConditions.length > 0 ? { AND: totalConditions } : {};

    const [
      total_prescriptions,
      active_prescriptions,
      dispensed_prescriptions,
      expired_prescriptions,
      cancelled_prescriptions,
      disputed,
      total_doctors,
      active_doctors,
      expired_doctors,
      suspended_doctors,
      total_pharmacists,
      total_patients,
      doctorsForRegion,
    ] = await Promise.all([
      prisma.prescription.count({ where: totalWhere }),
      prisma.prescription.count({ where: { AND: [...baseConditions, { status: 'ACTIVE' }] } }),
      prisma.prescription.count({ where: { AND: [...baseConditions, { status: 'DISPENSED' }] } }),
      prisma.prescription.count({ where: { AND: [...baseConditions, { status: 'EXPIRED' }] } }),
      prisma.prescription.count({ where: { AND: [...baseConditions, { status: 'CANCELLED' }] } }),
      prisma.prescription.count({ where: { AND: [...baseConditions, { is_disputed: true, is_reviewed: false }] } }),
      prisma.doctor.count(),
      prisma.doctor.count({ where: { status: 'ACTIVE' } }),
      prisma.doctor.count({ where: { status: 'EXPIRED' } }),
      prisma.doctor.count({ where: { status: 'SUSPENDED' } }),
      prisma.pharmacist.count(),
      prisma.patient.count(),
      // Always fetch all regions regardless of filter
      prisma.doctor.findMany({
        select: { region: true, _count: { select: { prescriptions: true } } },
      }),
    ]);

    // Aggregate prescriptions count by region
    const regionMap = {};
    doctorsForRegion.forEach(d => {
      if (d.region) {
        regionMap[d.region] = (regionMap[d.region] || 0) + d._count.prescriptions;
      }
    });
    const prescriptions_by_region = Object.entries(regionMap)
      .map(([r, count]) => ({ region: r, count }))
      .sort((a, b) => b.count - a.count);

    return success(res, {
      total_prescriptions,
      active_prescriptions,
      dispensed_prescriptions,
      expired_prescriptions,
      cancelled_prescriptions,
      disputed,
      total_doctors,
      active_doctors,
      expired_doctors,
      suspended_doctors,
      total_pharmacists,
      total_patients,
      prescriptions_by_region,
      // Legacy compat fields (dashboard reads these)
      total: total_prescriptions,
      doctors: total_doctors,
      pharmacies: total_pharmacists,
    });
  } catch (err) {
    console.error('getStats error:', err);
    return error(res, 'Failed to fetch stats', 500);
  }
};

// ---------------------------------------------------------------------------
// GET /api/regulator/prescriptions
// Accepts: ?region=X&status=Y&search=Z&page=1&limit=10
// ---------------------------------------------------------------------------
const getAllPrescriptions = async (req, res) => {
  try {
    const { region, status, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    if (region && region !== 'All Morocco') {
      conditions.push({ doctor: { region } });
    }
    if (status && status !== 'All Records') {
      conditions.push({ status: status.toUpperCase() });
    }
    if (search) {
      conditions.push({
        OR: [
          { rx_id: { contains: search } },
          { drug_name: { contains: search } },
          { doctor: { user: { first_name: { contains: search } } } },
        ],
      });
    }
    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        include: {
          doctor: {
            include: { user: { select: { first_name: true, last_name: true } } },
          },
          patient: { select: { id: true } },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.prescription.count({ where }),
    ]);

    const formatted = prescriptions.map(p => ({
      rx_id: p.rx_id,
      doctor_name: `Dr. ${p.doctor?.user?.first_name || 'Unknown'}${p.doctor?.user?.last_name ? ' ' + p.doctor.user.last_name : ''}`,
      patient_token: `PAT-****-${p.patient?.id?.slice(-4)?.toUpperCase() || '0000'}`,
      drug_name: p.drug_name,
      created_at: p.created_at,
      expiry_date: p.expiry_date,
      region: p.doctor?.region || '—',
      status: p.status,
    }));

    return success(res, {
      prescriptions: formatted,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('getAllPrescriptions error:', err);
    return error(res, 'Failed to fetch prescriptions', 500);
  }
};

// ---------------------------------------------------------------------------
// GET /api/regulator/doctors
// Accepts: ?region=X&license_status=Y&search=Z&page=1&limit=10
// ---------------------------------------------------------------------------
const getDoctors = async (req, res) => {
  try {
    const { region, license_status, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [];
    if (region && region !== 'All Morocco') {
      conditions.push({ region });
    }
    if (license_status && license_status !== 'All') {
      conditions.push({ status: license_status.toUpperCase() });
    }
    if (search) {
      conditions.push({
        OR: [
          { license_number: { contains: search } },
          { specialty: { contains: search } },
          { user: { first_name: { contains: search } } },
          { user: { last_name: { contains: search } } },
        ],
      });
    }
    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [doctors, total] = await Promise.all([
      prisma.doctor.findMany({
        where,
        include: { user: { select: { first_name: true, last_name: true } } },
        orderBy: { created_at: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.doctor.count({ where }),
    ]);

    const formatted = doctors.map(d => ({
      id: d.id,
      full_name: `Dr. ${d.user?.first_name || ''}${d.user?.last_name ? ' ' + d.user.last_name : ''}`.trim(),
      license_number: d.license_number,
      specialty: d.specialty,
      region: d.region,
      license_status: d.status,
      created_at: d.created_at,
    }));

    return success(res, { doctors: formatted, total });
  } catch (err) {
    console.error('getDoctors error:', err);
    return error(res, 'Failed to fetch doctors', 500);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/regulator/doctors/:doctor_id/approve
// ---------------------------------------------------------------------------
const approveDoctor = async (req, res) => {
  try {
    const { doctor_id } = req.params;
    const doctor = await prisma.doctor.findUnique({ where: { id: doctor_id } });
    if (!doctor) return error(res, 'Doctor not found', 404);

    const old_status = doctor.status;
    await prisma.doctor.update({ where: { id: doctor_id }, data: { status: 'ACTIVE' } });

    await prisma.doctorStatusChange.create({
      data: {
        doctor_id,
        old_status,
        new_status: 'ACTIVE',
        reason: 'License approved by regulator',
        changed_by: req.user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        user_id: req.user.id,
        role: req.user.role,
        endpoint: `/api/regulator/doctors/${doctor_id}/approve`,
        method: 'PATCH',
        status_code: 200,
        action: 'DOCTOR_LICENSE_APPROVED',
      },
    });

    return success(res, { doctor_id, license_status: 'ACTIVE' });
  } catch (err) {
    console.error('approveDoctor error:', err);
    return error(res, 'Failed to approve doctor', 500);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/regulator/doctors/:doctor_id/revoke
// ---------------------------------------------------------------------------
const revokeDoctor = async (req, res) => {
  try {
    const { doctor_id } = req.params;
    const doctor = await prisma.doctor.findUnique({ where: { id: doctor_id } });
    if (!doctor) return error(res, 'Doctor not found', 404);

    const old_status = doctor.status;
    await prisma.doctor.update({ where: { id: doctor_id }, data: { status: 'SUSPENDED' } });

    await prisma.doctorStatusChange.create({
      data: {
        doctor_id,
        old_status,
        new_status: 'SUSPENDED',
        reason: 'License revoked by regulator',
        changed_by: req.user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        user_id: req.user.id,
        role: req.user.role,
        endpoint: `/api/regulator/doctors/${doctor_id}/revoke`,
        method: 'PATCH',
        status_code: 200,
        action: 'DOCTOR_LICENSE_REVOKED',
      },
    });

    return success(res, { doctor_id, license_status: 'SUSPENDED' });
  } catch (err) {
    console.error('revokeDoctor error:', err);
    return error(res, 'Failed to revoke doctor', 500);
  }
};

// ---------------------------------------------------------------------------
// GET /api/regulator/disputes
// ---------------------------------------------------------------------------
const getDisputes = async (req, res) => {
  try {
    const disputes = await prisma.prescription.findMany({
      where: { is_disputed: true },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
      orderBy: { updated_at: 'desc' },
    });

    const formatted = disputes.map(p => ({
      rx_id: p.rx_id,
      drug_name: p.drug_name,
      dosage: p.dosage,
      frequency: p.frequency,
      duration_days: p.duration_days,
      created_at: p.created_at,
      updated_at: p.updated_at,
      expiry_date: p.expiry_date,
      status: p.status,
      is_reviewed: p.is_reviewed,
      doctor_name: `Dr. ${p.doctor?.user?.first_name || 'Unknown'}`,
      doctor_specialty: p.doctor?.specialty || '',
      doctor_facility: p.doctor?.facility || '',
      patient_token: `PAT-****-${p.patient?.id?.slice(-4)?.toUpperCase() || '0000'}`,
      patient_first_name: p.patient?.user?.first_name || 'Patient',
      disputed_at: p.updated_at,
    }));

    return success(res, { disputes: formatted });
  } catch (err) {
    console.error('getDisputes error:', err);
    return error(res, 'Failed to fetch disputes', 500);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/regulator/disputes/:rx_id/review
// ---------------------------------------------------------------------------
const markDisputeReviewed = async (req, res) => {
  try {
    const { rx_id } = req.params;
    const prescription = await prisma.prescription.findUnique({ where: { rx_id } });
    if (!prescription) return error(res, 'Prescription not found', 404);

    await prisma.prescription.update({ where: { rx_id }, data: { is_reviewed: true } });

    await prisma.auditLog.create({
      data: {
        user_id: req.user.id,
        role: req.user.role,
        endpoint: `/api/regulator/disputes/${rx_id}/review`,
        method: 'PATCH',
        status_code: 200,
        action: 'DISPUTE_REVIEWED',
        rx_id,
      },
    });

    return success(res, { message: 'Dispute marked as reviewed', rx_id, is_reviewed: true });
  } catch (err) {
    console.error('markDisputeReviewed error:', err);
    return error(res, 'Failed to mark dispute as reviewed: ' + err.message, 500);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/regulator/doctors/:doctor_id/status  (legacy — keep for compat)
// ---------------------------------------------------------------------------
const updateDoctorStatus = async (req, res) => {
  try {
    const { doctor_id } = req.params;
    const { status, reason } = req.body;
    const validStatuses = ['ACTIVE', 'SUSPENDED', 'REVOKED'];
    if (!validStatuses.includes(status)) return error(res, 'Invalid status', 400);

    const doctor = await prisma.doctor.findUnique({ where: { id: doctor_id } });
    if (!doctor) return error(res, 'Doctor not found', 404);

    await prisma.doctor.update({ where: { id: doctor_id }, data: { status } });

    await prisma.doctorStatusChange.create({
      data: {
        doctor_id,
        old_status: doctor.status,
        new_status: status,
        reason: reason || 'No reason provided',
        changed_by: req.user.id,
      },
    });

    if (status === 'REVOKED') {
      await prisma.prescription.updateMany({
        where: { doctor_id, status: 'ACTIVE' },
        data: { status: 'FLAGGED', is_flagged: true },
      });
    }

    return success(res, { message: `Doctor status updated to ${status}` });
  } catch (err) {
    return error(res, 'Failed to update doctor status', 500);
  }
};

// ---------------------------------------------------------------------------
// GET /api/regulator/pharmacists
// ---------------------------------------------------------------------------
const getPharmacists = async (req, res) => {
  try {
    const pharmacists = await prisma.pharmacist.findMany({
      include: {
        user: { select: { first_name: true, last_name: true } },
        pharmacy: { select: { name: true, region: true, status: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    const formatted = pharmacists.map(p => ({
      id: p.id,
      full_name: `${p.user?.first_name || ''}${p.user?.last_name ? ' ' + p.user.last_name : ''}`.trim() || 'Unknown',
      license_number: p.license_number,
      facility: p.pharmacy?.name || '—',
      region: p.pharmacy?.region || '—',
      license_status: p.pharmacy?.status || 'ACTIVE',
      created_at: p.created_at,
    }));

    return success(res, { pharmacists: formatted, total: formatted.length });
  } catch (err) {
    console.error('getPharmacists error:', err);
    return error(res, 'Failed to fetch pharmacists', 500);
  }
};

module.exports = {
  getStats,
  getAllPrescriptions,
  getDoctors,
  approveDoctor,
  revokeDoctor,
  getPharmacists,
  getDisputes,
  markDisputeReviewed,
  updateDoctorStatus,
};
