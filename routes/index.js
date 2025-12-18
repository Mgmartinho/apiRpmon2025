import solipedesRoutes from "./solipedesRoutes.js";

const routes = (app) => {
  app.route("/").get((req, res) => {
      res.status(200).send("API rodando com MySQL");
  });

    app.use(solipedesRoutes);
};

export default routes;
