import express from "express";
import ProntuarioController from "../controllers/ProntuarioController.js";
import SolipedeController from "../controllers/solipedeController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import * as NovoProntuarioController from "../controllers/NovoProntuarioController.js";

const router = express.Router();

// ⚠️ IMPORTANTE: Rotas específicas devem vir ANTES das rotas com parâmetros
// A ordem importa! Express usa a primeira rota que corresponder ao padrão

// 1. Rotas com paths específicos (sem parâmetros variáveis)
router.get("/todos", (req, res, next) => {
  console.log("🎯 ROTA /todos CAPTURADA!");
  ProntuarioController.listarTodos(req, res, next);
});

// NOVO MODELO — prontuario_geral com todos os complementos
router.get("/novo-modelo", NovoProntuarioController.listarTodos);
router.get("/novo-modelo/:numero", NovoProntuarioController.listarPorSolipede);

// 2. Rotas com parâmetro + sufixo específico
router.get("/:numero_solipede/baixas-pendentes", ProntuarioController.contarBaixasPendentes);

// 3. Rotas PATCH com ID
router.patch("/:id/liberar-baixa", (req, res, next) => {
  console.log(`🔓 ROTA PATCH /:id/liberar-baixa CAPTURADA com ID: ${req.params.id}`);
  ProntuarioController.liberarBaixa(req, res, next);
});

router.get("/:numero/tratamentos-andamento", (req, res, next) => {
  ProntuarioController.contarTratamentosEmAndamento(req, res, next);
});

router.patch("/:id/concluir-tratamento", (req, res, next) => {
  console.log(`✅ ROTA PATCH /:id/concluir-tratamento CAPTURADA com ID: ${req.params.id}`);
  ProntuarioController.concluirTratamento(req, res, next);
});

router.patch("/:id/concluir-registro", (req, res, next) => {
  console.log(`✅ ROTA PATCH /:id/concluir-registro CAPTURADA com ID: ${req.params.id}`);
  console.log("📦 Body recebido:", req.body);
  ProntuarioController.concluirRegistro(req, res, next);
});

// Rota DELETE para excluir registro com senha
router.delete("/:id/excluir", (req, res, next) => {
  console.log(`🗑️ ROTA DELETE /:id/excluir CAPTURADA com ID: ${req.params.id}`);
  console.log("📦 Body recebido:", req.body);
  ProntuarioController.excluirRegistro(req, res, next);
});

// Rota POST para criar prontuário
router.post("/", (req, res, next) => {
  console.log("➕ ROTA POST / prontuário CAPTURADA");
  console.log("📦 Body:", req.body);
  console.log("👤 Usuario:", req.usuario);
  SolipedeController.salvarProntuario(req, res, next);
});

// 4. Rota PUT para atualizar prontuário (edição)
router.put("/:id", (req, res, next) => {
  console.log(`✏️ ROTA PUT /:id CAPTURADA com ID: ${req.params.id}`);
  ProntuarioController.atualizarRegistro(req, res, next);
});

// 5. Rota DELETE para deletar prontuário
router.delete("/:id", (req, res, next) => {
  console.log(`🗑️ ROTA DELETE /:id CAPTURADA com ID: ${req.params.id}`);
  SolipedeController.deletarProntuario(req, res, next);
});

// 6. Rota genérica com parâmetro deve vir POR ÚLTIMO
router.get("/:numero_solipede", (req, res, next) => {
  console.log(`📖 ROTA /:numero_solipede CAPTURADA com valor: ${req.params.numero_solipede}`);
  ProntuarioController.listarPorSolipede(req, res, next);
});

export default router;
