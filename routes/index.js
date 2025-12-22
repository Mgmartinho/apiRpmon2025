import authMiddleware from "../middlewares/authMiddleware.js";
import usuarioRoutes from "./usuarioRoutes.js";
import solipedesRoutes from "./solipedesRoutes.js";
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

  // ROTA PÚBLICA - Histórico de horas
  app.get("/solipedes/historico/:numero", SolipedeController.historicoHoras);

  // ROTA PÚBLICA - Indicadores anuais por esquadrão
  app.get("/solipedes/indicadores/anual", SolipedeController.indicadoresAnuais);

  // routes/index.js
  app.use("/auth", usuarioRoutes);
  app.use("/gestaoFVR", authMiddleware, solipedesRoutes);
};

export default routes;
