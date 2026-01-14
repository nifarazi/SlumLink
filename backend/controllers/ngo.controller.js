import pool from "../db.js";

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
