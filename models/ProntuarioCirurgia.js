import pool from "../config/mysqlConnect.js";

class ProntuarioCirurgia {
  static async obterColunasTabela(db = pool) {
    const [rows] = await db.query("SHOW COLUMNS FROM prontuario_cirurgias");
    return new Set(rows.map((row) => row.Field));
  }

  static async listarPorProntuario(prontuarioId) {
    const colunas = await this.obterColunasTabela();

    const joinUsuarioAtualizacao = colunas.has("usuario_atualizacao")
      ? "LEFT JOIN usuarios uu ON pc.usuario_atualizacao = uu.id"
      : "";

    const joinCirurgiaoPrincipal = colunas.has("cirurgiao_principal_id")
      ? "LEFT JOIN usuarios ucp ON pc.cirurgiao_principal_id = ucp.id"
      : "";

    const joinCirurgiaoAnestesista = colunas.has("cirurgiao_anestesista_id")
      ? "LEFT JOIN usuarios uca ON pc.cirurgiao_anestesista_id = uca.id"
      : "";

    const joinCirurgiaoAuxiliar = colunas.has("cirurgiao_auxiliar_id")
      ? "LEFT JOIN usuarios ucx ON pc.cirurgiao_auxiliar_id = ucx.id"
      : "";

    const joinAuxiliar = colunas.has("auxiliar_id")
      ? "LEFT JOIN usuarios ua ON pc.auxiliar_id = ua.id"
      : "";

    const [rows] = await pool.query(
      `SELECT
        pc.*,
        p.numero_solipede,
        uc.nome AS usuario_nome,
        uc.re AS usuario_registro,
        ${colunas.has("usuario_atualizacao") ? "uu.nome AS usuario_atualizacao_nome, uu.re AS usuario_atualizacao_registro," : "NULL AS usuario_atualizacao_nome, NULL AS usuario_atualizacao_registro,"}
        ${colunas.has("cirurgiao_principal_id") ? "ucp.nome AS cirurgiao_principal_nome, ucp.re AS cirurgiao_principal_registro," : "NULL AS cirurgiao_principal_nome, NULL AS cirurgiao_principal_registro,"}
        ${colunas.has("cirurgiao_anestesista_id") ? "uca.nome AS cirurgiao_anestesista_nome, uca.re AS cirurgiao_anestesista_registro," : "NULL AS cirurgiao_anestesista_nome, NULL AS cirurgiao_anestesista_registro,"}
        ${colunas.has("cirurgiao_auxiliar_id") ? "ucx.nome AS cirurgiao_auxiliar_nome, ucx.re AS cirurgiao_auxiliar_registro," : "NULL AS cirurgiao_auxiliar_nome, NULL AS cirurgiao_auxiliar_registro,"}
        ${colunas.has("auxiliar_id") ? "ua.nome AS auxiliar_nome, ua.re AS auxiliar_registro" : "NULL AS auxiliar_nome, NULL AS auxiliar_registro"}
      FROM prontuario_cirurgias pc
      INNER JOIN prontuario_geral p ON p.id = pc.prontuario_id
      LEFT JOIN usuarios uc ON pc.usuario_id = uc.id
      ${joinUsuarioAtualizacao}
      ${joinCirurgiaoPrincipal}
      ${joinCirurgiaoAnestesista}
      ${joinCirurgiaoAuxiliar}
      ${joinAuxiliar}
      WHERE pc.prontuario_id = ?
      ORDER BY pc.data_criacao DESC`,
      [prontuarioId]
    );

    return rows;
  }

