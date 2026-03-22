const prisma = require('../utils/prisma');

const auditLog = (action) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (body) => {
      try {
        await prisma.auditLog.create({
          data: {
            user_id: req.user?.id || null,
            role: req.user?.role || null,
            endpoint: req.originalUrl,
            method: req.method,
            status_code: res.statusCode,
            action: action,
            rx_id: req.params?.rx_id || req.body?.rx_id || null
          }
        });
      } catch (err) {
        console.error('Audit log error:', err);
      }
      return originalJson(body);
    };
    next();
  };
};

module.exports = { auditLog };
