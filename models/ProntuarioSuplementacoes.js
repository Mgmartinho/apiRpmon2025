import pool from "../config/mysqlConnect.js";

class ProntuarioSuplementacoes {

  static async listarPorProntuario(prontuarioId) {
    const [rows] = await pool.query(
      `SELECT * FROM prontuario_suplementacoes
       WHERE prontuario_id = ?
       ORDER BY prontuario_id DESC`,
      [prontuarioId]
    );
    return rows;
  }

  static async criar(dados) {
    const {
      prontuario_id,
      usuario_id,
      produto,
      dose,
      frequencia,
      data_fabricacao,
      data_validade,
      observacoes
    } = dados;

    const [result] = await pool.query(
      `INSERT INTO prontuario_suplementacoes
       (prontuario_id, usuario_id, produto, dose, frequencia, data_fabricacao, data_validade, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [prontuario_id, usuario_id, produto, dose, frequencia, data_fabricacao, data_validade, observacoes]
    );

    return result.insertId;
  }

  static async excluir(id) {
    const [result] = await pool.query(
      `DELETE FROM prontuario_suplementacoes WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }
}

export default ProntuarioSuplementacoes;