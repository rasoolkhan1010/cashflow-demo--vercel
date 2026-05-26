// const bcrypt = require("bcrypt");
// const jwt = require("jsonwebtoken");
// const db = require("../config/db");

// // 🔥 FIXED: Declared as a local constant instead of exports.registerCompany
// const registerCompany = async (req, res, next) => {
//   const client = await db.pool.connect();
//   try {
//     const { company_name, full_name, email, password } = req.body;

//     if (!company_name || !full_name || !email || !password) {
//       return res.status(400).json({ error: "All fields are required." });
//     }

//     await client.query("BEGIN");

//     // 1. Create the Company
//     const companyRes = await client.query(
//       `INSERT INTO companies (name) VALUES ($1) RETURNING id`,
//       [company_name.trim()],
//     );
//     const newCompanyId = companyRes.rows[0].id;

//     // 2. Hash Password
//     const salt = await bcrypt.genSalt(10);
//     const password_hash = await bcrypt.hash(password, salt);

//     // 3. Create the Super Admin User for this Company
//     await client.query(
//       `INSERT INTO users (company_id, full_name, email, password_hash, role)
//        VALUES ($1, $2, $3, $4, 'super_admin')`,
//       [
//         newCompanyId,
//         full_name.trim(),
//         email.trim().toLowerCase(),
//         password_hash,
//       ],
//     );

//     await client.query("COMMIT");
//     res.status(201).json({ message: "Company registered successfully." });
//   } catch (e) {
//     await client.query("ROLLBACK");
//     if (e.code === "23505") {
//       // 23505 is PostgreSQL unique violation
//       if (e.constraint === "companies_name_key") {
//         return res
//           .status(409)
//           .json({ error: "A company with this name already exists." });
//       }
//       if (e.constraint === "users_email_key") {
//         return res.status(409).json({ error: "This email is already in use." });
//       }
//     }
//     next(e);
//   } finally {
//     client.release();
//   }
// };

// const login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ error: "Email and password are required" });
//     }

//     // 1. Find user AND their assigned market IDs
//     // We use a subquery with array_agg to bundle all assigned market_ids into a single array
//     const userQuery = `
//       SELECT
//         u.*,
//         COALESCE(
//           (SELECT array_agg(market_id) FROM public.user_markets WHERE user_id = u.id),
//           '{}'::int[]
//         ) as market_ids
//       FROM public.users u
//       WHERE u.email = $1 AND u.is_active = true
//     `;

//     const { rows } = await db.query(userQuery, [email]);

//     if (rows.length === 0) {
//       return res.status(401).json({ error: "Invalid credentials" });
//     }

//     const user = rows[0];

//     // 2. Verify password
//     const validPassword = await bcrypt.compare(password, user.password_hash);
//     if (!validPassword) {
//       return res.status(401).json({ error: "Invalid credentials" });
//     }

//     // 3. Generate JWT Token
//     // 🔒 Tenant Isolation: Injecting company_id directly into the token payload
//     const tokenPayload = {
//       userId: user.id,
//       email: user.email,
//       role: user.role,
//       market_ids: user.market_ids,
//       company_id: user.company_id,
//     };

//     const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
//       expiresIn: "7d",
//     });

//     res.json({
//       message: "Login successful",
//       token,
//       user: {
//         id: user.id,
//         fullName: user.full_name,
//         email: user.email,
//         role: user.role,
//         market_ids: user.market_ids,
//         company_id: user.company_id,
//       },
//     });
//   } catch (error) {
//     console.error("Login Error:", error);
//     res.status(500).json({ error: "Internal server error during login" });
//   }
// };

// module.exports = { login, registerCompany };
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../config/db");

const registerCompany = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { company_name, full_name, email, password } = req.body;

    if (!company_name || !full_name || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    await client.query("BEGIN");

    // 1. Create the Company
    const companyRes = await client.query(
      `INSERT INTO companies (name) VALUES ($1) RETURNING id`,
      [company_name.trim()],
    );
    const newCompanyId = companyRes.rows[0].id;

    // 2. Hash Password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // 3. Create the Super Admin User for this Company
    await client.query(
      `INSERT INTO users (company_id, full_name, email, password_hash, role) 
       VALUES ($1, $2, $3, $4, 'super_admin')`,
      [
        newCompanyId,
        full_name.trim(),
        email.trim().toLowerCase(),
        password_hash,
      ],
    );

    await client.query("COMMIT");
    res.status(201).json({ message: "Company registered successfully." });
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.code === "23505") {
      // 23505 is PostgreSQL unique violation
      if (e.constraint === "companies_name_key") {
        return res
          .status(409)
          .json({ error: "A company with this name already exists." });
      }
      if (e.constraint === "users_email_key") {
        return res.status(409).json({ error: "This email is already in use." });
      }
    }
    next(e);
  } finally {
    client.release();
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // 1. Find user, their market IDs, AND the company name via a JOIN
    const userQuery = `
      SELECT 
        u.*,
        c.name AS company_name, -- 🔥 JOIN fetches the actual company name
        COALESCE(
          (SELECT array_agg(market_id) FROM public.user_markets WHERE user_id = u.id), 
          '{}'::int[]
        ) as market_ids
      FROM public.users u 
      LEFT JOIN public.companies c ON u.company_id = c.id
      WHERE u.email = $1 AND u.is_active = true
    `;

    const { rows } = await db.query(userQuery, [email]);

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = rows[0];

    // 2. Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // 3. Generate JWT Token
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      market_ids: user.market_ids,
      company_id: user.company_id,
      companyName: user.company_name, // 🔥 Injects company name into the Token
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        market_ids: user.market_ids,
        company_id: user.company_id,
        companyName: user.company_name, // 🔥 Sends company name to the frontend AuthContext
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
};

module.exports = { login, registerCompany };
