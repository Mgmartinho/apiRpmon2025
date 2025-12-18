import pool from "../config/mysqlConnect.js";

class Solipede {

  static async listar() {
    const [rows] = await pool.query("SELECT * FROM solipede");
    return rows;
  }

  static async buscarRe(re) {
    const [rows] = await pool.query(
      "SELECT * FROM solipede WHERE re = ?",
      [re]
    );
    return rows[0];
  }

  static async criar(data) {
    const sql = `
      INSERT INTO solipede
      (re, nome, DataNascimento, sexo, pelagem, movimentacao,
       alocacao, restricoes, status, origem, esquadrao, cargaHoraria)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.re,
      data.nome,
      data.DataNascimento,
      data.sexo,
     
    ];

    const [result] = await pool.query(sql, values);
    return result;
  }

  static async atualizar(re, data) {
    const fields = Object.keys(data)
      .map(key => `${key} = ?`)
      .join(", ");

    const values = [...Object.values(data), re];

    const sql = `UPDATE veterinarios SET ${fields} WHERE re = ?`;
    return pool.query(sql, values);
  }

  static async excluir(re) {
    return pool.query("DELETE FROM solipede WHERE re = ?", [re]);
  }
}

export default Solipede;
