// backend/controllers/campaign.controller.js
import db from "../db.js";

/* ----------------------------- helpers ----------------------------- */

function cleanStr(v) {
  return String(v ?? "").trim();
}

function cleanDate(v) {
  return cleanStr(v).slice(0, 10); // YYYY-MM-DD
}

function cleanTimeHHMM(v) {
  return cleanStr(v).slice(0, 5); // HH:MM
}

function toSqlTime(vHHMM) {
  const t = cleanTimeHHMM(vHHMM);
  return t ? `${t}:00` : null; // TIME column
}

function mapCampaignGenderToDwellerGender(target_gender) {
  const g = cleanStr(target_gender).toLowerCase();
  if (g === "female") return "Female";
  if (g === "male") return "Male";
  if (g === "others") return "Others";
  return null; // "all" => no filter
}

function campaignSummaryText(c) {
  // This is what you wanted as “whole text”
  const parts = [
    `Title: ${c.title}`,
    `Category: ${c.category}`,
    `Location: ${c.division}, ${c.district}, ${c.slum_area}`,
    `Start: ${String(c.start_date).slice(0, 10)}`,
    `End: ${String(c.end_date).slice(0, 10)}`,
    `Time: ${c.start_time ? String(c.start_time).slice(0, 5) : "—"}`,
    `Target Gender: ${c.target_gender}`,
    `Age Group: ${c.age_group}`,
    `Education Required: ${c.education_required || "—"}`,
    `Skill Required: ${c.skills_required || "—"}`,
    `Description: ${c.description}`,
  ];
  return parts.join("\n");
}

function diffText(oldC, newC) {
  const changed = [];

  const oldStart = oldC.start_date ? String(oldC.start_date).slice(0, 10) : "";
  const oldEnd = oldC.end_date ? String(oldC.end_date).slice(0, 10) : "";
  const oldTime = oldC.start_time ? String(oldC.start_time).slice(0, 5) : "";

  const newStart = newC.start_date ? String(newC.start_date).slice(0, 10) : "";
  const newEnd = newC.end_date ? String(newC.end_date).slice(0, 10) : "";
  const newTime = newC.start_time ? String(newC.start_time).slice(0, 5) : "";

  if (oldStart !== newStart) changed.push(`Start Date: ${oldStart || "—"} → ${newStart || "—"}`);
  if (oldEnd !== newEnd) changed.push(`End Date: ${oldEnd || "—"} → ${newEnd || "—"}`);
  if (oldTime !== newTime) changed.push(`Time: ${oldTime || "—"} → ${newTime || "—"}`);

  return changed.length ? changed.join("\n") : "No visible field changed.";
}

/**
 * Recipient selection rule (backend only):
 * - Only slum_dwellers.status = 'accepted'
 * - Match division/district/area
 * - Match target_gender (mapped to dweller gender)
 * - Age group:
 *    child => must have at least 1 ACTIVE child
 *    adult => must have NO ACTIVE child  (so it doesn't go to child families)
 *    both  => no child filter
 * - education_required:
 *    null/""/"none" => ignore
 *    else => compare to slum_dwellers.education (case-insensitive exact)
 * - skills_required:
 *    ⚠️ You currently do NOT store “skills” for dwellers in DB.
 *    So we cannot filter by skill accurately without a new table/column.
 *    We still include it in the notification text.
 */
async function getEligibleSlumCodes(connection, campaignRow) {
  const where = [];
  const params = [];

  where.push(`sd.status = 'accepted'`);

  where.push(`sd.division = ?`);
  params.push(campaignRow.division);

  where.push(`sd.district = ?`);
  params.push(campaignRow.district);

  // Your slum_dwellers has "area" (not slum_area). Match campaign.slum_area to sd.area.
  where.push(`sd.area = ?`);
  params.push(campaignRow.slum_area);

  const dwellerGender = mapCampaignGenderToDwellerGender(campaignRow.target_gender);
  if (dwellerGender) {
    where.push(`sd.gender = ?`);
    params.push(dwellerGender);
  }

  const age = String(campaignRow.age_group || "").toLowerCase();
  if (age === "child") {
    where.push(`
      EXISTS (
        SELECT 1
        FROM children ch
        WHERE ch.slum_id = sd.slum_code
          AND ch.status = 'active'
      )
    `);
  } else if (age === "adult") {
    where.push(`
      NOT EXISTS (
        SELECT 1
        FROM children ch
        WHERE ch.slum_id = sd.slum_code
          AND ch.status = 'active'
      )
    `);
  } // both => no filter

  const edu = String(campaignRow.education_required || "").trim();
  if (edu && edu.toLowerCase() !== "none") {
    where.push(`LOWER(sd.education) = LOWER(?)`);
    params.push(edu);
  }

  const sql = `
    SELECT sd.slum_code
    FROM slum_dwellers sd
    WHERE ${where.join(" AND ")}
  `;

  const [rows] = await connection.execute(sql, params);
  return rows.map((r) => r.slum_code);
}

