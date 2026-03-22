const { success, error } = require('../utils/response.utils');
const prisma = require('../utils/prisma');

const getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [total, todayCount, dispensed, flagged, doctors, pharmacies] = await Promise.all([
      prisma.prescription.count(),
      prisma.prescription.count({ where: { created_at: { gte: today } } }),
      prisma.prescription.count({ where: { status: 'DISPENSED' } }),
      prisma.prescription.count({ where: { is_flagged: true } }),
      prisma.doctor.count(),
      prisma.pharmacy.count()
    ]);
    return success(res, { total, todayCount, dispensed, flagged, doctors, pharmacies });
  } catch (err) {
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

module.exports = { getStats, getAllPrescriptions, updateDoctorStatus };
