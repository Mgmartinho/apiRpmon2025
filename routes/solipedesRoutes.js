import express from "express";
import SolipedeController from "../controllers/solipedeController.js";

const router = express.Router();

/* ======================================================
   SOLÍPEDES (CRUD)
====================================================== */

// Listar todos
router.get("/solipedes", SolipedeController.listar);

// Buscar por número
router.get("/solipedes/:numero", SolipedeController.obterPorNumero);

// Criar
router.post("/solipedes", SolipedeController.criar);

// Atualizar
router.put("/solipedes/:numero", SolipedeController.atualizar);

// Excluir
router.delete("/solipedes/:numero", SolipedeController.excluir);


/* ======================================================
   CARGA HORÁRIA
====================================================== */

// Adicionar horas (lote ou individual — usado pelo front)
router.post(
  "/solipedes/adicionarHoras",
  SolipedeController.adicionarHoras
);


/* ======================================================
   HISTÓRICO DE HORAS
====================================================== */

// 🔍 Histórico completo (lupa no front)
router.get(
  "/solipedes/historico/:numero",
  SolipedeController.historicoHoras
);

// 📊 Histórico mensal (para gráficos)
router.get(
  "/solipedes/historico/mensal/:numero",
  SolipedeController.historicoMensal
);

// ✏️ Atualizar lançamento específico
router.put(
  "/historicoHoras/:id",
  SolipedeController.atualizarHistorico
);

export default router;
