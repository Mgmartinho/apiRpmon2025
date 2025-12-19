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

static async adicionarHoras(numero, horas) {
  // validação defensiva
  if (!numero || !horas) {
    throw new Error("Número e horas são obrigatórios");
  }

  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  const mesReferencia = `${anoAtual}-${String(mesAtual).padStart(2, "0")}`;

  // 1️⃣ inserir no histórico
  await pool.query(
    `INSERT INTO historicoHoras 
     (solipedeNumero, horas, dataLancamento, mesReferencia, mes, ano)
     VALUES (?, ?, NOW(), ?, ?, ?)`,
    [numero, Number(horas), mesReferencia, mesAtual, anoAtual]
  );

  // 2️⃣ recalcular total
  const [rows] = await pool.query(
    `SELECT SUM(horas) AS totalHoras
     FROM historicoHoras
     WHERE solipedeNumero = ?`,
    [numero]
  );

  const totalHoras = rows[0].totalHoras || 0;

  // 3️⃣ atualizar solípede
  await pool.query(
    `UPDATE solipede SET cargaHoraria = ? WHERE numero = ?`,
    [totalHoras, numero]
  );

  return totalHoras;
}


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

  static async atualizarHistorico(id, horas) {
  // 1️⃣ Atualiza o lançamento
  await pool.query(
    "UPDATE historicoHoras SET horas = ? WHERE id = ?",
    [Number(horas), id]
  );

  // 2️⃣ Descobre qual solípede foi alterado
  const [[registro]] = await pool.query(
    "SELECT solipedeNumero FROM historicoHoras WHERE id = ?",
    [id]
  );

  if (!registro) return 0;

  const numero = registro.solipedeNumero;

  // 3️⃣ Recalcula o total
  const [[soma]] = await pool.query(
    "SELECT SUM(horas) AS totalHoras FROM historicoHoras WHERE solipedeNumero = ?",
    [numero]
  );

  const totalHoras = soma.totalHoras || 0;

  // 4️⃣ Atualiza tabela solipede
  await pool.query(
    "UPDATE solipede SET cargaHoraria = ? WHERE numero = ?",
    [totalHoras, numero]
  );

  return totalHoras;
}

}

export default Solipede;
