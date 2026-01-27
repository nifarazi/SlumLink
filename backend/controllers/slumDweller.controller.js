import pool from "../db.js";
import bcrypt from "bcrypt";

// Signin controller for slum dwellers using slum_code and password
export const signinSlumDweller = async (req, res) => {
  try {
    const { slum_code, password } = req.body;

    // Validate required fields
    if (!slum_code || !password) {
      return res.status(400).json({
        status: "error",
        message: "Please provide both slum code and password."
      });
    }

    // Query slum dweller by slum_code
    const [dwellers] = await pool.query(
      'SELECT id, slum_code, password_hash, full_name, mobile, status FROM slum_dwellers WHERE slum_code = ?',
      [slum_code]
    );

    // Check if user exists
    if (dwellers.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid slum code or password"
      });
    }

    const dweller = dwellers[0];

    // Check if account is accepted/active
    if (dweller.status !== 'accepted') {
      return res.status(403).json({
        status: "error",
        message: `Your account is ${dweller.status}. Please wait for admin approval.`
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, dweller.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        status: "error",
        message: "Invalid slum code or password"
      });
    }

    // Successful authentication
    return res.json({
      status: "success",
      message: "Sign in successful",
      data: {
        id: dweller.id,
        slum_code: dweller.slum_code,
        full_name: dweller.full_name,
        mobile: dweller.mobile
      }
    });

  } catch (error) {
    console.error("Slum Dweller Signin Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while signing in."
    });
  }
};

// Helper function to convert Data URL to Buffer for BLOB storage
function dataUrlToBuffer(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    return null;
  }
  
  try {
    // Data URL format: data:mime/type;base64,<base64data>
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) return null;
    return Buffer.from(base64Data, 'base64');
  } catch (error) {
    console.error('Error converting Data URL to Buffer:', error);
    return null;
  }
}

