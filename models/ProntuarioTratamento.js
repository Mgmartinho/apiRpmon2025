import pool from "../config/mysqlConnect.js";

class ProntuarioTratamentos {

  static async listarPorProntuario(prontuarioId) {
    const [rows] = await pool.query(
      `SELECT *
       FROM prontuario_tratamentos
       WHERE prontuario_id = ?
       ORDER BY data_inicio DESC`,
      [prontuarioId]
    );
    return rows;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query(
      `SELECT * FROM prontuario_tratamentos WHERE id = ?`,
      [id]
    );
    return rows[0];
  }

  static async criar(dados) {
    const {
      prontuario_id,
      usuario_id,
      descricao,
      data_inicio,
      data_fim,
      status,
      observacoes
    } = dados;

    const [result] = await pool.query(
      `INSERT INTO prontuario_tratamentos
       (prontuario_id, usuario_id, descricao, data_inicio, data_fim, status, observacoes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        prontuario_id,
        usuario_id,
        descricao,
        data_inicio,
        data_fim,
        status,
        observacoes
      ]
    );

    return result.insertId;
  }

  static async atualizarStatus(id, status, usuario_id) {
    const [result] = await pool.query(
      `UPDATE prontuario_tratamentos
       SET status = ?,
           data_atualizacao = NOW(),
           usuario_id = ?
       WHERE id = ?`,
      [status, usuario_id, id]
    );

    return result.affectedRows > 0;
  }

  static async excluir(id) {
    const [result] = await pool.query(
      `DELETE FROM prontuario_tratamentos WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }
}

export default ProntuarioTratamentos;