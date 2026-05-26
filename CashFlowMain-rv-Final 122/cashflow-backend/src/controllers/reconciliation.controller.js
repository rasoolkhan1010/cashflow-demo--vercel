// src/controllers/reconciliation.controller.js
// src/controllers/reconciliation.controller.js
const db = require("../config/db");
// 🔥 FIX 1: Import RBAC for security
const { hasGlobalAccess } = require("../middleware/rbac");

// 1. Get all closed months for a market
exports.getReconciliations = async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation
    const market_id = req.query.market_id || req.query.market;

    let sql = `
      SELECT r.*, m.name AS market 
      FROM monthly_reconciliations r
      JOIN markets m ON r.market_id = m.id
      WHERE r.company_id = $1
    `;
    let params = [companyId];

    // 🔥 FIX 2: Apply strictly scoped Market Isolation Guard
    if (!hasGlobalAccess(req.user.role)) {
      params.push(req.user.market_ids);
      sql += ` AND r.market_id = ANY($${params.length}::int[])`;
    }

    if (market_id) {
      params.push(parseInt(market_id, 10));
      sql += ` AND r.market_id = $${params.length}`;
    }

    sql += ` ORDER BY r.reconciliation_month DESC`;

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

// 2. Get the Opening Balance for a specific month
exports.getOpeningBalance = async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation
    const market_id = req.query.market_id || req.query.market;
    const { year, month } = req.query;

    if (!market_id || !year || !month) {
      return res.json({ openingBalance: 0 });
    }

    const currentMonthStart = `${year}-${String(month).padStart(2, "0")}-01`;

    const sql = `
      SELECT opening_balance
      FROM monthly_reconciliations
      WHERE company_id = $1 AND market_id = $2 AND reconciliation_month < $3
      ORDER BY reconciliation_month DESC
      LIMIT 1
    `;

    const { rows } = await db.query(sql, [
      companyId,
      parseInt(market_id, 10),
      currentMonthStart,
    ]);
    const balance = rows.length ? Number(rows[0].opening_balance) : 0;

    res.json({ openingBalance: balance });
  } catch (e) {
    console.error("Error fetching opening balance:", e);
    next(e);
  }
};

