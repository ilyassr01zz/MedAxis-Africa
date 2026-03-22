const crypto = require('crypto');

const hashCNIE = (cnie) => {
  return crypto.createHash('sha256').update(cnie.toUpperCase().trim()).digest('hex');
};

const hashPhone = (phone) => {
  return crypto.createHash('sha256').update(phone.trim()).digest('hex');
};

module.exports = { hashCNIE, hashPhone };
