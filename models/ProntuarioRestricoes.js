import pool from "../config/mysqlConnect.js";

class ProntuarioRestricoes {
  static async listarPorProntuario(prontuarioId) {
    const [rows] = await pool.query(
      `SELECT *
       FROM prontuario_restricoes
       WHERE prontuario_id = ?
       ORDER BY data_inicio DESC`,
      [prontuarioId]
    );
    return rows;
  }

  static async criar(dados) {
    const {
      prontuario_id,
      usuario_id,
      tipo_restricao,
      descricao,
      data_inicio,
      data_fim,
      status
    } = dados;

    const [result] = await pool.query(
      `INSERT INTO prontuario_restricoes
       (prontuario_id, usuario_id, tipo_restricao, descricao, data_inicio, data_fim, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        prontuario_id,
        usuario_id,
        tipo_restricao,
        descricao,
        data_inicio,
        data_fim,
        status
      ]
    );

    return result.insertId;
  }

  static async excluir(id) {
    const [result] = await pool.query(
      `DELETE FROM prontuario_restricoes WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }
}

export default ProntuarioRestricoes;
