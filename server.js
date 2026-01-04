import 'dotenv/config';
import app from './app.js';
import pool from './config/mysqlConnect.js';
import os from 'os';

const PORT = process.env.PORT || 3000;

// Função para obter o IP local da máquina
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Pula interfaces internas e não IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

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

    const localIP = getLocalIP();
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      console.log(`Acesse localmente: http://localhost:${PORT}`);
      console.log(`Acesse pela rede: http://${localIP}:${PORT}`);
    });
    
    // Manter o processo vivo
    setInterval(() => {}, 1 << 30);
    
    // Tratamento de sinais de encerramento
    process.on('SIGTERM', () => {
      server.close(() => {
        console.log('Servidor encerrado');
        process.exit(0);
      });
    });
  }catch(erro){
    console.error('Erro ao iniciar o servidor', erro);
    process.exit(1);
  }
}

startServer();