async function insertNotificationsBulk(connection, rows) {
  if (!rows.length) return 0;

  // mysql2 supports bulk insert with VALUES ?
  const values = rows.map((r) => [
    r.slum_code,
    r.campaign_id,
    r.org_id,
    r.type,
    r.title,
    r.message,
  ]);

  const sql = `
    INSERT INTO notifications
      (slum_code, campaign_id, org_id, type, title, message)
    VALUES ?
  `;

  const [result] = await connection.query(sql, [values]);
  return result.affectedRows || 0;
}

/* ----------------------------- controllers ----------------------------- */

/**
 * POST /api/campaigns/create
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
      description,
    } = req.body || {};

    const orgIdNum = Number(org_id);

    const cleanTitle = cleanStr(title);
    const cleanCategory = cleanStr(category);
    const cleanDivision = cleanStr(division);
    const cleanDistrict = cleanStr(district);
    const cleanSlumArea = cleanStr(slum_area);

    const cleanStartDate = cleanDate(start_date);
    const cleanEndDate = cleanDate(end_date);
    const cleanStartTime = cleanTimeHHMM(start_time);

    const cleanGender = cleanStr(target_gender).toLowerCase();
    const cleanAge = cleanStr(age_group).toLowerCase();

    const cleanDesc = cleanStr(description);
    const cleanEdu = cleanStr(education_required);
    const cleanSkills = cleanStr(skills_required);

    if (
      !Number.isInteger(orgIdNum) ||
      orgIdNum <= 0 ||
      !cleanTitle ||
      !cleanCategory ||
      !cleanDivision ||
      !cleanDistrict ||
      !cleanSlumArea ||
      !cleanStartDate ||
      !cleanEndDate ||
      !cleanGender ||
      !cleanAge ||
      !cleanDesc
    ) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const allowedGender = new Set(["all", "female", "male", "others"]);
    const allowedAge = new Set(["child", "adult", "both"]);

    if (!allowedGender.has(cleanGender)) {
      return res.status(400).json({ success: false, message: "Invalid target_gender." });
    }
    if (!allowedAge.has(cleanAge)) {
      return res.status(400).json({ success: false, message: "Invalid age_group." });
    }
    if (cleanEndDate < cleanStartDate) {
      return res.status(400).json({ success: false, message: "End date cannot be before start date." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // ensure org exists + accepted
    const [orgRows] = await connection.execute(
      `SELECT org_id, status FROM organizations WHERE org_id = ? LIMIT 1`,
      [orgIdNum]
    );
    if (!orgRows.length) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Referenced organization (org_id=${orgIdNum}) not found.`,
      });
    }
    if (orgRows[0].status !== "accepted") {
      await connection.rollback();
      return res.status(403).json({
        success: false,
        message: "Organization is not accepted yet. Campaign creation is not allowed.",
      });
    }

    // insert campaign
    const insertSql = `
      INSERT INTO campaigns (
        org_id, title, category,
        division, district, slum_area,
        start_date, end_date, start_time,
        target_gender, age_group,
        education_required, skills_required,
        description,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    const [ins] = await connection.execute(insertSql, [
      orgIdNum,
      cleanTitle,
      cleanCategory,
      cleanDivision,
      cleanDistrict,
      cleanSlumArea,
      cleanStartDate,
      cleanEndDate,
      toSqlTime(cleanStartTime),
      cleanGender,
      cleanAge,
      cleanEdu || null,
      cleanSkills || null,
      cleanDesc,
    ]);

    const campaignId = ins.insertId;

    // load inserted campaign row for consistent message + recipient selection
    const [cRows] = await connection.execute(
      `SELECT * FROM campaigns WHERE campaign_id = ? LIMIT 1`,
      [campaignId]
    );
    const c = cRows[0];

    const eligibleSlumCodes = await getEligibleSlumCodes(connection, c);

    const titleText = `New Campaign: ${c.title}`;
    const msgText = campaignSummaryText(c);

    const inserted = await insertNotificationsBulk(
      connection,
      eligibleSlumCodes.map((slum_code) => ({
        slum_code,
        campaign_id: c.campaign_id,
        org_id: c.org_id,
        type: "campaign_created",
        title: titleText,
        message: msgText,
      }))
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "New campaign has been created",
      data: { campaign_id: campaignId, notifications_created: inserted },
    });
  } catch (error) {
    console.error("Error creating campaign:", error);
    try {
      if (connection) await connection.rollback();
    } catch {}
    return res.status(500).json({
      success: false,
      message: "Failed to create campaign",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
}

/**
 * GET /api/campaigns?org_id=...
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
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
}

/**
 * GET /api/campaigns/:campaignId
 */