// 3. Close the Book
exports.closeBook = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation
    const { year, month } = req.body;
    const market_id = parseInt(req.body.market_id || req.body.market, 10);
    const adminUserId = req.user.userId;

    const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
    const targetMonth = `${year}-${String(month).padStart(2, "0")}`;

    await client.query("BEGIN");

    // --- STEP 1: Fetch Previous Month's Carry Forward Balance ---
    const prevMonthSql = `
      SELECT opening_balance FROM monthly_reconciliations
      WHERE company_id = $1 AND market_id = $2 AND reconciliation_month < $3
      ORDER BY reconciliation_month DESC LIMIT 1
    `;
    const prevMonthRes = await client.query(prevMonthSql, [
      companyId,
      market_id,
      monthStart,
    ]);
    const previousBalance = prevMonthRes.rows.length
      ? Number(prevMonthRes.rows[0].opening_balance)
      : 0;

    // --- STEP 2: Calculate the totals for the CURRENT month ---
    const paramArr = [companyId, market_id, targetMonth];

    const salesQ = `SELECT SUM(pos_cash) as total FROM pos_data WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(date, 'YYYY-MM') = $3 `;
    const bankQ = `SELECT SUM(cashinbank) as total FROM pos_data WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(date, 'YYYY-MM') = $3`;
    const expQ = `SELECT SUM(amount) as total FROM expenses WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(expense_date, 'YYYY-MM') = $3 AND status='approved' `;
    const payQ = `SELECT SUM(amount) as total FROM payroll_expenses WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(date, 'YYYY-MM') = $3 AND status='approved' AND audit_status='audited' AND payment_status = 'paid'`;
    const comQ = `SELECT SUM(final_commission) as total FROM commission_data WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(date, 'YYYY-MM') = $3 AND status='approved' AND audit_status = 'audited' AND payment_status = 'paid'`;
    const pickQ = `SELECT SUM(cash_entry) as total FROM market_cash_wallet WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(date, 'YYYY-MM') = $3 AND status='approved' AND audit_status='audited'`;

    const [salesRes, bankRes, expRes, payRes, pickRes, comRes] =
      await Promise.all([
        client.query(salesQ, paramArr),
        client.query(bankQ, paramArr),
        client.query(expQ, paramArr),
        client.query(payQ, paramArr),
        client.query(pickQ, paramArr),
        client.query(comQ, paramArr),
      ]);

    const totalSales = Number(salesRes.rows[0]?.total || 0);
    const totalBank = Number(bankRes.rows[0]?.total || 0);
    const totalExp = Number(expRes.rows[0]?.total || 0);
    const totalPay = Number(payRes.rows[0]?.total || 0);
    const totalPick = Number(pickRes.rows[0]?.total || 0);
    const totalComm = Number(comRes.rows[0]?.total || 0);

    // --- STEP 3: Calculate True Final Cash In Hand ---
    const totalExpenses = totalExp + totalPay + totalComm;
    const cashPickupCalc = totalSales - totalBank;
    const varience = cashPickupCalc - totalPick;
    const finalCashInHand =
      previousBalance + (totalPick - totalExpenses) + varience;
    let carryForwardBalance = finalCashInHand;

    // --- STEP 5: Insert into Reconciliations table ---
    const insertSql = `
      INSERT INTO monthly_reconciliations (company_id, market_id, reconciliation_month, opening_balance, locked_by_user_id)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `;
    const { rows } = await client.query(insertSql, [
      companyId,
      market_id,
      monthStart,
      carryForwardBalance,
      adminUserId,
    ]);

    // --- STEP 6: Lock the tables for that month ---
    const lockParams = [companyId, market_id, targetMonth];

    await client.query(
      `UPDATE expenses SET is_locked = TRUE WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(expense_date, 'YYYY-MM') = $3`,
      lockParams,
    );
    await client.query(
      `UPDATE payroll_expenses SET is_locked = TRUE WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(date, 'YYYY-MM') = $3`,
      lockParams,
    );
    await client.query(
      `UPDATE commission_data SET is_locked = TRUE WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(date, 'YYYY-MM') = $3`,
      lockParams,
    );
    await client.query(
      `UPDATE market_cash_wallet SET is_locked = TRUE WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(date, 'YYYY-MM') = $3`,
      lockParams,
    );
    await client.query(
      `UPDATE pos_data SET is_locked = TRUE WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(date, 'YYYY-MM') = $3`,
      lockParams,
    );

    await client.query("COMMIT");
    res.json({
      success: true,
      data: rows[0],
      finalCashInHand,
      carryForwardBalance,
    });
  } catch (e) {
    await client.query("ROLLBACK");
    if (e.code === "23505")
      return res.status(400).json({ error: "This month is already closed." });
    next(e);
  } finally {
    client.release();
  }
};

// 4. Reopen the Book
exports.reopenBook = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const companyId = req.user.company_id; // 🔒

    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT * FROM monthly_reconciliations WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (!rows.length) throw new Error("Record not found or access denied");

    const record = rows[0];
    const targetMonth = record.reconciliation_month
      .toISOString()
      .substring(0, 7);
    const lockParams = [companyId, record.market_id, targetMonth];

    // Unlock tables
    await client.query(
      `UPDATE expenses SET is_locked = FALSE WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(expense_date, 'YYYY-MM') = $3`,
      lockParams,
    );
    await client.query(
      `UPDATE payroll_expenses SET is_locked = FALSE WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(date, 'YYYY-MM') = $3`,
      lockParams,
    );
    await client.query(
      `UPDATE commission_data SET is_locked = FALSE WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(date, 'YYYY-MM') = $3`,
      lockParams,
    );
    await client.query(
      `UPDATE market_cash_wallet SET is_locked = FALSE WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(date, 'YYYY-MM') = $3`,
      lockParams,
    );
    await client.query(
      `UPDATE pos_data SET is_locked = FALSE WHERE company_id = $1 AND market_id = $2 AND TO_CHAR(date, 'YYYY-MM') = $3`,
      lockParams,
    );

    // Remove the record
    await client.query(
      `DELETE FROM monthly_reconciliations WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    await client.query("COMMIT");
    res.json({ success: true, message: "Book reopened successfully." });
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
};
