import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'dashboardrpmon',
  port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 20000, // 20 segundos para conectar
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

console.log('🔌 Configurando MySQL:', {
  host: config.host,
  user: config.user,
  database: config.database,
  port: config.port,
  environment: process.env.NODE_ENV
});

const pool = mysql.createPool(config);

export default pool;
