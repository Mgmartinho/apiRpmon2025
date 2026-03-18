import ProntuarioRestricoes from "../models/ProntuarioRestricoes.js";
import bcrypt from "bcryptjs";
import pool from "../config/mysqlConnect.js";

export const listar = async (req, res) => {
  try {
    const { prontuarioId } = req.params;
    
    console.log(`📋 Listando restrições do prontuário ${prontuarioId}`);
    
    if (!prontuarioId) {
      return res.status(400).json({ erro: "prontuarioId é obrigatório" });
    }
    
    const dados = await ProntuarioRestricoes.listarPorProntuario(prontuarioId);
    
    console.log(`✅ ${dados.length} restrição(ões) encontrada(s)`);
    res.json(dados);
  } catch (error) {
    console.error("❌ Erro ao listar restrições:", error);
    res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  let connection;
  try {
    console.log("\n� === CRIAR RESTRIÇÃO ===");
    console.log("📦 Body completo:", JSON.stringify(req.body, null, 2));
    console.log("🔐 Headers:", req.headers.authorization ? "Token presente" : "Sem token");
    
    const { numero_solipede, restricao, recomendacoes, status_conclusao, data_validade } = req.body;
    const usuario_id = req.usuario?.id; // Pega do token JWT
    
    console.log("👤 Usuário autenticado:", { 
      id: usuario_id, 
      nome: req.usuario?.nome,
      email: req.usuario?.email 
    });
    
    // Validações básicas
    if (!numero_solipede) {
      console.log("❌ Erro: numero_solipede não fornecido");
      return res.status(400).json({ erro: "numero_solipede é obrigatório" });
    }
    
    if (!usuario_id) {
      console.log("❌ Erro: Usuário não autenticado no token JWT");
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }
    
    if (!restricao || !restricao.trim()) {
      console.log("❌ Erro: restricao vazia");
      return res.status(400).json({ 
        erro: "Restrição é obrigatória" 
      });
    }
    
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // PASSO 1: Verificar se o solípede existe
    console.log("🔍 Verificando se solípede existe:", numero_solipede);
    const [solipedes] = await connection.query(
      `SELECT numero, nome FROM solipede WHERE numero = ?`,
      [numero_solipede]
    );
    
    if (!solipedes || solipedes.length === 0) {
      console.log("❌ Erro: Solípede não encontrado");
      await connection.rollback();
      connection.release();
      connection = null;
      return res.status(404).json({ erro: `Solípede ${numero_solipede} não encontrado` });
    }
    
    console.log("✅ Solípede encontrado:", solipedes[0].nome);
    
    // PASSO 2: Criar registro base na tabela prontuario_geral
    console.log("📝 Criando registro base na tabela prontuario_geral...");
    
    const [resultProntuario] = await connection.query(
      `INSERT INTO prontuario_geral (numero_solipede, tipo, usuarioId, data_criacao, data_atualizacao)
       VALUES (?, 'Restrições', ?, NOW(), NOW())`,
      [numero_solipede, usuario_id]
    );
    
    const prontuario_id = resultProntuario.insertId;
    console.log("✅ Registro base criado! ID do prontuário:", prontuario_id);
    
    // PASSO 3: Criar registro detalhado na tabela prontuario_restricoes
    console.log("📝 Criando registro detalhado em prontuario_restricoes...");
    console.log("   - prontuario_id:", prontuario_id);
    console.log("   - usuario_id:", usuario_id);
    
    const dados = {
      prontuario_id,
      usuario_id,
      restricao,
      recomendacoes: recomendacoes || null,
      status_conclusao: status_conclusao || null,
      data_validade: data_validade || null,
    };
    
    console.log("   - Dados para restrição:", JSON.stringify(dados, null, 2));
    
    const restricao_id = await ProntuarioRestricoes.criar(dados, connection);

    await connection.commit();
    connection.release();
    connection = null;
    
    console.log("✅ Restrição criada com sucesso!");
    console.log("   - Prontuário ID:", prontuario_id);
    console.log("   - Restrição ID:", restricao_id);
    console.log("═".repeat(80));
    
    res.status(201).json({ 
      success: true,
      id: restricao_id,
      prontuario_id: prontuario_id,
      mensagem: "Restrição registrada com sucesso!" 
    });
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
      connection.release();
    }

    console.error("❌ ERRO COMPLETO:", error);
    console.error("   - Mensagem:", error.message);
    console.error("   - Stack:", error.stack);
    
    // Tratamento de erros específicos
    if (error.message.includes("não encontrado") || error.message.includes("inativo")) {
      return res.status(404).json({ erro: error.message });
    }
    
    if (error.message.includes("obrigatório")) {
      return res.status(400).json({ erro: error.message });
    }
    
    res.status(500).json({ erro: "Erro ao criar restrição: " + error.message });
  }
};

