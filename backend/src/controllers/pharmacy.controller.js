const prisma = require('../utils/prisma');
const { success, error } = require('../utils/response.utils');

// ── Legacy endpoints (kept for compatibility) ─────────────────────────────────

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
    return success(res, { alert_count: 0 });
  } catch (err) {
    return error(res, 'Failed to fetch stock alerts count', 500);
  }
}

async function getTodaySummary(req, res) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayEvents = await prisma.dispensingEvent.findMany({
      where: { created_at: { gte: startOfToday } },
      include: { prescription: { select: { patient_id: true } } },
    });

    const patientSet = new Set(todayEvents.map(e => e.prescription?.patient_id).filter(Boolean));
    const patients_served = patientSet.size;

    return success(res, { patients_served });
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

    const activities = logs.map(log => ({
      id:          log.id,
      rx_id:       log.rx_id || null,
      action:      log.action,
      description: log.action.replace(/_/g, ' ').toLowerCase(),
      dot_color:   '#0D7C7C',
      time:        log.created_at.toISOString(),
    }));

    return success(res, { activities });
  } catch (err) {
    return error(res, 'Failed to fetch recent activity', 500);
  }
}

// ── New endpoints ─────────────────────────────────────────────────────────────

async function getDashboardKPIs(req, res) {
  try {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const [dispensesToday, activeQueueCount, flaggedAlerts, todayEvents] = await Promise.all([
      prisma.dispensingEvent.count({
        where: { created_at: { gte: startOfToday } },
      }),
      prisma.prescription.count({
        where: { status: 'ACTIVE', expiry_date: { gt: now } },
      }),
      prisma.prescription.count({
        where: { status: 'FLAGGED' },
      }),
      prisma.dispensingEvent.findMany({
        where: { created_at: { gte: startOfToday } },
        include: { prescription: { select: { patient_id: true } } },
      }),
    ]);

    const patientSet = new Set(todayEvents.map(e => e.prescription?.patient_id).filter(Boolean));
    const patientsServed = patientSet.size;

    return success(res, { dispensesToday, activeQueueCount, flaggedAlerts, patientsServed });
  } catch (err) {
    return error(res, 'Failed to fetch dashboard KPIs', 500);
  }
}

async function getDashboardActivity(req, res) {
  try {
    const hours = Math.max(1, Math.min(168, parseInt(req.query.hours) || 24));
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const events = await prisma.dispensingEvent.findMany({
      where: { created_at: { gte: since } },
      orderBy: { created_at: 'desc' },
      take: 20,
      include: {
        prescription: {
          select: { rx_id: true, drug_name: true, status: true },
        },
        pharmacist: {
          include: { user: { select: { first_name: true, last_name: true } } },
        },
      },
    });

    const result = events.map(e => {
      const first = e.pharmacist?.user?.first_name || '';
      const last  = e.pharmacist?.user?.last_name  || '';
      const pharmacistLabel = first ? `${first.charAt(0)}. ${last}`.trim() : 'Pharmacist';
      return {
        prescriptionId:     e.prescription?.rx_id || e.prescription_id,
        medicationName:     e.prescription?.drug_name || 'Medication',
        pharmacistLabel,
        occurredAt:         e.created_at.toISOString(),
        prescriptionActive: e.prescription?.status === 'ACTIVE',
      };
    });

    return success(res, { events: result });
  } catch (err) {
    return error(res, 'Failed to fetch dashboard activity', 500);
  }
}

