import authMiddleware from "../middlewares/authMiddleware.js";
import usuarioRoutes from "./usuarioRoutes.js";
import solipedesRoutes from "./solipedesRoutes.js";
import ferrageamentoRoutes from "./ferrageamentoRoutes.js";
import prontuarioRoutes from "./prontuarioRoutes.js";
import prontuarioComplementosRoutes from "./prontuarioComplementosRoutes.js";
import restricaoRoutes from "./restricaoRoutes.js";
import observacaoRoutes from "./observacaoRoutes.js";
import historicoRoutes from "./historicoRoutes.js";
import SolipedeController from "../controllers/solipedeController.js";

const routes = (app) => {
  app.get("/", (req, res) => {
    res.status(200).send("API rodando com MySQL");
  });

  // ROTA DE DEBUG - Testar token
  app.get("/debug/token", authMiddleware, (req, res) => {
    console.log("🔍 DEBUG TOKEN:");
    console.log("   req.usuario:", req.usuario);
    console.log("   req.usuario?.id:", req.usuario?.id);
    res.json({
      usuario: req.usuario,
      usuarioId: req.usuario?.id
    });
  });

  // ROTA PÚBLICA - Listar solípedes
  app.get("/solipedes/publico", SolipedeController.listar);

  // ROTA PÚBLICA - Horas do mês atual (otimizado)
  app.get("/solipedes/horas-mes-atual", SolipedeController.horasMesAtual);

  // ROTA PÚBLICA - Histórico de horas
  app.get("/solipedes/historico/:numero", SolipedeController.historicoHoras);

  // ROTA PÚBLICA - Histórico de movimentação
  app.get("/solipedes/historico-movimentacao/:numero", SolipedeController.historicoMovimentacao);

  // ROTA PÚBLICA - Prontuário (apenas restrições)
  app.get("/solipedes/prontuario/:numero", SolipedeController.listarProntuarioRestricoes);
  
  // ROTA PÚBLICA - Observações gerais (exceto restrições)
  app.get("/solipedes/observacoes/:numero", SolipedeController.listarObservacoesGerais);
  
  // ROTA PÚBLICA - Ferrageamentos
  app.get("/solipedes/ferrageamentos", SolipedeController.listarFerrageamentosPublico);

  // ROTA PÚBLICA - Indicadores anuais por esquadrão
  app.get("/solipedes/indicadores/anual", SolipedeController.indicadoresAnuais);

  // ROTA PÚBLICA - Lista otimizada de solípedes com restrições (apenas números)
  app.use("/restricoes", restricaoRoutes);
  
  // ROTA PÚBLICA - Lista otimizada de solípedes com observações (apenas números)
  app.use("/observacoes", observacaoRoutes);

  // ⚠️ IMPORTANTE: A ORDEM das rotas importa!
  // Rotas mais específicas devem vir ANTES das rotas mais genéricas
  
  app.use("/auth", usuarioRoutes);
  app.use("/gestaoFVR/prontuario", authMiddleware, prontuarioRoutes);  // ✅ Mais específica PRIMEIRO
  app.use("/gestaoFVR/prontuario", authMiddleware, prontuarioComplementosRoutes);
  app.use("/gestaoFVR", authMiddleware, historicoRoutes);  // Rotas de histórico
  app.use("/gestaoFVR", authMiddleware, ferrageamentoRoutes);
  app.use("/gestaoFVR", authMiddleware, solipedesRoutes);
};

export default routes;
