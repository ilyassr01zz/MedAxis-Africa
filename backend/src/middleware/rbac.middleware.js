const { error } = require('../utils/response.utils');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return error(res, 'Access denied', 403);
    }
    next();
  };
};

module.exports = { authorize };
