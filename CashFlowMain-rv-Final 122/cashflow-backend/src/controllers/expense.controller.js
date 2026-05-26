// src/controllers/expense.controller.js
const db = require("../config/db");
const { ROLES, hasGlobalAccess } = require("../middleware/rbac");

// --- 1. GET EXPENSES (The Relational Way) ---
exports.getExpenses = async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation

    const {
      market_id,
      store_id,
      date,
      date_from,
      date_to,
      category,
      status,
      audit_status,
      search,
      specific_dates,
    } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // 🔒 STRICT TENANT ISOLATION: Always start with the company_id
    let whereClauses = ["e.company_id = $1"];
    let params = [companyId];

    // 🛡️ MARKET ISOLATION GUARD 🛡️
    if (!hasGlobalAccess(req.user.role)) {
      params.push(req.user.market_ids);
      whereClauses.push(`e.market_id = ANY($${params.length}::int[])`);
    }

    if (market_id) {
      params.push(parseInt(market_id, 10));
      whereClauses.push(`e.market_id = $${params.length}`);
    }
    if (store_id) {
      params.push(parseInt(store_id, 10));
      whereClauses.push(`e.store_id = $${params.length}`);
    }
    if (category) {
      params.push(category.trim().toLowerCase());
      whereClauses.push(`LOWER(e.category) = $${params.length}`);
    }
    if (status) {
      params.push(status.trim().toLowerCase());
      whereClauses.push(`e.status = $${params.length}`);
    }
    if (audit_status) {
      params.push(audit_status.trim().toLowerCase());
      whereClauses.push(`e.audit_status = $${params.length}`);
    }

    if (date) {
      params.push(date);
      whereClauses.push(`e.expense_date = $${params.length}`);
    } else if (specific_dates) {
      const dateList = specific_dates.split(",").map((d) => d.trim());
      const placeholders = [];
      for (const d of dateList) {
        params.push(d);
        placeholders.push(`$${params.length}`);
      }
      whereClauses.push(`e.expense_date IN (${placeholders.join(",")})`);
    } else {
      if (date_from) {
        params.push(date_from);
        whereClauses.push(`e.expense_date >= $${params.length}`);
      }
      if (date_to) {
        params.push(date_to);
        whereClauses.push(`e.expense_date <= $${params.length}`);
      }
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      whereClauses.push(`(
        s.name ILIKE $${searchIdx} OR 
        m.name ILIKE $${searchIdx} OR 
        e.comment ILIKE $${searchIdx}
      )`);
    }

    const countSql = `
      SELECT 
        COUNT(*) as total_records, 
        COALESCE(SUM(e.amount), 0) as total_amount,
        ARRAY_AGG(DISTINCT TO_CHAR(e.expense_date, 'YYYY-MM-DD')) as available_dates
      FROM expenses e
      LEFT JOIN stores s ON e.store_id = s.id
      LEFT JOIN markets m ON e.market_id = m.id
      WHERE ${whereClauses.join(" AND ")}
    `;

    const { rows: countRows } = await db.query(countSql, params);
    const totalRecords = parseInt(countRows[0].total_records);
    const grandTotalAmount = parseFloat(countRows[0].total_amount);
    const availableDates = (countRows[0].available_dates || [])
      .filter(Boolean)
      .sort();

    params.push(limit, offset);

    const sql = `
      SELECT
        e.id, e.expense_date AS date, e.expense_date, m.name AS market, s.name AS store,
        u1.full_name AS managername, u2.full_name AS username, e.category, e.amount, 
        e.amount AS amount_numeric, e.upload_url, e.comment, e.comment AS notes, 
        e.status, e.reason, e.audit_status, u3.full_name AS audit_by
      FROM expenses e
      JOIN markets m ON e.market_id = m.id
      LEFT JOIN stores s ON e.store_id = s.id
      LEFT JOIN users u1 ON e.manager_user_id = u1.id
      LEFT JOIN users u2 ON e.submitted_by_user_id = u2.id
      LEFT JOIN users u3 ON e.audited_by_user_id = u3.id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY e.expense_date DESC, e.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const { rows } = await db.query(sql, params);

    return res.json({
      data: rows,
      summary: { totalAmount: grandTotalAmount, availableDates },
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (e) {
    next(e);
  }
};

// --- 2. CREATE EXPENSE ---
exports.createExpense = async (req, res, next) => {
  try {
    // 🔥 THE FIX: Extract 'status' and 'manager_user_id' from the frontend payload
    let {
      expensedate,
      market_id,
      store_id,
      category,
      amount,
      uploadurl,
      comment,
      status,
      manager_user_id,
    } = req.body;

    const companyId = req.user.company_id;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(expensedate))) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    // 🔥 THE FIX: Prioritize frontend override (for "Important" category), otherwise default to 'pending'
    const finalStatus = status === "approved" ? "approved" : "pending";

    const sql = `
      INSERT INTO expenses
      (company_id, expense_date, market_id, store_id, category, amount, upload_url, comment, status, submitted_by_user_id, manager_user_id)
      VALUES ($1, $2, $3, $4, $5, CAST(NULLIF($6,'') AS NUMERIC), $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const { rows } = await db.query(sql, [
      companyId,
      expensedate,
      market_id,
      store_id || null,
      category,
      amount,
      uploadurl,
      comment,
      finalStatus,
      req.user.userId,
      manager_user_id || null,
    ]);

    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === "23505")
      return res.status(409).json({ error: "Duplicate expense entry." });
    next(e);
  }
};

// --- IDOR SECURED STATUS UPDATES ---

exports.approveExpense = async (req, res, next) => {
  try {
    const sql = `UPDATE expenses SET status = 'approved', reason = $2 WHERE id = $1 AND company_id = $3 RETURNING *`;
    const { rows } = await db.query(sql, [
      req.params.id,
      req.body.reason || "",
      req.user.company_id,
    ]);
    if (!rows.length)
      return res.status(404).json({ error: "Not found or access denied" });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

exports.rejectExpense = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");

    const updateSql = `
      UPDATE expenses e SET status = 'rejected', reason = $2 WHERE e.id = $1 AND e.company_id = $3 
      RETURNING e.*, (SELECT name FROM stores WHERE id = e.store_id) as store_name
    `;
    const { rows } = await client.query(updateSql, [
      req.params.id,
      req.body.reason || "",
      req.user.company_id,
    ]);

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found or access denied" });
    }

    const item = rows[0];
    const message = `Expense of $${item.amount} for ${item.store_name || "store"} was rejected. Reason: ${req.body.reason}`;

    await client.query(
      `INSERT INTO notifications (company_id, market_id, store_id, message, type) VALUES ($1, $2, $3, $4, 'rejection')`,
      [req.user.company_id, item.market_id, item.store_id, message],
    );

    await client.query("COMMIT");
    res.json(item);
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
};

exports.auditExpense = async (req, res, next) => {
  try {
    const sql = `UPDATE expenses SET audit_status = 'audited', audited_by_user_id = $2 WHERE id = $1 AND company_id = $3 RETURNING *`;
    const { rows } = await db.query(sql, [
      req.params.id,
      req.user.userId,
      req.user.company_id,
    ]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};
