const { success, error } = require('../utils/response.utils');
const { hashCNIE } = require('../utils/hash.utils');
const prisma = require('../utils/prisma');

const searchPatient = async (req, res) => {
  try {
    const { cnie } = req.query;
    if (!cnie) return error(res, 'CNIE is required', 400);
    const cnie_hash = hashCNIE(cnie);
    const patient = await prisma.patient.findUnique({
      where: { cnie_hash },
      include: { user: true }
    });
    if (!patient) return error(res, 'Patient not found', 404);
    return success(res, {
      patient_token: `PAT-****-${patient.id.slice(-4).toUpperCase()}`,
      first_name: patient.user.first_name,
      cnie_hash: patient.cnie_hash
    });
  } catch (err) {
    return error(res, 'Patient search failed', 500);
  }
};

module.exports = { searchPatient };
