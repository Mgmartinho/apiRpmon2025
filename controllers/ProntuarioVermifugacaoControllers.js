import ProntuarioVermifugacao from "../models/ProntuarioVermifugacao.js";
import pool from "../config/mysqlConnect.js";

export const listar = async (req, res) => {
  try {
    const { prontuarioId } = req.params;

    if (!prontuarioId) {
      return res.status(400).json({ erro: "prontuarioId é obrigatório" });
    }

    const dados = await ProntuarioVermifugacao.listarPorProntuario(prontuarioId);
    res.json(dados);
  } catch (error) {
    console.error("Erro ao listar vermifugações:", error);
    res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  let connection;

  try {
    const {
      numero_solipede,
      produto,
      partida,
      fabricacao,
      data_inicio,
      data_fabricacao,
      data_validade,
      descricao,
      status_conclusao,
    } = req.body;

    const usuario_id = req.usuario?.id;

    if (!numero_solipede) {
      return res.status(400).json({ erro: "numero_solipede é obrigatório" });
    }

    if (!usuario_id) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    if (!produto || !produto.trim()) {
      return res.status(400).json({ erro: "Produto (vermífugo) é obrigatório" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [solipedes] = await connection.query(
      `SELECT numero FROM solipede WHERE numero = ?`,
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
       VALUES (?, 'Vermifugação', ?, NOW(), NOW())`,
      [numero_solipede, usuario_id]
    );

    const prontuario_id = resultProntuario.insertId;

    const vermifugacao_id = await ProntuarioVermifugacao.criar(
      {
        prontuario_id,
        usuario_id,
        produto,
        partida: partida || null,
        fabricacao: fabricacao || null,
        data_inicio: data_inicio || new Date().toISOString().split("T")[0],
        data_fabricacao: data_fabricacao || null,
        data_validade: data_validade || null,
        descricao: descricao || null,
        status_conclusao: "concluido",
      },
      connection
    );

    await connection.commit();
    connection.release();
    connection = null;

    return res.status(201).json({
      success: true,
      id: vermifugacao_id,
      prontuario_id,
      mensagem: "Vermifugação registrada com sucesso!",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }

    console.error("Erro ao criar vermifugação:", error);

    if (error.message.includes("não encontrado") || error.message.includes("inativo")) {
      return res.status(404).json({ erro: error.message });
    }

    if (error.message.includes("obrigatório")) {
      return res.status(400).json({ erro: error.message });
    }

    return res.status(500).json({ erro: "Erro ao criar vermifugação: " + error.message });
  }
};

export const atualizarParcial = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario?.id;

    if (!usuarioId) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    const dados = {
      ...req.body,
      usuario_atualizacao: usuarioId,
    };

    const connection = await pool.getConnection();
    const sucesso = await ProntuarioVermifugacao.atualizarParcial(id, dados, connection);
    connection.release();

    if (!sucesso) {
      return res.status(404).json({ erro: "Vermifugação não encontrada" });
    }

    const atualizado = await ProntuarioVermifugacao.buscarPorId(id);

    return res.json({
      mensagem: "Vermifugação atualizada com sucesso",
      dados: atualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar vermifugação:", error);
    return res.status(500).json({ erro: error.message });
  }
};

export const excluir = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const registro = await ProntuarioVermifugacao.buscarPorId(id);
    if (!registro) {
      await connection.rollback();
      connection.release();
      connection = null;
      return res.status(404).json({ erro: "Não encontrado" });
    }

    const sucesso = await ProntuarioVermifugacao.excluir(id);

    if (!sucesso) {
      await connection.rollback();
      connection.release();
      connection = null;
      return res.status(404).json({ erro: "Não encontrado" });
    }

    await connection.query(`DELETE FROM prontuario_geral WHERE id = ?`, [registro.prontuario_id]);
    await connection.commit();
    connection.release();
    connection = null;

    return res.json({ mensagem: "Vermifugação removida" });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }

    console.error("Erro ao excluir vermifugação:", error);
    return res.status(500).json({ erro: error.message });
  }
};
