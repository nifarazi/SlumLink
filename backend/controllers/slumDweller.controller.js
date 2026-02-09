import pool from "../db.js";
import bcrypt from "bcrypt";
import { sendSMS, createVerificationMessage } from "../utils/sms.js";

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

// Check NID duplicate
export const checkNidDuplicate = async (req, res) => {
  try {
    const { nid } = req.body;

    // Validate NID input
    if (!nid) {
      return res.status(400).json({
        status: "error",
        message: "NID number is required."
      });
    }

    // Remove any spaces from NID for consistent checking
    const cleanNid = String(nid).replace(/\s+/g, '');

    // Check if NID already exists in database
    const [existingRows] = await pool.query(
      'SELECT COUNT(*) as count FROM slum_dwellers WHERE nid = ?',
      [cleanNid]
    );

    const isDuplicate = existingRows[0].count > 0;

    return res.json({
      status: "success",
      isDuplicate: isDuplicate,
      message: isDuplicate ? "NID already exists in the system" : "NID is available"
    });

  } catch (error) {
    console.error("NID Check Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while checking NID."
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
      (full_name, mobile, dob, gender, nid, education, occupation, income, area, district, division, family_members, password_hash, skills_1, skills_2, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
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
      password_hash,
      personal.skills_1 || 'None',
      personal.skills_2 || 'None'
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
          (slum_id, name, dob, gender, nid, education, job, income, mobile, marriage_certificate, skills_1, skills_2)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          certBuffer,
          spouse.skills_1 || 'None',
          spouse.skills_2 || 'None'
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
          (slum_id, name, dob, gender, education, job, income, preferred_job, birth_certificate, birth_certificate_number, skills_1, skills_2)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
          certBuffer,
          child.birthCertificateNumber || null,
          child.skills_1 || 'None',
          child.skills_2 || 'None'
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
      'SELECT id, slum_code, full_name, mobile, nid, gender, education, occupation, income, area, district, division, created_at FROM slum_dwellers WHERE status = ? ORDER BY created_at DESC',
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
      'SELECT id, slum_code, full_name, mobile, nid, gender, education, occupation, income, area, district, division, created_at FROM slum_dwellers WHERE status = ? ORDER BY created_at DESC',
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

    // Get slum dweller details including mobile number and slum_code
    const [dwellerRows] = await connection.query(
      'SELECT slum_code, mobile, full_name FROM slum_dwellers WHERE id = ? AND status = ?',
      [id, 'pending']
    );

    if (!dwellerRows || dwellerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ 
        status: "error", 
        message: "Resident not found or already processed." 
      });
    }

    const { slum_code: slumCode, mobile, full_name: fullName } = dwellerRows[0];

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

    console.log('✅ Approved slum dweller:', id, 'Slum Code:', slumCode);

    // Send SMS notification (don't fail the approval if SMS fails)
    if (mobile && slumCode) {
      try {
        const message = createVerificationMessage(slumCode);
        const smsSent = await sendSMS(mobile, message);
        if (smsSent) {
          console.log('📱 Verification SMS sent to:', mobile);
        } else {
          console.warn('⚠️ Failed to send verification SMS to:', mobile);
        }
      } catch (smsError) {
        console.error('❌ SMS sending error for user', fullName, ':', smsError.message);
      }
    } else {
      console.warn('⚠️ No mobile number or slum code found for SMS notification');
    }

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

// Update slum dweller personal information
export const updatePersonalInfo = async (req, res) => {
  try {
    const { slumId } = req.params;
    const updates = req.body;

    // Validate slumId
    if (!slumId) {
      return res.status(400).json({
        status: "error",
        message: "Slum ID is required."
      });
    }

    // Build dynamic update query
    const allowedFields = [
      'full_name', 'nid', 'dob', 'gender', 'education', 
      'occupation', 'income', 'area', 'district', 'division', 'family_members',
      'skills_1', 'skills_2'
    ];
    
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No valid fields to update."
      });
    }
    
    updateValues.push(slumId);
    
    const [result] = await pool.query(
      `UPDATE slum_dwellers SET ${updateFields.join(', ')} WHERE slum_code = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Slum dweller not found."
      });
    }
    
    return res.json({
      status: "success",
      message: "Personal information updated successfully"
    });
    
  } catch (error) {
    console.error("Update Personal Info Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while updating personal information."
    });
  }
};

// Update spouse information
export const updateSpouseInfo = async (req, res) => {
  try {
    const { slumId, spouseId } = req.params;
    const updates = req.body;

    // Validate required parameters
    if (!slumId || !spouseId) {
      return res.status(400).json({
        status: "error",
        message: "Slum ID and Spouse ID are required."
      });
    }

    // Build dynamic update query for spouse
    const allowedFields = [
      'name', 'dob', 'gender', 'nid', 'education', 
      'job', 'income', 'skills_1', 'skills_2'
    ];
    
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No valid fields to update."
      });
    }
    
    updateValues.push(spouseId, slumId);
    
    const [result] = await pool.query(
      `UPDATE spouses SET ${updateFields.join(', ')} WHERE id = ? AND slum_id = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Spouse not found."
      });
    }
    
    return res.json({
      status: "success",
      message: "Spouse information updated successfully"
    });
    
  } catch (error) {
    console.error("Update Spouse Info Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while updating spouse information."
    });
  }
};

