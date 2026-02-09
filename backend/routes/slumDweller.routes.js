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
  checkNidDuplicate,
  checkBirthCertificateDuplicate,
  updatePersonalInfo,
  updateSpouseInfo,
  updateChildInfo,
  initPhoneChange,
  verifyCurrentPhone,
  sendNewPhoneOTP,
  verifyNewPhoneAndUpdate,
  initSpousePhoneChange,
  verifySpouseCurrentPhone,
  sendSpouseNewPhoneOTP,
  verifySpouseNewPhoneAndUpdate,
  changePassword
} from "../controllers/slumDweller.controller.js";

const router = express.Router();

// POST /api/slum-dweller/register
router.post("/register", registerSlumDweller);

// POST /api/slum-dweller/signin
router.post("/signin", signinSlumDweller);

// POST /api/slum-dweller/check-nid - Check NID duplicate
router.post("/check-nid", checkNidDuplicate);

// POST /api/slum-dweller/check-birth-certificate - Check birth certificate duplicate
router.post("/check-birth-certificate", checkBirthCertificateDuplicate);

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

// PUT /api/slum-dweller/:slumId/personal - Update personal information
router.put("/:slumId/personal", updatePersonalInfo);

// PUT /api/slum-dweller/:slumId/spouse/:spouseId - Update spouse information
router.put("/:slumId/spouse/:spouseId", updateSpouseInfo);

// PUT /api/slum-dweller/:slumId/child/:childId - Update child information  
router.put("/:slumId/child/:childId", updateChildInfo);

// POST /api/slum-dweller/:slumCode/change-password - Change password
router.post("/:slumCode/change-password", changePassword);

// Phone number change endpoints
// POST /api/slum-dweller/phone-change/init - Initialize phone change process
router.post("/phone-change/init", initPhoneChange);

// POST /api/slum-dweller/phone-change/verify-current - Verify current phone OTP
router.post("/phone-change/verify-current", verifyCurrentPhone);

// POST /api/slum-dweller/phone-change/new-phone - Send OTP to new phone
router.post("/phone-change/new-phone", sendNewPhoneOTP);

// POST /api/slum-dweller/phone-change/verify-new - Verify new phone and update
router.post("/phone-change/verify-new", verifyNewPhoneAndUpdate);

// Spouse phone number change endpoints
// POST /api/slum-dweller/spouse-phone-change/init - Initialize spouse phone change process
router.post("/spouse-phone-change/init", initSpousePhoneChange);

// POST /api/slum-dweller/spouse-phone-change/verify-current - Verify spouse current phone OTP
router.post("/spouse-phone-change/verify-current", verifySpouseCurrentPhone);

// POST /api/slum-dweller/spouse-phone-change/new-phone - Send OTP to new spouse phone
router.post("/spouse-phone-change/new-phone", sendSpouseNewPhoneOTP);

// POST /api/slum-dweller/spouse-phone-change/verify-new - Verify new spouse phone and update
router.post("/spouse-phone-change/verify-new", verifySpouseNewPhoneAndUpdate);

// DELETE /api/slum-dweller/:id
router.delete("/:id", rejectSlumDweller);

export default router;
