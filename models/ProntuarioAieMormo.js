import pool from "../config/mysqlConnect.js";

class ProntuarioAieMormo {
  static escolherPrimeiraColunaExistente(colunasSet, candidatos) {
    return candidatos.find((c) => colunasSet.has(c)) || null;
  }

  static async obterNomeTabela(db = pool) {
    const [plural] = await db.query(`SHOW TABLES LIKE 'prontuario_aiemormos'`);
    if (plural.length > 0) {
      return "prontuario_aiemormos";
    }

    const [singular] = await db.query(`SHOW TABLES LIKE 'prontuario_aiemormo'`);
    if (singular.length > 0) {
      return "prontuario_aiemormo";
    }

    throw new Error("Tabela de AIE Mormo não encontrada (prontuario_aiemormos/prontuario_aiemormo)");
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
    const colunaUsuarioCriacao = this.escolherPrimeiraColunaExistente(colunas, [
      "usuario_id",
      "usuario_atualizacao",
      "usuario_aplicacao",
    ]);
    const colunaUsuarioAplicacao = this.escolherPrimeiraColunaExistente(colunas, [
      "usuario_aplicacao",
      "usuario_atualizacao",
      "usuario_id",
    ]);
    const colunaOrdenacao = this.escolherPrimeiraColunaExistente(colunas, [
      "data_criacao",
      "data_atualizacao",
      "id",
    ]) || "id";

    const joinUsuarioCriacao = colunaUsuarioCriacao
      ? `LEFT JOIN usuarios uc ON pam.${colunaUsuarioCriacao} = uc.id`
      : "LEFT JOIN usuarios uc ON p.usuarioId = uc.id";
    const joinUsuarioAplicacao = colunaUsuarioAplicacao
      ? `LEFT JOIN usuarios ua ON pam.${colunaUsuarioAplicacao} = ua.id`
      : "";
    const selectUsuario = `${colunaUsuarioCriacao ? "uc.nome as usuario_nome, uc.re as usuario_registro" : "NULL as usuario_nome, NULL as usuario_registro"}, ${colunaUsuarioAplicacao ? "ua.nome as usuario_aplicacao_nome, ua.re as usuario_aplicacao_registro" : "NULL as usuario_aplicacao_nome, NULL as usuario_aplicacao_registro"}`;

    const [rows] = await pool.query(
      `SELECT pam.*, p.numero_solipede, p.tipo, ${selectUsuario}
       FROM ${tabela} pam
       JOIN prontuario_geral p ON pam.prontuario_id = p.id
       ${joinUsuarioCriacao}
       ${joinUsuarioAplicacao}
       WHERE pam.prontuario_id = ?
       ORDER BY pam.${colunaOrdenacao} DESC`,
      [prontuarioId]
    );

    return rows;
  }

