import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Singleton pool promise - mọi nơi gọi getPool() đều dùng lại CÙNG 1 pool,
// tránh việc mỗi request/cron job tự mở 1 pool kết nối mới (rò rỉ kết nối).
let poolPromise = null;

export const getPool = async () => {
  if (!poolPromise) {
    poolPromise = sql.connect(config).catch((err) => {
      // Cho phép thử kết nối lại ở lần gọi sau nếu lần này lỗi
      poolPromise = null;
      throw err;
    });
  }

  return poolPromise;
};

export const connectDB = async () => {
  try {
    const pool = await getPool();
    if (pool.connected) {
      console.log('✅ Ket noi SQL Server thanh cong!');
    }
  } catch (err) {
    console.error('❌ Loi ket noi SQL:', err.message);
    process.exit(1);
  }
};

export default sql;
