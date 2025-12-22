import Solipede from "../models/Solipedes.js";

class SolipedeController {

  // ===== CRUD =====
static async listar(req, res, next) {
  try {
    const { alocacao } = req.query;

    const dados = await Solipede.listar({
      alocacao
    });

    res.status(200).json(dados);
  } catch (err) {
    next(err);
  }
}

  static async obterPorNumero(req, res, next) {
    try {
      const { numero } = req.params;
      const dado = await Solipede.buscarPorNumero(numero);
      if (!dado) return res.status(404).json({ message: "Não encontrado" });
      res.status(200).json(dado);
    } catch (err) {
      next(err);
    }
  }

  static async criar(req, res, next) {
    try {
      await Solipede.criar(req.body);
      res.status(201).json({ message: "Criado com sucesso" });
    } catch (err) {
      next(err);
    }
  }

  static async atualizar(req, res, next) {
    try {
      const { numero } = req.params;
      await Solipede.atualizar(numero, req.body);
      res.status(200).json({ message: "Atualizado com sucesso" });
    } catch (err) {
      next(err);
    }
  }

  static async excluir(req, res, next) {
    try {
      const { numero } = req.params;
      await Solipede.excluir(numero);
      res.status(200).json({ message: "Removido com sucesso" });
    } catch (err) {
      next(err);
    }
  }
static async adicionarHoras(req, res) {
  try {
    const { numero, horas, senha, usuarioId } = req.body;

    console.log("🔥 RECEBIDO adicionarHoras:", { numero, horas, senha, usuarioId });
    console.log("Tipo usuarioId:", typeof usuarioId, "Valor:", usuarioId);
    console.log("Usuario do token:", req.usuario);

    if (!numero || horas === undefined || !senha || !usuarioId) {
      console.log("❌ Validação falhou:", { numero: !!numero, horas: horas !== undefined, senha: !!senha, usuarioId: !!usuarioId });
      return res.status(400).json({
        error: "Número, horas, senha e usuarioId são obrigatórios",
      });
    }

    // 🔐 usuário vindo DO TOKEN
    const usuario = req.usuario;

    if (!usuario || !usuario.email || !usuario.id) {
      console.log("Usuario inválido:", usuario);
      return res.status(401).json({ error: "Usuário não autenticado" });
    }

    // Verificar se o usuarioId do body é o mesmo do token
    console.log("Comparando usuario.id:", usuario.id, "tipo:", typeof usuario.id, "com usuarioId:", usuarioId, "tipo:", typeof usuarioId);
    if (usuario.id !== usuarioId) {
      console.log("❌ usuario.id !== usuarioId");
      return res.status(403).json({ error: "ID do usuário não corresponde" });
    }
    console.log("✅ usuario.id === usuarioId");

    // 1️⃣ validar senha do usuário LOGADO
    console.log("Validando senha para email:", usuario.email);
    await Solipede.verificarSenhaUsuario(
      usuario.email,
      senha
    );
    console.log("Senha validada com sucesso");

    // 2️⃣ lançar horas COM ID DO BODY
    console.log("Lançando horas com usuarioId:", usuarioId);
    const totalHoras = await Solipede.adicionarHoras(
      numero,
      Number(horas),
      usuarioId
    );

    console.log("Horas lançadas, total:", totalHoras);

    return res.status(200).json({
      success: true,
      totalHoras,
      message: "Lançamento realizado com sucesso",
    });
  } catch (err) {
    console.error("Erro ao adicionar horas:", err);

    if (err.message === "Senha incorreta") {
      return res.status(401).json({ error: "Senha incorreta" });
    }

    return res.status(500).json({ error: err.message });
  }
}

  // ===== Histórico =====
  static async historicoHoras(req, res) {
  try {
    const { numero } = req.params;

    // Buscar histórico com nome do usuário
    const historico = await Solipede.buscarHistorico(numero);

    res.status(200).json(historico);
  } catch (err) {
    console.error("Erro histórico:", err);
    res.status(500).json({ error: "Erro ao buscar histórico" });
  }
}


  static async historicoMensal(req, res) {
    try {
      const { numero } = req.params;
      const [rows] = await Solipede.buscarHistoricoPorMes(numero);
      res.status(200).json(rows);
    } catch (err) {
      console.error("Erro histórico mensal:", err);
      res.status(500).json({ error: "Erro ao buscar histórico mensal" });
    }
  }

  // ===== Indicadores anuais por esquadrão (publico) =====
  static async indicadoresAnuais(req, res) {
    try {
      const { ano } = req.query;
      const resultado = await Solipede.indicadoresAnuaisPorEsquadrao(ano);
      return res.status(200).json(resultado);
    } catch (err) {
      console.error("Erro indicadores anuais:", err);
      return res.status(500).json({ error: "Erro ao buscar indicadores anuais" });
    }
  }

