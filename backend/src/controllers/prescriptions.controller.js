const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { success, error } = require('../utils/response.utils');
const prisma = require('../utils/prisma');

const createPrescription = async (req, res) => {
  try {
    const { patient_cnie_hash, drug_code, drug_name, dosage, frequency, duration_days, medications, notes, expiry_days } = req.body;
    console.log('[createPrescription] body:', { patient_cnie_hash, drug_code, drug_name, dosage, frequency, duration_days });
    if (!patient_cnie_hash || !drug_code || !drug_name || !dosage || !frequency || !duration_days) {
      return error(res, 'All prescription fields are required', 400);
    }
    if (duration_days > 365) return error(res, 'Maximum duration is 365 days', 400);
    let doctor = await prisma.doctor.findUnique({ where: { user_id: req.user.id } });
    if (!doctor) {
      doctor = await prisma.doctor.create({
        data: {
          user_id: req.user.id,
          license_number: `LIC-${req.user.id.slice(0, 8).toUpperCase()}`,
          specialty: 'General Medicine',
          facility: 'MedAxis Demo Clinic',
          region: 'Casablanca-Settat'
        }
      });
    }
    let patient = await prisma.patient.findUnique({ where: { cnie_hash: patient_cnie_hash } });
    console.log('[createPrescription] patient lookup by cnie_hash:', patient_cnie_hash.slice(0, 8) + '...', '→', patient ? `found id=${patient.id}` : 'NOT FOUND');
    if (!patient) return error(res, 'Patient not found', 404);
    const rx_id = `RX-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`;
    const expiryDaysNum = expiry_days ? parseInt(expiry_days) : 90;
    const expiry_date = new Date();
    expiry_date.setDate(expiry_date.getDate() + expiryDaysNum);
    const prescription = await prisma.prescription.create({
      data: {
        rx_id,
        doctor_id: doctor.id,
        patient_id: patient.id,
        drug_code,
        drug_name,
        dosage,
        frequency,
        duration_days: parseInt(duration_days),
        expiry_date,
        status: 'ACTIVE',
        medications_json: medications && medications.length > 0 ? JSON.stringify(medications) : null,
        notes: req.body.notes || null,
      }
    });

    console.log('=== GENERATING QR CODE ===', prescription.rx_id);

    // Generate W3C Verifiable Credential for the prescription
    const vc = {
      "@context": ["https://www.w3.org/2018/credentials/v1"],
      "type": ["VerifiableCredential", "PrescriptionCredential"],
      "issuer": "did:web:ilyassr01zz.github.io:medaxis-did:certify",
      "issuanceDate": new Date().toISOString(),
      "credentialSubject": {
        "prescriptionId": prescription.rx_id,
        "medication": prescription.drug_name,
        "dosage": prescription.dosage,
        "status": "ACTIVE"
      }
    };

    // Generate QR code from VC JSON
    try {
      const qrBuffer = await QRCode.toBuffer(JSON.stringify(vc), {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 1024,
        margin: 8,
        scale: 16,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const qrCodeDataUrl = `data:image/png;base64,${qrBuffer.toString('base64')}`;

      console.log('=== QR CODE GENERATED ===', !!qrCodeDataUrl, 'length:', qrCodeDataUrl.length);

      // Update prescription with QR code
      const updatedPrescription = await prisma.prescription.update({
        where: { rx_id },
        data: { vc_qr_code: qrCodeDataUrl }
      });

      console.log('=== QR CODE SAVED ===', !!updatedPrescription.vc_qr_code);

      prescription.vc_qr_code = qrCodeDataUrl;
    } catch (qrError) {
      console.error('[createPrescription] QR code generation failed:', qrError);
      // Continue without QR code; don't fail the entire request
    }

    await prisma.auditLog.create({
      data: {
        user_id: req.user.id,
        role: req.user.role,
        endpoint: '/api/prescriptions',
        method: 'POST',
        status_code: 201,
        action: 'PRESCRIPTION_CREATED',
        rx_id: prescription.rx_id
      }
    });
    console.log('[createPrescription] SUCCESS rx_id:', prescription.rx_id, 'patient_id:', prescription.patient_id);
    return success(res, { prescription, rx_id }, 201);
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to create prescription', 500);
  }
};

const getMyPrescriptions = async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { user_id: req.user.id } });
    if (!doctor) return success(res, { prescriptions: [], total: 0 });

    const { status, dateFrom, dateTo, search } = req.query;

    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 30);

    const where = {
      doctor_id: doctor.id,
      created_at: {
        gte: dateFrom ? new Date(dateFrom) : defaultFrom,
        lte: dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : new Date()
      }
    };

    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { drug_name: { contains: search } },
        { rx_id: { contains: search } }
      ];
    }

    const [prescriptions, total] = await Promise.all([
      prisma.prescription.findMany({
        where,
        include: { patient: { include: { user: true } } },
        orderBy: { created_at: 'desc' }
      }),
      prisma.prescription.count({ where })
    ]);

    const now = new Date();
    const mapped = prescriptions.map(p => {
      const status = p.status === 'ACTIVE' && p.expiry_date < now ? 'EXPIRED' : p.status;
      let medications = null;
      if (p.medications_json) {
        try { medications = JSON.parse(p.medications_json); } catch (_) { medications = null; }
      }
      if (!medications) {
        medications = [{
          drug_name: p.drug_name,
          drug_code: p.drug_code,
          form: null,
          dosage_amount: null,
          dosage_unit: null,
          dosage: p.dosage,
          frequency: p.frequency,
          duration_days: p.duration_days,
          controlled: false,
        }];
      }
      return {
        rxId: p.rx_id,
        patientFirstName: p.patient?.user?.first_name || 'Patient',
        patientLastName: p.patient?.user?.last_name || '',
        medications,
        drugName: p.drug_name,
        dosage: p.dosage,
        notes: p.notes || '',
        issuedAt: p.created_at,
        expiresAt: p.expiry_date,
        status,
        vc_qr_code: p.vc_qr_code || null,
      };
    });

    return success(res, { prescriptions: mapped, total });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to fetch prescriptions', 500);
  }
};

