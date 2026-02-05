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
    const { status } = req.body || {};

    if (!status) {
      return res.status(400).json({ success: false, message: "Status is required" });
    }

    connection = await db.getConnection();

    const [result] = await connection.execute(
      `UPDATE campaigns SET status = ?, updated_at = NOW() WHERE campaign_id = ?`,
      [status, Number(campaignId)]
    );

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