import pool from "../db.js";
import { sendApprovalEmail, sendRejectionEmail } from "../utils/email.js";

export const registerOrganization = async (req, res) => {
  try {
    const { orgName, email, phone, orgAge, password } = req.body;

    // file is required
    if (!req.file) {
      return res.status(400).json({ status: "error", message: "License file is required." });
    }

    // Basic server validation
    if (!orgName || !email || !phone || !orgAge || !password) {
      return res.status(400).json({ status: "error", message: "Missing required fields." });
    }

    // Insert into DB (status auto pending)
    const sql = `
      INSERT INTO organizations
      (org_name, email, phone, org_age, password, license_filename, license_mimetype, license_size, license_file)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      orgName.trim(),
      email.trim(),
      phone.trim(),
      Number(orgAge),
      password,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      req.file.buffer,
    ];

    const [result] = await pool.query(sql, values);

    return res.json({
      status: "success",
      message: "Organization registered successfully. Status is pending.",
      org_id: result.insertId,
    });
  } catch (err) {
    console.error("NGO Register Error:", err);

    // Duplicate email/phone handling
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        status: "error",
        message: "Email or phone already exists. Please use a different one.",
      });
    }

    return res.status(500).json({
      status: "error",
      message: "Server error while registering organization.",
    });
  }
};

// Get all pending NGOs for admin verification
export const getPendingNGOs = async (req, res) => {
  try {
    const sql = `
      SELECT org_id, org_name, email, phone, org_age, status, license_filename
      FROM organizations
      WHERE status = 'pending'
      ORDER BY org_id DESC
    `;

    const [ngos] = await pool.query(sql);

    return res.json({
      status: "success",
      data: ngos,
    });
  } catch (err) {
    console.error("Get Pending NGOs Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error while fetching pending NGOs.",
    });
  }
};

// Get all active (accepted) NGOs
export const getActiveNGOs = async (req, res) => {
  try {
    const sql = `
      SELECT org_id, org_name, email, phone, org_age, status, license_filename
      FROM organizations
      WHERE status = 'accepted'
      ORDER BY org_id DESC
    `;

    const [ngos] = await pool.query(sql);

    return res.json({
      status: "success",
      data: ngos,
    });
  } catch (err) {
    console.error("Get Active NGOs Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error while fetching active NGOs.",
    });
  }
};

// Get single NGO details by ID
export const getNGODetails = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (!orgId) {
      return res.status(400).json({ status: "error", message: "Organization ID is required." });
    }

    const sql = `
      SELECT org_id, org_name, email, phone, org_age, status, license_filename
      FROM organizations
      WHERE org_id = ?
    `;

    const [result] = await pool.query(sql, [orgId]);

    if (result.length === 0) {
      return res.status(404).json({ status: "error", message: "Organization not found." });
    }

    return res.json({
      status: "success",
      data: result[0],
    });
  } catch (err) {
    console.error("Get NGO Details Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error while fetching NGO details.",
    });
  }
};

// Get license file
export const getNGOLicense = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (!orgId) {
      return res.status(400).json({ status: "error", message: "Organization ID is required." });
    }

    const sql = `
      SELECT license_file, license_mimetype, license_filename
      FROM organizations
      WHERE org_id = ?
    `;

    const [result] = await pool.query(sql, [orgId]);

    if (result.length === 0) {
      return res.status(404).json({ status: "error", message: "Organization not found." });
    }

    const { license_file, license_mimetype, license_filename } = result[0];

    res.setHeader("Content-Type", license_mimetype);
    res.setHeader("Content-Disposition", `inline; filename="${license_filename}"`);
    res.send(license_file);
  } catch (err) {
    console.error("Get License Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error while fetching license.",
    });
  }
};

// Approve NGO
export const approveNGO = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (!orgId) {
      return res.status(400).json({ status: "error", message: "Organization ID is required." });
    }

    // Get NGO details
    const selectSql = `
      SELECT org_name, email, status
      FROM organizations
      WHERE org_id = ?
    `;
    const [ngo] = await pool.query(selectSql, [orgId]);

    if (ngo.length === 0) {
      return res.status(404).json({ status: "error", message: "Organization not found." });
    }

    if (ngo[0].status !== "pending") {
      return res.status(400).json({
        status: "error",
        message: `Organization status is already '${ngo[0].status}'. Cannot approve.`,
      });
    }

    // Update status to accepted
    const updateSql = `
      UPDATE organizations
      SET status = 'accepted'
      WHERE org_id = ?
    `;
    await pool.query(updateSql, [orgId]);

    // Send approval email
    await sendApprovalEmail(ngo[0].org_name, ngo[0].email);

    return res.json({
      status: "success",
      message: `${ngo[0].org_name} has been approved successfully. Email sent to ${ngo[0].email}`,
    });
  } catch (err) {
    console.error("Approve NGO Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error while approving organization.",
    });
  }
};

// Reject NGO
export const rejectNGO = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (!orgId) {
      return res.status(400).json({ status: "error", message: "Organization ID is required." });
    }

    // Get NGO details
    const selectSql = `
      SELECT org_name, email, status
      FROM organizations
      WHERE org_id = ?
    `;
    const [ngo] = await pool.query(selectSql, [orgId]);

    if (ngo.length === 0) {
      return res.status(404).json({ status: "error", message: "Organization not found." });
    }

    if (ngo[0].status !== "pending") {
      return res.status(400).json({
        status: "error",
        message: `Organization status is already '${ngo[0].status}'. Cannot reject.`,
      });
    }

    // Update status to rejected
    const updateSql = `
      UPDATE organizations
      SET status = 'rejected'
      WHERE org_id = ?
    `;
    await pool.query(updateSql, [orgId]);

    // Send rejection email
    await sendRejectionEmail(ngo[0].org_name, ngo[0].email);

    return res.json({
      status: "success",
      message: `${ngo[0].org_name} has been rejected. Email sent to ${ngo[0].email}`,
    });
  } catch (err) {
    console.error("Reject NGO Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error while rejecting organization.",
    });
  }
};

// Delete NGO by ID
export const deleteNGO = async (req, res) => {
  try {
    const { orgId } = req.params;

    if (!orgId) {
      return res.status(400).json({ status: "error", message: "Organization ID is required." });
    }

    // Check if NGO exists
    const checkSql = `SELECT org_id, org_name FROM organizations WHERE org_id = ?`;
    const [ngo] = await pool.query(checkSql, [orgId]);

    if (ngo.length === 0) {
      return res.status(404).json({ status: "error", message: "Organization not found." });
    }

    // Delete the NGO
    const deleteSql = `DELETE FROM organizations WHERE org_id = ?`;
    await pool.query(deleteSql, [orgId]);

    return res.json({
      status: "success",
      message: `${ngo[0].org_name} has been deleted successfully.`,
    });
  } catch (err) {
    console.error("Delete NGO Error:", err);
    return res.status(500).json({
      status: "error",
      message: "Server error while deleting organization.",
    });
  }
};
