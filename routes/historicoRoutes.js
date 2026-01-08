import express from "express";
import HistoricoAlteracoesController from "../controllers/historicoAlteracoesController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Listar histórico de um solípede específico
router.get("/historico/solipede/:numero", HistoricoAlteracoesController.listarPorSolipede);

// Listar histórico de um prontuário específico
router.get("/historico/prontuario/:id", HistoricoAlteracoesController.listarPorProntuario);

// Listar alterações recentes (opcionalmente filtradas por tabela)
router.get("/historico/recentes", HistoricoAlteracoesController.listarRecentes);

export default router;
