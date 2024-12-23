const crypto = require('crypto');

const generateActivationCode = () => crypto.randomBytes(16).toString('hex');

module.exports = generateActivationCode;
