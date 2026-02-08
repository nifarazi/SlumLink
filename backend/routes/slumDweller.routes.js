import express from "express";
import { 
  registerSlumDweller,
  signinSlumDweller,
  getPendingSlumDwellers,
  getActiveSlumDwellers,
  getSlumDwellerById,
  approveSlumDweller,
  rejectSlumDweller,
  getCurrentUserProfile,
  checkNidDuplicate
} from "../controllers/slumDweller.controller.js";

const router = express.Router();

// POST /api/slum-dweller/register
router.post("/register", registerSlumDweller);

// POST /api/slum-dweller/signin
router.post("/signin", signinSlumDweller);

// POST /api/slum-dweller/check-nid - Check NID duplicate
router.post("/check-nid", checkNidDuplicate);

// GET /api/slum-dweller/pending
router.get("/pending", getPendingSlumDwellers);

// GET /api/slum-dweller/active
router.get("/active", getActiveSlumDwellers);

// GET /api/slum-dweller/profile/:id (for dashboard - lightweight)
router.get("/profile/:id", getCurrentUserProfile);

// GET /api/slum-dweller/:id (full details with spouse and children)
router.get("/:id", getSlumDwellerById);

// PATCH /api/slum-dweller/:id/approve
router.patch("/:id/approve", approveSlumDweller);

// DELETE /api/slum-dweller/:id
router.delete("/:id", rejectSlumDweller);

export default router;