export const registerSlumDweller = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    const { personal, spouses, children } = req.body;

    console.log('📝 Registration request received:', { 
      personal: personal?.name, 
      spousesCount: spouses?.length, 
      childrenCount: children?.length 
    });

    // Validate required fields
    if (!personal || !personal.name || !personal.mobile || !personal.password) {
      console.error('❌ Validation failed:', { personal });
      return res.status(400).json({ 
        status: "error", 
        message: "Missing required personal information." 
      });
    }

    await connection.beginTransaction();

    // Hash password
    const password_hash = await bcrypt.hash(personal.password, 10);

    // Insert into slum_dwellers table
    const dwellerSql = `
      INSERT INTO slum_dwellers 
      (full_name, mobile, dob, gender, nid, education, occupation, income, area, district, division, family_members, password_hash, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `;

    const dwellerValues = [
      personal.name,
      personal.mobile,
      personal.dob || null,
      personal.gender || null,
      personal.nid || null,
      personal.education || null,
      personal.occupation || null,
      personal.income || null,
      personal.area || null,
      personal.district || null,
      personal.division || null,
      personal.members || 0,
      password_hash
    ];

    const [dwellerResult] = await connection.query(dwellerSql, dwellerValues);
    const slumDwellerId = dwellerResult.insertId;

    // The trigger will auto-generate slum_code after insert
    // Retrieve the generated slum_code
    const [dwellerRow] = await connection.query(
      'SELECT slum_code FROM slum_dwellers WHERE id = ?',
      [slumDwellerId]
    );
    const slumCode = dwellerRow[0]?.slum_code;

    // Insert spouses if any
    if (spouses && Array.isArray(spouses) && spouses.length > 0) {
      for (const spouse of spouses) {
        // Convert marriage certificate Data URL to Buffer
        const certBuffer = dataUrlToBuffer(spouse.marriageCertificate);
        
        const spouseSql = `
          INSERT INTO spouses 
          (slum_id, name, dob, gender, nid, education, job, income, mobile, marriage_certificate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const spouseValues = [
          slumCode,
          spouse.name,
          spouse.dob || null,
          spouse.gender || null,
          spouse.nid || null,
          spouse.education || null,
          spouse.occupation || null,
          spouse.income || null,
          spouse.mobile || null,
          certBuffer
        ];
        await connection.query(spouseSql, spouseValues);
      }
    }

    // Insert children if any
    if (children && Array.isArray(children) && children.length > 0) {
      for (const child of children) {
        // Convert birth certificate Data URL to Buffer
        const certBuffer = dataUrlToBuffer(child.birthCertificate);
        
        const childSql = `
          INSERT INTO children 
          (slum_id, name, dob, gender, education, job, income, preferred_job, birth_certificate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const childValues = [
          slumCode,
          child.name,
          child.dob || null,
          child.gender || null,
          child.education || null,
          child.job || null,
          child.income || null,
          child.preferredJob || null,
          certBuffer
        ];
        await connection.query(childSql, childValues);

        // Also insert birth certificate as a document if it exists
        if (certBuffer) {
          const mimetypeMatch = child.birthCertificate?.match(/^data:([^;]+)/) || [];
          const mimetype = mimetypeMatch[1] || 'application/octet-stream';
          
          const docSql = `
            INSERT INTO documents 
            (slum_id, document_type, document_title, file_blob, file_mimetype, file_size, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
          `;
          const docValues = [
            slumCode,
            'Birth Certificate',
            `${child.name} - Birth Certificate`,
            certBuffer,
            mimetype,
            certBuffer.length
          ];
          await connection.query(docSql, docValues);
          console.log('📄 Birth certificate uploaded for child:', child.name);
        }
      }
    }

    // Also insert marriage certificates as documents
    if (spouses && Array.isArray(spouses) && spouses.length > 0) {
      for (let idx = 0; idx < spouses.length; idx++) {
        const spouse = spouses[idx];
        const certBuffer = dataUrlToBuffer(spouse.marriageCertificate);
        if (certBuffer) {
          const mimetypeMatch = spouse.marriageCertificate?.match(/^data:([^;]+)/) || [];
          const mimetype = mimetypeMatch[1] || 'application/octet-stream';
          
          const docSql = `
            INSERT INTO documents 
            (slum_id, document_type, document_title, file_blob, file_mimetype, file_size, status)
            VALUES (?, ?, ?, ?, ?, ?, 'pending')
          `;
          const docValues = [
            slumCode,
            'Marriage Certificate',
            `${spouse.name} - Marriage Certificate`,
            certBuffer,
            mimetype,
            certBuffer.length
          ];
          await connection.query(docSql, docValues);
          console.log('📄 Marriage certificate uploaded for spouse:', spouse.name);
        }
      }
    }

    await connection.commit();

    console.log('✅ Registration successful:', { slum_code: slumCode, id: slumDwellerId });

    return res.json({
      status: "success",
      message: "Registration submitted successfully. Your application is pending approval.",
      slum_code: slumCode,
      id: slumDwellerId
    });

  } catch (error) {
    await connection.rollback();
    console.error("❌ Registration error:", error);
    console.error("Error stack:", error.stack);
    return res.status(500).json({ 
      status: "error", 
      message: "Registration failed. Please try again.",
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// Get all pending slum dwellers
export const getPendingSlumDwellers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, slum_code, full_name, mobile, gender, education, occupation, income, area, district, division, created_at FROM slum_dwellers WHERE status = ? ORDER BY created_at DESC',
      ['pending']
    );
    
    console.log('📋 Retrieved pending slum dwellers:', rows.length);
    return res.json({
      status: "success",
      data: rows || []
    });
  } catch (error) {
    console.error("❌ Error fetching pending slum dwellers:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Failed to fetch pending accounts.",
      error: error.message 
    });
  }
};

// Get all active slum dwellers
export const getActiveSlumDwellers = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, slum_code, full_name, mobile, gender, education, occupation, income, area, district, division, created_at FROM slum_dwellers WHERE status = ? ORDER BY created_at DESC',
      ['accepted']
    );
    
    console.log('📋 Retrieved active slum dwellers:', rows.length);
    return res.json({
      status: "success",
      data: rows || []
    });
  } catch (error) {
    console.error("❌ Error fetching active slum dwellers:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Failed to fetch active accounts.",
      error: error.message 
    });
  }
};

