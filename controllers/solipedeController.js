import Solipede from "../models/Solipedes.js";

class SolipedeController {

  // ===== CRUD =====
  static async listar(req, res, next) {
    try {
      const dados = await Solipede.listar();
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

  // ===== Carga Horária =====
static async adicionarHoras(req, res) {
  try {
    const { numero, horas, senha, usuarioEmail } = req.body;

    if (!numero || horas === undefined) {
      return res
        .status(400)
        .json({ error: "Número e horas são obrigatórios" });
    }

    let usuarioId = null;

    // Verificar senha e obter userId
    if (senha && usuarioEmail) {
      try {
        usuarioId = await Solipede.verificarSenhaUsuario(usuarioEmail, senha);
      } catch (err) {
        return res.status(401).json({ error: "Senha incorreta! Lançamento não realizado." });
      }
    }

    const totalHoras = await Solipede.adicionarHoras(
      numero,
      Number(horas),
      usuarioId
    );

    res.status(200).json({
      success: true,
      totalHoras,
      message: "Lançamento realizado com sucesso"
    });
  } catch (err) {
    console.error("Erro adicionarHoras:", err);
    res.status(500).json({ error: err.message });
  }
}

  // ===== Histórico =====
static async historicoHoras(req, res) {
  try {
    const { numero } = req.params;

    // Buscar histórico com nome do usuário
    const historico = await Solipede.buscarHistoricoComUsuario(numero);

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

  // ===== Prontuário =====
  static async salvarProntuario(req, res) {
    try {
      const { numero_solipede, tipo, observacao, recomendacoes } = req.body;

      if (!numero_solipede || !observacao) {
        return res.status(400).json({ error: "Número do solípede e observação são obrigatórios" });
      }

      const resultado = await Solipede.salvarProntuario({
        numero_solipede,
        tipo: tipo || "Observação Geral",
        observacao,
        recomendacoes: recomendacoes || null
      });

      res.status(201).json({ 
        success: true, 
        id: resultado,
        message: "Prontuário salvo com sucesso" 
      });
    } catch (err) {
      console.error("Erro ao salvar prontuário:", err);
      res.status(500).json({ error: "Erro ao salvar prontuário" });
    }
  }

  static async listarProntuario(req, res) {
    try {
      const { numero } = req.params;
      const prontuarios = await Solipede.listarProntuario(numero);
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
