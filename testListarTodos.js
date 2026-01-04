import Prontuario from './models/Prontuario.js';

async function testarListarTodos() {
  try {
    console.log('\n🧪 Testando Prontuario.listarTodos()...\n');
    
    const resultado = await Prontuario.listarTodos();
    
    console.log(`✅ Total de registros: ${resultado.length}`);
    console.log('\n📦 Primeiros 3 registros:\n');
    
    resultado.slice(0, 3).forEach((reg, index) => {
      console.log(`${index + 1}. ID: ${reg.id}`);
      console.log(`   Solípede: ${reg.numero_solipede} - ${reg.solipede_nome || 'N/A'}`);
      console.log(`   Tipo: ${reg.tipo}`);
      console.log(`   Data: ${reg.data} ${reg.hora}`);
      console.log(`   Usuário: ${reg.usuario_nome || 'N/A'}`);
      console.log('');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

testarListarTodos();
