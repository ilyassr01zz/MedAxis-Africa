const prisma = require('../utils/prisma');
const { success, error } = require('../utils/response.utils');

async function getDispensedToday(req, res) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const events = await prisma.dispensingEvent.findMany({
      where: { created_at: { gte: startOfToday } },
      select: { quantity_dispensed: true },
    });

    const total_items = events.reduce((sum, e) => sum + e.quantity_dispensed, 0);
    const dispensing_count = events.length;

    return success(res, { total_items, dispensing_count });
  } catch (err) {
    return error(res, 'Failed to fetch dispensed today count', 500);
  }
}

async function getPendingVerifications(req, res) {
  try {
    const now = new Date();
    const count = await prisma.prescription.count({
      where: { status: 'ACTIVE', expiry_date: { gt: now } },
    });
    return success(res, { count });
  } catch (err) {
    return error(res, 'Failed to fetch pending verifications count', 500);
  }
}

async function getStockAlerts(req, res) {
  try {
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const events = await prisma.dispensingEvent.findMany({
      where: { created_at: { gte: last30Days } },
      include: { prescription: { select: { drug_name: true } } },
    });

    const freqMap = {};
    for (const e of events) {
      const name = e.prescription?.drug_name;
      if (!name) continue;
      freqMap[name] = (freqMap[name] || 0) + e.quantity_dispensed;
    }

    const alert_count = Object.values(freqMap).filter(qty => qty > 10).length;
    return success(res, { alert_count });
  } catch (err) {
    return error(res, 'Failed to fetch stock alerts count', 500);
  }
}

async function getTodaySummary(req, res) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const now = new Date();

    const [todayEvents, prescriptions_pending, otps_pending] = await Promise.all([
      prisma.dispensingEvent.findMany({
        where: { created_at: { gte: startOfToday } },
        include: { prescription: { select: { patient_id: true } } },
      }),
      prisma.prescription.count({
        where: { status: 'ACTIVE', expiry_date: { gt: now } },
      }),
      prisma.auditLog.count({
        where: { action: 'OTP_SENT', created_at: { gte: startOfToday } },
      }),
    ]);

    const patientSet = new Set(todayEvents.map(e => e.prescription?.patient_id).filter(Boolean));
    const patients_served = patientSet.size;

    return success(res, { patients_served, prescriptions_pending, otps_pending });
  } catch (err) {
    return error(res, 'Failed to fetch today summary', 500);
  }
}

async function getRecentActivity(req, res) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { role: 'PHARMACIST' },
      orderBy: { created_at: 'desc' },
      take: 10,
    });

    const DOT_COLORS = {
      PRESCRIPTION_DISPENSED: '#0D7C7C',
      PRESCRIPTION_FLAGGED:   '#E53E3E',
      OTP_VERIFIED:           '#16A34A',
      OTP_SENT:               '#F0A500',
      IDENTITY_VERIFIED:      '#0D7C7C',
    };

    const DESCRIPTIONS = {
      PRESCRIPTION_DISPENSED: 'Prescription dispensed',
      PRESCRIPTION_FLAGGED:   'Prescription flagged for regulator review',
      OTP_VERIFIED:           'Patient identity verified via OTP',
      OTP_SENT:               'OTP sent to patient',
      IDENTITY_VERIFIED:      'Patient identity confirmed',
    };

    const activities = logs.map(log => ({
      id:          log.id,
      rx_id:       log.rx_id || null,
      action:      log.action,
      description: DESCRIPTIONS[log.action] || log.action.replace(/_/g, ' ').toLowerCase(),
      dot_color:   DOT_COLORS[log.action] || '#6B7280',
      time:        log.created_at.toISOString(),
    }));

    return success(res, { activities });
  } catch (err) {
    return error(res, 'Failed to fetch recent activity', 500);
  }
}

module.exports = {
  getDispensedToday,
  getPendingVerifications,
  getStockAlerts,
  getTodaySummary,
  getRecentActivity,
};