// Update child information
export const updateChildInfo = async (req, res) => {
  try {
    const { slumId, childId } = req.params;
    const updates = req.body;

    // Validate required parameters
    if (!slumId || !childId) {
      return res.status(400).json({
        status: "error",
        message: "Slum ID and Child ID are required."
      });
    }

    // Build dynamic update query for child
    const allowedFields = [
      'name', 'dob', 'gender', 'education', 
      'job', 'income', 'preferred_job', 'skills_1', 'skills_2'
    ];
    
    const updateFields = [];
    const updateValues = [];
    
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key) && updates[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updates[key]);
      }
    });
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "No valid fields to update."
      });
    }
    
    updateValues.push(childId, slumId);
    
    const [result] = await pool.query(
      `UPDATE children SET ${updateFields.join(', ')} WHERE id = ? AND slum_id = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Child not found."
      });
    }
    
    return res.json({
      status: "success",
      message: "Child information updated successfully"
    });
    
  } catch (error) {
    console.error("Update Child Info Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while updating child information."
    });
  }
};

// In-memory storage for OTPs (In production, use Redis or database)
const otpStorage = new Map();

// Generate random 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP with expiry
function storeOTP(key, otp, expiryMinutes = 5) {
  const expiryTime = Date.now() + (expiryMinutes * 60 * 1000);
  otpStorage.set(key, { otp, expiryTime });
}

// Verify and consume OTP
function verifyOTP(key, providedOTP) {
  const otpData = otpStorage.get(key);
  if (!otpData) return false;
  
  if (Date.now() > otpData.expiryTime) {
    otpStorage.delete(key);
    return false;
  }
  
  if (otpData.otp === providedOTP) {
    otpStorage.delete(key);
    return true;
  }
  
  return false;
}

// Initialize phone number change process
export const initPhoneChange = async (req, res) => {
  try {
    const { slumCode } = req.body;

    if (!slumCode) {
      return res.status(400).json({
        status: "error",
        message: "Slum code is required."
      });
    }

    // Get current user's phone number
    const [dwellers] = await pool.query(
      'SELECT mobile FROM slum_dwellers WHERE slum_code = ? AND status = "accepted"',
      [slumCode]
    );

    if (dwellers.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found or not active."
      });
    }

    const currentPhone = dwellers[0].mobile;
    if (!currentPhone) {
      return res.status(400).json({
        status: "error",
        message: "No phone number registered for this account."
      });
    }

    // Generate OTP for current phone verification
    const otp = generateOTP();
    const otpKey = `phone_change_current_${slumCode}`;
    storeOTP(otpKey, otp);

    // Send OTP to current phone
    const message = `Your SlumLink phone change verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    const smsSent = await sendSMS(currentPhone, message);

    if (!smsSent) {
      return res.status(500).json({
        status: "error",
        message: "Failed to send OTP. Please try again."
      });
    }

    return res.json({
      status: "success",
      message: "OTP sent to your current phone number",
      maskedPhone: currentPhone.replace(/(.{3})(.*)(.{4})/, '$1****$3')
    });

  } catch (error) {
    console.error("Init Phone Change Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while initiating phone change."
    });
  }
};

