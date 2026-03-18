import pool from "../config/mysqlConnect.js";

class ProntuarioMovimentacoes {

  static async obterNomeTabela(db = pool) {
    const [plural] = await db.query(`SHOW TABLES LIKE 'prontuario_movimentacoes'`);
    if (plural.length > 0) {
      return "prontuario_movimentacoes";
    }

    const [singular] = await db.query(`SHOW TABLES LIKE 'prontuario_movimentacao'`);
    if (singular.length > 0) {
      return "prontuario_movimentacao";
    }

    throw new Error("Tabela de movimentações não encontrada (prontuario_movimentacoes/prontuario_movimentacao)");
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
      `SELECT pm.*, p.numero_solipede, u.nome as usuario_nome
       FROM ${tabela} pm
      JOIN prontuario_geral p ON pm.prontuario_id = p.id
       LEFT JOIN usuarios u ON pm.usuario_id = u.id
       WHERE pm.prontuario_id = ?
       ORDER BY pm.data_movimentacao DESC`,
      [prontuarioId]
    );
    return rows;
  }

  static async buscarPorId(id) {
    const tabela = await this.obterNomeTabela();

    const [rows] = await pool.query(
      `SELECT pm.*, p.numero_solipede, u.nome as usuario_nome
       FROM ${tabela} pm
      JOIN prontuario_geral p ON pm.prontuario_id = p.id
       LEFT JOIN usuarios u ON pm.usuario_id = u.id
       WHERE pm.id = ?`,
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
      motivo,
      destino,
      data_movimentacao,
      status_conclusao,
    } = dados;

    console.log("📝 Criando movimentação com dados:", dados);

    if (!prontuario_id || !usuario_id) {
      throw new Error("prontuario_id e usuario_id são obrigatórios");
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

    const campos = ["prontuario_id", "usuario_id", "destino", "motivo"];
    const valores = [
      prontuario_id,
      usuario_id,
      destino || null,
      motivo || null,
    ];

    if (colunas.has("data_movimentacao")) {
      campos.push("data_movimentacao");
      valores.push(data_movimentacao || new Date().toISOString().split("T")[0]);
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

    console.log("✅ Movimentação criada! ID:", result.insertId);
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

export default ProntuarioMovimentacoes;