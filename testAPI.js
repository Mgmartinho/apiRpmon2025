import ProntuarioController from './controllers/ProntuarioController.js';

async function testarController() {
  try {
    console.log('\n🧪 Testando ProntuarioController.listarTodos()...\n');
    
    // Simular req e res
    const req = {};
    const res = {
      set: (headers) => console.log('Headers:', headers),
      removeHeader: (header) => console.log('Remove header:', header),
      status: (code) => ({
        json: (data) => {
          console.log(`✅ Status: ${code}`);
          console.log(`✅ Total de registros: ${data.length}`);
          console.log('\n📦 Primeiros 3 registros:\n');
          data.slice(0, 3).forEach((reg, index) => {
            console.log(`${index + 1}. ID: ${reg.id} - ${reg.tipo}`);
            console.log(`   Solípede: #${reg.numero_solipede} - ${reg.solipede_nome || 'N/A'}`);
            console.log(`   Data: ${reg.data} ${reg.hora}`);
            console.log(`   Usuário: ${reg.usuario_nome || 'N/A'}`);
            console.log('');
          });
        }
      })
    };
    const next = (err) => {
      console.error('❌ Erro:', err);
    };
    
    await ProntuarioController.listarTodos(req, res, next);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

testarController();