const getByPatient = async (req, res) => {
  try {
    const { cnie_hash } = req.params;
    console.log('getByPatient called with cnie_hash:', cnie_hash);

    const patient = await prisma.patient.findUnique({
      where: { cnie_hash },
      include: { user: true }
    });
    console.log('Patient found:', patient ? 'YES id=' + patient.id : 'NO');

    if (!patient) return error(res, 'Patient not found', 404);

    const now = new Date();

    const prescriptions = await prisma.prescription.findMany({
      where: { patient_id: patient.id },
      include: {
        doctor: { include: { user: true } }
      },
      orderBy: { created_at: 'desc' }
    });

    console.log('Prescriptions found:', prescriptions.length);

    const updatedPrescriptions = prescriptions.map(p => ({
      ...p,
      status: p.status === 'ACTIVE' && p.expiry_date < now ? 'EXPIRED' : p.status,
      vc_qr_code: p.vc_qr_code || null
    }));

    return success(res, {
      patient_first_name: patient.user?.first_name || 'Patient',
      patient_token: `PAT-****-${patient.id.slice(-4).toUpperCase()}`,
      prescriptions: updatedPrescriptions
    });
  } catch (err) {
    console.error('getByPatient error:', err);
    return error(res, 'Failed to fetch patient prescriptions', 500);
  }
};

const getPatientView = async (req, res) => {
  try {
    console.log('getPatientView called for user:', req.user.id, 'cnie_hash:', req.user.cnie_hash);

    let patient = await prisma.patient.findUnique({ where: { user_id: req.user.id } });

    if (!patient && req.user.cnie_hash) {
      patient = await prisma.patient.findUnique({ where: { cnie_hash: req.user.cnie_hash } });
      if (patient) {
        console.log('Found patient by cnie_hash, fixing user_id mismatch');
        await prisma.patient.update({ where: { id: patient.id }, data: { user_id: req.user.id } });
      }
    }

    if (!patient) {
      console.log('No patient record found for user:', req.user.id);
      return success(res, { prescriptions: [] });
    }

    console.log('Found patient:', patient.id);

    const prescriptions = await prisma.prescription.findMany({
      where: { patient_id: patient.id },
      include: {
        doctor: { include: { user: true } },
        dispensing_events: true
      },
      orderBy: { created_at: 'desc' }
    });

    console.log('Found prescriptions:', prescriptions.length);
    console.log('Prescription statuses:', prescriptions.map(p => ({ rx_id: p.rx_id, status: p.status, is_reviewed: p.is_reviewed })));
    return success(res, { prescriptions });
  } catch (err) {
    console.error('getPatientView error:', err);
    return error(res, 'Failed to fetch prescriptions', 500);
  }
};