  static async atualizarHistorico(req, res) {
    try {
      const { id } = req.params;
      const { horas } = req.body;

      if (horas === undefined || horas === null) {
        return res.status(400).json({ error: "Horas são obrigatórias" });
      }

      const totalHoras = await Solipede.atualizarHistorico(id, horas);
      res.status(200).json({ success: true, totalHoras });
    } catch (err) {
      console.error("Erro atualizar histórico:", err);
      res.status(500).json({ error: "Erro ao atualizar histórico" });
    }
  }

  // ===== Movimentação em lote (apenas movimentacao, não altera status) =====
  static async movimentacaoEmLote(req, res) {
    try {
      const { numeros, novoStatus, senha } = req.body;
      const usuario = req.usuario;

      if (!usuario || !usuario.email || !usuario.id) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }
      if (!Array.isArray(numeros) || numeros.length === 0) {
        return res.status(400).json({ error: "Seleção de solípedes vazia" });
      }
      if (!novoStatus) {
        return res.status(400).json({ error: "Status é obrigatório" });
      }
      if (!senha) {
        return res.status(400).json({ error: "Senha é obrigatória" });
      }

      await Solipede.verificarSenhaUsuario(usuario.email, senha);

      const mapaAnterior = await Solipede.atualizarMovimentacaoEmLote(
        numeros,
        novoStatus
      );
      await Solipede.registrarMovimentacoesProntuario(
        numeros,
        mapaAnterior,
        novoStatus,
        usuario.id
      );

      return res.status(200).json({ success: true, count: numeros.length });
    } catch (err) {
      console.error("Erro movimentação em lote:", err);
      if (err.message === "Senha incorreta") {
        return res.status(401).json({ error: "Senha incorreta" });
      }
      return res.status(500).json({ error: err.message });
    }
  }

  // ===== Prontuário =====
  static async salvarProntuario(req, res) {
    try {
      const { numero_solipede, tipo, observacao, recomendacoes } = req.body;
      const usuarioId = req.usuario?.id;

      console.log("\n📝 CONTROLLER: salvarProntuario");
      console.log("   Dados do body:", { numero_solipede, tipo, observacao: observacao?.substring(0, 30) + "..." });
      console.log("   req.usuario completo:", req.usuario);
      console.log("   usuarioId extraído:", usuarioId, "Tipo:", typeof usuarioId);

      if (!numero_solipede || !observacao) {
        console.log("❌ Validação falhou - faltam dados obrigatórios");
        return res.status(400).json({ error: "Número do solípede e observação são obrigatórios" });
      }

      if (!usuarioId) {
        console.log("⚠️ AVISO: usuarioId não foi encontrado!");
      }

      console.log("   Salvando prontuário com usuarioId:", usuarioId);

      const resultado = await Solipede.salvarProntuario({
        numero_solipede,
        tipo: tipo || "Observação Geral",
        observacao,
        recomendacoes: recomendacoes || null,
        usuario_id: usuarioId || null
      });

      console.log("✅ Prontuário salvo com sucesso! ID:", resultado);

      res.status(201).json({ 
        success: true, 
        id: resultado,
        usuario_id: usuarioId,
        message: "Prontuário salvo com sucesso" 
      });
    } catch (err) {
      console.error("❌ Erro ao salvar prontuário:", err);
      res.status(500).json({ error: "Erro ao salvar prontuário" });
    }
  }

  static async listarProntuario(req, res) {
    try {
      const { numero } = req.params;
      console.log("📖 Listando prontuário para número:", numero);
      const prontuarios = await Solipede.listarProntuario(numero);
      console.log("📖 Prontuários retornados:", prontuarios);
      res.status(200).json(prontuarios);
    } catch (err) {
      console.error("Erro ao listar prontuário:", err);
      res.status(500).json({ error: "Erro ao listar prontuário" });
    }
  }

  static async atualizarProntuario(req, res) {
    try {
      const { id } = req.params;
      const { observacao, recomendacoes, tipo } = req.body;

      if (!observacao) {
        return res.status(400).json({ error: "Observação é obrigatória" });
      }

      await Solipede.atualizarProntuario(id, { observacao, recomendacoes, tipo });
      res.status(200).json({ success: true, message: "Prontuário atualizado com sucesso" });
    } catch (err) {
      console.error("Erro ao atualizar prontuário:", err);
      res.status(500).json({ error: "Erro ao atualizar prontuário" });
    }
  }

  static async deletarProntuario(req, res) {
    try {
      const { id } = req.params;
      await Solipede.deletarProntuario(id);
      res.status(200).json({ success: true, message: "Prontuário deletado com sucesso" });
    } catch (err) {
      console.error("Erro ao deletar prontuário:", err);
      res.status(500).json({ error: "Erro ao deletar prontuário" });
    }
  }
}

export default SolipedeController;
