import express from "express";
import AutorController from "../controllers/autorController.js";

const routes = express.Router();

routes.get("/autor", AutorController.ListarAutores);
routes.get("/autor/:id", AutorController.ListarAutorPorId);
routes.post("/autor", AutorController.CadastrarAutor);
routes.put("/autor/:id", AutorController.AtualizarAutor);
routes.delete("/autor/:id", AutorController.excluirAutor);

export default routes;