// Verify current phone OTP
export const verifyCurrentPhone = async (req, res) => {
  try {
    const { slumCode, otp } = req.body;

    if (!slumCode || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Slum code and OTP are required."
      });
    }

    const otpKey = `phone_change_current_${slumCode}`;
    const isValid = verifyOTP(otpKey, otp);

    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP."
      });
    }

    // Store verification status for new phone step
    const verifiedKey = `phone_change_verified_${slumCode}`;
    storeOTP(verifiedKey, "verified", 10); // 10 minutes to complete process

    return res.json({
      status: "success",
      message: "Current phone verified successfully"
    });

  } catch (error) {
    console.error("Verify Current Phone Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while verifying current phone."
    });
  }
};

// Send OTP to new phone number
export const sendNewPhoneOTP = async (req, res) => {
  try {
    const { slumCode, newPhone } = req.body;

    if (!slumCode || !newPhone) {
      return res.status(400).json({
        status: "error",
        message: "Slum code and new phone number are required."
      });
    }

    // Validate phone number format (11 digits)
    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(newPhone)) {
      return res.status(400).json({
        status: "error",
        message: "Phone number must be exactly 11 digits."
      });
    }

    // Check if user has verified current phone
    const verifiedKey = `phone_change_verified_${slumCode}`;
    const verifiedData = otpStorage.get(verifiedKey);
    if (!verifiedData || Date.now() > verifiedData.expiryTime) {
      return res.status(400).json({
        status: "error",
        message: "Current phone verification expired. Please start over."
      });
    }

    // Check if new phone is already registered
    const [existingUsers] = await pool.query(
      'SELECT COUNT(*) as count FROM slum_dwellers WHERE mobile = ? AND slum_code != ?',
      [newPhone, slumCode]
    );

    if (existingUsers[0].count > 0) {
      return res.status(400).json({
        status: "error",
        message: "This phone number is already registered with another account."
      });
    }

    // Generate OTP for new phone
    const otp = generateOTP();
    const otpKey = `phone_change_new_${slumCode}_${newPhone}`;
    storeOTP(otpKey, otp);

    // Send OTP to new phone
    const message = `Your SlumLink new phone verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    const smsSent = await sendSMS(newPhone, message);

    if (!smsSent) {
      return res.status(500).json({
        status: "error",
        message: "Failed to send OTP to new phone. Please try again."
      });
    }

    return res.json({
      status: "success",
      message: "OTP sent to your new phone number",
      maskedPhone: newPhone.replace(/(.{3})(.*)(.{4})/, '$1****$3')
    });

  } catch (error) {
    console.error("Send New Phone OTP Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while sending OTP to new phone."
    });
  }
};

// Verify new phone and update database
export const verifyNewPhoneAndUpdate = async (req, res) => {
  try {
    const { slumCode, newPhone, otp } = req.body;

    if (!slumCode || !newPhone || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Slum code, new phone number, and OTP are required."
      });
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(newPhone)) {
      return res.status(400).json({
        status: "error",
        message: "Phone number must be exactly 11 digits."
      });
    }

    const otpKey = `phone_change_new_${slumCode}_${newPhone}`;
    const isValid = verifyOTP(otpKey, otp);

    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP."
      });
    }

    // Update phone number in database
    const [result] = await pool.query(
      'UPDATE slum_dwellers SET mobile = ? WHERE slum_code = ?',
      [newPhone, slumCode]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found."
      });
    }

    // Clean up verification status
    const verifiedKey = `phone_change_verified_${slumCode}`;
    otpStorage.delete(verifiedKey);

    return res.json({
      status: "success",
      message: "Phone number updated successfully"
    });

  } catch (error) {
    console.error("Verify New Phone Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while updating phone number."
    });
  }
};

// ===================
// SPOUSE PHONE NUMBER CHANGE FUNCTIONS
// ===================

// Initialize spouse phone number change process
export const initSpousePhoneChange = async (req, res) => {
  try {
    const { slumCode, spouseId } = req.body;

    if (!slumCode || !spouseId) {
      return res.status(400).json({
        status: "error",
        message: "Slum code and spouse ID are required."
      });
    }

    // Get spouse's current phone number
    const [spouses] = await pool.query(
      'SELECT mobile FROM spouses WHERE id = ? AND slum_id = ? AND status = "active"',
      [spouseId, slumCode]
    );

    if (spouses.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Spouse not found or not active."
      });
    }

    const currentPhone = spouses[0].mobile;
    if (!currentPhone) {
      return res.status(400).json({
        status: "error",
        message: "No phone number registered for this spouse."
      });
    }

    // Generate OTP for current phone verification
    const otp = generateOTP();
    const otpKey = `spouse_phone_change_current_${slumCode}_${spouseId}`;
    storeOTP(otpKey, otp);

    // Send OTP to current phone
    const message = `Your SlumLink spouse phone change verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    const smsSent = await sendSMS(currentPhone, message);

    if (!smsSent) {
      return res.status(500).json({
        status: "error",
        message: "Failed to send OTP. Please try again."
      });
    }

    return res.json({
      status: "success",
      message: "OTP sent to current phone number",
      maskedPhone: currentPhone.replace(/(.{3})(.*)(.{4})/, '$1****$3')
    });

  } catch (error) {
    console.error("Init Spouse Phone Change Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while initiating spouse phone change."
    });
  }
};

