import pool from "../config/mysqlConnect.js";

class RestricaoService {
  // Retorna apenas os números dos solípedes que possuem restrições ativas
  static async listarSolipedesComRestricao() {
    const sql = `
      SELECT DISTINCT 
        p.numero_solipede
      FROM prontuario p
      WHERE p.tipo = 'Restrições'
        AND (
          p.status_conclusao IS NULL 
          OR p.status_conclusao != 'concluido'
        )
        AND (
          p.data_validade IS NULL 
          OR p.data_validade >= CURDATE()
        )
    `;

    const [rows] = await pool.query(sql);
    // Retorna apenas um array de números
    return rows.map(row => row.numero_solipede);
  }
}

export default RestricaoService;
