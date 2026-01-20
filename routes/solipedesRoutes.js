import express from "express";
import SolipedeController from "../controllers/solipedeController.js";

const router = express.Router();

/* ======================================================
   SOLÍPEDES (CRUD)
====================================================== */

// Listar todos
router.get("/solipedes", SolipedeController.listar);

/* ======================================================
   EXCLUSÃO - ARQUIVA EM TABELAS SEPARADAS
   IMPORTANTE: Deve vir ANTES de /solipedes/:numero
====================================================== */

// Listar solípedes excluídos - ESPECÍFICO ANTES DO GENÉRICO
router.get("/solipedes/excluidos/listar", SolipedeController.listarExcluidos);

// Buscar dados do solípede excluído
router.get("/solipedes/excluidos/:numero", SolipedeController.obterSolipedeExcluido);

// Buscar prontuário arquivado de solípede excluído
router.get("/solipedes/excluidos/:numero/prontuario", SolipedeController.obterProntuarioExcluido);

// Buscar ferrageamentos arquivados de solípede excluído
router.get("/solipedes/excluidos/:numero/ferrageamentos", SolipedeController.obterFerrageamentosExcluidos);

// Excluir solípede (move para tabelas de arquivo e deleta)
router.post("/solipedes/excluir", SolipedeController.excluirSolipede);

// Buscar por número - GENÉRICO (com :numero)
router.get("/solipedes/:numero", SolipedeController.obterPorNumero);

// Criar
router.post("/solipedes", SolipedeController.criar);

// Atualizar
router.put("/solipedes/:numero", SolipedeController.atualizar);

// Atualizar apenas status
router.patch("/solipedes/:numero/status", SolipedeController.atualizarStatus);

// ⚠️ ROTA DESABILITADA - Excluir permanente (use POST /solipedes/excluir para soft delete)
// router.delete("/solipedes/:numero", SolipedeController.excluirPermanente);


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

// Horas do mês atual (otimizado) - NOVO ENDPOINT
router.get(
  "/solipedes/horas-mes-atual",
  SolipedeController.horasMesAtual
);

// Historico de movimentação - ESPECÍFICO ANTES DO MENSAL
router.get(
  "/solipedes/historico-movimentacao/:numero",
  SolipedeController.historicoMovimentacao
);

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
