import ProntuarioTratamentos from "../models/ProntuarioTratamento.js";
import pool from "../config/mysqlConnect.js";
import Solipede from "../models/Solipedes.js";

const normalizarTexto = (valor = "") =>
  String(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

export const listar = async (req, res) => {
  try {
    const { prontuarioId } = req.params;
    
    console.log(`📋 Listando tratamentos do prontuário ${prontuarioId}`);
    
    if (!prontuarioId) {
      return res.status(400).json({ erro: "prontuarioId é obrigatório" });
    }
    
    const dados = await ProntuarioTratamentos.listarPorProntuario(prontuarioId);
    
    console.log(`✅ ${dados.length} tratamento(s) encontrado(s)`);
    res.json(dados);
  } catch (error) {
    console.error("❌ Erro ao listar tratamentos:", error);
    res.status(500).json({ erro: error.message });
  }
};

export const criar = async (req, res) => {
  let connection;
  try {
    console.log("\n🩺 === CRIAR TRATAMENTO ===");
    console.log("📦 Body completo:", JSON.stringify(req.body, null, 2));
    console.log("🔐 Headers:", req.headers.authorization ? "Token presente" : "Sem token");
    
    const { numero_solipede, diagnostico, observacao_clinica, prescricao, precisa_baixar, foi_responsavel_pela_baixa } = req.body;
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
    
    if (!observacao_clinica || !observacao_clinica.trim()) {
      console.log("❌ Erro: observacao_clinica vazia");
      return res.status(400).json({ 
        erro: "Observação clínica é obrigatória" 
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
    console.log("   - numero_solipede:", numero_solipede);
    console.log("   - usuarioId:", usuario_id);
    
    const [resultProntuario] = await connection.query(
      `INSERT INTO prontuario_geral (numero_solipede, tipo, usuarioId, data_criacao, data_atualizacao)
       VALUES (?, 'Tratamento', ?, NOW(), NOW())`,
      [numero_solipede, usuario_id]
    );
    
    const prontuario_id = resultProntuario.insertId;
    console.log("✅ Registro base criado! ID do prontuário:", prontuario_id);
    
    // PASSO 3: Criar registro detalhado na tabela prontuario_tratamentos
    console.log("📝 Criando registro detalhado em prontuario_tratamentos...");
    console.log("   - prontuario_id:", prontuario_id);
    console.log("   - usuario_id:", usuario_id);
    
    const dados = {
      prontuario_id,
      diagnostico: diagnostico || null,
      observacao_clinica,
      prescricao: prescricao || null,
      usuario_id,
      precisa_baixar: precisa_baixar || 'nao',
      foi_responsavel_pela_baixa: foi_responsavel_pela_baixa || 0
    };
    
    console.log("   - Dados para tratamento:", JSON.stringify(dados, null, 2));
    
    const tratamento_id = await ProntuarioTratamentos.criar(dados, connection);

    // Se o tratamento exige baixa, já baixa o solípede no mesmo commit.
    if (normalizarTexto(precisa_baixar) === "sim") {
      const [updateStatus] = await connection.query(
        `UPDATE solipede SET status = ? WHERE numero = ?`,
        ["Baixado", numero_solipede]
      );

      if (!updateStatus || updateStatus.affectedRows === 0) {
        throw new Error(`Não foi possível atualizar status do solípede ${numero_solipede} para Baixado`);
      }

      console.log(`✅ Solípede ${numero_solipede} alterado para Baixado (tratamento com precisa_baixar='sim')`);
    }

    await connection.commit();
    connection.release();
    connection = null;
    
    console.log("✅ Tratamento criado com sucesso!");
    console.log("   - Prontuário ID:", prontuario_id);
    console.log("   - Tratamento ID:", tratamento_id);
    console.log("═".repeat(80));
    
    res.status(201).json({ 
      success: true,
      id: tratamento_id,
      prontuario_id: prontuario_id,
      mensagem: "Tratamento registrado com sucesso!" 
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
    
    res.status(500).json({ erro: "Erro ao criar tratamento: " + error.message });
  }
};

export const atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status_conclusao } = req.body;
    const usuario_conclusao_id = req.usuario?.id;

    if (!usuario_conclusao_id) {
      return res.status(401).json({ erro: "Usuário não autenticado" });
    }

    if (!status_conclusao || !['em_andamento', 'concluido'].includes(status_conclusao)) {
      return res.status(400).json({ erro: "Status inválido. Use 'em_andamento' ou 'concluido'" });
    }

    const tratamentoAtual = await ProntuarioTratamentos.buscarPorId(id);
    if (!tratamentoAtual) {
      return res.status(404).json({ erro: "Tratamento não encontrado" });
    }

    const sucesso = await ProntuarioTratamentos.atualizarStatus(id, status_conclusao, usuario_conclusao_id);

    if (!sucesso) return res.status(404).json({ erro: "Tratamento não encontrado" });

    const precisaBaixar = normalizarTexto(tratamentoAtual.precisa_baixar) === "sim";

    if (precisaBaixar && status_conclusao === "em_andamento") {
      await Solipede.atualizarStatus(tratamentoAtual.numero_solipede, "Baixado");
    }

    if (status_conclusao === "concluido") {
      const [pendentes] = await pool.query(
        `SELECT COUNT(*) AS total
         FROM prontuario_tratamentos pt
         INNER JOIN prontuario_geral pg ON pg.id = pt.prontuario_id
         WHERE pg.numero_solipede = ?
           AND pt.precisa_baixar = 'sim'
           AND (pt.status_conclusao IS NULL OR pt.status_conclusao <> 'concluido')`,
        [tratamentoAtual.numero_solipede]
      );

      const totalPendentes = Number(pendentes?.[0]?.total || 0);
      if (totalPendentes === 0) {
        await Solipede.atualizarStatus(tratamentoAtual.numero_solipede, "Ativo");
      }
    }

    res.json({ 
      success: true,
      mensagem: `Status atualizado para '${status_conclusao}'` 
    });
  } catch (error) {
    console.error("❌ Erro ao atualizar status:", error);
    res.status(500).json({ erro: error.message });
  }
};

export const excluir = async (req, res) => {
  try {
    const { id } = req.params;
    const sucesso = await ProntuarioTratamentos.excluir(id);

    if (!sucesso) return res.status(404).json({ erro: "Não encontrado" });

    res.json({ mensagem: "Tratamento removido" });
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
};