async function getActiveQueue(req, res) {
  try {
    const now = new Date();

    const prescriptions = await prisma.prescription.findMany({
      where: { status: 'ACTIVE', expiry_date: { gt: now } },
      orderBy: { created_at: 'desc' },
      include: {
        doctor: {
          include: { user: { select: { first_name: true, last_name: true } } },
        },
        patient: { select: { id: true } },
      },
    });

    const entries = prescriptions.map(rx => {
      let meds = [];
      if (rx.medications_json) {
        try { meds = JSON.parse(rx.medications_json); } catch {}
      }
      if (!Array.isArray(meds) || meds.length === 0) {
        meds = [{
          name:      rx.drug_name,
          dosage:    rx.dosage,
          frequency: rx.frequency,
          duration:  `${rx.duration_days} days`,
          status:    'PENDING',
        }];
      }

      const medications = meds.map((m, idx) => ({
        medicationId: `${rx.id}-med-${idx}`,
        drugName:     m.name || m.drugName || m.drug_name || rx.drug_name,
        dosage:       m.dosage || rx.dosage,
        frequency:    m.frequency || rx.frequency,
        duration:     m.duration || `${rx.duration_days} days`,
        status:       m.status || 'PENDING',
        versionHash:  m.versionHash || '',
      }));

      const docFirst = rx.doctor?.user?.first_name || '';
      const docLast  = rx.doctor?.user?.last_name  || '';
      const doctorName = docFirst ? `Dr. ${docFirst} ${docLast}`.trim() : 'Unknown Doctor';

      const patientId    = rx.patient?.id || rx.patient_id;
      const patientToken = `PAT-***-${patientId.slice(-4).toUpperCase()}`;

      const firstMed         = medications[0]?.drugName || rx.drug_name;
      const medicationSummary = medications.length > 1
        ? `${firstMed} +${medications.length - 1} more`
        : firstMed;

      return {
        prescriptionId:    rx.rx_id,
        patientToken,
        doctorName,
        medicationSummary,
        dateIssued:        rx.created_at.toISOString(),
        status:            rx.status,
        medications,
      };
    });

    return success(res, { entries, total: entries.length });
  } catch (err) {
    return error(res, 'Failed to fetch active queue', 500);
  }
}

async function getDispensingHistory(req, res) {
  try {
    const {
      timeRange  = 'LAST_7_DAYS',
      startDate,
      endDate,
      medicationQuery,
      page     = '1',
      pageSize = '50',
    } = req.query;

    const now = new Date();
    let startFilter;
    let endFilter = now;

    if (timeRange === 'TODAY') {
      startFilter = new Date(now);
      startFilter.setHours(0, 0, 0, 0);
    } else if (timeRange === 'CUSTOM' && startDate) {
      startFilter = new Date(startDate);
      if (endDate) endFilter = new Date(endDate);
    } else {
      // LAST_7_DAYS (default)
      startFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    const pageNum     = Math.max(1, parseInt(page)     || 1);
    const pageSizeNum = Math.max(1, Math.min(100, parseInt(pageSize) || 50));

    const baseWhere = { created_at: { gte: startFilter, lte: endFilter } };
    const prescriptionFilter = medicationQuery
      ? { prescription: { drug_name: { contains: medicationQuery } } }
      : {};

    const where = { ...baseWhere, ...prescriptionFilter };

    const [total, events] = await Promise.all([
      prisma.dispensingEvent.count({ where }),
      prisma.dispensingEvent.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip:  (pageNum - 1) * pageSizeNum,
        take:  pageSizeNum,
        include: {
          prescription: {
            include: {
              doctor: {
                include: { user: { select: { first_name: true, last_name: true } } },
              },
            },
          },
          pharmacist: {
            include: { user: { select: { first_name: true, last_name: true } } },
          },
        },
      }),
    ]);

    const mappedEvents = events.map(e => {
      const pharmFirst = e.pharmacist?.user?.first_name || '';
      const pharmLast  = e.pharmacist?.user?.last_name  || '';
      const snapshotPharmacistLabel = pharmFirst
        ? `${pharmFirst.charAt(0)}. ${pharmLast}`.trim()
        : 'Pharmacist';

      const docFirst = e.prescription?.doctor?.user?.first_name || '';
      const docLast  = e.prescription?.doctor?.user?.last_name  || '';
      const snapshotDoctorIdentifier = docFirst
        ? `Dr. ${docFirst} ${docLast}`.trim()
        : 'Unknown Doctor';

      return {
        eventId:                  e.id,
        dispensedAt:              e.created_at.toISOString(),
        prescriptionId:           e.prescription?.rx_id || e.prescription_id,
        snapshotMedicationName:   e.prescription?.drug_name || 'Medication',
        snapshotDoctorIdentifier,
        snapshotPharmacistLabel,
      };
    });

    return success(res, {
      events: mappedEvents,
      pagination: {
        total,
        page:       pageNum,
        pageSize:   pageSizeNum,
        totalPages: Math.ceil(total / pageSizeNum),
      },
    });
  } catch (err) {
    return error(res, 'Failed to fetch dispensing history', 500);
  }
}

module.exports = {
  getDispensedToday,
  getPendingVerifications,
  getStockAlerts,
  getTodaySummary,
  getRecentActivity,
  getDashboardKPIs,
  getDashboardActivity,
  getActiveQueue,
  getDispensingHistory,
};
