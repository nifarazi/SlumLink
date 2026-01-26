import pool from "../db.js";
import bcrypt from "bcrypt";

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
