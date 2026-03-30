import pool from "../config/mysqlConnect.js";
import ProntuarioCirurgia from "../models/ProntuarioCirurgia.js";

export const listar = async (req, res) => {
  try {
    const { prontuarioId } = req.params;

    if (!prontuarioId) {
      return res.status(400).json({ erro: "prontuarioId é obrigatório" });
    }

    const dados = await ProntuarioCirurgia.listarPorProntuario(prontuarioId);
    return res.json(dados);
  } catch (error) {
    console.error("Erro ao listar cirurgias:", error);
    return res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  let connection;
  try {
    const {
      numero_solipede,
      procedimento,
      descricao_procedimento,
      data_procedimento,
      status_conclusao,
      cirurgiao_principal_id,
      cirurgiao_anestesista_id,
      cirurgiao_auxiliar_id,
      auxiliar_id,
    } = req.body || {};

    const usuarioTokenId = req.usuario?.id;

    if (!usuarioTokenId) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    if (!numero_solipede) {
      return res.status(400).json({ erro: "numero_solipede é obrigatório" });
    }

    if (!procedimento || !String(procedimento).trim()) {
      return res.status(400).json({ erro: "procedimento é obrigatório" });
    }

    if (!descricao_procedimento || !String(descricao_procedimento).trim()) {
      return res.status(400).json({ erro: "descricao_procedimento é obrigatória" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [solipedes] = await connection.query(
      "SELECT numero FROM solipede WHERE numero = ?",
      [numero_solipede]
    );

    if (!solipedes || solipedes.length === 0) {
      await connection.rollback();
      connection.release();
      connection = null;
      return res.status(404).json({ erro: `Solípede ${numero_solipede} não encontrado` });
    }

    const [resultProntuario] = await connection.query(
      `INSERT INTO prontuario_geral (numero_solipede, tipo, usuarioId, data_criacao, data_atualizacao)
       VALUES (?, 'Cirurgia', ?, NOW(), NOW())`,
      [numero_solipede, usuarioTokenId]
    );

    const prontuario_id = resultProntuario.insertId;

    const cirurgiaId = await ProntuarioCirurgia.criar(
      {
        prontuario_id,
        numero_solipede,
        procedimento,
        descricao_procedimento,
        data_procedimento,
        status_conclusao,
        // Segurança: criação sempre registrada pelo usuário autenticado no token
        usuario_id: usuarioTokenId,
        usuario_atualizacao: usuarioTokenId,
        cirurgiao_principal_id,
        cirurgiao_anestesista_id,
        cirurgiao_auxiliar_id,
        auxiliar_id,
      },
      connection
    );

    await connection.commit();
    connection.release();
    connection = null;

    return res.status(201).json({
      success: true,
      id: cirurgiaId,
      prontuario_id,
      mensagem: "Cirurgia registrada com sucesso!",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }

    console.error("Erro ao criar cirurgia:", error);
    return res.status(500).json({ erro: `Erro ao criar cirurgia: ${error.message}` });
  }
};

export const atualizarParcial = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioTokenId = req.usuario?.id;
    const dados = { ...(req.body || {}) };

    if (usuarioTokenId) {
      dados.usuario_atualizacao = usuarioTokenId;
    }

    const atualizado = await ProntuarioCirurgia.atualizarParcial(id, dados);

    if (!atualizado) {
      return res.status(404).json({ erro: "Cirurgia não encontrada" });
    }

    return res.json({ success: true, dado: atualizado });
  } catch (error) {
    console.error("Erro ao atualizar cirurgia:", error);
    return res.status(500).json({ erro: error.message });
  }
};

export const excluir = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const registro = await ProntuarioCirurgia.buscarPorId(id);
    if (!registro) {
      await connection.rollback();
      connection.release();
      connection = null;
      return res.status(404).json({ erro: "Cirurgia não encontrada" });
    }

    const sucesso = await ProntuarioCirurgia.excluir(id, connection);
    if (!sucesso) {
      await connection.rollback();
      connection.release();
      connection = null;
      return res.status(404).json({ erro: "Cirurgia não encontrada" });
    }

    await connection.query("DELETE FROM prontuario_geral WHERE id = ?", [registro.prontuario_id]);

    await connection.commit();
    connection.release();
    connection = null;

    return res.json({ success: true, mensagem: "Cirurgia removida" });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("Erro ao excluir cirurgia:", error);
    return res.status(500).json({ erro: error.message });
  }
};
