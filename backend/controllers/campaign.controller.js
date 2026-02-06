import db from "../db.js";

/**
 * POST /api/campaigns/create
 * Payload MUST match table columns.
 */
export async function createCampaign(req, res) {
  let connection;
  try {
    const {
      org_id,
      title,
      category,
      division,
      district,
      slum_area,
      start_date,
      end_date,
      start_time,
      target_gender,
      age_group,
      education_required,
      skills_required,
      description
    } = req.body || {};

    const orgIdNum = Number(org_id);
    const cleanTitle = String(title ?? "").trim();
    const cleanCategory = String(category ?? "").trim();
    const cleanDivision = String(division ?? "").trim();
    const cleanDistrict = String(district ?? "").trim();
    const cleanSlumArea = String(slum_area ?? "").trim();
    const cleanStartDate = String(start_date ?? "").trim();
    const cleanEndDate = String(end_date ?? "").trim();
    const cleanStartTime = String(start_time ?? "").trim();
    const cleanGender = String(target_gender ?? "").trim().toLowerCase();
    const cleanAgeGroup = String(age_group ?? "").trim().toLowerCase();
    const cleanDescription = String(description ?? "").trim();
    const cleanEducation = String(education_required ?? "").trim();
    const cleanSkills = String(skills_required ?? "").trim();

    // Basic validation
    if (
      !Number.isInteger(orgIdNum) || orgIdNum <= 0 ||
      !cleanTitle || !cleanCategory ||
      !cleanDivision || !cleanDistrict || !cleanSlumArea ||
      !cleanStartDate || !cleanEndDate ||
      !cleanGender || !cleanAgeGroup || !cleanDescription
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields."
      });
    }

    // Validate enums (match your SQL)
    const allowedGender = new Set(["all", "female", "male", "others"]);
    const allowedAge = new Set(["child", "adult", "both"]);

    if (!allowedGender.has(cleanGender)) {
      return res.status(400).json({ success: false, message: "Invalid target_gender." });
    }
    if (!allowedAge.has(cleanAgeGroup)) {
      return res.status(400).json({ success: false, message: "Invalid age_group." });
    }

    if (cleanEndDate < cleanStartDate) {
      return res.status(400).json({ success: false, message: "End date cannot be before start date." });
    }

    connection = await db.getConnection();

    // FK safety: ensure org exists
    const [orgRows] = await connection.execute(
      `SELECT org_id, org_type, status FROM organizations WHERE org_id = ? LIMIT 1`,
      [orgIdNum]
    );

    if (!orgRows || orgRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Referenced organization (org_id=${org_id}) not found. Insert the organization row first.`
      });
    }

    // Optional: require accepted orgs only (recommended)
    const org = orgRows[0];
    if (org.status && org.status !== "accepted") {
      return res.status(403).json({
        success: false,
        message: "Organization is not accepted yet. Campaign creation is not allowed."
      });
    }

    const insertSql = `
      INSERT INTO campaigns (
        org_id,
        title,
        category,
        division,
        district,
        slum_area,
        start_date,
        end_date,
        start_time,
        target_gender,
        age_group,
        education_required,
        skills_required,
        description,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
    `;

    const [result] = await connection.execute(insertSql, [
      orgIdNum,
      cleanTitle,
      cleanCategory,
      cleanDivision,
      cleanDistrict,
      cleanSlumArea,
      cleanStartDate,
      cleanEndDate,
      cleanStartTime || null,
      cleanGender,
      cleanAgeGroup,
      cleanEducation || null,
      cleanSkills || null,
      cleanDescription
    ]);

    return res.status(201).json({
      success: true,
      message: "New campaign has been created",
      data: { campaign_id: result.insertId }
    });

  } catch (error) {
    console.error("Error creating campaign:", error);

    if (error && (error.code === "ER_NO_REFERENCED_ROW_2" || error.errno === 1452)) {
      return res.status(400).json({
        success: false,
        message: "Foreign key failed: org_id does not exist in organizations table.",
        error: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create campaign",
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
}

/**
 * GET /api/campaigns
 * Optional: /api/campaigns?org_id=1001 to filter “my campaigns”
 */
export async function getAllCampaigns(req, res) {
  let connection;
  try {
    const { org_id } = req.query;

    connection = await db.getConnection();

    let sql = `
      SELECT campaign_id, org_id, title, category, division, district, slum_area,
             start_date, end_date, start_time, target_gender, age_group,
             education_required, skills_required, description, status, created_at, updated_at
      FROM campaigns
    `;
    const params = [];

    if (org_id) {
      sql += ` WHERE org_id = ? `;
      params.push(Number(org_id));
    }

    sql += ` ORDER BY created_at DESC `;

    const [rows] = await connection.execute(sql, params);

    return res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error("Error retrieving campaigns:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve campaigns",
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
}

export async function getCampaignById(req, res) {
  let connection;
  try {
    const { campaignId } = req.params;
    connection = await db.getConnection();

    const [rows] = await connection.execute(
      `SELECT * FROM campaigns WHERE campaign_id = ? LIMIT 1`,
      [Number(campaignId)]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    return res.status(200).json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error retrieving campaign:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve campaign",
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
}

export async function updateCampaign(req, res) {
  let connection;
  try {
    const { campaignId } = req.params;
    const payload = req.body || {};
    const idNum = Number(campaignId);

    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ success: false, message: "Invalid campaignId" });
    }

    connection = await db.getConnection();

    const [existingRows] = await connection.execute(
      `SELECT campaign_id, status FROM campaigns WHERE campaign_id = ? LIMIT 1`,
      [idNum]
    );

    if (!existingRows.length) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    const currentStatus = String(existingRows[0].status || "").toLowerCase();

    const hasNonStatusEdits = [
      "title",
      "category",
      "division",
      "district",
      "slum_area",
      "start_date",
      "end_date",
      "start_time",
      "target_gender",
      "age_group",
      "education_required",
      "skills_required",
      "description"
    ].some((k) => payload[k] !== undefined);

    // Completed/cancelled campaigns are read-only (UI should enforce this too)
    if (hasNonStatusEdits && (currentStatus === "completed" || currentStatus === "cancelled" || currentStatus === "canceled")) {
      return res.status(403).json({ success: false, message: "Completed/cancelled campaigns cannot be edited" });
    }

    const allowedGender = new Set(["all", "female", "male", "others"]);
    const allowedAge = new Set(["child", "adult", "both"]);
    const allowedStatus = new Set(["pending", "waiting", "in_progress", "completed", "cancelled", "canceled"]);

    const updates = [];
    const values = [];

    const setIfProvided = (col, val) => {
      updates.push(`${col} = ?`);
      values.push(val);
    };

    if (payload.title !== undefined) setIfProvided("title", String(payload.title ?? "").trim());
    if (payload.category !== undefined) setIfProvided("category", String(payload.category ?? "").trim());
    if (payload.division !== undefined) setIfProvided("division", String(payload.division ?? "").trim());
    if (payload.district !== undefined) setIfProvided("district", String(payload.district ?? "").trim());
    if (payload.slum_area !== undefined) setIfProvided("slum_area", String(payload.slum_area ?? "").trim());
    if (payload.start_date !== undefined) setIfProvided("start_date", String(payload.start_date ?? "").trim());
    if (payload.end_date !== undefined) setIfProvided("end_date", String(payload.end_date ?? "").trim());
    if (payload.start_time !== undefined) {
      const t = String(payload.start_time ?? "").trim();
      setIfProvided("start_time", t || null);
    }
    if (payload.education_required !== undefined) {
      const v = String(payload.education_required ?? "").trim();
      setIfProvided("education_required", v || null);
    }
    if (payload.skills_required !== undefined) {
      const v = String(payload.skills_required ?? "").trim();
      setIfProvided("skills_required", v || null);
    }
    if (payload.description !== undefined) setIfProvided("description", String(payload.description ?? "").trim());

    if (payload.target_gender !== undefined) {
      const g = String(payload.target_gender ?? "").trim().toLowerCase();
      if (g && !allowedGender.has(g)) {
        return res.status(400).json({ success: false, message: "Invalid target_gender" });
      }
      setIfProvided("target_gender", g);
    }

    if (payload.age_group !== undefined) {
      const a = String(payload.age_group ?? "").trim().toLowerCase();
      if (a && !allowedAge.has(a)) {
        return res.status(400).json({ success: false, message: "Invalid age_group" });
      }
      setIfProvided("age_group", a);
    }

    if (payload.status !== undefined) {
      const s = String(payload.status ?? "").trim().toLowerCase();
      if (!s || !allowedStatus.has(s)) {
        return res.status(400).json({ success: false, message: "Invalid status" });
      }

      // Basic guardrails for cancelling
      if ((s === "cancelled" || s === "canceled") && currentStatus === "completed") {
        return res.status(403).json({ success: false, message: "Completed campaigns cannot be cancelled" });
      }

      setIfProvided("status", s);
    }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    // Validate date range if provided
    const nextStart = payload.start_date !== undefined ? String(payload.start_date ?? "").trim() : null;
    const nextEnd = payload.end_date !== undefined ? String(payload.end_date ?? "").trim() : null;
    if (nextStart && nextEnd && nextEnd < nextStart) {
      return res.status(400).json({ success: false, message: "End date cannot be before start date" });
    }

    const sql = `UPDATE campaigns SET ${updates.join(", ")}, updated_at = NOW() WHERE campaign_id = ?`;
    values.push(idNum);

    const [result] = await connection.execute(sql, values);

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    return res.status(200).json({ success: true, message: "Campaign updated successfully" });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update campaign",
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
}

export async function deleteCampaign(req, res) {
  let connection;
  try {
    const { campaignId } = req.params;
    connection = await db.getConnection();

    const [result] = await connection.execute(
      `DELETE FROM campaigns WHERE campaign_id = ?`,
      [Number(campaignId)]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    return res.status(200).json({ success: true, message: "Campaign deleted successfully" });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete campaign",
      error: error.message
    });
  } finally {
    if (connection) connection.release();
  }
}