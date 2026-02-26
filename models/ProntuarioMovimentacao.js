import pool from "../config/mysqlConnect.js";

class ProntuarioMovimentacoes {

  static async listarPorProntuario(prontuarioId) {
    const [rows] = await pool.query(
      `SELECT *
       FROM prontuario_movimentacoes
       WHERE prontuario_id = ?
       ORDER BY data_movimentacao DESC`,
      [prontuarioId]
    );
    return rows;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query(
      `SELECT * FROM prontuario_movimentacoes WHERE id = ?`,
      [id]
    );
    return rows[0];
  }

  static async criar(dados) {
    const {
      prontuario_id,
      usuario_id,
      tipo_movimentacao,
      origem,
      destino,
      motivo,
      observacoes,
      data_movimentacao
    } = dados;

    const [result] = await pool.query(
      `INSERT INTO prontuario_movimentacoes
       (prontuario_id, usuario_id, tipo_movimentacao, origem, destino, motivo, observacoes, data_movimentacao)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        prontuario_id,
        usuario_id,
        tipo_movimentacao,
        origem,
        destino,
        motivo,
        observacoes,
        data_movimentacao
      ]
    );

    return result.insertId;
  }

  static async excluir(id) {
    const [result] = await pool.query(
      `DELETE FROM prontuario_movimentacoes WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }
}

export default ProntuarioMovimentacoes;