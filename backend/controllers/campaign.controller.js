import db from "../db.js";

/**
 * Create a new campaign
 * POST /api/campaigns/create
 */
export async function createCampaign(req, res) {
  let connection;
  try {
    const {
      title,
      category,
      target_slum_area,
      start_date,
      end_date,
      start_time,
      target_gender,
      age_group,
      description,
      org_id_prefix = "aut"
    } = req.body;

    // Validation
    if (!title || !category || !target_slum_area || !start_date || !end_date || !start_time || !target_gender || !age_group || !description) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    connection = await db.getConnection();
    // Map authority prefix to org_id in organizations table
    const orgIdMap = {
      "dha": 1001, // Dhaka
      "cht": 1002, // Chattogram
      "khu": 1003, // Khulna
      "raj": 1004, // Rajshahi
      "bar": 1005, // Barishal
      "syl": 1006, // Sylhet
      "ran": 1007, // Rangpur
      "mym": 1008  // Mymensingh
    };
    
    const org_id = orgIdMap[org_id_prefix] || 1001; // Default to Dhaka

    // Verify referenced organization exists to avoid FK errors
    try {
      const [orgRows] = await connection.execute(
        `SELECT org_id FROM organizations WHERE org_id = ? LIMIT 1`,
        [org_id]
      );

      if (!orgRows || orgRows.length === 0) {
        return res.status(400).json({
          success: false,
          message: `Referenced organization (org_id=${org_id}) not found. Run setup_local_authorities.sql or create the organization record.`
        });
      }
    } catch (chkErr) {
      // If checking the organizations table fails, include helpful hint
      console.error('Error checking organizations table:', chkErr.message);
      return res.status(500).json({
        success: false,
        message: 'Database error while validating organization reference',
        error: chkErr.message
      });
    }
    console.log("Creating campaign with org_id:", org_id, "for authority:", org_id_prefix);
    const genderMap = {
      "both": "Any",
      "male": "Male",
      "female": "Female",
      "others": "Others"
    };
    const mappedGender = genderMap[target_gender.toLowerCase()] || "Any";

    // Status should be PENDING (matching database ENUM)
    const status = "PENDING";

    console.log("Creating campaign with org_id:", org_id, "Gender:", mappedGender);

    // Insert campaign into database
    const query = `
      INSERT INTO campaigns (
        org_id,
        title,
        category,
        target_slum_area,
        start_date,
        end_date,
        start_time,
        target_gender,
        age_group,
        description,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    const [result] = await connection.execute(query, [
      org_id,
      title,
      category,
      target_slum_area,
      start_date,
      end_date,
      start_time,
      mappedGender,
      age_group,
      description,
      status
    ]);

    console.log("Campaign inserted successfully with ID:", result.insertId);

    return res.status(201).json({
      success: true,
      message: "New campaign has been created",
      data: {
        campaign_id: result.insertId,
        title,
        category,
        status,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error("Error creating campaign:", error);

    // Foreign key / referenced row errors are common if organizations table
    // doesn't contain the expected org_id. Provide a clearer message.
    if (error && (error.code === 'ER_NO_REFERENCED_ROW_2' || error.errno === 1452)) {
      return res.status(400).json({
        success: false,
        message: 'Foreign key constraint failed: referenced organization not found. Run setup_local_authorities.sql or insert the organization record, or apply the migration to allow nullable org_id.',
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
 * Get all campaigns
 * GET /api/campaigns
 */
export async function getAllCampaigns(req, res) {
  let connection;
  try {
    connection = await db.getConnection();

    const query = `
      SELECT campaign_id, org_id, title, category, target_slum_area, 
             start_date, end_date, start_time, target_gender, age_group, 
             description, status, created_at, updated_at
      FROM campaigns
      ORDER BY created_at DESC
    `;

    const [campaigns] = await connection.execute(query);

    return res.status(200).json({
      success: true,
      data: campaigns
    });
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

/**
 * Get campaign by ID
 * GET /api/campaigns/:campaignId
 */
export async function getCampaignById(req, res) {
  let connection;
  try {
    const { campaignId } = req.params;
    connection = await db.getConnection();

    const query = `
      SELECT campaign_id, org_id, title, category, target_slum_area, 
             start_date, end_date, start_time, target_gender, age_group, 
             description, status, created_at, updated_at
      FROM campaigns
      WHERE campaign_id = ?
    `;

    const [results] = await connection.execute(query, [campaignId]);

    if (results.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: results[0]
    });
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

/**
 * Update campaign status
 * PUT /api/campaigns/:campaignId
 */
export async function updateCampaign(req, res) {
  let connection;
  try {
    const { campaignId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    connection = await db.getConnection();

    const query = `
      UPDATE campaigns
      SET status = ?, updated_at = NOW()
      WHERE campaign_id = ?
    `;

    const [result] = await connection.execute(query, [status, campaignId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Campaign updated successfully"
    });
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

/**
 * Delete campaign
 * DELETE /api/campaigns/:campaignId
 */
export async function deleteCampaign(req, res) {
  let connection;
  try {
    const { campaignId } = req.params;
    connection = await db.getConnection();

    const query = "DELETE FROM campaigns WHERE campaign_id = ?";

    const [result] = await connection.execute(query, [campaignId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Campaign deleted successfully"
    });
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
