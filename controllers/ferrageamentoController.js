import Ferrageamento from "../models/Ferrageamento.js";
import bcrypt from "bcryptjs";

class FerrageamentoController {
  // Criar novo ferrageamento
  static async criar(req, res) {
    try {
      const { solipede_numero, data_ferrageamento, prazo_validade, tamanho_ferradura, responsavel, observacoes } = req.body;

      // Validações
      if (!solipede_numero || !data_ferrageamento) {
        return res.status(400).json({
          error: "Número do solípede e data do ferrageamento são obrigatórios"
        });
      }

      if (!prazo_validade || prazo_validade <= 0) {
        return res.status(400).json({
          error: "Prazo de validade deve ser maior que zero"
        });
      }

      // Calcular data do próximo ferrageamento
      const dataFerr = new Date(data_ferrageamento);
      const proximoFerr = new Date(dataFerr);
      proximoFerr.setDate(proximoFerr.getDate() + parseInt(prazo_validade));

      const dados = {
        solipede_numero,
        data_ferrageamento,
        prazo_validade: parseInt(prazo_validade),
        tamanho_ferradura: tamanho_ferradura || null,
        proximo_ferrageamento: proximoFerr.toISOString().split('T')[0],
        responsavel: responsavel || null,
        observacoes: observacoes || null
      };

      const resultado = await Ferrageamento.criar(dados);

      res.status(201).json({
        message: "Ferrageamento registrado com sucesso",
        id: resultado.insertId,
        dados
      });
    } catch (error) {
      console.error("Erro ao criar ferrageamento:", error);
      res.status(500).json({
        error: "Erro ao registrar ferrageamento",
        details: error.message
      });
    }
  }

  // Listar todos os ferrageamentos
  static async listar(req, res) {
    try {
      const ferrageamentos = await Ferrageamento.listarTodos();
      res.status(200).json(ferrageamentos);
    } catch (error) {
      console.error("Erro ao listar ferrageamentos:", error);
      res.status(500).json({
        error: "Erro ao listar ferrageamentos",
        details: error.message
      });
    }
  }

  // Listar ferrageamentos com status calculado
  static async listarComStatus(req, res) {
    try {
      const ferrageamentos = await Ferrageamento.listarComStatus();
      res.status(200).json(ferrageamentos);
    } catch (error) {
      console.error("Erro ao listar ferrageamentos com status:", error);
      res.status(500).json({
        error: "Erro ao listar ferrageamentos",
        details: error.message
      });
    }
  }

  // Buscar histórico de um solípede
  static async historico(req, res) {
    try {
      const { numero } = req.params;

      if (!numero) {
        return res.status(400).json({
          error: "Número do solípede é obrigatório"
        });
      }

      const historico = await Ferrageamento.buscarHistoricoPorSolipede(numero);
      res.status(200).json(historico);
    } catch (error) {
      console.error("Erro ao buscar histórico:", error);
      res.status(500).json({
        error: "Erro ao buscar histórico de ferrageamentos",
        details: error.message
      });
    }
  }

  // Buscar último ferrageamento de um solípede
  static async ultimo(req, res) {
    try {
      const { numero } = req.params;

      if (!numero) {
        return res.status(400).json({
          error: "Número do solípede é obrigatório"
        });
      }

      const ultimo = await Ferrageamento.buscarUltimoPorSolipede(numero);
      
      if (!ultimo) {
        return res.status(404).json({
          message: "Nenhum ferrageamento encontrado para este solípede"
        });
      }

      res.status(200).json(ultimo);
    } catch (error) {
      console.error("Erro ao buscar último ferrageamento:", error);
      res.status(500).json({
        error: "Erro ao buscar último ferrageamento",
        details: error.message
      });
    }
  }

  // Deletar ferrageamento
  static async deletar(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          error: "ID do ferrageamento é obrigatório"
        });
      }

      const resultado = await Ferrageamento.deletar(id);

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          error: "Ferrageamento não encontrado"
        });
      }

      res.status(200).json({
        message: "Ferrageamento deletado com sucesso"
      });
    } catch (error) {
      console.error("Erro ao deletar ferrageamento:", error);
      res.status(500).json({
        error: "Erro ao deletar ferrageamento",
        details: error.message
      });
    }
  }

  // Atualizar ferrageamento
  static async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { data_ferrageamento, prazo_validade, responsavel, observacoes } = req.body;

      if (!id) {
        return res.status(400).json({
          error: "ID do ferrageamento é obrigatório"
        });
      }

      if (!data_ferrageamento || !prazo_validade) {
        return res.status(400).json({
          error: "Data do ferrageamento e prazo de validade são obrigatórios"
        });
      }

      // Calcular data do próximo ferrageamento
      const dataFerr = new Date(data_ferrageamento);
      const proximoFerr = new Date(dataFerr);
      proximoFerr.setDate(proximoFerr.getDate() + parseInt(prazo_validade));

      const dados = {
        data_ferrageamento,
        prazo_validade: parseInt(prazo_validade),
        proximo_ferrageamento: proximoFerr.toISOString().split('T')[0],
        responsavel: responsavel || null,
        observacoes: observacoes || null
      };

      const resultado = await Ferrageamento.atualizar(id, dados);

      if (resultado.affectedRows === 0) {
        return res.status(404).json({
          error: "Ferrageamento não encontrado"
        });
      }

      res.status(200).json({
        message: "Ferrageamento atualizado com sucesso",
        dados
      });
    } catch (error) {
      console.error("Erro ao atualizar ferrageamento:", error);
      res.status(500).json({
        error: "Erro ao atualizar ferrageamento",
        details: error.message
      });
    }
  }

  // Deletar ferrageamento com confirmação de senha
  static async excluirComSenha(req, res) {
    try {
      const { id } = req.params;
      const { senha } = req.body;

      const usuarioLogado = req.usuario;

      if (!id) {
        return res.status(400).json({ error: "ID do ferrageamento é obrigatório" });
      }

      if (!senha) {
        return res.status(400).json({ error: "Senha é obrigatória" });
      }

      if (!usuarioLogado || !usuarioLogado.id) {
        return res.status(401).json({ error: "Usuário não autenticado" });
      }

      // Buscar senha do usuário logado
      const pool = (await import("../config/mysqlConnect.js")).default;
      const [usuarios] = await pool.query(
        "SELECT id, nome, senha FROM usuarios WHERE id = ?",
        [usuarioLogado.id]
      );

      if (!usuarios || usuarios.length === 0) {
        return res.status(401).json({ error: "Usuário não encontrado" });
      }

      const usuario = usuarios[0];
      const senhaValida = await bcrypt.compare(senha, usuario.senha);

      if (!senhaValida) {
        return res.status(401).json({ error: "Senha inválida" });
      }

      // Executar exclusão
      const resultado = await Ferrageamento.deletar(id);

      if (resultado.affectedRows === 0) {
        return res.status(404).json({ error: "Ferrageamento não encontrado" });
      }

      res.status(200).json({ message: "Ferrageamento deletado com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir ferrageamento com senha:", error);
      res.status(500).json({ error: "Erro ao excluir ferrageamento", details: error.message });
    }
  }
}

export default FerrageamentoController;
