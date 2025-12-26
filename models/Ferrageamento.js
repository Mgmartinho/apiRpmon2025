import pool from "../config/mysqlConnect.js";

class Ferrageamento {
  // Criar novo ferrageamento
  static async criar(dados) {
    const { solipede_numero, data_ferrageamento, prazo_validade, tamanho_ferradura, proximo_ferrageamento, responsavel, observacoes } = dados;
    
    const query = `
      INSERT INTO ferrageamentos 
      (solipede_numero, data_ferrageamento, prazo_validade, tamanho_ferradura, proximo_ferrageamento, responsavel, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const [resultado] = await pool.query(query, [
      solipede_numero,
      data_ferrageamento,
      prazo_validade,
      tamanho_ferradura,
      proximo_ferrageamento,
      responsavel,
      observacoes
    ]);
    
    return resultado;
  }

  // Listar todos os ferrageamentos
  static async listarTodos() {
    const query = `
      SELECT 
        f.*,
        s.nome as solipede_nome,
        s.alocacao as solipede_alocacao
      FROM ferrageamentos f
      LEFT JOIN solipede s ON f.solipede_numero = s.numero
      ORDER BY f.data_ferrageamento DESC
    `;
    
    const [ferrageamentos] = await pool.query(query);
    return ferrageamentos;
  }

  // Buscar último ferrageamento de um solípede
  static async buscarUltimoPorSolipede(solipede_numero) {
    const query = `
      SELECT * FROM ferrageamentos
      WHERE solipede_numero = ?
      ORDER BY data_ferrageamento DESC
      LIMIT 1
    `;
    
    const [ferrageamentos] = await pool.query(query, [solipede_numero]);
    return ferrageamentos[0] || null;
  }

  // Buscar histórico de ferrageamentos de um solípede
  static async buscarHistoricoPorSolipede(solipede_numero) {
    const query = `
      SELECT * FROM ferrageamentos
      WHERE solipede_numero = ?
      ORDER BY data_ferrageamento DESC
    `;
    
    const [ferrageamentos] = await pool.query(query, [solipede_numero]);
    return ferrageamentos;
  }

  // Buscar ferrageamentos com status (próximo vencimento, vencidos, etc)
  static async listarComStatus() {
    const query = `
      SELECT 
        f.*,
        s.nome as solipede_nome,
        s.alocacao as solipede_alocacao,
        s.status as solipede_status,
        DATEDIFF(f.proximo_ferrageamento, CURDATE()) as dias_restantes,
        CASE
          WHEN DATEDIFF(f.proximo_ferrageamento, CURDATE()) < 0 THEN 'VENCIDO'
          WHEN DATEDIFF(f.proximo_ferrageamento, CURDATE()) <= 15 THEN 'PROXIMO_VENCIMENTO'
          ELSE 'EM_DIA'
        END as status_ferrageamento
      FROM (
        SELECT 
          f1.*
        FROM ferrageamentos f1
        INNER JOIN (
          SELECT solipede_numero, MAX(data_ferrageamento) as max_data
          FROM ferrageamentos
          GROUP BY solipede_numero
        ) f2 ON f1.solipede_numero = f2.solipede_numero 
        AND f1.data_ferrageamento = f2.max_data
      ) f
      LEFT JOIN solipede s ON f.solipede_numero = s.numero
      WHERE s.status IN ('Ativo')
      ORDER BY dias_restantes ASC, f.proximo_ferrageamento ASC
    `;
    
    const [ferrageamentos] = await pool.query(query);
    return ferrageamentos;
  }

  // Deletar ferrageamento
  static async deletar(id) {
    const query = "DELETE FROM ferrageamentos WHERE id = ?";
    const [resultado] = await pool.query(query, [id]);
    return resultado;
  }

  // Atualizar ferrageamento
  static async atualizar(id, dados) {
    const { data_ferrageamento, prazo_validade, tamanho_ferradura, proximo_ferrageamento, responsavel, observacoes } = dados;
    
    const query = `
      UPDATE ferrageamentos 
      SET data_ferrageamento = ?,
          prazo_validade = ?,
          tamanho_ferradura = ?,
          proximo_ferrageamento = ?,
          responsavel = ?,
          observacoes = ?
      WHERE id = ?
    `;
    
    const [resultado] = await pool.query(query, [
      data_ferrageamento,
      prazo_validade,
      tamanho_ferradura,
      proximo_ferrageamento,
      responsavel,
      observacoes,
      id
    ]);
    
    return resultado;
  }
}

export default Ferrageamento;
