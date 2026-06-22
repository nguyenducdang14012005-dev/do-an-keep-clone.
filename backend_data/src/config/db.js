const sql = require('mssql');
const env = require('./env');

let poolPromise;

const getPool = async () => {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(env.db)
      .connect()
      .then((pool) => pool)
      .catch((error) => {
        poolPromise = undefined;
        throw error;
      });
  }

  return poolPromise;
};

const closePool = async () => {
  if (!poolPromise) return;
  const pool = await poolPromise;
  await pool.close();
  poolPromise = undefined;
};

module.exports = {
  sql,
  getPool,
  closePool,
};