export async function getCampaignById(req, res) {
  let connection;
  try {
    const idNum = Number(req.params.campaignId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ success: false, message: "Invalid campaignId" });
    }

    connection = await db.getConnection();
    const [rows] = await connection.execute(
      `SELECT * FROM campaigns WHERE campaign_id = ? LIMIT 1`,
      [idNum]
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
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
}

/**
 * PUT /api/campaigns/:campaignId
 * ✅ Allowed:
 *   - start_date, end_date, start_time (edit)
 *   - status = 'cancelled' (cancel)
 * ❌ Any other field -> rejected
 *
 * Also inserts notifications:
 *  - campaign_updated when date/time edited
 *  - campaign_cancelled when cancelled
 */
export async function updateCampaign(req, res) {
  let connection;
  try {
    const idNum = Number(req.params.campaignId);
    const payload = req.body || {};

    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ success: false, message: "Invalid campaignId" });
    }

    // hard allow-list
    const allowedKeys = new Set(["start_date", "end_date", "start_time", "status", "org_id"]);
    for (const k of Object.keys(payload)) {
      if (!allowedKeys.has(k)) {
        return res.status(400).json({
          success: false,
          message: `Only start_date, end_date, start_time can be edited (or status=cancelled). Invalid field: ${k}`,
        });
      }
    }

    const nextStart = payload.start_date !== undefined ? cleanDate(payload.start_date) : null;
    const nextEnd = payload.end_date !== undefined ? cleanDate(payload.end_date) : null;
    const nextTime = payload.start_time !== undefined ? cleanTimeHHMM(payload.start_time) : null;

    const nextStatusRaw = payload.status !== undefined ? cleanStr(payload.status).toLowerCase() : null;
    const allowedStatus = new Set(["cancelled"]); // you said you only use cancelled
    if (nextStatusRaw && !allowedStatus.has(nextStatusRaw)) {
      return res.status(400).json({ success: false, message: "Only status='cancelled' is allowed." });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    // load current campaign
    const [rows] = await connection.execute(
      `SELECT * FROM campaigns WHERE campaign_id = ? LIMIT 1`,
      [idNum]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    const cur = rows[0];
    const curStatus = String(cur.status || "").toLowerCase();

    if (curStatus === "cancelled") {
      await connection.rollback();
      return res.status(403).json({ success: false, message: "Campaign already cancelled." });
    }

    // compute final values
    const finalStart = nextStart ?? (cur.start_date ? String(cur.start_date).slice(0, 10) : "");
    const finalEnd = nextEnd ?? (cur.end_date ? String(cur.end_date).slice(0, 10) : "");
    const finalTime = payload.start_time !== undefined ? toSqlTime(nextTime) : cur.start_time;

    if (!finalStart || !finalEnd) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "start_date and end_date are required." });
    }
    if (finalEnd < finalStart) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "End date cannot be before start date." });
    }

    // build update
    const sets = [];
    const vals = [];

    let isCancel = false;
    let isEdit = false;

    if (nextStatusRaw === "cancelled") {
      isCancel = true;
      sets.push(`status = 'cancelled'`);
    } else {
      if (payload.start_date !== undefined) {
        sets.push(`start_date = ?`);
        vals.push(finalStart);
        isEdit = true;
      }
      if (payload.end_date !== undefined) {
        sets.push(`end_date = ?`);
        vals.push(finalEnd);
        isEdit = true;
      }
      if (payload.start_time !== undefined) {
        sets.push(`start_time = ?`);
        vals.push(finalTime);
        isEdit = true;
      }
    }

    if (!sets.length) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: "No fields to update" });
    }

    const updSql = `
      UPDATE campaigns
      SET ${sets.join(", ")}, updated_at = NOW()
      WHERE campaign_id = ?
    `;
    vals.push(idNum);

    await connection.execute(updSql, vals);

    // reload updated campaign for messages
    const [afterRows] = await connection.execute(
      `SELECT * FROM campaigns WHERE campaign_id = ? LIMIT 1`,
      [idNum]
    );
    const after = afterRows[0];

    // recipients based on campaign criteria
    const eligibleSlumCodes = await getEligibleSlumCodes(connection, after);

    let createdNotifs = 0;

    if (isCancel) {
      const titleText = `Campaign Cancelled: ${after.title}`;
      const msgText = `This campaign has been cancelled.\n\n${campaignSummaryText(after)}`;

      createdNotifs = await insertNotificationsBulk(
        connection,
        eligibleSlumCodes.map((slum_code) => ({
          slum_code,
          campaign_id: after.campaign_id,
          org_id: after.org_id,
          type: "campaign_cancelled",
          title: titleText,
          message: msgText,
        }))
      );
    } else if (isEdit) {
      const titleText = `Campaign Updated: ${after.title}`;
      const msgText =
        `This campaign was edited.\n\nChanged:\n${diffText(cur, after)}\n\nUpdated Details:\n${campaignSummaryText(after)}`;

      createdNotifs = await insertNotificationsBulk(
        connection,
        eligibleSlumCodes.map((slum_code) => ({
          slum_code,
          campaign_id: after.campaign_id,
          org_id: after.org_id,
          type: "campaign_updated",
          title: titleText,
          message: msgText,
        }))
      );
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: isCancel ? "Campaign cancelled successfully" : "Campaign updated successfully",
      data: { campaign_id: idNum, notifications_created: createdNotifs },
    });
  } catch (error) {
    console.error("Error updating campaign:", error);
    try {
      if (connection) await connection.rollback();
    } catch {}
    return res.status(500).json({
      success: false,
      message: "Failed to update campaign",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
}

/**
 * DELETE /api/campaigns/:campaignId
 * You said you mainly use status='cancelled', but keeping delete safe:
 * - creates a campaign_cancelled notification first (best-effort)
 * - then deletes the campaign
 */
export async function deleteCampaign(req, res) {
  let connection;
  try {
    const idNum = Number(req.params.campaignId);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return res.status(400).json({ success: false, message: "Invalid campaignId" });
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `SELECT * FROM campaigns WHERE campaign_id = ? LIMIT 1`,
      [idNum]
    );
    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    const c = rows[0];
    const eligibleSlumCodes = await getEligibleSlumCodes(connection, c);

    // best-effort notify as "cancelled" (since deleted)
    const titleText = `Campaign Removed: ${c.title}`;
    const msgText = `This campaign was removed by the organization.\n\n${campaignSummaryText(c)}`;

    const createdNotifs = await insertNotificationsBulk(
      connection,
      eligibleSlumCodes.map((slum_code) => ({
        slum_code,
        campaign_id: c.campaign_id,
        org_id: c.org_id,
        type: "campaign_cancelled",
        title: titleText,
        message: msgText,
      }))
    );

    const [del] = await connection.execute(
      `DELETE FROM campaigns WHERE campaign_id = ?`,
      [idNum]
    );

    if (!del.affectedRows) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Campaign deleted successfully",
      data: { campaign_id: idNum, notifications_created: createdNotifs },
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    try {
      if (connection) await connection.rollback();
    } catch {}
    return res.status(500).json({
      success: false,
      message: "Failed to delete campaign",
      error: error.message,
    });
  } finally {
    if (connection) connection.release();
  }
}