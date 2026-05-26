const db = require("../config/db");
const bcrypt = require("bcrypt");

// ==========================================
// SYSTEM USERS
// ==========================================
exports.getUsers = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;

    const countRes = await db.query(
      `SELECT COUNT(*) FROM users WHERE company_id = $1`,
      [companyId],
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const { rows } = await db.query(
      `
      SELECT 
        u.id, u.full_name, u.email, u.role, u.is_active, u.created_at,
        COALESCE(json_agg(um.market_id) FILTER (WHERE um.market_id IS NOT NULL), '[]') as market_ids
      FROM users u
      LEFT JOIN user_markets um ON u.id = um.user_id
      WHERE u.company_id = $1
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET $3
    `,
      [companyId, limit, offset],
    );

    res.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    next(e);
  }
};

exports.createUser = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { full_name, email, password, role, market_ids } = req.body;
    const companyId = req.user.company_id;

    if (!full_name || !email || !password || !role) {
      return res.status(400).json({
        error: "Missing required fields (Name, Email, Password, Role)",
      });
    }

    await client.query("BEGIN");
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const userRes = await client.query(
      `INSERT INTO users (company_id, full_name, email, password_hash, role) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role, is_active`,
      [
        companyId,
        full_name.trim(),
        email.trim().toLowerCase(),
        password_hash,
        role,
      ],
    );
    const newUser = userRes.rows[0];

    if (
      role === "market_manager" &&
      Array.isArray(market_ids) &&
      market_ids.length > 0
    ) {
      for (const m_id of market_ids) {
        await client.query(
          `INSERT INTO user_markets (user_id, market_id) VALUES ($1, $2)`,
          [newUser.id, m_id],
        );
      }
    }

    await client.query("COMMIT");
    newUser.market_ids = role === "market_manager" ? market_ids : [];
    res.status(201).json(newUser);
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.code === "23505")
      return res
        .status(409)
        .json({ error: "A user with this email already exists." });
    next(e);
  } finally {
    client.release();
  }
};

exports.updateUser = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { full_name, email, role, is_active, password, market_ids } =
      req.body;
    const companyId = req.user.company_id;

    await client.query("BEGIN");
    let updateSql = `UPDATE users SET full_name = COALESCE($1, full_name), email = COALESCE($2, email), role = COALESCE($3, role), is_active = COALESCE($4, is_active), updated_at = CURRENT_TIMESTAMP`;
    let params = [
      full_name?.trim(),
      email?.trim().toLowerCase(),
      role,
      is_active,
    ];
    let paramIdx = 5;

    if (password && password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      updateSql += `, password_hash = $${paramIdx}`;
      params.push(password_hash);
      paramIdx++;
    }

    updateSql += ` WHERE id = $${paramIdx} AND company_id = $${paramIdx + 1} RETURNING id, full_name, email, role, is_active`;
    params.push(id, companyId);

    const userRes = await client.query(updateSql, params);
    if (!userRes.rows.length) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ error: "User not found or access denied." });
    }

    const updatedUser = userRes.rows[0];
    await client.query(`DELETE FROM user_markets WHERE user_id = $1`, [id]);

    if (
      role === "market_manager" &&
      Array.isArray(market_ids) &&
      market_ids.length > 0
    ) {
      for (const m_id of market_ids) {
        await client.query(
          `INSERT INTO user_markets (user_id, market_id) VALUES ($1, $2)`,
          [id, m_id],
        );
      }
    }

    await client.query("COMMIT");
    updatedUser.market_ids = role === "market_manager" ? market_ids : [];
    res.json(updatedUser);
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.code === "23505")
      return res
        .status(409)
        .json({ error: "A user with this email already exists." });
    next(e);
  } finally {
    client.release();
  }
};

// ==========================================
// MARKETS
// ==========================================
exports.getMarkets = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;

    const countRes = await db.query(
      `SELECT COUNT(*) FROM markets WHERE company_id = $1`,
      [companyId],
    );
    const total = parseInt(countRes.rows[0].count, 10);

    const { rows } = await db.query(
      `SELECT m.*, (SELECT COUNT(*) FROM stores WHERE market_id = m.id) as store_count
       FROM markets m 
       WHERE m.company_id = $1 ORDER BY m.name
       LIMIT $2 OFFSET $3`,
      [companyId, limit, offset],
    );

    res.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    next(e);
  }
};

