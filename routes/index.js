import authMiddleware from "../middlewares/authMiddleware.js";
import usuarioRoutes from "./usuarioRoutes.js";
import solipedesRoutes from "./solipedesRoutes.js";
import SolipedeController from "../controllers/solipedeController.js";

const routes = (app) => {
  app.get("/", (req, res) => {
    res.status(200).send("API rodando com MySQL");
  });

  // ROTA PÚBLICA - Listar solípedes
  app.get("/solipedes/publico", SolipedeController.listar);

  // ROTA PÚBLICA - Histórico de horas
  app.get("/solipedes/historico/:numero", SolipedeController.historicoHoras);

  // routes/index.js
  app.use("/auth", usuarioRoutes);
  app.use("/gestaoFVR", authMiddleware, solipedesRoutes);
};

export default routes;
