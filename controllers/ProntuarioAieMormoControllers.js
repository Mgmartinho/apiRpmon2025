import ProntuarioAieMormo from "../models/ProntuarioAieMormo.js";
import bcrypt from "bcryptjs";
import pool from "../config/mysqlConnect.js";

export const listar = async (req, res) => {
  try {
    const { prontuarioId } = req.params;

    if (!prontuarioId) {
      return res.status(400).json({ erro: "prontuarioId é obrigatório" });
    }

    const dados = await ProntuarioAieMormo.listarPorProntuario(prontuarioId);
    res.json(dados);
  } catch (error) {
    console.error("Erro ao listar AIE/Mormo:", error);
    res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  let connection;

  try {
    const {
      numero_solipede,
      data_exame,
      validade,
      resultado,
      descricao,
      status_conclusao,
      usuario_atualizacao,
      usuario_aplicacao,
    } = req.body;

    const usuario_id = req.usuario?.id;
    // Responsável pela aplicação pode ser selecionado no formulário.
    const usuario_responsavel = usuario_aplicacao || usuario_atualizacao || usuario_id;

    if (!numero_solipede) {
      return res.status(400).json({ erro: "numero_solipede é obrigatório" });
    }

    if (!usuario_id) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
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
       VALUES (?, 'AIE & Mormo', ?, NOW(), NOW())`,
      [numero_solipede, usuario_id]
    );

    const prontuario_id = resultProntuario.insertId;

    const aieMormo_id = await ProntuarioAieMormo.criar(
      {
        prontuario_id,
        usuario_id,
        usuario_aplicacao: usuario_responsavel,
        usuario_atualizacao: usuario_id,
        data_exame: data_exame || null,
        validade: validade || null,
        resultado: resultado || null,
        descricao: descricao || null,
        status_conclusao: status_conclusao || "em_andamento",
      },
      connection
    );

    await connection.commit();
    connection.release();
    connection = null;

    return res.status(201).json({
      success: true,
      id: aieMormo_id,
      prontuario_id,
      mensagem: "AIE & Mormo registrado com sucesso!",
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }

    console.error("Erro ao criar AIE/Mormo:", error);

    if (error.message.includes("não encontrado") || error.message.includes("inativo")) {
      return res.status(404).json({ erro: error.message });
    }

    if (error.message.includes("obrigatório")) {
      return res.status(400).json({ erro: error.message });
    }

    return res.status(500).json({ erro: "Erro ao criar AIE/Mormo: " + error.message });
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
    const sucesso = await ProntuarioAieMormo.atualizarParcial(id, dados, connection);
    connection.release();

    if (!sucesso) {
      return res.status(404).json({ erro: "Registro AIE/Mormo não encontrado" });
    }

    const atualizado = await ProntuarioAieMormo.buscarPorId(id);

    return res.json({
      mensagem: "AIE/Mormo atualizado com sucesso",
      dados: atualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar AIE/Mormo:", error);
    return res.status(500).json({ erro: error.message });
  }
};

export const excluir = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const { senha } = req.body || {};
    const usuarioId = req.usuario?.id;

    if (!usuarioId) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    if (!senha) {
      return res.status(400).json({ erro: "Senha é obrigatória" });
    }

    const [usuarios] = await pool.query(
      "SELECT id, senha FROM usuarios WHERE id = ?",
      [usuarioId]
    );

    if (!usuarios || usuarios.length === 0) {
      return res.status(401).json({ erro: "Usuário não encontrado" });
    }

    const senhaValida = await bcrypt.compare(senha, usuarios[0].senha);
    if (!senhaValida) {
      return res.status(401).json({ erro: "Senha inválida" });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const registro = await ProntuarioAieMormo.buscarPorId(id);
    if (!registro) {
      await connection.rollback();
      connection.release();
      connection = null;
      return res.status(404).json({ erro: "Registro AIE/Mormo não encontrado" });
    }

    const sucesso = await ProntuarioAieMormo.excluir(id, connection);
    if (!sucesso) {
      await connection.rollback();
      connection.release();
      connection = null;
      return res.status(404).json({ erro: "Registro AIE/Mormo não encontrado" });
    }

    await connection.query(`DELETE FROM prontuario_geral WHERE id = ?`, [registro.prontuario_id]);

    await connection.commit();
    connection.release();
    connection = null;

    return res.json({ mensagem: "AIE/Mormo excluído com sucesso" });
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    console.error("Erro ao excluir AIE/Mormo:", error);
    return res.status(500).json({ erro: error.message });
  }
};

export const concluir = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioId = req.usuario?.id;

    if (!usuarioId) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    const connection = await pool.getConnection();
    const sucesso = await ProntuarioAieMormo.atualizarParcial(
      id,
      {
        status_conclusao: "concluido",
        usuario_atualizacao: usuarioId,
      },
      connection
    );
    connection.release();

    if (!sucesso) {
      return res.status(404).json({ erro: "Registro AIE/Mormo não encontrado" });
    }

    const atualizado = await ProntuarioAieMormo.buscarPorId(id);

    return res.json({
      mensagem: "AIE/Mormo concluído com sucesso",
      dados: atualizado,
    });
  } catch (error) {
    console.error("Erro ao concluir AIE/Mormo:", error);
    return res.status(500).json({ erro: error.message });
  }
};

export default {
  listar,
  criar,
  atualizarParcial,
  excluir,
  concluir,
};
