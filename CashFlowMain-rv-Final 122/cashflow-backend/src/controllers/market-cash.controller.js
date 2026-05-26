// src/controllers/market-cash.controller.js
const db = require("../config/db");
const { ROLES, hasGlobalAccess } = require("../middleware/rbac");

// --- 1. GET HISTORICAL BALANCE ---
exports.getHistoricalBalance = async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation
    const market_id = req.query.market_id || req.query.market;
    const { date } = req.query;

    if (!market_id || !date) {
      return res
        .status(400)
        .json({ error: "Market ID and date are required." });
    }

    const parsedMarketId = parseInt(market_id, 10);

    if (
      !hasGlobalAccess(req.user.role) &&
      !req.user.market_ids.includes(parsedMarketId)
    ) {
      return res
        .status(403)
        .json({ error: "Forbidden: Cannot access other market data." });
    }

    // 🔒 Add companyId as the very first parameter
    const params = [companyId, parsedMarketId, date];

    const salesQuery = `
      SELECT SUM(pos_cash) as total_sales, SUM(cashinbank) as total_bank
      FROM pos_data WHERE company_id = $1 AND market_id = $2 AND date <= $3
    `;

    const expensesQuery = `
      SELECT SUM(amount) as total_expenses
      FROM expenses
      WHERE company_id = $1 AND market_id = $2 AND expense_date <= $3 AND status = 'approved'
    `;

    const payrollQuery = `
      SELECT SUM(amount) as total_payroll
      FROM payroll_expenses
      WHERE company_id = $1 AND market_id = $2 AND date <= $3 AND status = 'approved'
    `;

    const pickupsQuery = `
      SELECT SUM(COALESCE(total_amount, cash_entry, 0)) as total_pickups
      FROM market_cash_wallet
      WHERE company_id = $1 AND market_id = $2 AND date <= $3 AND status = 'approved' AND audit_status = 'audited'
    `;

    const [salesRes, expRes, payRes, pickRes] = await Promise.all([
      db.query(salesQuery, params),
      db.query(expensesQuery, params),
      db.query(payrollQuery, params),
      db.query(pickupsQuery, params),
    ]);

    const totalSales = Number(salesRes.rows[0]?.total_sales || 0);
    const totalBank = Number(salesRes.rows[0]?.total_bank || 0);
    const totalExpenses = Number(expRes.rows[0]?.total_expenses || 0);
    const totalPayroll = Number(payRes.rows[0]?.total_payroll || 0);
    const totalPickups = Number(pickRes.rows[0]?.total_pickups || 0);

    const allExpenses = totalExpenses + totalPayroll;
    let cashInHand = totalSales - (totalBank + allExpenses + totalPickups);

    res.json({
      market_id: parsedMarketId,
      date_up_to: date,
      carry_forward: cashInHand,
      debug: {
        totalSales,
        totalBank,
        totalExpenses,
        totalPayroll,
        totalPickups,
      },
    });
  } catch (e) {
    console.error("Historical Balance Error:", e.message);
    res.status(500).json({ error: e.message });
  }
};