// Verify spouse current phone OTP
export const verifySpouseCurrentPhone = async (req, res) => {
  try {
    const { slumCode, spouseId, otp } = req.body;

    if (!slumCode || !spouseId || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Slum code, spouse ID, and OTP are required."
      });
    }

    const otpKey = `spouse_phone_change_current_${slumCode}_${spouseId}`;
    const isValid = verifyOTP(otpKey, otp);

    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP."
      });
    }

    // Store verification status for new phone step
    const verifiedKey = `spouse_phone_change_verified_${slumCode}_${spouseId}`;
    storeOTP(verifiedKey, "verified", 10); // 10 minutes to complete process

    return res.json({
      status: "success",
      message: "Current phone verified successfully"
    });

  } catch (error) {
    console.error("Verify Spouse Current Phone Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while verifying current phone."
    });
  }
};

// Send OTP to spouse new phone number
export const sendSpouseNewPhoneOTP = async (req, res) => {
  try {
    const { slumCode, spouseId, newPhone } = req.body;

    if (!slumCode || !spouseId || !newPhone) {
      return res.status(400).json({
        status: "error",
        message: "Slum code, spouse ID, and new phone number are required."
      });
    }

    // Validate phone number format (11 digits)
    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(newPhone)) {
      return res.status(400).json({
        status: "error",
        message: "Phone number must be exactly 11 digits."
      });
    }

    // Check if spouse has verified current phone
    const verifiedKey = `spouse_phone_change_verified_${slumCode}_${spouseId}`;
    const verifiedData = otpStorage.get(verifiedKey);
    if (!verifiedData || Date.now() > verifiedData.expiryTime) {
      return res.status(400).json({
        status: "error",
        message: "Current phone verification expired. Please start over."
      });
    }

    // Check if new phone is already registered (for any slum dweller or spouse)
    const [existingDwellers] = await pool.query(
      'SELECT COUNT(*) as count FROM slum_dwellers WHERE mobile = ?',
      [newPhone]
    );
    
    const [existingSpouses] = await pool.query(
      'SELECT COUNT(*) as count FROM spouses WHERE mobile = ? AND NOT (slum_id = ? AND id = ?)',
      [newPhone, slumCode, spouseId]
    );

    if (existingDwellers[0].count > 0 || existingSpouses[0].count > 0) {
      return res.status(400).json({
        status: "error",
        message: "This phone number is already registered with another account."
      });
    }

    // Generate OTP for new phone
    const otp = generateOTP();
    const otpKey = `spouse_phone_change_new_${slumCode}_${spouseId}_${newPhone}`;
    storeOTP(otpKey, otp);

    // Send OTP to new phone
    const message = `Your SlumLink new spouse phone verification code is: ${otp}. Valid for 5 minutes. Do not share this code with anyone.`;
    const smsSent = await sendSMS(newPhone, message);

    if (!smsSent) {
      return res.status(500).json({
        status: "error",
        message: "Failed to send OTP to new phone. Please try again."
      });
    }

    return res.json({
      status: "success",
      message: "OTP sent to your new phone number",
      maskedPhone: newPhone.replace(/(.{3})(.*)(.{4})/, '$1****$3')
    });

  } catch (error) {
    console.error("Send Spouse New Phone OTP Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while sending OTP to new phone."
    });
  }
};

