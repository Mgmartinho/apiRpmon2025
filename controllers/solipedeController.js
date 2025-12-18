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
      const { numero, horas } = req.body;
      if (!numero || horas === undefined) {
        return res.status(400).json({ error: "Número e horas são obrigatórios" });
      }

      const novaCarga = await Solipede.adicionarHoras(numero, Number(horas));
      res.status(200).json({ success: true, totalHoras: novaCarga });
    } catch (err) {
      console.error("Erro adicionarHoras:", err);
      res.status(500).json({ error: err.message });
    }
  }

  // ===== Histórico =====
  static async historicoHoras(req, res) {
    try {
      const { numero } = req.params;
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
}

export default SolipedeController;
