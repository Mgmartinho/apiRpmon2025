import express from "express";
import authMiddleware from "../middlewares/authMiddleware.js";
import ObservacaoComportamentalController from "../controllers/observacaoComportamentalController.js";

const router = express.Router();

// GET /observacoes/solipedes-com-observacoes - Retorna array de números de solípedes com observações
router.get(
  "/solipedes-com-observacoes",
  ObservacaoComportamentalController.listarSolipedesComObservacoes
);

// GET /observacoes/:numero - Retorna observações de um solípede COM dados do usuário
router.get("/:numero", ObservacaoComportamentalController.listarPorSolipede);

// POST /observacoes - Cria observação comportamental
router.post("/", authMiddleware, ObservacaoComportamentalController.criar);

// PUT /observacoes/:id - Atualiza observação comportamental
router.put("/:id", authMiddleware, ObservacaoComportamentalController.atualizar);

// DELETE /observacoes/:id - Exclui observação comportamental
router.delete("/:id", authMiddleware, ObservacaoComportamentalController.deletar);

export default router;
