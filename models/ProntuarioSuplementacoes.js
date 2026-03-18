import pool from "../config/mysqlConnect.js";

class ProntuarioSuplementacoes {

  static async obterNomeTabela(db = pool) {
    const [plural] = await db.query(`SHOW TABLES LIKE 'prontuario_suplementacoes'`);
    if (plural.length > 0) {
      return "prontuario_suplementacoes";
    }

    const [singular] = await db.query(`SHOW TABLES LIKE 'prontuario_suplementacao'`);
    if (singular.length > 0) {
      return "prontuario_suplementacao";
    }

    throw new Error("Tabela de suplementações não encontrada (prontuario_suplementacoes/prontuario_suplementacao)");
  }

  static async obterColunasTabela(db = pool) {
    const tabela = await this.obterNomeTabela(db);
    const [rows] = await db.query(`SHOW COLUMNS FROM ${tabela}`);
    return {
      tabela,
      colunas: new Set(rows.map((row) => row.Field)),
    };
  }

  static async listarPorProntuario(prontuarioId) {
    const tabela = await this.obterNomeTabela();

    const [rows] = await pool.query(
      `SELECT ps.*, p.numero_solipede, u.nome as usuario_nome
       FROM ${tabela} ps
      JOIN prontuario_geral p ON ps.prontuario_id = p.id
       LEFT JOIN usuarios u ON ps.usuario_id = u.id
       WHERE ps.prontuario_id = ?
       ORDER BY ps.id DESC`,
      [prontuarioId]
    );
    return rows;
  }

  static async buscarPorId(id) {
    const tabela = await this.obterNomeTabela();

    const [rows] = await pool.query(
      `SELECT ps.*, p.numero_solipede, u.nome as usuario_nome
       FROM ${tabela} ps
      JOIN prontuario_geral p ON ps.prontuario_id = p.id
       LEFT JOIN usuarios u ON ps.usuario_id = u.id
       WHERE ps.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async validarProntuario(prontuarioId, db = pool) {
    const [rows] = await db.query(
      `SELECT id FROM prontuario_geral WHERE id = ?`,
      [prontuarioId]
    );
    return rows.length > 0;
  }

  static async validarUsuario(usuarioId, db = pool) {
    const [rows] = await db.query(
      `SELECT id FROM usuarios WHERE id = ? AND ativo = TRUE`,
      [usuarioId]
    );
    return rows.length > 0;
  }

  static async criar(dados, db = pool) {
    const {
      prontuario_id,
      usuario_id,
      produto,
      dose,
      frequencia,
      descricao,
      data_fim,
      status_conclusao,
    } = dados;

    console.log("📝 Criando suplementação com dados:", dados);

    if (!prontuario_id || !usuario_id) {
      throw new Error("prontuario_id e usuario_id são obrigatórios");
    }

    if ((!produto || !String(produto).trim()) && (!descricao || !String(descricao).trim())) {
      throw new Error("Produto ou descrição é obrigatório");
    }

    // Validar se prontuário existe
    const prontuarioValido = await this.validarProntuario(prontuario_id, db);
    if (!prontuarioValido) {
      throw new Error(`Prontuário ${prontuario_id} não encontrado`);
    }

    // Validar se usuário existe e está ativo
    const usuarioValido = await this.validarUsuario(usuario_id, db);
    if (!usuarioValido) {
      throw new Error(`Usuário ${usuario_id} não encontrado ou inativo`);
    }

    const { tabela, colunas } = await this.obterColunasTabela(db);

    const campoTextoLivre =
      (colunas.has("observacoes") && "observacoes") ||
      (colunas.has("observacao") && "observacao") ||
      (colunas.has("descricao") && "descricao") ||
      (colunas.has("recomendacoes") && "recomendacoes") ||
      null;

    const campos = ["prontuario_id", "usuario_id", "produto", "dose", "frequencia"];
    const valores = [
      prontuario_id,
      usuario_id,
      produto || null,
      dose || null,
      frequencia || null,
    ];

    if (campoTextoLivre) {
      campos.push(campoTextoLivre);
      valores.push(descricao || null);
    }

    if (colunas.has("data_inicio")) {
      campos.push("data_inicio");
      valores.push(new Date().toISOString().split("T")[0]);
    }

    if (colunas.has("data_fim")) {
      campos.push("data_fim");
      valores.push(data_fim || null);
    }

    if (colunas.has("status_conclusao")) {
      campos.push("status_conclusao");
      valores.push(status_conclusao || "em_andamento");
    }

    const placeholders = campos.map(() => "?").join(", ");

    const [result] = await db.query(
      `INSERT INTO ${tabela}
       (${campos.join(", ")})
       VALUES (${placeholders})`,
      valores
    );

    console.log("✅ Suplementação criada! ID:", result.insertId);
    return result.insertId;
  }

  static async excluir(id) {
    const tabela = await this.obterNomeTabela();

    const [result] = await pool.query(
      `DELETE FROM ${tabela} WHERE id = ?`,
      [id]
    );

    return result.affectedRows > 0;
  }
}

export default ProntuarioSuplementacoes;