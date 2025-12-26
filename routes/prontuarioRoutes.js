import express from "express";
import ProntuarioController from "../controllers/ProntuarioController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/:numero_solipede", ProntuarioController.listarPorSolipede);
router.get("/:numero_solipede/baixas-pendentes", ProntuarioController.contarBaixasPendentes);
router.patch("/:id/liberar-baixa", authMiddleware, ProntuarioController.liberarBaixa);
router.patch("/:id/concluir-tratamento", ProntuarioController.concluirTratamento);

export default router;