// Get single slum dweller with spouse and children
export const getSlumDwellerById = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  
  try {
    // Get main resident info
    const [dwellerRows] = await connection.query(
      'SELECT * FROM slum_dwellers WHERE id = ?',
      [id]
    );

    if (!dwellerRows || dwellerRows.length === 0) {
      return res.status(404).json({ 
        status: "error", 
        message: "Resident not found." 
      });
    }

    const resident = dwellerRows[0];
    const slumCode = resident.slum_code;

    // Get spouses
    const [spouseRows] = await connection.query(
      'SELECT * FROM spouses WHERE slum_id = ?',
      [slumCode]
    );

    // Get children
    const [childrenRows] = await connection.query(
      'SELECT * FROM children WHERE slum_id = ?',
      [slumCode]
    );

    console.log('👤 Retrieved resident:', resident.full_name);

    return res.json({
      status: "success",
      data: {
        resident,
        spouses: spouseRows || [],
        children: childrenRows || []
      }
    });
  } catch (error) {
    console.error("❌ Error fetching resident:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Failed to fetch resident details.",
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// Approve pending slum dweller (change status to 'accepted')
export const approveSlumDweller = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get slum_code first
    const [dwellerRows] = await connection.query(
      'SELECT slum_code FROM slum_dwellers WHERE id = ?',
      [id]
    );

    if (!dwellerRows || dwellerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        status: "error", 
        message: "Resident not found." 
      });
    }

    const slumCode = dwellerRows[0].slum_code;

    // Update slum_dweller status to 'accepted'
    await connection.query(
      'UPDATE slum_dwellers SET status = ? WHERE id = ?',
      ['accepted', id]
    );

    // Update all spouses status to 'active'
    await connection.query(
      'UPDATE spouses SET status = ? WHERE slum_id = ?',
      ['active', slumCode]
    );

    // Update all children status to 'active'
    await connection.query(
      'UPDATE children SET status = ? WHERE slum_id = ?',
      ['active', slumCode]
    );

    await connection.commit();

    console.log('✅ Approved slum dweller:', id);

    return res.json({
      status: "success",
      message: "Account approved successfully."
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error approving slum dweller:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Failed to approve account.",
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// Reject/Delete slum dweller
export const rejectSlumDweller = async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Get slum_code first
    const [dwellerRows] = await connection.query(
      'SELECT slum_code FROM slum_dwellers WHERE id = ?',
      [id]
    );

    if (!dwellerRows || dwellerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        status: "error", 
        message: "Resident not found." 
      });
    }

    const slumCode = dwellerRows[0].slum_code;

    // Delete spouses first (due to foreign key)
    await connection.query(
      'DELETE FROM spouses WHERE slum_id = ?',
      [slumCode]
    );

    // Delete children (due to foreign key)
    await connection.query(
      'DELETE FROM children WHERE slum_id = ?',
      [slumCode]
    );

    // Delete slum_dweller
    await connection.query(
      'DELETE FROM slum_dwellers WHERE id = ?',
      [id]
    );

    await connection.commit();

    console.log('✅ Rejected/deleted slum dweller:', id);

    return res.json({
      status: "success",
      message: "Account rejected and deleted successfully."
    });
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error rejecting slum dweller:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Failed to reject account.",
      error: error.message 
    });
  } finally {
    connection.release();
  }
};

// Get current user's profile (for dashboard)
export const getCurrentUserProfile = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get main resident info (basic fields for dashboard)
    const [dwellerRows] = await pool.query(
      'SELECT id, slum_code, full_name, mobile, status FROM slum_dwellers WHERE id = ? AND status = ?',
      [id, 'accepted']
    );

    if (!dwellerRows || dwellerRows.length === 0) {
      return res.status(404).json({ 
        status: "error", 
        message: "User not found or account not active." 
      });
    }

    const user = dwellerRows[0];

    console.log('👤 Retrieved user profile for dashboard:', user.full_name);

    return res.json({
      status: "success",
      data: {
        id: user.id,
        slum_code: user.slum_code,
        full_name: user.full_name,
        mobile: user.mobile
      }
    });
  } catch (error) {
    console.error("❌ Error fetching user profile:", error);
    return res.status(500).json({ 
      status: "error", 
      message: "Failed to fetch user profile.",
      error: error.message 
    });
  }
};