const cancelPrescription = async (req, res) => {
  try {
    const { rx_id } = req.params;
    const prescription = await prisma.prescription.findUnique({ where: { rx_id } });
    if (!prescription) return error(res, 'Prescription not found', 404);
    if (prescription.status !== 'ACTIVE') return error(res, 'Only active prescriptions can be cancelled', 400);
    if (new Date() > prescription.expiry_date) return error(res, 'Expired prescriptions cannot be cancelled', 400);
    const updated = await prisma.prescription.update({
      where: { rx_id },
      data: { status: 'CANCELLED' }
    });
    await prisma.auditLog.create({
      data: {
        user_id: req.user.id,
        role: req.user.role,
        endpoint: `/api/prescriptions/${rx_id}/cancel`,
        method: 'PATCH',
        status_code: 200,
        action: 'PRESCRIPTION_CANCELLED',
        rx_id
      }
    });
    return success(res, { prescription: updated });
  } catch (err) {
    return error(res, 'Failed to cancel prescription', 500);
  }
};

const dispensePrescription = async (req, res) => {
  try {
    const { rx_id } = req.params;
    const { quantity_dispensed, doctor_license_verified, patient_otp_verified } = req.body;
    const prescription = await prisma.prescription.findUnique({ where: { rx_id } });
    if (!prescription) return error(res, 'Prescription not found', 404);
    if (prescription.status === 'DISPENSED') return error(res, 'Prescription already dispensed', 400);
    if (prescription.status === 'CANCELLED') return error(res, 'Prescription is cancelled', 400);
    if (new Date() > prescription.expiry_date) return error(res, 'Prescription has expired', 400);
    let pharmacist = await prisma.pharmacist.findUnique({ where: { user_id: req.user.id } });
    if (!pharmacist) {
      let pharmacy = await prisma.pharmacy.findFirst();
      if (!pharmacy) {
        pharmacy = await prisma.pharmacy.create({
          data: {
            name: 'Pharmacie Demo',
            license_number: 'PHARM-DEMO-001',
            region: 'Casablanca-Settat',
            city: 'Casablanca'
          }
        });
      }
      pharmacist = await prisma.pharmacist.create({
        data: {
          user_id: req.user.id,
          license_number: `PHARM-LIC-${req.user.id.slice(0, 8).toUpperCase()}`,
          pharmacy_id: pharmacy.id
        }
      });
    }
    await prisma.dispensingEvent.create({
      data: {
        prescription_id: prescription.id,
        pharmacist_id: pharmacist.id,
        pharmacy_id: pharmacist.pharmacy_id,
        quantity_dispensed: parseInt(quantity_dispensed) || 1,
        doctor_license_verified: doctor_license_verified || false,
        patient_otp_verified: patient_otp_verified || false
      }
    });
    await prisma.prescription.update({
      where: { rx_id },
      data: { status: 'DISPENSED' }
    });
    await prisma.auditLog.create({
      data: {
        user_id: req.user.id,
        role: req.user.role,
        endpoint: `/api/prescriptions/${rx_id}/dispense`,
        method: 'POST',
        status_code: 200,
        action: 'PRESCRIPTION_DISPENSED',
        rx_id
      }
    });
    return success(res, { message: 'Prescription dispensed successfully', rx_id });
  } catch (err) {
    console.error(err);
    return error(res, 'Failed to dispense prescription', 500);
  }
};

