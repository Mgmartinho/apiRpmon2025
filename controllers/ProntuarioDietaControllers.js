import ProntuarioDietas from "../models/ProntuarioDietas.js";
import pool from "../config/mysqlConnect.js";

export const listar = async (req, res) => {
  try {
    const { prontuarioId } = req.params;
    
    console.log(`📋 Listando dietas do prontuário ${prontuarioId}`);
    
    if (!prontuarioId) {
      return res.status(400).json({ erro: "prontuarioId é obrigatório" });
    }
    
    const dados = await ProntuarioDietas.listarPorProntuario(prontuarioId);
    
    console.log(`✅ ${dados.length} dieta(s) encontrada(s)`);
    res.json(dados);
  } catch (error) {
    console.error("❌ Erro ao listar dietas:", error);
    res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  let connection;
  try {
    console.log("\n🥗 === CRIAR DIETA ===");
    console.log("📦 Body completo:", JSON.stringify(req.body, null, 2));
    console.log("🔐 Headers:", req.headers.authorization ? "Token presente" : "Sem token");
    
    const { numero_solipede, tipo_dieta, descricao, data_criacao, data_fim, status_conclusao } = req.body;
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

    if ((!tipo_dieta || !tipo_dieta.trim()) && (!descricao || !descricao.trim())) {
      console.log("❌ Erro: tipo_dieta e descricao vazios");
      return res.status(400).json({ erro: "Informe pelo menos o tipo de dieta ou uma descrição" });
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
      return res.status(404).json({ erro: `Solípede ${numero_solipede} não encontrado` });
    }
    
    console.log("✅ Solípede encontrado:", solipedes[0].nome);
    
    // PASSO 2: Criar registro base na tabela prontuario
    console.log("📝 Criando registro base na tabela prontuario...");
    const observacaoCompleta = tipo_dieta 
      ? `Tipo: ${tipo_dieta}\n${descricao || 'Sem descrição adicional'}`
      : (descricao || 'Dieta registrada');
    
    const [resultProntuario] = await connection.query(
      `INSERT INTO prontuario (numero_solipede, tipo, observacao, usuarioId) 
       VALUES (?, 'Dieta', ?, ?)`,
      [numero_solipede, observacaoCompleta, usuario_id]
    );
    
    const prontuario_id = resultProntuario.insertId;
    console.log("✅ Registro base criado! ID do prontuário:", prontuario_id);
    
    // PASSO 3: Criar registro detalhado na tabela prontuario_dietas
    console.log("📝 Criando registro detalhado em prontuario_dietas...");
    console.log("   - prontuario_id:", prontuario_id);
    console.log("   - usuario_id:", usuario_id);
    
    const dados = {
      prontuario_id,
      usuario_id,
      tipo_dieta: tipo_dieta || null,
      descricao: descricao || null,
      data_criacao: data_criacao || new Date().toISOString().split('T')[0],
      data_fim: data_fim || null,
      status_conclusao: status_conclusao || 'em_andamento',
    };
    
    console.log("   - Dados para dieta:", JSON.stringify(dados, null, 2));
    
    const dieta_id = await ProntuarioDietas.criar(dados, connection);

    await connection.commit();
    
    console.log("✅ Dieta criada com sucesso!");
    console.log("   - Prontuário ID:", prontuario_id);
    console.log("   - Dieta ID:", dieta_id);
    console.log("═".repeat(80));
    
    res.status(201).json({ 
      success: true,
      id: dieta_id,
      prontuario_id: prontuario_id,
      mensagem: "Dieta registrada com sucesso!" 
    });
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
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
    
    res.status(500).json({ erro: "Erro ao criar dieta: " + error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

export const excluir = async (req, res) => {
  try {
    const { id } = req.params;
    const sucesso = await ProntuarioDietas.excluir(id);
    if (!sucesso) return res.status(404).json({ erro: "Não encontrado" });

    res.json({ mensagem: "Dieta removida" });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
};

export const atualizarParcial = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_dieta, descricao, data_criacao, data_fim, status_conclusao } = req.body;

    if (!id) {
      return res.status(400).json({ erro: "id é obrigatório" });
    }

    if (status_conclusao && !["em_andamento", "concluido"].includes(status_conclusao)) {
      return res.status(400).json({ erro: "status_conclusao inválido. Use 'em_andamento' ou 'concluido'" });
    }

    const dadosAtualizacao = {};

    if (Object.prototype.hasOwnProperty.call(req.body, "tipo_dieta")) {
      dadosAtualizacao.tipo_dieta = tipo_dieta;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "descricao")) {
      dadosAtualizacao.descricao = descricao;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "data_criacao")) {
      dadosAtualizacao.data_criacao = data_criacao || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "data_fim")) {
      dadosAtualizacao.data_fim = data_fim || null;
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "status_conclusao")) {
      dadosAtualizacao.status_conclusao = status_conclusao;
    }

    const dietaAtualizada = await ProntuarioDietas.atualizarParcial(id, dadosAtualizacao);

    if (!dietaAtualizada) {
      return res.status(404).json({ erro: "Dieta não encontrada" });
    }

    return res.json({
      success: true,
      mensagem: "Dieta atualizada com sucesso",
      dieta: dietaAtualizada,
    });
  } catch (error) {
    if (error.message.includes("Nenhum campo válido")) {
      return res.status(400).json({ erro: error.message });
    }

    return res.status(500).json({ erro: error.message });
  }
};