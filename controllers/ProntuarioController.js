import Prontuario from "../models/Prontuario.js";

class ProntuarioController {
  static async listarPorSolipede(req, res, next) {
    try {
      const { numero_solipede } = req.params;
      const dados = await Prontuario.listarPorSolipede(numero_solipede);
      res.status(200).json(dados);
    } catch (err) {
      next(err);
    }
  }
}

export default ProntuarioController;
