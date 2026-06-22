const dotenv = require('dotenv');

dotenv.config();

const toBoolean = (value, fallback = false) => {
  if (value === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const toNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const env = {
  port: toNumber(process.env.PORT, 5000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  db: {
    server: process.env.DB_HOST || 'localhost',
    port: toNumber(process.env.DB_PORT, 1433),
    database: process.env.DB_NAME || 'GoogleKeepClone',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
      encrypt: toBoolean(process.env.DB_ENCRYPT, false),
      trustServerCertificate: toBoolean(process.env.DB_TRUST_SERVER_CERTIFICATE, true),
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  },
  jwtSecret: process.env.JWT_SECRET || 'dev-only-google-keep-clone-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  bcryptRounds: toNumber(process.env.BCRYPT_ROUNDS, 12),
};

module.exports = env;
