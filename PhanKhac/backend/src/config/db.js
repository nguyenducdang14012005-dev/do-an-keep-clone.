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
        trustServerCertificate: true
    }
};

export const connectDB = async () => {
    try {
        const pool = await sql.connect(config);
        if (pool.connected) {
            console.log(' Ket noi SQL Server thanh cong!');
        }
    } catch (err) {
        console.error(' Loi ket noi SQL:', err.message);
        process.exit(1);
    }
};

export default sql;