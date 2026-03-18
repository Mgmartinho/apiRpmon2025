import ProntuarioMovimentacoes from "../models/ProntuarioMovimentacao.js";
import pool from "../config/mysqlConnect.js";

export const listar = async (req, res) => {
  try {
    const { prontuarioId } = req.params;
    
    console.log(`📋 Listando movimentações do prontuário ${prontuarioId}`);
    
    if (!prontuarioId) {
      return res.status(400).json({ erro: "prontuarioId é obrigatório" });
    }
    
    const dados = await ProntuarioMovimentacoes.listarPorProntuario(prontuarioId);
    
    console.log(`✅ ${dados.length} movimentação(ões) encontrada(s)`);
    res.json(dados);
  } catch (error) {
    console.error("❌ Erro ao listar movimentações:", error);
    res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  let connection;
  try {
    console.log("\n🚚 === CRIAR MOVIMENTAÇÃO ===");
    console.log("📦 Body completo:", JSON.stringify(req.body, null, 2));
    console.log("🔐 Headers:", req.headers.authorization ? "Token presente" : "Sem token");
    
    const { numero_solipede, motivo, destino, data_movimentacao } = req.body;
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
    
    if (!motivo || !motivo.trim()) {
      console.log("❌ Erro: motivo vazio");
      return res.status(400).json({ 
        erro: "Motivo da movimentação é obrigatório" 
      });
    }

    if (!destino || !destino.trim()) {
      console.log("❌ Erro: destino vazio");
      return res.status(400).json({ 
        erro: "Destino é obrigatório" 
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
       VALUES (?, 'Movimentação', ?, NOW(), NOW())`,
      [numero_solipede, usuario_id]
    );
    
    const prontuario_id = resultProntuario.insertId;
    console.log("✅ Registro base criado! ID do prontuário:", prontuario_id);
    
    // PASSO 3: Criar registro detalhado na tabela prontuario_movimentacoes
    console.log("📝 Criando registro detalhado em prontuario_movimentacoes...");
    console.log("   - prontuario_id:", prontuario_id);
    console.log("   - usuario_id:", usuario_id);
    
    const dados = {
      prontuario_id,
      usuario_id,
      motivo,
      destino,
      data_movimentacao: data_movimentacao || new Date().toISOString().split('T')[0],
    };
    
    console.log("   - Dados para movimentação:", JSON.stringify(dados, null, 2));
    
    const movimentacao_id = await ProntuarioMovimentacoes.criar(dados, connection);

    await connection.commit();
    connection.release();
    connection = null;
    
    console.log("✅ Movimentação criada com sucesso!");
    console.log("   - Prontuário ID:", prontuario_id);
    console.log("   - Movimentação ID:", movimentacao_id);
    console.log("═".repeat(80));
    
    res.status(201).json({ 
      success: true,
      id: movimentacao_id,
      prontuario_id: prontuario_id,
      mensagem: "Movimentação registrada com sucesso!" 
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
    
    res.status(500).json({ erro: "Erro ao criar movimentação: " + error.message });
  }
};

export const excluir = async (req, res) => {
  try {
    const { id } = req.params;
    const sucesso = await ProntuarioMovimentacoes.excluir(id);
    if (!sucesso) return res.status(404).json({ erro: "Não encontrado" });

    res.json({ mensagem: "Movimentação removida" });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
};