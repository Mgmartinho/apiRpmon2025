import pool from "../config/mysqlConnect.js";

class Solipede {
  /* ======================================================
     LISTAGEM
  ====================================================== */
  static async listar() {
    const [rows] = await pool.query("SELECT * FROM solipede");

    return rows.map((s) => ({
      ...s,
      DataNascimento: s.DataNascimento
        ? s.DataNascimento.toISOString().split("T")[0]
        : null,
    }));
  }

  static async buscarPorNumero(numero) {
    const [rows] = await pool.query(
      "SELECT * FROM solipede WHERE numero = ?",
      [numero]
    );

    if (!rows[0]) return null;

    const solipede = rows[0];

    if (solipede.DataNascimento) {
      solipede.DataNascimento =
        solipede.DataNascimento.toISOString().split("T")[0];
    }

    return solipede;
  }

  /* ======================================================
     CRUD
  ====================================================== */
  static async criar(data) {
    const sql = `
      INSERT INTO solipede
      (numero, nome, DataNascimento, sexo, pelagem, movimentacao,
       alocacao, restricoes, status, origem, esquadrao, cargaHoraria)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      data.numero,
      data.nome,
      data.DataNascimento,
      data.sexo,
      data.pelagem,
      data.movimentacao,
      data.alocacao,
      data.restricoes,
      data.status,
      data.origem,
      data.esquadrao,
      data.cargaHoraria || 0,
    ];

    return pool.query(sql, values);
  }

  static async atualizar(numero, data) {
    const fields = Object.keys(data)
      .map((key) => `${key} = ?`)
      .join(", ");

    const values = [...Object.values(data), numero];

    return pool.query(
      `UPDATE solipede SET ${fields} WHERE numero = ?`,
      values
    );
  }

  static async excluir(numero) {
    return pool.query("DELETE FROM solipede WHERE numero = ?", [numero]);
  }

  /* ======================================================
     CARGA HORÁRIA — CONTROLE MENSAL
  ====================================================== */
  static getMesAtual() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  }

static adicionarHoras = async (req, res) => {
  try {
    const { numero, horas } = req.body;
    if (!numero || !horas) 
      return res.status(400).json({ error: "Número e horas são obrigatórios" });

    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const mesReferencia = `${anoAtual}-${String(mesAtual).padStart(2,"0")}`;

    // 1️⃣ Inserir no histórico
    await pool.query(
      `INSERT INTO historicoHoras 
       (solipedeNumero, horas, dataLancamento, mesReferencia, mes, ano)
       VALUES (?, ?, NOW(), ?, ?, ?)`,
      [numero, Number(horas), mesReferencia, mesAtual, anoAtual]
    );

    // 2️⃣ Recalcular carga horária total
    const [soma] = await pool.query(
      `SELECT SUM(horas) AS totalHoras 
       FROM historicoHoras 
       WHERE solipedeNumero = ?`,
      [numero]
    );

    const totalHoras = soma[0].totalHoras || 0;

    // 3️⃣ Atualizar cargaHoraria no solípede
    await pool.query(
      `UPDATE solipede SET cargaHoraria = ? WHERE numero = ?`,
      [totalHoras, numero]
    );

    res.status(200).json({ success: true, totalHoras });

  } catch (err) {
    console.error("ERRO adicionarHoras:", err);
    res.status(500).json({ error: err.message });
  }
};


  /* ======================================================
     HISTÓRICO
  ====================================================== */
  static async buscarHistorico(numero) {
    const [rows] = await pool.query(
      `SELECT id, horas, dataLancamento, mesReferencia, mes, ano
       FROM historicoHoras
       WHERE solipedeNumero = ?
       ORDER BY dataLancamento DESC`,
      [numero]
    );

    return rows;
  }

  static async buscarHistoricoPorMes(numero, mesReferencia) {
    const [rows] = await pool.query(
      `SELECT id, horas, dataLancamento
       FROM historicoHoras
       WHERE solipedeNumero = ? AND mesReferencia = ?
       ORDER BY dataLancamento DESC`,
      [numero, mesReferencia]
    );

    return rows;
  }
}

export default Solipede;
