import pool from "../config/mysqlConnect.js";

class ProntuarioDietas {

  static async listarPorProntuario(prontuarioId) {
    const [rows] = await pool.query(
      `SELECT * FROM prontuario_dietas
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
      tipo_dieta,
      descricao,
      data_inicio,
      data_fim
    } = dados;

    const [result] = await pool.query(
      `INSERT INTO prontuario_dietas
       (prontuario_id, usuario_id, tipo_dieta, descricao, data_inicio, data_fim)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [prontuario_id, usuario_id, tipo_dieta, descricao, data_inicio, data_fim]
    );

    return result.insertId;
  }

  static async excluir(id) {
    const [result] = await pool.query(
      `DELETE FROM prontuario_dietas WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }
}

export default ProntuarioDietas;