  static async buscarPorId(id) {
    const [rows] = await pool.query(
      `SELECT pc.*, p.numero_solipede
       FROM prontuario_cirurgias pc
       INNER JOIN prontuario_geral p ON p.id = pc.prontuario_id
       WHERE pc.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  static async criar(dados, db = pool) {
    const {
      prontuario_id,
      numero_solipede,
      procedimento,
      descricao_procedimento,
      data_procedimento,
      status_conclusao,
      usuario_id,
      usuario_atualizacao,
      cirurgiao_principal_id,
      cirurgiao_anestesista_id,
      cirurgiao_auxiliar_id,
      auxiliar_id,
    } = dados;

    const colunas = await this.obterColunasTabela(db);

    const campos = ["prontuario_id", "procedimento", "descricao_procedimento", "usuario_id"];
    const valores = [
      prontuario_id,
      procedimento || null,
      descricao_procedimento,
      usuario_id,
    ];

    if (colunas.has("numero_solipede") && numero_solipede) {
      campos.push("numero_solipede");
      valores.push(numero_solipede);
    }

    if (colunas.has("data_procedimento")) {
      campos.push("data_procedimento");
      valores.push(data_procedimento || new Date().toISOString().split("T")[0]);
    }

    if (colunas.has("status_conclusao")) {
      campos.push("status_conclusao");
      valores.push(status_conclusao || "em_andamento");
    }

    if (colunas.has("usuario_atualizacao")) {
      campos.push("usuario_atualizacao");
      valores.push(usuario_atualizacao || usuario_id);
    }

    if (colunas.has("cirurgiao_principal_id")) {
      campos.push("cirurgiao_principal_id");
      valores.push(cirurgiao_principal_id || null);
    }

    if (colunas.has("cirurgiao_anestesista_id")) {
      campos.push("cirurgiao_anestesista_id");
      valores.push(cirurgiao_anestesista_id || null);
    }

    if (colunas.has("cirurgiao_auxiliar_id")) {
      campos.push("cirurgiao_auxiliar_id");
      valores.push(cirurgiao_auxiliar_id || null);
    }

    if (colunas.has("auxiliar_id")) {
      campos.push("auxiliar_id");
      valores.push(auxiliar_id || null);
    }

    const placeholders = campos.map(() => "?").join(", ");

    const [result] = await db.query(
      `INSERT INTO prontuario_cirurgias (${campos.join(", ")}) VALUES (${placeholders})`,
      valores
    );

    return result.insertId;
  }

  static async atualizarParcial(id, dados, db = pool) {
    const colunas = await this.obterColunasTabela(db);
    const camposParaAtualizar = [];
    const valores = [];

    const mapaCampos = {
      procedimento: "procedimento",
      descricao_procedimento: "descricao_procedimento",
      data_procedimento: colunas.has("data_procedimento") ? "data_procedimento" : null,
      status_conclusao: colunas.has("status_conclusao") ? "status_conclusao" : null,
      usuario_atualizacao: colunas.has("usuario_atualizacao") ? "usuario_atualizacao" : null,
      cirurgiao_principal_id: colunas.has("cirurgiao_principal_id") ? "cirurgiao_principal_id" : null,
      cirurgiao_anestesista_id: colunas.has("cirurgiao_anestesista_id") ? "cirurgiao_anestesista_id" : null,
      cirurgiao_auxiliar_id: colunas.has("cirurgiao_auxiliar_id") ? "cirurgiao_auxiliar_id" : null,
      auxiliar_id: colunas.has("auxiliar_id") ? "auxiliar_id" : null,
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

    if (camposParaAtualizar.length === 0) {
      throw new Error("Nenhum campo válido para atualização");
    }

    valores.push(id);

    const [result] = await db.query(
      `UPDATE prontuario_cirurgias SET ${camposParaAtualizar.join(", ")} WHERE id = ?`,
      valores
    );

    if (result.affectedRows === 0) {
      return null;
    }

    return this.buscarPorId(id);
  }

  static async excluir(id, db = pool) {
    const [result] = await db.query(
      "DELETE FROM prontuario_cirurgias WHERE id = ?",
      [id]
    );

    return result.affectedRows > 0;
  }
}

export default ProntuarioCirurgia;
