import pool from "../config/mysqlConnect.js";
import bcrypt from "bcryptjs";

class Solipede {
  /* ======================================================
     LISTAGEM
  ====================================================== */
  /* ======================================================
    LISTAGEM COM FILTRO OPCIONAL
 ====================================================== */
  static async listar(filtros = {}) {
    let sql = "SELECT * FROM solipede";
    const params = [];

    if (filtros.alocacao) {
      sql += " WHERE alocacao = ?";
      params.push(filtros.alocacao);
    }

    const [rows] = await pool.query(sql, params);

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

  static async adicionarHoras(numero, horas, usuarioId) {
    // validação defensiva
    if (!numero || !horas) {
      throw new Error("Número e horas são obrigatórios");
    }

    if (!usuarioId) {
      console.warn("⚠️ Lançamento sem usuário identificado");
    }

    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();
    const mesReferencia = `${anoAtual}-${String(mesAtual).padStart(2, "0")}`;

    // 1️⃣ inserir no histórico com usuarioId
    console.log("Inserindo histórico:", { numero, horas, usuarioId, tipo: typeof usuarioId });
    const usuarioIdNumerico = Number(usuarioId) || null;
    console.log("usuarioIdNumerico:", usuarioIdNumerico, "tipo:", typeof usuarioIdNumerico);
    const params = [numero, Number(horas), mesReferencia, mesAtual, anoAtual, usuarioIdNumerico];
    console.log("Parametros do insert:", params);
    try {
      const result = await pool.query(
        `INSERT INTO historicoHoras 
   (solipedeNumero, horas, dataLancamento, mesReferencia, mes, ano, usuarioId)
   VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
        params
      );
      console.log("Insert result:", result);
    } catch (insertError) {
      console.error("Erro no insert:", insertError);
      throw insertError;
    }


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

  static async verificarSenhaUsuario(email, senhaFornecida) {
    const [rows] = await pool.query(
      "SELECT id, senha FROM usuarios WHERE email = ?",
      [email]
    );

    if (!rows.length) {
      throw new Error("Usuário não encontrado");
    }

    const usuario = rows[0];
    const senhaValida = await bcrypt.compare(senhaFornecida, usuario.senha);

    if (!senhaValida) {
      throw new Error("Senha incorreta");
    }

    return usuario.id;
  }


  /* ======================================================
     HISTÓRICO
  ====================================================== */
  static async buscarHistorico(numero) {
    const [rows] = await pool.query(
      `SELECT 
      h.id, 
      h.horas, 
      h.dataLancamento, 
      h.mesReferencia, 
      h.mes, 
      h.ano,
      h.usuarioId,
      u.nome as usuarioNome,
      u.email as usuarioEmail
     FROM historicoHoras h
     LEFT JOIN usuarios u ON h.usuarioId = u.id
     WHERE h.solipedeNumero = ?
     ORDER BY h.dataLancamento DESC`,
      [numero]
    );

    console.log("Historico rows:", rows);

    return rows;
  }


  static async buscarHistoricoPorMes(numero, mesReferencia) {
    const [rows] = await pool.query(
      `SELECT 
        h.id, 
        h.horas, 
        h.dataLancamento,
        h.usuarioId,
        u.nome as usuarioNome,
        u.email as usuarioEmail
       FROM historicoHoras h
       LEFT JOIN usuarios u ON h.usuarioId = u.id
       WHERE h.solipedeNumero = ? AND h.mesReferencia = ?
       ORDER BY h.dataLancamento DESC`,
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

  /* ======================================================
     PRONTUÁRIO
  ====================================================== */
  static async salvarProntuario(dados) {
    const sql = `
      INSERT INTO prontuario (numero_solipede, tipo, observacao, recomendacoes, data_criacao)
      VALUES (?, ?, ?, ?, NOW())
    `;

    const [resultado] = await pool.query(sql, [
      dados.numero_solipede,
      dados.tipo,
      dados.observacao,
      dados.recomendacoes
    ]);

    return resultado.insertId;
  }

  static async listarProntuario(numero) {
    const sql = `
      SELECT id, numero_solipede, tipo, observacao, recomendacoes, data_criacao
      FROM prontuario
      WHERE numero_solipede = ?
      ORDER BY data_criacao DESC
    `;

    const [rows] = await pool.query(sql, [numero]);
    return rows;
  }

  static async atualizarProntuario(id, dados) {
    const sql = `
      UPDATE prontuario
      SET tipo = ?, observacao = ?, recomendacoes = ?
      WHERE id = ?
    `;

    await pool.query(sql, [dados.tipo, dados.observacao, dados.recomendacoes, id]);
  }

  static async deletarProntuario(id) {
    const sql = `DELETE FROM prontuario WHERE id = ?`;
    await pool.query(sql, [id]);
  }

  static async buscarHistoricoComUsuario(numero) {
    const sql = `
    SELECT 
      h.id,
      h.horas,
      h.dataLancamento,
      h.mesReferencia,
      h.mes,
      h.ano,
      h.usuarioId,
      u.nome AS usuarioNome,
      u.email AS usuarioEmail
    FROM historicoHoras h
    LEFT JOIN usuarios u ON h.usuarioId = u.id
    WHERE h.solipedeNumero = ?
    ORDER BY h.dataLancamento DESC
  `;

    const [rows] = await pool.query(sql, [numero]);
    return rows;
  }

  static async buscarUsuarioPorId(id) {
    const [[row]] = await pool.query(
      "SELECT id, email FROM usuarios WHERE id = ?",
      [id]
    );
    return row;
  }

}

export default Solipede;
