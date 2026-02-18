// backend/controllers/complaintController.js
import pool from "../db.js"; // Make sure this exports a MySQL pool

// 1️⃣ Get counts per category
export const getComplaintCounts = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT category, COUNT(*) AS total,
             SUM(status='pending') AS pendingCount
      FROM complaints
      GROUP BY category
    `);

    const categories = {};
    let pendingCount = 0;

    rows.forEach(r => {
      categories[r.category] = r.total;
      pendingCount += parseInt(r.pendingCount);
    });

    res.json({ categories, pendingCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// 2️⃣ Get all complaints by category
export const getComplaintsByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    if (!category) return res.status(400).json({ error: "Category is required" });

    const [rows] = await pool.query(
      `SELECT complaint_id, slum_id, title, description, status 
       FROM complaints 
       WHERE category = ? 
       ORDER BY created_at DESC`,
      [category]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};
// 3️⃣ Get single complaint by ID
export const getComplaintById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT complaint_id, slum_id, title, category, description,
              division, district, area, status, created_at
       FROM complaints
       WHERE complaint_id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};

// 4️⃣ Update complaint status
export const updateComplaintStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "in progress", "resolved"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    await pool.query(
      `UPDATE complaints
       SET status = ?
       WHERE complaint_id = ?`,
      [status, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
};
