import express from "express";
import ObservacaoService from "../models/ObservacaoService.js";

const router = express.Router();

// GET /observacoes/solipedes-com-observacoes - Retorna array de números de solípedes com observações
router.get("/solipedes-com-observacoes", async (req, res) => {
  try {
    console.log("📝 GET /observacoes/solipedes-com-observacoes");
    const numeros = await ObservacaoService.listarSolipedesComObservacoes();
    res.json(numeros);
  } catch (error) {
    console.error("❌ Erro ao listar solípedes com observações:", error);
    res.status(500).json({ error: "Erro ao buscar solípedes com observações" });
  }
});

// GET /observacoes/:numero - Retorna observações de um solípede COM dados do usuário
router.get("/:numero", async (req, res) => {
  try {
    const { numero } = req.params;
    console.log(`📝 GET /observacoes/${numero} - Buscando com dados de usuário`);
    
    const observacoes = await ObservacaoService.listarObservacoesComUsuario(numero);
    res.json(observacoes);
  } catch (error) {
    console.error("❌ Erro ao buscar observações:", error);
    res.status(500).json({ error: "Erro ao buscar observações" });
  }
});

export default router;
