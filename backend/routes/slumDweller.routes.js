import express from "express";
import { registerSlumDweller } from "../controllers/slumDweller.controller.js";

const router = express.Router();

// POST /api/slum-dweller/register
router.post("/register", registerSlumDweller);

export default router;
