import express from "express";

const router = express.Router();

// GET /observacoes/solipedes-com-observacoes - Retorna array de números de solípedes com observações
router.get("/solipedes-com-observacoes", async (req, res) => {
  try {
    return res.status(410).json({
      error: "O endpoint de observações foi descontinuado porque não possui equivalente no modelo prontuario_geral."
    });
  } catch (error) {
    console.error("❌ Erro ao listar solípedes com observações:", error);
    res.status(500).json({ error: "Erro ao buscar solípedes com observações" });
  }
});

// GET /observacoes/:numero - Retorna observações de um solípede COM dados do usuário
router.get("/:numero", async (req, res) => {
  try {
    return res.status(410).json({
      error: "O endpoint de observações foi descontinuado porque não possui equivalente no modelo prontuario_geral."
    });
  } catch (error) {
    console.error("❌ Erro ao buscar observações:", error);
    res.status(500).json({ error: "Erro ao buscar observações" });
  }
});

export default router;
