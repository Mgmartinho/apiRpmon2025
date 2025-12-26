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

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Acesse localmente: http://localhost:${PORT}`);
      console.log(`Acesse pela rede: http://10.37.20.250:${PORT}`);
    });
    // Keep process alive in case the event loop would otherwise exit
    // (debugging aid — can be removed later)
    setInterval(() => {}, 1_000_000);
  }catch(erro){
    console.error('Erro ao iniciar o servidor', erro);
    process.exit(1);
  }
}

startServer();
