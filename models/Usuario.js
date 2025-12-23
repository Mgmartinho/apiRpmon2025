import pool from "../config/mysqlConnect.js";

class Usuario {
  static async buscarPorEmail(email) {
    const [rows] = await pool.query(
      "SELECT * FROM usuarios WHERE email = ? AND ativo = TRUE",
      [email]
    );
    return rows[0];
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query(
      "SELECT id, nome, re as registro, email, perfil, ativo FROM usuarios WHERE id = ? AND ativo = TRUE",
      [id]
    );
    return rows[0];
  }

  static async listarTodos() {
    const [rows] = await pool.query(
      "SELECT id, nome, re as registro, email, perfil, ativo FROM usuarios WHERE ativo = TRUE ORDER BY nome"
    );
    return rows;
  }

  static async criar({ nome, re ,email, senha, perfil }) {
    return pool.query(
      `INSERT INTO usuarios (nome, re, email, senha, perfil)
       VALUES (?, ?, ?, ?, ?)`,
      [nome, re ,email, senha, perfil || "OPERADOR"]
    );
  }

  static async atualizarDados(id, { nome, registro, email }) {
    return pool.query(
      "UPDATE usuarios SET nome = ?, re = ?, email = ? WHERE id = ?",
      [nome, registro, email, id]
    );
  }

  static async atualizarPerfil(id, perfil) {
    return pool.query(
      "UPDATE usuarios SET perfil = ? WHERE id = ?",
      [perfil, id]
    );
  }

  static async atualizarSenha(id, senhaHash) {
    return pool.query(
      "UPDATE usuarios SET senha = ? WHERE id = ?",
      [senhaHash, id]
    );
  }
}

export default Usuario;
