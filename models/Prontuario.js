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
        DATE_FORMAT(p.data_criacao, '%d/%m/%Y') AS data,
        DATE_FORMAT(p.data_criacao, '%H:%i') AS hora,
        u.nome as usuario_nome,
        u.re as usuario_registro,
        u.perfil as usuario_perfil,
        u.email as usuario_email
      FROM prontuario p
      LEFT JOIN usuarios u ON p.usuarioId = u.id
      WHERE p.numero_solipede = ?
      ORDER BY p.data_criacao DESC
      `,
      [numero]
    );

    return rows;
  }
}

export default Prontuario;
