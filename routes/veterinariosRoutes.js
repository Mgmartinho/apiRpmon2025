import express from "express";
import VeterinarioController from "../controllers/veterinarioController.js";    
const router = express.Router();

router.get("/veterinarios", VeterinarioController.listar);
router.get("/veterinarios/:numero", VeterinarioController.obterPorNumero);
router.post("/veterinarios", VeterinarioController.criar);
router.put("/veterinarios/:numero", VeterinarioController.atualizar);
router.delete("/veterinarios/:numero", VeterinarioController.excluir);

export default router;
