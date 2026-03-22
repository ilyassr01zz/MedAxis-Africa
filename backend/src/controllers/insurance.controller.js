const { success, error } = require('../utils/response.utils');
const prisma = require('../utils/prisma');

const submitClaim = async (req, res) => {
  try {
    const { rx_id, claim_amount } = req.body;
    if (!rx_id || !claim_amount) return error(res, 'RxID and claim amount required', 400);
    const prescription = await prisma.prescription.findUnique({ where: { rx_id } });
    if (!prescription) return error(res, 'Prescription not found', 404);
    if (prescription.status !== 'DISPENSED') return error(res, 'Prescription has not been dispensed', 400);
    const existing = await prisma.insuranceClaim.findFirst({ where: { prescription_id: prescription.id } });
    if (existing) return error(res, 'Claim already submitted for this prescription', 400);
    const claim = await prisma.insuranceClaim.create({
      data: { prescription_id: prescription.id, claim_amount: parseFloat(claim_amount), status: 'APPROVED' }
    });
    return success(res, { claim, message: 'Claim approved automatically' }, 201);
  } catch (err) {
    return error(res, 'Failed to submit claim', 500);
  }
};

const getClaims = async (req, res) => {
  try {
    const claims = await prisma.insuranceClaim.findMany({
      include: { prescription: true },
      orderBy: { submitted_at: 'desc' }
    });
    return success(res, { claims });
  } catch (err) {
    return error(res, 'Failed to fetch claims', 500);
  }
};

module.exports = { submitClaim, getClaims };
