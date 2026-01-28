import express from "express";
import {
  createCampaign,
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign
} from "../controllers/campaign.controller.js";

const router = express.Router();

// POST /api/campaigns/create - Create a new campaign
router.post("/create", createCampaign);

// GET /api/campaigns - Get all campaigns
router.get("/", getAllCampaigns);

// GET /api/campaigns/:campaignId - Get campaign by ID
router.get("/:campaignId", getCampaignById);

// PUT /api/campaigns/:campaignId - Update campaign
router.put("/:campaignId", updateCampaign);

// DELETE /api/campaigns/:campaignId - Delete campaign
router.delete("/:campaignId", deleteCampaign);

export default router;
