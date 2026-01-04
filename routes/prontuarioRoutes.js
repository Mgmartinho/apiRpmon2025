import express from "express";
import ProntuarioController from "../controllers/ProntuarioController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// ⚠️ IMPORTANTE: Rotas específicas devem vir ANTES das rotas com parâmetros
// A ordem importa! Express usa a primeira rota que corresponder ao padrão

// 1. Rotas com paths específicos (sem parâmetros variáveis)
router.get("/todos", (req, res, next) => {
  console.log("🎯 ROTA /todos CAPTURADA!");
  ProntuarioController.listarTodos(req, res, next);
});

// 2. Rotas com parâmetro + sufixo específico
router.get("/:numero_solipede/baixas-pendentes", ProntuarioController.contarBaixasPendentes);

// 3. Rotas PATCH com ID
router.patch("/:id/liberar-baixa", ProntuarioController.liberarBaixa);
router.patch("/:id/concluir-tratamento", ProntuarioController.concluirTratamento);

// 4. Rota genérica com parâmetro deve vir POR ÚLTIMO
router.get("/:numero_solipede", (req, res, next) => {
  console.log(`📖 ROTA /:numero_solipede CAPTURADA com valor: ${req.params.numero_solipede}`);
  ProntuarioController.listarPorSolipede(req, res, next);
});

export default router;
