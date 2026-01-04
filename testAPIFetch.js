// Teste da API de prontuários
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibm9tZSI6Ik1hcmNlbG8gR3VpbGhlcm1lIGRlIEFyYXVqbyBNYXJ0aW5obyIsImVtYWlsIjoibWFydGluaG8uZ3VpbGhlcm1lMTNAaG90bWFpbC5jb20iLCJwZXJmaWwiOiJEZXNlbnZvbHZlZG9yIiwiaWF0IjoxNzY3MDE5MzAwLCJleHAiOjE3NjcwNDgxMDB9.nHoHJuRnxSJlUGsTWeU_vAxhATl6rkc1Xv6Q63fIYYQ";

async function testarAPI() {
  try {
    console.log("\n🧪 Testando rota /gestaoFVR/prontuario/todos\n");
    
    const response = await fetch("http://localhost:3000/gestaoFVR/prontuario/todos", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    console.log("📡 Status:", response.status, response.statusText);
    console.log("📋 Headers:", Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    
    console.log("\n📦 Tipo de dados:", typeof data);
    console.log("📊 É array?", Array.isArray(data));
    console.log("📊 Quantidade de registros:", Array.isArray(data) ? data.length : "não é array");
    
    if (Array.isArray(data) && data.length > 0) {
      console.log("\n✅ Primeiros 2 registros:");
      data.slice(0, 2).forEach((reg, i) => {
        console.log(`\n${i + 1}. ID: ${reg.id}`);
        console.log(`   Tipo: ${reg.tipo}`);
        console.log(`   Solípede: #${reg.numero_solipede} - ${reg.solipede_nome || 'N/A'}`);
        console.log(`   Data: ${reg.data} ${reg.hora}`);
        console.log(`   Usuário: ${reg.usuario_nome || 'N/A'}`);
      });
    } else {
      console.log("\n⚠️ Dados recebidos:", data);
    }
    
  } catch (error) {
    console.error("\n❌ Erro:", error.message);
  }
}

testarAPI();
