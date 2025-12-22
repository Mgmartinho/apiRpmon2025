import express from "express";
import ProntuarioController from "../controllers/ProntuarioController.js";

const router = express.Router();

router.get("/:numero_solipede", ProntuarioController.listarPorSolipede);

export default router;
