import pool from "../config/mysqlConnect.js";

class ProntuarioDietas {

  static async obterNomeTabela(db = pool) {
    const [plural] = await db.query(`SHOW TABLES LIKE 'prontuario_dietas'`);
    if (plural.length > 0) {
      return "prontuario_dietas";
    }

    const [singular] = await db.query(`SHOW TABLES LIKE 'prontuario_dieta'`);
    if (singular.length > 0) {
      return "prontuario_dieta";
    }

    throw new Error("Tabela de dietas não encontrada (prontuario_dietas/prontuario_dieta)");
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
      `SELECT pd.*, p.numero_solipede, u.nome as usuario_nome
       FROM ${tabela} pd
       JOIN prontuario p ON pd.prontuario_id = p.id
       LEFT JOIN usuarios u ON pd.usuario_id = u.id
       WHERE pd.prontuario_id = ?
       ORDER BY pd.id DESC`,
      [prontuarioId]
    );
    return rows;
  }

  static async buscarPorId(id) {
    const tabela = await this.obterNomeTabela();

    const [rows] = await pool.query(
      `SELECT pd.*, p.numero_solipede, u.nome as usuario_nome
       FROM ${tabela} pd
       JOIN prontuario p ON pd.prontuario_id = p.id
       LEFT JOIN usuarios u ON pd.usuario_id = u.id
       WHERE pd.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async validarProntuario(prontuarioId, db = pool) {
    const [rows] = await db.query(
      `SELECT id, numero_solipede FROM prontuario WHERE id = ?`,
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
      tipo_dieta,
      descricao,
      data_criacao,
      data_fim,
      status_conclusao,
    } = dados;

    console.log("📝 Criando dieta com dados:", dados);

    if (!prontuario_id || !usuario_id) {
      throw new Error("prontuario_id e usuario_id são obrigatórios");
    }

    if ((!tipo_dieta || !String(tipo_dieta).trim()) && (!descricao || !String(descricao).trim())) {
      throw new Error("Tipo de dieta ou descrição é obrigatório");
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

    const campos = ["prontuario_id", "usuario_id", "tipo_dieta", "descricao"];
    const valores = [
      prontuario_id,
      usuario_id,
      tipo_dieta || null,
      descricao || null,
    ];

    if (colunas.has("data_criacao")) {
      campos.push("data_criacao");
      valores.push(data_criacao || new Date().toISOString().split("T")[0]);
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

    console.log("✅ Dieta criada! ID:", result.insertId);
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

  static async atualizarParcial(id, dados, db = pool) {
    const registroAtual = await this.buscarPorId(id);
    if (!registroAtual) {
      return null;
    }

    const { tabela, colunas } = await this.obterColunasTabela(db);

    const camposPermitidos = ["tipo_dieta", "descricao", "data_criacao", "data_fim", "status_conclusao"];
    const camposParaAtualizar = [];
    const valores = [];

    for (const campo of camposPermitidos) {
      if (Object.prototype.hasOwnProperty.call(dados, campo) && colunas.has(campo)) {
        camposParaAtualizar.push(`${campo} = ?`);
        valores.push(dados[campo]);
      }
    }

    if (camposParaAtualizar.length === 0) {
      throw new Error("Nenhum campo válido para atualização");
    }

    valores.push(id);

    const [result] = await db.query(
      `UPDATE ${tabela}
       SET ${camposParaAtualizar.join(", ")}
       WHERE id = ?`,
      valores
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return this.buscarPorId(id);
  }
}

export default ProntuarioDietas;