import 'dotenv/config';
import app from './app.js';
import pool from './config/mysqlConnect.js';

const PORT = process.env.PORT || 3000;

async function startServer(){
  try{
    // Test MySQL connection
    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      console.log('Conectado ao MySQL com sucesso');
    } catch (err) {
      console.warn('Não foi possível conectar ao MySQL:', err.message);
    }

    app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
    // Keep process alive in case the event loop would otherwise exit
    // (debugging aid — can be removed later)
    setInterval(() => {}, 1_000_000);
  }catch(erro){
    console.error('Erro ao iniciar o servidor', erro);
    process.exit(1);
  }
}

startServer();
