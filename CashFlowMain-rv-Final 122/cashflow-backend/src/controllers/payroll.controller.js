// src/controllers/payroll.controller.js
const db = require("../config/db");
const { ROLES, hasGlobalAccess } = require("../middleware/rbac");

const safeNum = (val) => {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
};

// --- 1. GET ALL WITH PAGINATION, GRAND TOTALS, & SEARCH ---
exports.getPayroll = async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation

    const store_id = req.query.store_id || req.query.store;
    const market_id = req.query.market_id || req.query.market;
    const {
      date,
      date_from,
      date_to,
      specific_dates,
      category,
      status,
      audit_status,
      payment_status,
      date_period,
      search,
    } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    let whereClauses = ["p.company_id = $1"];
    let params = [companyId];

    if (!hasGlobalAccess(req.user.role)) {
      params.push(req.user.market_ids);
      whereClauses.push(`p.market_id = ANY($${params.length}::int[])`);
    }

    if (market_id) {
      params.push(parseInt(market_id, 10));
      whereClauses.push(`p.market_id = $${params.length}`);
    }
    if (store_id) {
      params.push(parseInt(store_id, 10));
      whereClauses.push(`p.store_id = $${params.length}`);
    }
    if (category) {
      params.push(category.trim().toLowerCase());
      whereClauses.push(`LOWER(p.category) = $${params.length}`);
    }
    if (status) {
      params.push(status.trim().toLowerCase());
      whereClauses.push(`p.status = $${params.length}`);
    }
    if (audit_status) {
      params.push(audit_status.trim().toLowerCase());
      whereClauses.push(`p.audit_status = $${params.length}`);
    }
    if (payment_status) {
      params.push(payment_status.trim().toLowerCase());
      whereClauses.push(`p.payment_status = $${params.length}`);
    }
    if (date_period) {
      params.push(date_period.trim());
      whereClauses.push(`p.date_period = $${params.length}`);
    }

    if (date) {
      params.push(date);
      whereClauses.push(`p.date = $${params.length}`);
    } else if (specific_dates) {
      const dateList = specific_dates.split(",").map((d) => d.trim());
      const placeholders = [];
      for (const d of dateList) {
        params.push(d);
        placeholders.push(`$${params.length}`);
      }
      whereClauses.push(`p.date IN (${placeholders.join(",")})`);
    } else {
      if (date_from) {
        params.push(date_from);
        whereClauses.push(`p.date >= $${params.length}`);
      }
      if (date_to) {
        params.push(date_to);
        whereClauses.push(`p.date <= $${params.length}`);
      }
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      whereClauses.push(`(
        emp.full_name ILIKE $${searchIdx} OR 
        emp.employee_code ILIKE $${searchIdx} OR 
        s.name ILIKE $${searchIdx} OR 
        p.notes ILIKE $${searchIdx} OR
        p.reason ILIKE $${searchIdx}
      )`);
    }

    const countSql = `
      SELECT COUNT(*) as total_records, 
        COALESCE(SUM(p.net_final_pay), 0) as total_amount,
        ARRAY_AGG(DISTINCT TO_CHAR(p.date, 'YYYY-MM-DD')) as available_dates
      FROM payroll_expenses p
      JOIN markets m ON p.market_id = m.id
      JOIN stores s ON p.store_id = s.id
      JOIN employees emp ON p.employee_id = emp.id
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
      SELECT p.*, m.name AS market, s.name AS store, emp.full_name AS employee_name, u.full_name AS username
      FROM payroll_expenses p
      JOIN markets m ON p.market_id = m.id
      JOIN stores s ON p.store_id = s.id
      JOIN employees emp ON p.employee_id = emp.id
      LEFT JOIN users u ON p.submitted_by_user_id = u.id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY p.date_period DESC, p.date DESC, p.id DESC
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

// --- 2. CREATE PAYROLL ---
exports.createPayroll = async (req, res, next) => {
  try {
    const user = req.user;
    let payload = req.body;

    const companyId = req.user.company_id; // 🔒
    const marketId = parseInt(payload.market_id || payload.market, 10);
    const storeId = parseInt(payload.store_id || payload.store, 10);
    const employeeId = parseInt(payload.employee_id, 10);
    const category = payload.category || "payroll";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.date)))
      return res.status(400).json({ error: "Invalid date format" });

    if (
      user.role === ROLES.MARKET_MANAGER &&
      !user.market_ids.includes(marketId)
    ) {
      return res
        .status(403)
        .json({ error: "Cannot submit data for a market you do not manage." });
    }

    const sql = `
      INSERT INTO payroll_expenses (
        company_id, date, market_id, store_id, employee_id, submitted_by_user_id, category, amount, notes, status, 
        date_period, pay_type, pay_rate, pay_rate_hike, working_days_1, hours_worked_1, working_days_2, 
        hours_worked_2, hours_adjusted, days_adjusted, total_days_worked, total_hours, net_pay, salary, 
        total_days_to_work, salary_hike, gross_pay, lop_count, credits, deductions, loans_advances, 
        reimbursements, add_amount_by_mm, reason_for_add_amount, net_final_pay, payment_status, employee_stats
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,'pending',
        $10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,
        $25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36
      ) RETURNING *`;

    const values = [
      companyId,
      payload.date,
      marketId,
      storeId,
      employeeId,
      user.userId,
      category,
      safeNum(payload.amount),
      payload.notes || "",
      payload.date_period,
      payload.pay_type,
      safeNum(payload.pay_rate),
      safeNum(payload.pay_rate_hike),
      safeNum(payload.working_days_1),
      safeNum(payload.hours_worked_1),
      safeNum(payload.working_days_2),
      safeNum(payload.hours_worked_2),
      safeNum(payload.hours_adjusted),
      safeNum(payload.days_adjusted),
      safeNum(payload.total_days_worked),
      safeNum(payload.total_hours),
      safeNum(payload.net_pay),
      safeNum(payload.salary),
      safeNum(payload.total_days_to_work),
      safeNum(payload.salary_hike),
      safeNum(payload.gross_pay),
      safeNum(payload.lop_count),
      safeNum(payload.credits),
      safeNum(payload.deductions),
      safeNum(payload.loans_advances),
      safeNum(payload.reimbursements),
      safeNum(payload.add_amount_by_mm),
      payload.reason_for_add_amount,
      safeNum(payload.net_final_pay),
      payload.payment_status || "pending",
      payload.employee_stats,
    ];

    const { rows } = await db.query(sql, values);
    return res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// --- IDOR SECURED STATUS UPDATES ---

exports.approvePayroll = async (req, res, next) => {
  try {
    const sql = `UPDATE payroll_expenses SET status='approved', reason=$2 WHERE id=$1 AND company_id=$3 RETURNING *`;
    const { rows } = await db.query(sql, [
      req.params.id,
      String(req.body?.reason || "").trim() || null,
      req.user.company_id,
    ]);
    if (!rows.length)
      return res.status(404).json({ error: "Not found or access denied" });
    return res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

exports.rejectPayroll = async (req, res, next) => {
  const id = Number(req.params.id);
  const reason = String(req.body?.reason || "").trim();
  if (!id || !reason)
    return res.status(400).json({ error: "ID and reason required" });

  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const updateSql = `
      UPDATE payroll_expenses p SET status='rejected', reason=$2 WHERE p.id=$1 AND p.company_id=$3 
      RETURNING p.*, (SELECT name FROM stores WHERE id = p.store_id) as store_name
    `;
    const { rows } = await client.query(updateSql, [
      id,
      reason,
      req.user.company_id,
    ]);

    if (!rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Not found or access denied" });
    }

    const item = rows[0];
    const message = `PAYROLL of $${item.amount} for ${item.store_name} was rejected. Reason: ${reason}`;

    await client.query(
      `INSERT INTO notifications (company_id, market_id, store_id, message, type) VALUES ($1,$2,$3,$4,'rejection')`,
      [req.user.company_id, item.market_id, item.store_id, message],
    );

    await client.query("COMMIT");
    return res.json(item);
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
};

exports.auditPayroll = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `UPDATE payroll_expenses SET audit_status='audited', audited_by_user_id=$2 WHERE id=$1 AND company_id=$3 RETURNING *`,
      [req.params.id, req.user.userId, req.user.company_id],
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    return res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

exports.raiseIssue = async (req, res, next) => {
  try {
    if (!req.body.notes)
      return res.status(400).json({ error: "Notes required" });
    const sql = `
      UPDATE payroll_expenses SET notes = $1, status = 'pending', audit_status = 'pending', reason = NULL 
      WHERE id = $2 AND company_id = $3 RETURNING *;
    `;
    const { rows } = await db.query(sql, [
      req.body.notes,
      req.params.id,
      req.user.company_id,
    ]);
    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

exports.markPayrollPaid = async (req, res, next) => {
  try {
    const { add_amount_by_mm, reason_for_add_amount } = req.body;

    // Safely parse the amount to a number
    const mmAmount = add_amount_by_mm ? parseFloat(add_amount_by_mm) : 0;

    const sql = `
      UPDATE payroll_expenses
      SET 
        add_amount_by_mm = $1, 
        reason_for_add_amount = $2, 
        payment_status = 'paid', 
        status = CASE 
                   WHEN net_final_pay::numeric = $1::numeric THEN status 
                   ELSE 'pending' 
                 END,
        audit_status = CASE 
                         WHEN net_final_pay::numeric = $1::numeric THEN audit_status 
                         ELSE 'pending' 
                       END
      WHERE id = $3 AND company_id = $4 
      RETURNING *;
    `;

    const { rows } = await db.query(sql, [
      mmAmount,
      reason_for_add_amount || null,
      req.params.id,
      req.user.company_id,
    ]);

    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// --- 8. UPDATE PAYROLL RECORD ---
exports.updatePayrollExpense = async (req, res, next) => {
  try {
    const payload = req.body;
    const marketId = parseInt(payload.market_id || payload.market, 10);

    if (
      req.user.role === ROLES.MARKET_MANAGER &&
      !req.user.market_ids.includes(marketId)
    ) {
      return res
        .status(403)
        .json({ error: "Cannot update data for a market you do not manage." });
    }

    const sql = `
      UPDATE payroll_expenses 
      SET 
        date = $1, market_id = $2, store_id = $3, category = $4, amount = $5, notes = $6,
        employee_id = $7, date_period = $8, pay_type = $9, pay_rate = $10, pay_rate_hike = $11, 
        working_days_1 = $12, hours_worked_1 = $13, working_days_2 = $14, hours_worked_2 = $15, 
        hours_adjusted = $16, days_adjusted = $17, total_days_worked = $18, total_hours = $19, 
        net_pay = $20, salary = $21, total_days_to_work = $22, salary_hike = $23, gross_pay = $24, 
        lop_count = $25, credits = $26, deductions = $27, loans_advances = $28, reimbursements = $29,
        add_amount_by_mm = $30, reason_for_add_amount = $31, net_final_pay = $32, payment_status = $33, 
        employee_stats = $34, status = 'pending', audit_status = 'pending' 
      WHERE id = $35 AND company_id = $36
      RETURNING *;
    `;

    const values = [
      payload.date,
      marketId,
      parseInt(payload.store_id || payload.store, 10),
      payload.category,
      safeNum(payload.amount),
      payload.notes || "",
      parseInt(payload.employee_id, 10),
      payload.date_period,
      payload.pay_type,
      safeNum(payload.pay_rate),
      safeNum(payload.pay_rate_hike),
      safeNum(payload.working_days_1),
      safeNum(payload.hours_worked_1),
      safeNum(payload.working_days_2),
      safeNum(payload.hours_worked_2),
      safeNum(payload.hours_adjusted),
      safeNum(payload.days_adjusted),
      safeNum(payload.total_days_worked),
      safeNum(payload.total_hours),
      safeNum(payload.net_pay),
      safeNum(payload.salary),
      safeNum(payload.total_days_to_work),
      safeNum(payload.salary_hike),
      safeNum(payload.gross_pay),
      safeNum(payload.lop_count),
      safeNum(payload.credits),
      safeNum(payload.deductions),
      safeNum(payload.loans_advances),
      safeNum(payload.reimbursements),
      safeNum(payload.add_amount_by_mm),
      payload.reason_for_add_amount,
      safeNum(payload.net_final_pay),
      payload.payment_status || "pending",
      payload.employee_stats,
      req.params.id,
      req.user.company_id,
    ];

    const { rows } = await db.query(sql, values);
    if (!rows.length)
      return res.status(404).json({ error: "Not found or access denied" });
    return res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

// Add this inside src/controllers/payroll.controller.js

exports.bulkCreatePayroll = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { records, market_id, date } = req.body;
    const companyId = req.user.company_id;
    const submittedBy = req.user.userId;

    if (!Array.isArray(records) || records.length === 0) {
      return res
        .status(400)
        .json({ error: "No valid records provided for upload." });
    }

    await client.query("BEGIN"); // 🛡️ Start Transaction

    const sql = `
      INSERT INTO payroll_expenses (
        company_id, market_id, store_id, employee_id, submitted_by_user_id,
        date, date_period, category, pay_type, pay_rate,
        working_days_1, hours_worked_1, working_days_2, hours_worked_2,
        hours_adjusted, days_adjusted, total_days_worked, total_days_to_work, total_hours,
        salary, salary_hike, pay_rate_hike, gross_pay, net_pay, lop_count,
        credits, deductions, loans_advances, reimbursements,
        add_amount_by_mm, reason_for_add_amount, net_final_pay, amount,
        notes, employee_stats, status, unique_id
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, 'payroll', $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26,
        $27, $28, $29, $30, $31, $32, $33, $34, 'pending', $35
      )
    `;

    // Loop through the parsed and calculated records from the frontend
    for (const rec of records) {
      // Create a unique ID to prevent double-uploading the exact same record
      const uniqueId = `bulk-${companyId}-${market_id}-${rec.store_id}-${rec.employee_id}-${date}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

      await client.query(sql, [
        companyId,
        market_id,
        parseInt(rec.store_id, 10),
        parseInt(rec.employee_id, 10),
        submittedBy,
        date,
        rec.date_period || null,
        rec.pay_type || "payrate",
        parseFloat(rec.pay_rate || 0),
        parseFloat(rec.working_days_1 || 0),
        parseFloat(rec.hours_worked_1 || 0),
        parseFloat(rec.working_days_2 || 0),
        parseFloat(rec.hours_worked_2 || 0),
        parseFloat(rec.hours_adjusted || 0),
        parseInt(rec.days_adjusted || 0, 10),
        parseFloat(rec.total_days_worked || 0),
        parseInt(rec.total_days_to_work || 0, 10),
        parseFloat(rec.total_hours || 0),
        parseFloat(rec.salary || 0),
        parseFloat(rec.salary_hike || 0),
        parseFloat(rec.pay_rate_hike || 0),
        parseFloat(rec.gross_pay || 0),
        parseFloat(rec.net_pay || 0),
        parseFloat(rec.lop_count || 0),
        parseFloat(rec.credits || 0),
        parseFloat(rec.deductions || 0),
        parseFloat(rec.loans_advances || 0),
        parseFloat(rec.reimbursements || 0),
        parseFloat(rec.add_amount_by_mm || 0),
        rec.reason_for_add_amount || null,
        parseFloat(rec.net_final_pay || 0),
        parseFloat(rec.net_final_pay || 0), // maps to 'amount' column
        rec.notes || null,
        rec.employee_stats || null,
        uniqueId,
      ]);
    }

    await client.query("COMMIT"); // ✅ Commit Transaction
    res.status(201).json({
      message: `Successfully uploaded and processed ${records.length} records.`,
    });
  } catch (e) {
    await client.query("ROLLBACK"); // ❌ Revert everything if one row fails
    next(e);
  } finally {
    client.release();
  }
};