// Verify spouse new phone and update database
export const verifySpouseNewPhoneAndUpdate = async (req, res) => {
  try {
    const { slumCode, spouseId, newPhone, otp } = req.body;

    if (!slumCode || !spouseId || !newPhone || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Slum code, spouse ID, new phone number, and OTP are required."
      });
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(newPhone)) {
      return res.status(400).json({
        status: "error",
        message: "Phone number must be exactly 11 digits."
      });
    }

    const otpKey = `spouse_phone_change_new_${slumCode}_${spouseId}_${newPhone}`;
    const isValid = verifyOTP(otpKey, otp);

    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP."
      });
    }

    // Update spouse phone number in database
    const [result] = await pool.query(
      'UPDATE spouses SET mobile = ? WHERE id = ? AND slum_id = ?',
      [newPhone, spouseId, slumCode]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "Spouse not found."
      });
    }

    // Clean up verification status
    const verifiedKey = `spouse_phone_change_verified_${slumCode}_${spouseId}`;
    otpStorage.delete(verifiedKey);

    return res.json({
      status: "success",
      message: "Spouse phone number updated successfully"
    });

  } catch (error) {
    console.error("Verify Spouse New Phone Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while updating spouse phone number."
    });
  }
};

// Change password for slum dweller
export const changePassword = async (req, res) => {
  try {
    const { slumCode } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!slumCode || !currentPassword || !newPassword) {
      return res.status(400).json({
        status: "error",
        message: "Slum code, current password, and new password are required."
      });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "New password must be at least 6 characters long."
      });
    }

    // Check if new password is same as current password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        status: "error",
        message: "New password must be different from current password."
      });
    }

    // Get the slum dweller profile from database
    const [residents] = await pool.query(
      'SELECT id, slum_code, password_hash FROM slum_dwellers WHERE slum_code = ? AND status = ?',
      [slumCode, 'accepted']
    );
    
    if (residents.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Slum dweller not found or account not approved."
      });
    }

    const resident = residents[0];

    // Verify current password using bcrypt
    const passwordMatch = await bcrypt.compare(currentPassword, resident.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({
        status: "error",
        message: "Current password is incorrect."
      });
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    const [result] = await pool.query(
      'UPDATE slum_dwellers SET password_hash = ?, updated_at = NOW() WHERE slum_code = ?',
      [hashedNewPassword, slumCode]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({
        status: "error",
        message: "Failed to update password."
      });
    }

    console.log(`Password changed successfully for slum dweller: ${slumCode}`);

    return res.status(200).json({
      status: "success",
      message: "Password changed successfully."
    });

  } catch (error) {
    console.error("Change Password Error:", error);
    return res.status(500).json({
      status: "error",
      message: "Server error while changing password."
    });
  }
};
