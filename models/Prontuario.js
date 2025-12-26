import pool from "../config/mysqlConnect.js";

class Prontuario {
  static async listarPorSolipede(numero) {
    const [rows] = await pool.query(
      `
      SELECT 
        p.id,
        p.tipo,
        p.observacao,
        p.recomendacoes,
        p.usuarioId,
        p.data_criacao,
        p.status_baixa,
        p.data_liberacao,
        p.usuario_liberacao_id,
        p.tipo_baixa,
        p.data_lancamento,
        p.data_validade,
        p.status_conclusao,
        p.data_conclusao,
        p.usuario_conclusao_id,
        DATE_FORMAT(p.data_criacao, '%d/%m/%Y') AS data,
        DATE_FORMAT(p.data_criacao, '%H:%i') AS hora,
        u.nome as usuario_nome,
        u.re as usuario_registro,
        u.perfil as usuario_perfil,
        u.email as usuario_email,
        ul.nome as usuario_liberacao_nome,
        ul.re as usuario_liberacao_registro,
        uc.nome as usuario_conclusao_nome,
        uc.re as usuario_conclusao_registro
      FROM prontuario p
      LEFT JOIN usuarios u ON p.usuarioId = u.id
      LEFT JOIN usuarios ul ON p.usuario_liberacao_id = ul.id
      LEFT JOIN usuarios uc ON p.usuario_conclusao_id = uc.id
      WHERE p.numero_solipede = ?
      ORDER BY p.data_criacao DESC
      `,
      [numero]
    );

    return rows;
  }

  static async contarBaixasPendentes(numero) {
    const [rows] = await pool.query(
      `
      SELECT COUNT(*) as total
      FROM prontuario
      WHERE numero_solipede = ?
        AND tipo = 'Baixa'
        AND status_baixa = 'pendente'
      `,
      [numero]
    );

    return rows[0].total;
  }

  static async liberarBaixa(prontuarioId, usuarioId) {
    const [result] = await pool.query(
      `
      UPDATE prontuario
      SET status_baixa = 'liberada',
          data_liberacao = NOW(),
          usuario_liberacao_id = ?
      WHERE id = ? AND tipo = 'Baixa' AND status_baixa = 'pendente'
      `,
      [usuarioId, prontuarioId]
    );

    return result.affectedRows > 0;
  }

  static async concluirTratamento(prontuarioId, usuarioId) {
    const [result] = await pool.query(
      `
      UPDATE prontuario
      SET status_conclusao = 'concluido',
          data_conclusao = NOW(),
          usuario_conclusao_id = ?
      WHERE id = ? AND status_conclusao = 'em_andamento'
      `,
      [usuarioId, prontuarioId]
    );

    return result.affectedRows > 0;
  }
}

export default Prontuario;
