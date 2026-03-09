import express from "express";
import ProntuarioRestricoes from "../models/ProntuarioRestricoes.js";

const router = express.Router();

// Rota pública para listar solípedes com restrições ativas
router.get("/solipedes-com-restricao", async (req, res, next) => {
  try {
    const numeros = await ProntuarioRestricoes.listarSolipedesComRestricao();
    res.status(200).json(numeros);
  } catch (err) {
    console.error("Erro ao listar solípedes com restrição:", err);
    next(err);
  }
});

export default router;
