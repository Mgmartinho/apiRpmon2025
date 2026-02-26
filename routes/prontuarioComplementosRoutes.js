import express from "express";
import * as ProntuarioDietaController from "../controllers/ProntuarioDietaControllers.js";
import * as ProntuarioMovimentacaoController from "../controllers/ProntuarioMovimentacaoControllers.js";
import * as ProntuarioRestricaoController from "../controllers/ProntuarioRestricaoControllers.js";
import * as ProntuarioSuplementacaoController from "../controllers/ProntuarioSuplementacaoControllers.js";
import * as ProntuarioTratamentoController from "../controllers/ProntuarioTratamentoControllers.js";

const router = express.Router();

// Dietas
router.get("/:prontuarioId/dietas", ProntuarioDietaController.listar);
router.post("/dietas", ProntuarioDietaController.criar);
router.delete("/dietas/:id", ProntuarioDietaController.excluir);

// Movimentações
router.get("/:prontuarioId/movimentacoes", ProntuarioMovimentacaoController.listar);
router.post("/movimentacoes", ProntuarioMovimentacaoController.criar);
router.delete("/movimentacoes/:id", ProntuarioMovimentacaoController.excluir);

// Restrições
router.get("/:prontuarioId/restricoes", ProntuarioRestricaoController.listar);
router.post("/restricoes", ProntuarioRestricaoController.criar);
router.delete("/restricoes/:id", ProntuarioRestricaoController.excluir);

// Suplementações
router.get("/:prontuarioId/suplementacoes", ProntuarioSuplementacaoController.listar);
router.post("/suplementacoes", ProntuarioSuplementacaoController.criar);
router.delete("/suplementacoes/:id", ProntuarioSuplementacaoController.excluir);

// Tratamentos
router.get("/:prontuarioId/tratamentos", ProntuarioTratamentoController.listar);
router.post("/tratamentos", ProntuarioTratamentoController.criar);
router.patch("/tratamentos/:id/status", ProntuarioTratamentoController.atualizarStatus);
router.delete("/tratamentos/:id", ProntuarioTratamentoController.excluir);

export default router;
