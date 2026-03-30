import pool from "../config/mysqlConnect.js";

class ProntuarioVacinacao {

  static escolherPrimeiraColunaExistente(colunasSet, candidatos) {
    return candidatos.find((c) => colunasSet.has(c)) || null;
  }

  static async obterNomeTabela(db = pool) {
    const [plural] = await db.query(`SHOW TABLES LIKE 'prontuario_vacinacoes'`);
    if (plural.length > 0) {
      return "prontuario_vacinacoes";
    }

    const [singular] = await db.query(`SHOW TABLES LIKE 'prontuario_vacinacao'`);
    if (singular.length > 0) {
      return "prontuario_vacinacao";
    }

    throw new Error("Tabela de vacinações não encontrada (prontuario_vacinacoes/prontuario_vacinacao)");
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
    const { tabela, colunas } = await this.obterColunasTabela();
    const colunaUsuario = this.escolherPrimeiraColunaExistente(colunas, [
      "usuario_aplicacao",
      "usuario_atualizacao",
      "usuario_id",
    ]);
    const colunaOrdenacao = this.escolherPrimeiraColunaExistente(colunas, [
      "data_criacao",
      "data_atualizacao",
      "id",
    ]) || "id";

    const joinUsuarioCriacao = "LEFT JOIN usuarios uc ON p.usuarioId = uc.id";
    const joinUsuarioAplicacao = colunaUsuario
      ? `LEFT JOIN usuarios ua ON pv.${colunaUsuario} = ua.id`
      : "";
    const selectUsuario = colunaUsuario
      ? "uc.nome as usuario_nome, uc.re as usuario_registro, ua.nome as usuario_aplicacao_nome, ua.re as usuario_aplicacao_registro"
      : "uc.nome as usuario_nome, uc.re as usuario_registro, NULL as usuario_aplicacao_nome, NULL as usuario_aplicacao_registro";

    const [rows] = await pool.query(
      `SELECT pv.*, p.numero_solipede, ${selectUsuario}
       FROM ${tabela} pv
       JOIN prontuario_geral p ON pv.prontuario_id = p.id
       ${joinUsuarioCriacao}
       ${joinUsuarioAplicacao}
       WHERE pv.prontuario_id = ?
       ORDER BY pv.${colunaOrdenacao} DESC`,
      [prontuarioId]
    );
    return rows;
  }

  static async buscarPorId(id) {
    const { tabela, colunas } = await this.obterColunasTabela();
    const colunaUsuario = this.escolherPrimeiraColunaExistente(colunas, [
      "usuario_aplicacao",
      "usuario_atualizacao",
      "usuario_id",
    ]);

    const joinUsuarioCriacao = "LEFT JOIN usuarios uc ON p.usuarioId = uc.id";
    const joinUsuarioAplicacao = colunaUsuario
      ? `LEFT JOIN usuarios ua ON pv.${colunaUsuario} = ua.id`
      : "";
    const selectUsuario = colunaUsuario
      ? "uc.nome as usuario_nome, uc.re as usuario_registro, ua.nome as usuario_aplicacao_nome, ua.re as usuario_aplicacao_registro"
      : "uc.nome as usuario_nome, uc.re as usuario_registro, NULL as usuario_aplicacao_nome, NULL as usuario_aplicacao_registro";

    const [rows] = await pool.query(
      `SELECT pv.*, p.numero_solipede, ${selectUsuario}
       FROM ${tabela} pv
       JOIN prontuario_geral p ON pv.prontuario_id = p.id
       ${joinUsuarioCriacao}
       ${joinUsuarioAplicacao}
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
      lote,
      dose,
      data_inicio,
      data_validade,
      descricao,
      data_fim,
      status_conclusao,
    } = dados;

    console.log("📝 Criando vacinação com dados:", dados);

    if (!prontuario_id || !usuario_id) {
      throw new Error("prontuario_id e usuario_id são obrigatórios");
    }

    if (!produto || !String(produto).trim()) {
      throw new Error("Produto é obrigatório");
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

    const colunasUsuario = ["usuario_aplicacao", "usuario_atualizacao", "usuario_id"].filter(
      (c) => colunas.has(c)
    );

    if (colunasUsuario.length === 0) {
      throw new Error("Tabela de vacinação sem coluna de usuário (usuario_id/usuario_atualizacao/usuario_aplicacao)");
    }

    const campos = ["prontuario_id", "produto"];
    const valores = [prontuario_id, produto || null];

    colunasUsuario.forEach((coluna) => {
      campos.push(coluna);
      valores.push(usuario_id);
    });

    // Campos opcionais com detecção dinâmica
    if (colunas.has("partida")) {
      campos.push("partida");
      valores.push(partida || null);
    }

    if (colunas.has("fabricacao")) {
      campos.push("fabricacao");
      valores.push(fabricacao || null);
    }

    if (colunas.has("lote")) {
      campos.push("lote");
      valores.push(lote || null);
    }

    if (colunas.has("dose")) {
      campos.push("dose");
      valores.push(dose || null);
    }

    if (colunas.has("data_inicio")) {
      campos.push("data_inicio");
      valores.push(data_inicio || new Date().toISOString().split("T")[0]);
    }

    if (colunas.has("data_validade")) {
      campos.push("data_validade");
      valores.push(data_validade || null);
    }

    if (colunas.has("descricao")) {
      campos.push("descricao");
      valores.push(descricao || null);
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

    console.log("✅ Vacinação criada! ID:", result.insertId);
    return result.insertId;
  }

  static async excluir(id, db = pool) {
    const tabela = await this.obterNomeTabela(db);

    const [result] = await db.query(
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
    const { usuario_atualizacao, usuario_aplicacao, ...camposAtualizaveis } = dados;
    const camposPermitidos = [
      "produto",
      "partida",
      "fabricacao",
      "lote",
      "dose",
      "data_inicio",
      "data_validade",
      "descricao",
      "data_fim",
      "status_conclusao",
    ];

    const camposParaAtualizar = [];
    const valores = [];

    for (const campo of camposPermitidos) {
      if (Object.prototype.hasOwnProperty.call(camposAtualizaveis, campo) && colunas.has(campo)) {
        camposParaAtualizar.push(`${campo} = ?`);
        valores.push(camposAtualizaveis[campo] || null);
      }
    }

    const colunaUsuarioAtualizacao = this.escolherPrimeiraColunaExistente(colunas, [
      "usuario_atualizacao",
      "usuario_aplicacao",
      "usuario_id",
    ]);
    const usuarioResponsavel = usuario_aplicacao || usuario_atualizacao;

    if (usuarioResponsavel && colunaUsuarioAtualizacao) {
      camposParaAtualizar.push(`${colunaUsuarioAtualizacao} = ?`);
      valores.push(usuarioResponsavel);
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
}

export default ProntuarioVacinacao;
