import express from "express";
import SolipedeController from "../controllers/solipedeController.js";

const router = express.Router();

/* ======================================================
   SOLÍPEDES (CRUD)
====================================================== */

// Listar todos
router.get("/solipedes", SolipedeController.listar);

/* ======================================================
   EXCLUSÃO (SOFT DELETE) - MOVE PARA HISTÓRICO
   IMPORTANTE: Deve vir ANTES de /solipedes/:numero
====================================================== */

// Listar solípedes excluídos - ESPECÍFICO ANTES DO GENÉRICO
router.get("/solipedes/excluidos/listar", SolipedeController.listarExcluidos);

// Excluir solípede (move para tabela de excluídos)
router.post("/solipedes/excluir", SolipedeController.excluirSolipede);

// Buscar por número - GENÉRICO (com :numero)
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

// Movimentação em lote (alteração de status)
router.post(
  "/solipedes/movimentacao/bulk",
  SolipedeController.movimentacaoEmLote
);


/* ======================================================
   HISTÓRICO DE HORAS
====================================================== */

// Historico mensal (para gráficos) - DEVE VIR ANTES DA ROTA COM :numero
router.get(
  "/solipedes/historico/mensal/:numero",
  SolipedeController.historicoMensal
);

// Atualizar lançamento específico - DEVE VIR ANTES DO GET :numero GENÉRICO
router.put(
  "/solipedes/historico/:id",
  SolipedeController.atualizarHistorico
);

// Historico completo (lupa no front) - GENÉRICO VIRA POR ÚLTIMO
router.get(
  "/solipedes/historico/:numero",
  SolipedeController.historicoHoras
);

/* ======================================================
   PRONTUÁRIO (OBSERVAÇÕES CLÍNICAS)
====================================================== */

// Salvar observação clínica
router.post("/prontuario", SolipedeController.salvarProntuario);

// Listar observações de um solípede
router.get("/prontuario/:numero", SolipedeController.listarProntuario);

// Atualizar observação
router.put("/prontuario/:id", SolipedeController.atualizarProntuario);

// Deletar observação
router.delete("/prontuario/:id", SolipedeController.deletarProntuario);

export default router;