const disputePrescription = async (req, res) => {
  try {
    const { rx_id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length < 10) {
      return error(res, 'A reason of at least 10 characters is required', 400);
    }

    const prescription = await prisma.prescription.findUnique({
      where: { rx_id },
      include: { doctor: { include: { user: true } } }
    });

    if (!prescription) return error(res, 'Prescription not found', 404);

    if (prescription.status === 'DISPUTED') {
      return error(res, 'This prescription has already been disputed', 400);
    }

    await prisma.prescription.update({
      where: { rx_id },
      data: {
        is_disputed: true,
        status: 'DISPUTED'
      }
    });

    await prisma.auditLog.create({
      data: {
        user_id: req.user.id,
        role: req.user.role,
        endpoint: `/api/prescriptions/${rx_id}/dispute`,
        method: 'POST',
        status_code: 200,
        action: 'PRESCRIPTION_DISPUTED',
        rx_id,
      }
    });

    console.log(`[MedAxis DISPUTE] RxID: ${rx_id} — Reason: ${reason} — Patient: ${req.user.id}`);
    console.log(`[MedAxis DISPUTE] Notifying regulatory team — prescription from Dr. ${prescription.doctor?.user?.first_name}`);

    return success(res, {
      message: 'Dispute recorded and sent to Ministry of Health regulatory team',
      reference: `DISP-${Date.now()}`,
      rx_id
    });
  } catch (err) {
    console.error('disputePrescription error:', err);
    return error(res, 'Failed to create dispute', 500);
  }
};

const flagPrescription = async (req, res) => {
  try {
    const { rx_id } = req.params;
    await prisma.prescription.update({
      where: { rx_id },
      data: { is_flagged: true, status: 'FLAGGED' }
    });
    return success(res, { message: 'Prescription flagged for regulator review' });
  } catch (err) {
    return error(res, 'Failed to flag prescription', 500);
  }
};

const getAuditTrail = async (req, res) => {
  try {
    const { rx_id } = req.params;
    const logs = await prisma.auditLog.findMany({
      where: { rx_id },
      orderBy: { created_at: 'asc' }
    });
    return success(res, { audit_trail: logs });
  } catch (err) {
    return error(res, 'Failed to fetch audit trail', 500);
  }
};

const getDoctorStats = async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { user_id: req.user.id } });
    if (!doctor) return success(res, { issuedToday: 0, pendingPickup: 0, issuedThisMonth: 0 });

    const now = new Date();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [issuedToday, pendingPickup, issuedThisMonth] = await Promise.all([
      prisma.prescription.count({
        where: { doctor_id: doctor.id, created_at: { gte: startOfToday } }
      }),
      prisma.prescription.count({
        where: { doctor_id: doctor.id, status: 'ACTIVE', expiry_date: { gt: now } }
      }),
      prisma.prescription.count({
        where: { doctor_id: doctor.id, created_at: { gte: startOfMonth } }
      })
    ]);

    return success(res, { issuedToday, pendingPickup, issuedThisMonth });
  } catch (err) {
    console.error('getDoctorStats error:', err);
    return error(res, 'Failed to fetch stats', 500);
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const doctor = await prisma.doctor.findUnique({ where: { user_id: req.user.id } });
    if (!doctor) return success(res, { activities: [] });

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const prescriptions = await prisma.prescription.findMany({
      where: {
        doctor_id: doctor.id,
        created_at: { gte: last24h }
      },
      include: {
        patient: { include: { user: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 10
    });

    const activities = prescriptions.map(p => ({
      id: p.id,
      rx_id: p.rx_id,
      type: 'PRESCRIPTION_ISSUED',
      description: `Prescription ${p.rx_id} issued`,
      detail: `${p.patient?.user?.first_name || 'Patient'} \u2022 ${p.drug_name}`,
      dot_color: '#6B7280',
      time: p.created_at
    }));

    return success(res, { activities });
  } catch (err) {
    console.error('getRecentActivity error:', err);
    return error(res, 'Failed to fetch recent activity', 500);
  }
};

module.exports = {
  createPrescription,
  getMyPrescriptions,
  getByPatient,
  getPatientView,
  cancelPrescription,
  dispensePrescription,
  disputePrescription,
  flagPrescription,
  getAuditTrail,
  getDoctorStats,
  getRecentActivity
};
