const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const { getPool, closePool } = require('./config/db');
const { sendError } = require('./utils/responses');
const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

const allowedOrigins = env.frontendOrigin === '*'
  ? true
  : env.frontendOrigin.split(',').map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', async (_req, res) => {
  try {
    await getPool();
    res.json({ success: true, data: { status: 'ok', database: 'connected' } });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Backend dang chay nhung chua ket noi duoc database',
      code: 'DB_CONNECTION_FAILED',
      detail: error.message,
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use((_req, _res, next) => {
  const error = new Error('Khong tim thay endpoint');
  error.statusCode = 404;
  error.code = 'ROUTE_NOT_FOUND';
  next(error);
});

app.use((error, _req, res, _next) => {
  if (!error.statusCode) {
    console.error(error);
  }
  sendError(res, error);
});

const server = app.listen(env.port, () => {
  console.log(`Admin/Auth API dang chay tai http://localhost:${env.port}`);
});

const shutdown = async () => {
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;
