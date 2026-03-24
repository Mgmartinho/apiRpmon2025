import pool from "../config/mysqlConnect.js";

class ProntuarioVermifugacao {
  static async obterNomeTabela(db = pool) {
    const [plural] = await db.query(`SHOW TABLES LIKE 'prontuario_vermifugacoes'`);
    if (plural.length > 0) {
      return "prontuario_vermifugacoes";
    }

    const [singular] = await db.query(`SHOW TABLES LIKE 'prontuario_vermifugacao'`);
    if (singular.length > 0) {
      return "prontuario_vermifugacao";
    }

    throw new Error("Tabela de vermifugacao não encontrada (prontuario_vermifugacoes/prontuario_vermifugacao)");
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
      `SELECT pv.*, p.numero_solipede, p.tipo, u.nome as usuario_nome, u.re as usuario_registro
       FROM ${tabela} pv
       JOIN prontuario_geral p ON pv.prontuario_id = p.id
       LEFT JOIN usuarios u ON pv.usuario_id = u.id
       WHERE pv.prontuario_id = ?
       ORDER BY pv.data_criacao DESC`,
      [prontuarioId]
    );

    return rows;
  }

  static async buscarPorId(id) {
    const tabela = await this.obterNomeTabela();

    const [rows] = await pool.query(
      `SELECT pv.*, p.numero_solipede, p.tipo, u.nome as usuario_nome, u.re as usuario_registro
       FROM ${tabela} pv
       JOIN prontuario_geral p ON pv.prontuario_id = p.id
       LEFT JOIN usuarios u ON pv.usuario_id = u.id
       WHERE pv.id = ?`,
      [id]
    );

    return rows[0] || null;
  }

  static async validarProntuario(prontuarioId, db = pool) {
    const [rows] = await db.query(
      `SELECT id, numero_solipede FROM prontuario_geral WHERE id = ?`,
      [prontuarioId]
    );
    return rows[0] || null;
  }

  static async validarUsuario(usuarioId, db = pool) {
    const [rows] = await db.query(
      `SELECT id, nome, email FROM usuarios WHERE id = ? AND ativo = TRUE`,
      [usuarioId]
    );
    return rows[0] || null;
  }

  static async criar(dados, db = pool) {
    const {
      prontuario_id,
      usuario_id,
      produto,
      partida,
      fabricacao,
      data_inicio,
      data_fabricacao,
      data_validade,
      descricao,
      status_conclusao,
    } = dados;

    if (!prontuario_id || !usuario_id) {
      throw new Error("prontuario_id e usuario_id são obrigatórios");
    }

    if (!produto || !String(produto).trim()) {
      throw new Error("Produto é obrigatório");
    }

    const prontuarioValido = await this.validarProntuario(prontuario_id, db);
    if (!prontuarioValido) {
      throw new Error(`Prontuário ${prontuario_id} não encontrado`);
    }

    const usuarioValido = await this.validarUsuario(usuario_id, db);
    if (!usuarioValido) {
      throw new Error(`Usuário ${usuario_id} não encontrado ou inativo`);
    }

    const { tabela, colunas } = await this.obterColunasTabela(db);

    const campos = ["prontuario_id", "usuario_id", "produto"];
    const valores = [prontuario_id, usuario_id, produto || null];

    if (colunas.has("partida")) {
      campos.push("partida");
      valores.push(partida || null);
    }

    if (colunas.has("fabricacao")) {
      campos.push("fabricacao");
      valores.push(fabricacao || null);
    }

    if (colunas.has("data_inicio")) {
      campos.push("data_inicio");
      valores.push(data_inicio || new Date().toISOString().split("T")[0]);
    }

    if (colunas.has("data_fabricacao")) {
      campos.push("data_fabricacao");
      valores.push(data_fabricacao || null);
    }

    if (colunas.has("data_validade")) {
      campos.push("data_validade");
      valores.push(data_validade || null);
    }

    if (colunas.has("descricao")) {
      campos.push("descricao");
      valores.push(descricao || null);
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

    return result.insertId;
  }

  static async atualizarParcial(id, dados, db = pool) {
    const registroAtual = await this.buscarPorId(id);
    if (!registroAtual) {
      return null;
    }

    const { tabela, colunas } = await this.obterColunasTabela(db);
    const camposPermitidos = [
      "produto",
      "partida",
      "fabricacao",
      "data_inicio",
      "data_fabricacao",
      "data_validade",
      "descricao",
      "status_conclusao",
      "usuario_atualizacao",
    ];

    const camposParaAtualizar = [];
    const valores = [];

    for (const campo of camposPermitidos) {
      if (Object.prototype.hasOwnProperty.call(dados, campo) && colunas.has(campo)) {
        camposParaAtualizar.push(`${campo} = ?`);
        valores.push(dados[campo] || null);
      }
    }

    if (camposParaAtualizar.length === 0) {
      return registroAtual;
    }

    valores.push(id);

    const [result] = await db.query(
      `UPDATE ${tabela}
       SET ${camposParaAtualizar.join(", ")}
       WHERE id = ?`,
      valores
    );

    return result.affectedRows > 0;
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

export default ProntuarioVermifugacao;
