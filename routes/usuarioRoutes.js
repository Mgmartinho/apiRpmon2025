import express from "express";
import UsuarioController from "../controllers/usuarioController.js";


const router = express.Router();

router.post("/login", UsuarioController.login);
router.post("/criar", UsuarioController.criar);

export default router;