  static async buscarPorId(id) {
    const { tabela, colunas } = await this.obterColunasTabela();
    const colunaUsuarioCriacao = this.escolherPrimeiraColunaExistente(colunas, [
      "usuario_id",
      "usuario_atualizacao",
      "usuario_aplicacao",
    ]);
    const colunaUsuarioAplicacao = this.escolherPrimeiraColunaExistente(colunas, [
      "usuario_aplicacao",
      "usuario_atualizacao",
      "usuario_id",
    ]);

    const joinUsuarioCriacao = colunaUsuarioCriacao
      ? `LEFT JOIN usuarios uc ON pam.${colunaUsuarioCriacao} = uc.id`
      : "LEFT JOIN usuarios uc ON p.usuarioId = uc.id";
    const joinUsuarioAplicacao = colunaUsuarioAplicacao
      ? `LEFT JOIN usuarios ua ON pam.${colunaUsuarioAplicacao} = ua.id`
      : "";
    const selectUsuario = `${colunaUsuarioCriacao ? "uc.nome as usuario_nome, uc.re as usuario_registro" : "NULL as usuario_nome, NULL as usuario_registro"}, ${colunaUsuarioAplicacao ? "ua.nome as usuario_aplicacao_nome, ua.re as usuario_aplicacao_registro" : "NULL as usuario_aplicacao_nome, NULL as usuario_aplicacao_registro"}`;

    const [rows] = await pool.query(
      `SELECT pam.*, p.numero_solipede, p.tipo, ${selectUsuario}
       FROM ${tabela} pam
       JOIN prontuario_geral p ON pam.prontuario_id = p.id
       ${joinUsuarioCriacao}
       ${joinUsuarioAplicacao}
       WHERE pam.id = ?`,
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
      usuario_aplicacao,
      usuario_atualizacao,
      data_exame,
      validade,
      resultado,
      descricao,
      status_conclusao,
    } = dados;

    if (!prontuario_id || !usuario_id) {
      throw new Error("prontuario_id e usuario_id são obrigatórios");
    }

    const prontuarioValido = await this.validarProntuario(prontuario_id, db);
    if (!prontuarioValido) {
      throw new Error(`Prontuário ${prontuario_id} não encontrado`);
    }

    const usuarioValido = await this.validarUsuario(usuario_id, db);
    if (!usuarioValido) {
      throw new Error(`Usuário ${usuario_id} não encontrado`);
    }

    const usuarioAplicacao = usuario_aplicacao || usuario_id;
    if (usuarioAplicacao) {
      const usuarioAplicacaoValido = await this.validarUsuario(usuarioAplicacao, db);
      if (!usuarioAplicacaoValido) {
        throw new Error(`Usuário responsável ${usuarioAplicacao} não encontrado`);
      }
    }

    const { tabela, colunas } = await this.obterColunasTabela(db);

    if (!colunas.has("prontuario_id")) {
      throw new Error("Tabela de AIE/Mormo sem coluna prontuario_id");
    }

    const temAlgumaColunaUsuario = ["usuario_aplicacao", "usuario_atualizacao", "usuario_id"].some((c) => colunas.has(c));

    if (!temAlgumaColunaUsuario) {
      throw new Error("Tabela de AIE/Mormo sem coluna de usuário (usuario_id/usuario_atualizacao/usuario_aplicacao)");
    }

    const colunaDataExame = this.escolherPrimeiraColunaExistente(colunas, [
      "data_exame",
      "data_inicio",
      "data_movimentacao",
    ]);
    const colunaValidade = this.escolherPrimeiraColunaExistente(colunas, [
      "validade",
      "validade_dias",
    ]);
    const colunaResultado = this.escolherPrimeiraColunaExistente(colunas, [
      "resultado",
      "resultado_exame",
    ]);
    const colunaDescricao = this.escolherPrimeiraColunaExistente(colunas, [
      "descricao",
      "observacao",
      "motivo",
    ]);
    const colunaStatus = this.escolherPrimeiraColunaExistente(colunas, [
      "status_conclusao",
      "status",
    ]);

    const campos = ["prontuario_id"];
    const valores = [prontuario_id];

    if (colunas.has("usuario_id")) {
      campos.push("usuario_id");
      valores.push(usuario_id);
    }

    if (colunas.has("usuario_aplicacao")) {
      campos.push("usuario_aplicacao");
      valores.push(usuarioAplicacao);
    }

    if (colunas.has("usuario_atualizacao")) {
      campos.push("usuario_atualizacao");
      valores.push(usuario_atualizacao || usuario_id);
    }

    if (colunaDataExame) {
      campos.push(colunaDataExame);
      valores.push(data_exame || new Date().toISOString().split("T")[0]);
    }

    if (colunaValidade) {
      campos.push(colunaValidade);
      valores.push(validade || null);
    }

    if (colunaResultado) {
      campos.push(colunaResultado);
      valores.push(resultado || null);
    }

    if (colunaDescricao) {
      campos.push(colunaDescricao);
      valores.push(descricao || null);
    }

    if (colunaStatus) {
      campos.push(colunaStatus);
      valores.push(status_conclusao || "em_andamento");
    }

    const placeholders = campos.map(() => "?").join(", ");

    const [resultadoInsert] = await db.query(
      `INSERT INTO ${tabela} (${campos.join(", ")}) VALUES (${placeholders})`,
      valores
    );

    return resultadoInsert.insertId;
  }

  static async atualizarParcial(id, dados, db = pool) {
    const registroAtual = await this.buscarPorId(id);
    if (!registroAtual) {
      return null;
    }

    const { tabela, colunas } = await this.obterColunasTabela(db);
    const { usuario_atualizacao, ...camposAtualizaveis } = dados;

    if (Object.keys(camposAtualizaveis).length === 0) {
      return true;
    }

    const camposComAlias = {
      data_exame: this.escolherPrimeiraColunaExistente(colunas, ["data_exame", "data_inicio", "data_movimentacao"]),
      validade: this.escolherPrimeiraColunaExistente(colunas, ["validade", "validade_dias"]),
      resultado: this.escolherPrimeiraColunaExistente(colunas, ["resultado", "resultado_exame"]),
      descricao: this.escolherPrimeiraColunaExistente(colunas, ["descricao", "observacao", "motivo"]),
      status_conclusao: this.escolherPrimeiraColunaExistente(colunas, ["status_conclusao", "status"]),
    };

    const camposParaAtualizar = [];
    const valores = [];

    Object.entries(camposAtualizaveis).forEach(([campoEntrada, valor]) => {
      const campoReal = camposComAlias[campoEntrada] || (colunas.has(campoEntrada) ? campoEntrada : null);
      if (campoReal) {
        camposParaAtualizar.push(`${campoReal} = ?`);
        valores.push(valor || null);
      }
    });

    const colunaUsuarioAtualizacao = this.escolherPrimeiraColunaExistente(colunas, [
      "usuario_atualizacao",
      "usuario_id",
      "usuario_aplicacao",
    ]);

    if (usuario_atualizacao && colunaUsuarioAtualizacao) {
      camposParaAtualizar.push(`${colunaUsuarioAtualizacao} = ?`);
      valores.push(usuario_atualizacao);
    }

    if (camposParaAtualizar.length === 0) {
      return true;
    }

    valores.push(id);

    const [resultado] = await db.query(
      `UPDATE ${tabela}
       SET ${camposParaAtualizar.join(", ")}
       WHERE id = ?`,
      valores
    );

    return resultado.affectedRows > 0;
  }

  static async excluir(id, db = pool) {
    const tabela = await this.obterNomeTabela(db);

    const [resultado] = await db.query(`DELETE FROM ${tabela} WHERE id = ?`, [id]);

    return resultado.affectedRows > 0;
  }

  static async obterStatus(id) {
    const tabela = await this.obterNomeTabela();

    const [rows] = await pool.query(
      `SELECT status_conclusao FROM ${tabela} WHERE id = ?`,
      [id]
    );

    return rows[0]?.status_conclusao || null;
  }
}

export default ProntuarioAieMormo;
