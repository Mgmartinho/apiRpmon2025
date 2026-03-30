import pool from "../config/mysqlConnect.js";

class ProntuarioMovimentacoes {

  static formatarDataHoraMySql(data = new Date()) {
    const pad = (n) => String(n).padStart(2, "0");
    const ano = data.getFullYear();
    const mes = pad(data.getMonth() + 1);
    const dia = pad(data.getDate());
    const hora = pad(data.getHours());
    const minuto = pad(data.getMinutes());
    const segundo = pad(data.getSeconds());
    return `${ano}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
  }

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
      tipo_movimentacao,
      motivo,
      origem,
      destino,
      destino_final,
      observacoes,
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
    const colunaDestinoFinal = colunas.has("destino_final")
      ? "destino_final"
      : colunas.has("destinoFinal")
        ? "destinoFinal"
        : colunas.has("alocacao_final")
          ? "alocacao_final"
          : null;

    const campos = ["prontuario_id", "usuario_id", "destino", "motivo"];
    const valores = [
      prontuario_id,
      usuario_id,
      destino || null,
      motivo || null,
    ];

    if (colunas.has("tipo_movimentacao")) {
      campos.push("tipo_movimentacao");
      valores.push(tipo_movimentacao || "Movimentacao");
    }

    if (colunas.has("observacoes")) {
      campos.push("observacoes");
      valores.push(observacoes || null);
    }

    if (colunas.has("origem")) {
      campos.push("origem");
      valores.push(origem || null);
    }

    if (colunaDestinoFinal) {
      campos.push(colunaDestinoFinal);
      valores.push(destino_final || null);
    }

    if (colunas.has("data_movimentacao")) {
      campos.push("data_movimentacao");
      valores.push(data_movimentacao || this.formatarDataHoraMySql());
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

  static async atualizarParcial(id, dados, db = pool) {
    const registroAtual = await this.buscarPorId(id);
    if (!registroAtual) {
      return null;
    }

    const { tabela, colunas } = await this.obterColunasTabela(db);
    const colunaDestinoFinal = colunas.has("destino_final")
      ? "destino_final"
      : colunas.has("destinoFinal")
        ? "destinoFinal"
        : colunas.has("alocacao_final")
          ? "alocacao_final"
          : null;

    if (Object.prototype.hasOwnProperty.call(dados, "destino_final") && !colunaDestinoFinal) {
      throw new Error("A tabela de movimentacoes nao possui coluna de destino final (destino_final/destinoFinal/alocacao_final)");
    }
    const camposParaAtualizar = [];
    const valores = [];

    const mapaCampos = {
      motivo: "motivo",
      origem: colunas.has("origem") ? "origem" : null,
      destino: "destino",
      destino_final: colunaDestinoFinal,
      data_movimentacao: colunas.has("data_movimentacao") ? "data_movimentacao" : null,
      status_conclusao: colunas.has("status_conclusao") ? "status_conclusao" : null,
      usuario_conclusao_id: colunas.has("usuario_conclusao_id") ? "usuario_conclusao_id" : null,
      usuario_atualizacao: colunas.has("usuario_atualizacao") ? "usuario_atualizacao" : null,
    };

    for (const [campoEntrada, campoTabela] of Object.entries(mapaCampos)) {
      if (campoTabela && Object.prototype.hasOwnProperty.call(dados, campoEntrada)) {
        camposParaAtualizar.push(`${campoTabela} = ?`);
        valores.push(dados[campoEntrada]);
      }
    }

    if (colunas.has("data_atualizacao")) {
      camposParaAtualizar.push("data_atualizacao = NOW()");
    }

    if (
      colunas.has("data_conclusao") &&
      Object.prototype.hasOwnProperty.call(dados, "status_conclusao") &&
      String(dados.status_conclusao || "").toLowerCase() === "concluido"
    ) {
      camposParaAtualizar.push("data_conclusao = NOW()");
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

export default ProntuarioMovimentacoes;