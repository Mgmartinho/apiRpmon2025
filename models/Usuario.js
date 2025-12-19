import pool from "../config/mysqlConnect.js";

class Usuario {
  static async buscarPorEmail(email) {
    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE email = ? AND ativo = TRUE",
      [email]
    );
    return rows[0];
  }

  static async criar({ nome, re ,email, senha, perfil }) {
    return pool.query(
      `INSERT INTO usuarios (nome, re, email, senha, perfil)
       VALUES (?, ?, ?, ?, ?)`,
      [nome, re ,email, senha, perfil || "OPERADOR"]
    );
  }
}

export default Usuario;
