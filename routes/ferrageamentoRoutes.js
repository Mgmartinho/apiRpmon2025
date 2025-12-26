import express from "express";
import FerrageamentoController from "../controllers/ferrageamentoController.js";

const router = express.Router();

// Rotas de ferrageamento
router.post("/ferrageamentos", FerrageamentoController.criar);
router.get("/ferrageamentos", FerrageamentoController.listar);
router.get("/ferrageamentos/status", FerrageamentoController.listarComStatus);
router.get("/ferrageamentos/historico/:numero", FerrageamentoController.historico);
router.get("/ferrageamentos/ultimo/:numero", FerrageamentoController.ultimo);
router.put("/ferrageamentos/:id", FerrageamentoController.atualizar);
router.delete("/ferrageamentos/:id", FerrageamentoController.deletar);

export default router;