export const excluir = async (req, res) => {
  try {
    const { id } = req.params;
    const sucesso = await ProntuarioRestricoes.excluir(id);
    if (!sucesso) return res.status(404).json({ erro: "Não encontrado" });

    res.json({ mensagem: "Restrição removida" });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
};

export const atualizarParcial = async (req, res) => {
  try {
    const { id } = req.params;
    const { restricao, recomendacoes, data_validade, status_conclusao } = req.body;

    if (!id) {
      return res.status(400).json({ erro: "id é obrigatório" });
    }

    if (status_conclusao && !["em_andamento", "concluido"].includes(status_conclusao)) {
      return res.status(400).json({ erro: "status_conclusao inválido. Use 'em_andamento' ou 'concluido'" });
    }

    const dadosAtualizacao = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "restricao")) {
      dadosAtualizacao.restricao = restricao || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "recomendacoes")) {
      dadosAtualizacao.recomendacoes = recomendacoes || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "data_validade")) {
      dadosAtualizacao.data_validade = data_validade || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "status_conclusao")) {
      dadosAtualizacao.status_conclusao = status_conclusao;
    }

    const restricaoAtualizada = await ProntuarioRestricoes.atualizarParcial(id, dadosAtualizacao);

    if (!restricaoAtualizada) {
      return res.status(404).json({ erro: "Restrição não encontrada" });
    }

    return res.json({
      success: true,
      mensagem: "Restrição atualizada com sucesso",
      restricao: restricaoAtualizada,
    });
  } catch (error) {
    if (error.message.includes("Nenhum campo válido")) {
      return res.status(400).json({ erro: error.message });
    }

    return res.status(500).json({ erro: error.message });
  }
};

export const concluirRestricao = async (req, res) => {
  try {
    const { id } = req.params;
    const { senha } = req.body;
    const usuarioLogado = req.usuario;

    console.log(`🔐 Tentativa de conclusão de restrição - ID: ${id}, Usuário: ${usuarioLogado?.nome}`);

    if (!senha) {
      console.log("❌ Senha não fornecida");
      return res.status(400).json({ error: "Senha é obrigatória" });
    }

    if (!usuarioLogado || !usuarioLogado.id) {
      console.log("❌ Usuário não autenticado");
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    // Buscar senha do usuário para validar
    const pool = (await import("../config/mysqlConnect.js")).default;
    const [usuarios] = await pool.query(
      "SELECT id, nome, re, senha FROM usuarios WHERE id = ?",
      [usuarioLogado.id]
    );

    if (!usuarios || usuarios.length === 0) {
      console.log(`❌ Usuário não encontrado: ${usuarioLogado.id}`);
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const usuario = usuarios[0];
    console.log(`✅ Validando senha para: ${usuario.nome}`);

    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      console.log("❌ Senha inválida");
      return res.status(401).json({ error: "Senha inválida" });
    }

    console.log("✅ Senha válida");

    // Concluir a restrição
    const concluido = await ProntuarioRestricoes.concluirRestricao(id, usuario.id);

    if (!concluido) {
      console.log(`⚠️ Restrição ${id} já estava concluída`);
      return res.status(409).json({
        error: "Restrição já foi concluída anteriormente",
        code: "ALREADY_CONCLUDED"
      });
    }

    console.log(`✅ Restrição ${id} concluída por ${usuario.nome}`);

    res.status(200).json({
      success: true,
      message: "Restrição concluída com sucesso",
      usuario_conclusao: {
        id: usuario.id,
        nome: usuario.nome,
        re: usuario.re
      }
    });
  } catch (error) {
    console.error("❌ Erro ao concluir restrição:", error);
    res.status(500).json({ error: error.message });
  }
};