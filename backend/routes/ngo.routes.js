import express from "express";
import upload from "../middleware/upload.js";
import { registerOrganization } from "../controllers/ngo.controller.js";

const router = express.Router();

// POST /api/ngo/register
router.post("/register", upload.single("license"), registerOrganization);

export default router;
