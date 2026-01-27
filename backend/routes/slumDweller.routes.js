import express from "express";
import { 
  registerSlumDweller,
  getPendingSlumDwellers,
  getActiveSlumDwellers,
  getSlumDwellerById,
  approveSlumDweller,
  rejectSlumDweller
} from "../controllers/slumDweller.controller.js";

const router = express.Router();

// POST /api/slum-dweller/register
router.post("/register", registerSlumDweller);

// GET /api/slum-dweller/pending
router.get("/pending", getPendingSlumDwellers);

// GET /api/slum-dweller/active
router.get("/active", getActiveSlumDwellers);

// GET /api/slum-dweller/:id
router.get("/:id", getSlumDwellerById);

// PATCH /api/slum-dweller/:id/approve
router.patch("/:id/approve", approveSlumDweller);

// DELETE /api/slum-dweller/:id
router.delete("/:id", rejectSlumDweller);

export default router;
