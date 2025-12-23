import express from "express";
import UsuarioController from "../controllers/usuarioController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Rotas públicas
router.post("/login", UsuarioController.login);
router.post("/criar", UsuarioController.criar);

// Rotas protegidas
router.get("/usuarios", authMiddleware, UsuarioController.listarTodos);
router.get("/usuarios/:id", authMiddleware, UsuarioController.buscarPorId);
router.put("/usuarios/:id", authMiddleware, UsuarioController.atualizarDados);
router.put("/usuarios/:id/perfil", authMiddleware, UsuarioController.atualizarPerfil);
router.put("/usuarios/:id/senha", authMiddleware, UsuarioController.alterarSenhaAdmin);
router.put("/alterar-senha", authMiddleware, UsuarioController.alterarSenha);

export default router;
