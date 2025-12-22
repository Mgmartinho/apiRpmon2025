import pool from './config/mysqlConnect.js';

async function showCreate() {
  try {
    const [rows] = await pool.query('SHOW CREATE TABLE prontuario');
    console.log('\n📋 CREATE TABLE prontuario:\n');
    console.log(rows[0]['Create Table']);
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

showCreate();
