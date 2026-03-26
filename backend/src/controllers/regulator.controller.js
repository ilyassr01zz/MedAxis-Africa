const { success, error } = require('../utils/response.utils');
const prisma = require('../utils/prisma');

const getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [total, todayCount, dispensed, flagged, disputed, doctors, pharmacies] = await Promise.all([
      prisma.prescription.count(),
      prisma.prescription.count({ where: { created_at: { gte: today } } }),
      prisma.prescription.count({ where: { status: 'DISPENSED' } }),
      prisma.prescription.count({ where: { is_flagged: true } }),
      prisma.prescription.count({ where: { is_disputed: true, is_reviewed: false } }),
      prisma.doctor.count(),
      prisma.pharmacy.count()
    ]);
    console.log('Stats:', { total, todayCount, dispensed, flagged, disputed, doctors, pharmacies });
    return success(res, { total, todayCount, dispensed, flagged, disputed, doctors, pharmacies });
  } catch (err) {
    console.error('getStats error:', err);
    return error(res, 'Failed to fetch stats', 500);
  }
};

const getAllPrescriptions = async (req, res) => {
  try {
    const prescriptions = await prisma.prescription.findMany({
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 50
    });
    return success(res, { prescriptions });
  } catch (err) {
    return error(res, 'Failed to fetch prescriptions', 500);
  }
};

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
        changed_by: req.user.id
      }
    });
    if (status === 'REVOKED') {
      await prisma.prescription.updateMany({
        where: { doctor_id, status: 'ACTIVE' },
        data: { status: 'FLAGGED', is_flagged: true }
      });
    }
    return success(res, { message: `Doctor status updated to ${status}` });
  } catch (err) {
    return error(res, 'Failed to update doctor status', 500);
  }
};

const getDisputes = async (req, res) => {
  try {
    console.log('=== GET DISPUTES CALLED ===');
    console.log('User:', req.user?.id, req.user?.role);

    const disputes = await prisma.prescription.findMany({
      where: { is_disputed: true },
      include: {
        doctor: { include: { user: true } },
        patient: { include: { user: true } },
      },
      orderBy: { updated_at: 'desc' }
    });

    console.log('Disputed prescriptions found:', disputes.length);
    console.log('Raw disputes:', JSON.stringify(disputes.map(d => ({ rx_id: d.rx_id, is_disputed: d.is_disputed, status: d.status })), null, 2));

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

const markDisputeReviewed = async (req, res) => {
  try {
    const { rx_id } = req.params;
    console.log('=== MARK REVIEWED ===', rx_id);

    const prescription = await prisma.prescription.findUnique({ where: { rx_id } });
    if (!prescription) {
      console.log('Prescription not found:', rx_id);
      return error(res, 'Prescription not found', 404);
    }

    console.log('Found prescription, is_reviewed before:', prescription.is_reviewed);

    const updated = await prisma.prescription.update({
      where: { rx_id },
      data: { is_reviewed: true }
    });

    console.log('Updated, is_reviewed after:', updated.is_reviewed);

    await prisma.auditLog.create({
      data: {
        user_id: req.user.id,
        role: req.user.role,
        endpoint: `/api/regulator/disputes/${rx_id}/review`,
        method: 'PATCH',
        status_code: 200,
        action: 'DISPUTE_REVIEWED',
        rx_id
      }
    });

    return success(res, { message: 'Dispute marked as reviewed', rx_id, is_reviewed: true });
  } catch (err) {
    console.error('markDisputeReviewed error FULL:', err);
    return error(res, 'Failed to mark dispute as reviewed: ' + err.message, 500);
  }
};

module.exports = { getStats, getAllPrescriptions, updateDoctorStatus, getDisputes, markDisputeReviewed };