// --- 2. GET ALL MARKET CASH ---
exports.getMarketCash = async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation

    const store_id = req.query.store_id || req.query.store;
    const market_id = req.query.market_id || req.query.market;
    const {
      date,
      status,
      audit_status,
      date_from,
      date_to,
      specific_dates,
      search,
    } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const offset = (page - 1) * limit;

    let whereClauses = ["mc.company_id = $1"];
    let params = [companyId];

    if (!hasGlobalAccess(req.user.role)) {
      params.push(req.user.market_ids);
      whereClauses.push(`mc.market_id = ANY($${params.length}::int[])`);
    }

    if (market_id) {
      params.push(parseInt(market_id, 10));
      whereClauses.push(`mc.market_id = $${params.length}`);
    }
    if (store_id) {
      params.push(parseInt(store_id, 10));
      whereClauses.push(`mc.store_id = $${params.length}`);
    }

    if (status && status !== "all") {
      params.push(status.toLowerCase());
      whereClauses.push(`mc.status = $${params.length}`);
    }
    if (audit_status && audit_status !== "all") {
      if (audit_status === "pending") {
        whereClauses.push(
          `(mc.audit_status IS NULL OR mc.audit_status = 'pending')`,
        );
      } else {
        params.push(audit_status.toLowerCase());
        whereClauses.push(`mc.audit_status = $${params.length}`);
      }
    }

    if (date) {
      params.push(date);
      whereClauses.push(`mc.date = $${params.length}`);
    } else if (specific_dates) {
      const dateList = specific_dates.split(",").map((d) => d.trim());
      const placeholders = [];
      for (const d of dateList) {
        params.push(d);
        placeholders.push(`$${params.length}`);
      }
      whereClauses.push(`mc.date IN (${placeholders.join(",")})`);
    } else {
      if (date_from) {
        params.push(date_from);
        whereClauses.push(`mc.date >= $${params.length}`);
      }
      if (date_to) {
        params.push(date_to);
        whereClauses.push(`mc.date <= $${params.length}`);
      }
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      whereClauses.push(`(
        m.name ILIKE $${searchIdx} OR 
        s.name ILIKE $${searchIdx} OR
        mc.notes ILIKE $${searchIdx} OR
        mc.reason ILIKE $${searchIdx}
      )`);
    }

    const countSql = `
      SELECT COUNT(*) as total_records, 
        COALESCE(SUM(mc.cash_entry), 0) as total_cash_entry,
        COALESCE(SUM(mc.carry_forwarded_amount), 0) as total_carry_forward,
        COALESCE(SUM(mc.total_amount), 0) as grand_total,
        ARRAY_AGG(DISTINCT TO_CHAR(mc.date, 'YYYY-MM-DD')) as available_dates
      FROM market_cash_wallet mc
      JOIN markets m ON mc.market_id = m.id
      LEFT JOIN stores s ON mc.store_id = s.id
      WHERE ${whereClauses.join(" AND ")}
    `;

    const { rows: countRows } = await db.query(countSql, params);
    const totalRecords = parseInt(countRows[0].total_records);
    const availableDates = (countRows[0].available_dates || [])
      .filter(Boolean)
      .sort();

    const totals = {
      cash_entry: parseFloat(countRows[0].total_cash_entry),
      carry_forward: parseFloat(countRows[0].total_carry_forward),
      total_amount: parseFloat(countRows[0].grand_total),
    };

    params.push(limit, offset);

    const sql = `
      SELECT mc.id, mc.date, m.name AS market, s.name AS store,
        mc.cash_entry, mc.carry_forwarded_amount, mc.total_amount,
        mc.notes, mc.status, mc.reason, mc.audit_status, 
        u.full_name AS audit_by, mc.created_at
      FROM market_cash_wallet mc
      JOIN markets m ON mc.market_id = m.id
      LEFT JOIN stores s ON mc.store_id = s.id
      LEFT JOIN users u ON mc.audited_by_user_id = u.id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY mc.date DESC, mc.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `;

    const { rows } = await db.query(sql, params);

    return res.json({
      data: rows,
      summary: { totals, availableDates },
      pagination: {
        total: totalRecords,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
      },
    });
  } catch (e) {
    console.error("❌ Market cash fetch error:", e.message);
    next(e);
  }
};

// --- 3. CREATE MARKET CASH ---
exports.createMarketCash = async (req, res, next) => {
  try {
    let {
      date,
      market_id,
      store_id,
      cash_entry,
      carry_forwarded_amount,
      notes,
    } = req.body;
    const companyId = req.user.company_id; // 🔒

    const parsedMarketId = parseInt(market_id || req.body.market, 10);
    const parsedStoreId =
      store_id || req.body.store
        ? parseInt(store_id || req.body.store, 10)
        : null;

    if (
      req.user.role === ROLES.MARKET_MANAGER &&
      !req.user.market_ids.includes(parsedMarketId)
    ) {
      return res
        .status(403)
        .json({ error: "Cannot submit data for a market you do not manage." });
    }

    if (!date || !parsedMarketId)
      return res
        .status(400)
        .json({ error: "Date and Market ID are required." });

    const sql = `
      INSERT INTO market_cash_wallet
        (company_id, date, market_id, store_id, cash_entry, carry_forwarded_amount, total_amount, notes, status, audit_status)
      VALUES (
        $1, $2, $3, $4, 
        $5::numeric, $6::numeric, 
        COALESCE($5::numeric, 0) + COALESCE($6::numeric, 0), 
        $7, 'pending', 'pending'
      )
      RETURNING *
    `;

    const params = [
      companyId,
      date,
      parsedMarketId,
      parsedStoreId,
      cash_entry,
      carry_forwarded_amount,
      notes || null,
    ];
    const { rows } = await db.query(sql, params);
    return res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// --- IDOR SECURED STATUS UPDATES ---

exports.approveMarketCash = async (req, res, next) => {
  try {
    const sql = `UPDATE market_cash_wallet SET status = 'approved', reason = $2 WHERE id = $1 AND company_id = $3 RETURNING *`;
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

exports.rejectMarketCash = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const reason = req.body.reason || "";
    await client.query("BEGIN");

    const updateSql = `
      UPDATE market_cash_wallet mc
      SET status = 'rejected', reason = $2 
      WHERE mc.id = $1 AND mc.company_id = $3
      RETURNING mc.*, (SELECT name FROM stores WHERE id = mc.store_id) as store_name
    `;
    const { rows } = await client.query(updateSql, [
      req.params.id,
      reason,
      req.user.company_id,
    ]);

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found or access denied" });
    }

    const item = rows[0];
    const message = `Market Wallet Entry of $${item.total_amount} for ${item.store_name || "store"} was rejected. Reason: ${reason}`;

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

exports.auditMarketCash = async (req, res, next) => {
  try {
    const sql = `UPDATE market_cash_wallet SET audit_status = 'audited', audited_by_user_id = $2 WHERE id = $1 AND company_id = $3 RETURNING *`;
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
