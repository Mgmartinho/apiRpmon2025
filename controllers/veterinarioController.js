import Solipede from "../models/Solipedes.js";
class VeterinarioController {

  static listar = async (req, res, next) => {
    try {
      const dados = await Solipede.listar();
      res.status(200).json(dados);
    } catch (err) {
      next(err);
    }
  };

  static obterPorRe = async (req, res, next) => {
    try {
      const { re } = req.params;
      const dado = await Solipede.buscarPorre(re);
      if (!dado) return res.status(404).json({ message: "Não encontrado" });
      res.status(200).json(dado);
    } catch (err) {
      next(err);
    }
  };

  static criar = async (req, res, next) => {
    try {
      await Solipede.criar(req.body);
      res.status(201).json({ message: "Criado com sucesso" });
    } catch (err) {
      next(err);
    }
  };

  static atualizar = async (req, res, next) => {
    try {
      const { re } = req.params;
      await Solipede.atualizar(re, req.body);
      res.status(200).json({ message: "Atualizado com sucesso" });
    } catch (err) {
      next(err);
    }
  };

  // ⚠️ ATENÇÃO: Esta função usa DELETE permanente
  // TODO: Implementar soft delete para veterinários se necessário
  static excluir = async (req, res, next) => {
    try {
      const { re } = req.params;
      await Solipede.excluirPermanente(re);
      res.status(200).json({ message: "Removido permanentemente" });
    } catch (err) {
      next(err);
    }
  };
}

export default VeterinarioController;
