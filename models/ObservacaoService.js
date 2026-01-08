import pool from "../config/mysqlConnect.js";

class ObservacaoService {
  // Retorna apenas os números dos solípedes que têm observações gerais (exceto restrições)
  static async listarSolipedesComObservacoes() {
    const sql = `
      SELECT DISTINCT numero_solipede
      FROM prontuario
      WHERE tipo = 'Observações Comportamentais'
      ORDER BY numero_solipede
    `;

    console.log("📝 Query: Buscando números de solípedes com Observações Comportamentais");
    const [rows] = await pool.query(sql);
    
    // Retornar apenas array de números
    const numeros = rows.map(row => row.numero_solipede);
    console.log(`✅ Encontrados ${numeros.length} solípedes com Observações Comportamentais`);
    
    return numeros;
  }

  // Buscar observações de um solípede COM dados dos usuários que lançaram e atualizaram
  static async listarObservacoesComUsuario(numeroSolipede) {
    const sql = `
      SELECT 
        p.*,
        u1.nome AS usuario_nome,
        u1.re AS usuario_re,
        u2.nome AS usuario_atualizacao_nome,
        u2.re AS usuario_atualizacao_re
      FROM prontuario p
      LEFT JOIN usuarios u1 ON p.usuarioId = u1.id
      LEFT JOIN usuarios u2 ON p.usuario_atualizacao_id = u2.id
      WHERE p.numero_solipede = ?
        AND p.tipo = 'Observações Comportamentais'
      ORDER BY p.data_criacao DESC
    `;

    console.log(`📝 Query: Buscando observações do solípede ${numeroSolipede} com dados de usuário`);
    const [rows] = await pool.query(sql, [numeroSolipede]);
    
    console.log(`✅ Encontradas ${rows.length} observações para o solípede ${numeroSolipede}`);
    
    return rows;
  }
}

export default ObservacaoService;
