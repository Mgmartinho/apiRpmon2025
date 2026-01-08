import pool from "../config/mysqlConnect.js";

class HistoricoAlteracoes {
  // Listar histórico de alterações de um registro específico
  static async listarPorRegistro(tabela, registroId) {
    const sql = `
      SELECT 
        ha.*,
        u.nome AS usuario_nome,
        u.email AS usuario_email
      FROM historico_alteracoes ha
      LEFT JOIN usuarios u ON ha.usuario_id = u.id
      WHERE ha.tabela = ? AND ha.registro_id = ?
      ORDER BY ha.data_alteracao DESC
    `;

    const [rows] = await pool.query(sql, [tabela, registroId]);
    return rows;
  }

  // Listar todas as alterações de uma tabela
  static async listarPorTabela(tabela, limite = 100) {
    const sql = `
      SELECT 
        ha.*,
        u.nome AS usuario_nome,
        u.email AS usuario_email
      FROM historico_alteracoes ha
      LEFT JOIN usuarios u ON ha.usuario_id = u.id
      WHERE ha.tabela = ?
      ORDER BY ha.data_alteracao DESC
      LIMIT ?
    `;

    const [rows] = await pool.query(sql, [tabela, limite]);
    return rows;
  }

  // Listar alterações de um usuário específico
  static async listarPorUsuario(usuarioId, limite = 100) {
    const sql = `
      SELECT 
        ha.*,
        u.nome AS usuario_nome,
        u.email AS usuario_email
      FROM historico_alteracoes ha
      LEFT JOIN usuarios u ON ha.usuario_id = u.id
      WHERE ha.usuario_id = ?
      ORDER BY ha.data_alteracao DESC
      LIMIT ?
    `;

    const [rows] = await pool.query(sql, [usuarioId, limite]);
    return rows;
  }

  // Criar novo registro de histórico (método auxiliar)
  static async criar(dados) {
    const {
      tabela,
      registroId,
      campoAlterado,
      valorAnterior,
      valorNovo,
      tipoOperacao,
      usuarioId,
      observacao
    } = dados;

    const sql = `
      INSERT INTO historico_alteracoes 
      (tabela, registro_id, campo_alterado, valor_anterior, valor_novo, tipo_operacao, usuario_id, observacao)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const [result] = await pool.query(sql, [
      tabela,
      registroId,
      campoAlterado,
      valorAnterior,
      valorNovo,
      tipoOperacao,
      usuarioId,
      observacao
    ]);

    return result;
  }
}

export default HistoricoAlteracoes;