exports.createMarket = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name)
      return res.status(400).json({ error: "Market name is required" });

    const { rows } = await db.query(
      `INSERT INTO markets (name, company_id) VALUES ($1, $2) RETURNING *`,
      [name.trim(), req.user.company_id],
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === "23505")
      return res.status(400).json({ error: "Market name already exists." });
    next(e);
  }
};

exports.updateMarket = async (req, res, next) => {
  try {
    const { name, is_active } = req.body;
    const { rows } = await db.query(
      `UPDATE markets SET name = COALESCE($1, name), is_active = COALESCE($2, is_active) 
       WHERE id = $3 AND company_id = $4 RETURNING *`,
      [
        name ? name.trim() : null,
        is_active,
        req.params.id,
        req.user.company_id,
      ],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Market not found." });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// ==========================================
// STORES
// ==========================================
exports.getStores = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { market_id } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;

    let whereClauses = ["s.company_id = $1"];
    let params = [companyId];

    if (market_id) {
      params.push(market_id);
      whereClauses.push(`s.market_id = $${params.length}`);
    }

    const countRes = await db.query(
      `SELECT COUNT(*) FROM stores s WHERE ${whereClauses.join(" AND ")}`,
      params,
    );
    const total = parseInt(countRes.rows[0].count, 10);

    params.push(limit, offset);
    const { rows } = await db.query(
      `SELECT s.*, m.name as market_name,
        (SELECT COUNT(*) FROM employees WHERE store_id = s.id) as employee_count
       FROM stores s JOIN markets m ON s.market_id = m.id
       WHERE ${whereClauses.join(" AND ")} ORDER BY m.name, s.name LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    res.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    next(e);
  }
};

exports.createStore = async (req, res, next) => {
  try {
    const { market_id, name, store_code } = req.body;
    if (!market_id || !name)
      return res
        .status(400)
        .json({ error: "Market ID and Store Name required" });

    const { rows } = await db.query(
      `INSERT INTO stores (market_id, company_id, name, store_code) VALUES ($1, $2, $3, $4) RETURNING *`,
      [market_id, req.user.company_id, name.trim(), store_code?.trim() || null],
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
};

exports.updateStore = async (req, res, next) => {
  try {
    const { name, store_code, is_active, market_id } = req.body;
    const { rows } = await db.query(
      `UPDATE stores SET name = COALESCE($1, name), store_code = COALESCE($2, store_code), 
       is_active = COALESCE($3, is_active), market_id = COALESCE($4, market_id)
       WHERE id = $5 AND company_id = $6 RETURNING *`,
      [
        name?.trim(),
        store_code?.trim(),
        is_active,
        market_id,
        req.params.id,
        req.user.company_id,
      ],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Store not found." });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// ==========================================
// EMPLOYEES
// ==========================================
// exports.getEmployees = async (req, res, next) => {
//   try {
//     const companyId = req.user.company_id;
//     const { market_id, store_id } = req.query;
//     const page = parseInt(req.query.page, 10) || 1;
//     const limit = parseInt(req.query.limit, 10) || 50;
//     const offset = (page - 1) * limit;

//     let whereClauses = ["e.company_id = $1"];
//     let params = [companyId];

//     if (market_id) {
//       params.push(market_id);
//       whereClauses.push(`s.market_id = $${params.length}`);
//     }
//     if (store_id) {
//       params.push(store_id);
//       whereClauses.push(`e.store_id = $${params.length}`);
//     }

//     const countRes = await db.query(
//       `SELECT COUNT(*) FROM employees e JOIN stores s ON e.store_id = s.id WHERE ${whereClauses.join(" AND ")}`,
//       params,
//     );
//     const total = parseInt(countRes.rows[0].count, 10);

//     params.push(limit, offset);
//     const { rows } = await db.query(
//       `SELECT e.*, s.name as store_name, m.name as market_name
//        FROM employees e
//        JOIN stores s ON e.store_id = s.id
//        JOIN markets m ON s.market_id = m.id
//        WHERE ${whereClauses.join(" AND ")}
//        ORDER BY e.is_active DESC, m.name, s.name, e.full_name
//        LIMIT $${params.length - 1} OFFSET $${params.length}`,
//       params,
//     );

//     res.json({
//       data: rows,
//       pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
//     });
//   } catch (e) {
//     next(e);
//   }
// };

exports.getEmployees = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const { market_id, store_id, missing_ntid } = req.query;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;

    let whereClauses = ["e.company_id = $1"];
    let params = [companyId];

    if (market_id) {
      params.push(parseInt(market_id, 10));
      whereClauses.push(`s.market_id = $${params.length}`);
    }
    if (store_id) {
      params.push(parseInt(store_id, 10));
      whereClauses.push(`e.store_id = $${params.length}`);
    }

    // 🔥 NEW: Filter for Missing NT IDs
    if (missing_ntid === "true") {
      whereClauses.push(
        `(e.ntid IS NULL OR TRIM(e.ntid) = '') AND e.is_active = true`,
      );
    }

    const countSql = `SELECT COUNT(*) as count FROM employees e JOIN stores s ON e.store_id = s.id WHERE ${whereClauses.join(" AND ")}`;
    const countRes = await db.query(countSql, params);
    const totalRecords = parseInt(countRes.rows[0].count, 10);

    // 🔥 NEW: Dedicated Metric query for the Red Action Card
    // This always counts missing NT IDs regardless of the toggle state, so the card number stays accurate
    let metricParams = [companyId];
    let metricWhere = [
      "e.company_id = $1",
      "(e.ntid IS NULL OR TRIM(e.ntid) = '')",
      "e.is_active = true",
    ];
    if (market_id) {
      metricParams.push(parseInt(market_id, 10));
      metricWhere.push(`s.market_id = $${metricParams.length}`);
    }
    const metricSql = `SELECT COUNT(*) as count FROM employees e JOIN stores s ON e.store_id = s.id WHERE ${metricWhere.join(" AND ")}`;
    const metricRes = await db.query(metricSql, metricParams);
    const missingNtidTotal = parseInt(metricRes.rows[0].count, 10);

    params.push(limit, offset);
    const sql = `
      SELECT e.*, s.name as store_name, m.name as market_name
      FROM employees e
      JOIN stores s ON e.store_id = s.id
      JOIN markets m ON s.market_id = m.id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY e.is_active DESC, m.name, s.name, e.full_name
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;
    const { rows } = await db.query(sql, params);

    res.json({
      data: rows,
      missing_ntid_count: missingNtidTotal, // Sends metric to the card
      pagination: {
        page,
        limit,
        total: totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (e) {
    next(e);
  }
};
exports.createEmployee = async (req, res, next) => {
  try {
    const { store_id, full_name, employee_code, ntid } = req.body;
    if (!store_id || !full_name)
      return res.status(400).json({ error: "Store ID and Name required" });

    const { rows } = await db.query(
      `INSERT INTO employees (store_id, company_id, full_name, employee_code, ntid) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [
        store_id,
        req.user.company_id,
        full_name.trim(),
        employee_code?.trim(),
        ntid?.trim(),
      ],
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
};

exports.updateEmployee = async (req, res, next) => {
  try {
    const { store_id, full_name, employee_code, ntid, is_active } = req.body;
    const { rows } = await db.query(
      `UPDATE employees SET store_id = COALESCE($1, store_id), full_name = COALESCE($2, full_name), 
       employee_code = COALESCE($3, employee_code), ntid = COALESCE($4, ntid), is_active = COALESCE($5, is_active)
       WHERE id = $6 AND company_id = $7 RETURNING *`,
      [
        store_id,
        full_name?.trim(),
        employee_code?.trim(),
        ntid?.trim(),
        is_active,
        req.params.id,
        req.user.company_id,
      ],
    );
    if (rows.length === 0)
      return res.status(404).json({ error: "Employee not found." });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};
