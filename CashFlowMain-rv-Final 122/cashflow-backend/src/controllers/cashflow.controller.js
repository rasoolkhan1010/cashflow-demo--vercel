// src/controllers/cashflow.controller.js
const db = require("../config/db");
const { ROLES, hasGlobalAccess } = require("../middleware/rbac");

// --- 1. GET PREVIOUS BALANCE & CHECK AUDIT LOCK ---
exports.getPreviousBalance = async (req, res, next) => {
  try {
    const { store_id } = req.query;
    const companyId = req.user.company_id;

    if (!store_id)
      return res.status(400).json({ error: "store_id is required" });

    // Grab the absolute latest record for this store
    const sql = `
      SELECT total_bal, audit_status, date 
      FROM store_tills 
      WHERE company_id = $1 AND store_id = $2
      ORDER BY date DESC, id DESC 
      LIMIT 1
    `;

    const { rows } = await db.query(sql, [companyId, store_id]);

    if (rows.length > 0) {
      const lastTill = rows[0];
      // 🔥 BLOCKER: If the last till isn't audited, send a flag to lock the frontend
      if (lastTill.audit_status === "pending") {
        return res.json({
          is_locked: true,
          locked_date: lastTill.date,
          carry_forward_bal: 0,
        });
      }
      return res.json({
        is_locked: false,
        carry_forward_bal: Number(lastTill.total_bal),
      });
    }

    // No previous records found
    res.json({ is_locked: false, carry_forward_bal: 0 });
  } catch (e) {
    next(e);
  }
};

// --- 2. GET ALL TILL RECORDS (HISTORY) ---
exports.getCashflow = async (req, res, next) => {
  try {
    const companyId = req.user.company_id;
    const store_id = req.query.store_id || req.query.store;
    const market_id = req.query.market_id || req.query.market;
    const { date_from, date_to } = req.query;

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;

    let whereClauses = ["t.company_id = $1"];
    let params = [companyId];

    if (!hasGlobalAccess(req.user.role)) {
      params.push(req.user.market_ids);
      whereClauses.push(`t.market_id = ANY($${params.length}::int[])`);
    }

    if (market_id && market_id !== "undefined") {
      params.push(parseInt(market_id, 10));
      whereClauses.push(`t.market_id = $${params.length}`);
    }

    if (store_id && store_id !== "undefined") {
      params.push(parseInt(store_id, 10));
      whereClauses.push(`t.store_id = $${params.length}`);
    }

    if (date_from) {
      params.push(date_from);
      whereClauses.push(`t.date >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      whereClauses.push(`t.date <= $${params.length}`);
    }

    const countSql = `SELECT COUNT(*) as total_records FROM store_tills t WHERE ${whereClauses.join(" AND ")}`;
    const { rows: countRows } = await db.query(countSql, params);
    const totalRecords = parseInt(countRows[0].total_records, 10);

    params.push(limit, offset);

    // 🔥 Added audit_status and JOIN for the auditor's name
    const sql = `
      SELECT 
        t.id, t.date, m.name AS market, s.name AS store,
        t.carry_forward_bal, t.till_entry, t.spent_amount, t.total_bal, t.reason_for_spending,
        t.audit_status, u.full_name AS audit_by
      FROM store_tills t
      JOIN markets m ON t.market_id = m.id
      JOIN stores s ON t.store_id = s.id
      LEFT JOIN users u ON t.audited_by_user_id = u.id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY t.date DESC, t.id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const { rows } = await db.query(sql, params);

    res.json({
      data: rows,
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

// --- 3. OPEN A NEW TILL (MORNING) ---
exports.createCashflow = async (req, res, next) => {
  try {
    let { date, market_id, store_id, carry_forward_bal, till_entry } = req.body;
    const companyId = req.user.company_id;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "date must be YYYY-MM-DD" });
    }

    const parsedMarketId = parseInt(market_id, 10);
    const parsedStoreId = parseInt(store_id, 10);

    if (
      req.user.role === ROLES.MARKET_MANAGER &&
      !req.user.market_ids.includes(parsedMarketId)
    ) {
      return res.status(403).json({
        error: "Cannot submit till data for a market you do not manage.",
      });
    }

    // 🔒 FINAL SECURITY CHECK: Prevent creation if previous till is pending
    const lastRec = await db.query(
      `SELECT audit_status FROM store_tills WHERE company_id = $1 AND store_id = $2 ORDER BY date DESC, id DESC LIMIT 1`,
      [companyId, parsedStoreId],
    );

    if (lastRec.rows.length > 0 && lastRec.rows[0].audit_status === "pending") {
      return res.status(400).json({
        error:
          "Cannot open a new till. The previous till must be audited first.",
      });
    }

    const cf = parseFloat(carry_forward_bal || 0);
    const entry = parseFloat(till_entry || 0);

    // Initial total_bal before any spending occurs
    const initial_total_bal = cf + entry;

    const sql = `
      INSERT INTO store_tills 
        (company_id, date, market_id, store_id, carry_forward_bal, till_entry, spent_amount, total_bal, audit_status)
      VALUES ($1, $2, $3, $4, $5, $6, 0, $7, 'pending')
      RETURNING *
    `;

    const { rows } = await db.query(sql, [
      companyId,
      date,
      parsedMarketId,
      parsedStoreId,
      cf,
      entry,
      initial_total_bal,
    ]);
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === "23505")
      return res.status(409).json({
        error: "A till entry already exists for this store on this date.",
      });
    next(e);
  }
};

// --- 4. AUDIT THE TILL (NIGHT) ---
exports.auditTill = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { spent_amount, reason_for_spending } = req.body;
    const companyId = req.user.company_id;

    const spent = parseFloat(spent_amount || 0);

    if (
      spent > 0 &&
      (!reason_for_spending || reason_for_spending.trim() === "")
    ) {
      return res.status(400).json({
        error: "Reason is required when money is spent from the till.",
      });
    }

    // Get the current till record to calculate the math
    const fetchSql = `SELECT carry_forward_bal, till_entry, audit_status FROM store_tills WHERE id = $1 AND company_id = $2`;
    const { rows: currentTill } = await db.query(fetchSql, [id, companyId]);

    if (currentTill.length === 0)
      return res.status(404).json({ error: "Till record not found." });
    if (currentTill[0].audit_status === "audited")
      return res
        .status(400)
        .json({ error: "This till has already been audited." });

    const cf = parseFloat(currentTill[0].carry_forward_bal);
    const entry = parseFloat(currentTill[0].till_entry);

    // Calculate final balance after spending
    const final_total_bal = cf + entry - spent;

    const updateSql = `
      UPDATE store_tills 
      SET spent_amount = $1, reason_for_spending = $2, total_bal = $3, 
          audit_status = 'audited', audited_by_user_id = $4, audited_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND company_id = $6
      RETURNING *
    `;

    const { rows } = await db.query(updateSql, [
      spent,
      reason_for_spending || null,
      final_total_bal,
      req.user.userId,
      id,
      companyId,
    ]);
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};
