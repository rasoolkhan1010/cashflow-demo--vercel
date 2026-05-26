// src/controllers/commission.controller.js
const db = require("../config/db");
const { ROLES, hasGlobalAccess } = require("../middleware/rbac");

// --- 1. GET ALL COMMISSIONS ---
// --- 1. GET ALL COMMISSIONS ---
exports.getCommissions = async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒

    const store_id = req.query.store_id || req.query.store;
    const market_id = req.query.market_id || req.query.market;
    const {
      date,
      status,
      audit_status,
      payment_status,
      date_from,
      date_to,
      specific_dates,
      search,
    } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // 🔒 STRICT TENANT ISOLATION
    let whereClauses = ["c.company_id = $1"];
    let params = [companyId];

    if (!hasGlobalAccess(req.user.role)) {
      params.push(req.user.market_ids);
      whereClauses.push(`c.market_id = ANY($${params.length}::int[])`);
    }

    if (market_id) {
      params.push(parseInt(market_id, 10));
      whereClauses.push(`c.market_id = $${params.length}`);
    }
    if (store_id) {
      params.push(parseInt(store_id, 10));
      whereClauses.push(`c.store_id = $${params.length}`);
    }
    if (status && status !== "all") {
      params.push(status.toLowerCase());
      whereClauses.push(`c.status = $${params.length}`);
    }
    if (audit_status && audit_status !== "all") {
      if (audit_status === "pending") {
        whereClauses.push(
          `(c.audit_status IS NULL OR c.audit_status = 'pending')`,
        );
      } else {
        params.push(audit_status.toLowerCase());
        whereClauses.push(`c.audit_status = $${params.length}`);
      }
    }
    if (payment_status && payment_status !== "all") {
      params.push(payment_status.toLowerCase());
      whereClauses.push(`c.payment_status = $${params.length}`);
    }

    if (date) {
      params.push(date);
      whereClauses.push(`c.date = $${params.length}`);
    } else if (specific_dates) {
      const dateList = specific_dates.split(",").map((d) => d.trim());
      const placeholders = dateList.map((d) => {
        params.push(d);
        return `$${params.length}`;
      });
      whereClauses.push(`c.date IN (${placeholders.join(",")})`);
    } else {
      if (date_from) {
        params.push(date_from);
        whereClauses.push(`c.date >= $${params.length}`);
      }
      if (date_to) {
        params.push(date_to);
        whereClauses.push(`c.date <= $${params.length}`);
      }
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      whereClauses.push(`(
        m.name ILIKE $${searchIdx} OR 
        s.name ILIKE $${searchIdx} OR
        emp.full_name ILIKE $${searchIdx} OR
        emp.employee_code ILIKE $${searchIdx} OR
        c.reason_for_add_amount ILIKE $${searchIdx}
      )`);
    }

    const countSql = `
      SELECT COUNT(*) as total_records, 
        COALESCE(SUM(c.total_commission), 0) as grand_total_commission,
        COALESCE(SUM(c.final_commission), 0) as grand_final_commission,
        COALESCE(SUM(c.csat_comm_loss), 0) as grand_csat_loss,
        ARRAY_AGG(DISTINCT TO_CHAR(c.date, 'YYYY-MM-DD')) as available_dates
      FROM commission_data c
      JOIN markets m ON c.market_id = m.id
      JOIN stores s ON c.store_id = s.id
      JOIN employees emp ON c.employee_id = emp.id
      WHERE ${whereClauses.join(" AND ")}
    `;

    const { rows: countRows } = await db.query(countSql, params);
    const totalRecords = parseInt(countRows[0].total_records);
    const availableDates = (countRows[0].available_dates || [])
      .filter(Boolean)
      .sort();

    const totals = {
      total_commission: parseFloat(countRows[0].grand_total_commission),
      final_commission: parseFloat(countRows[0].grand_final_commission),
      csat_loss: parseFloat(countRows[0].grand_csat_loss),
    };

    params.push(limit, offset);

    // 🔥 THE FIX: Added u2 for audited_by_user_id to fetch audit_by string
    const sql = `
      SELECT 
        c.id, c.company_id, c.market_id, c.store_id, c.employee_id, c.submitted_by_user_id,
        c.date, c.date_period, c.csat_score, c.csat_comm_loss, c.rebate_chargeback,
        c.deposit_chargeback, c.inventory_variance_chargeback, c.late_clock_in_chargeback,
        c.activation_count, c.act_comm, c.upgrade_count, c.upg_comm, c.hint_sold, c.hint_comm,
        c.qualified_box, c.box_comm, c.vas_mrc, c.vas_avg, c.vas_commission, c.leasing_done,
        c.leasing_commission, c.retention_35, c.retention_65, c.retention_95, c.retention_125,
        c.retention_155, c.retention_185, c.retention_215, c.retention_245, c.retention_275,
        c.retention_305, c.retention_335, c.retention_365, c.retention_commission, c.acc_profit,
        c.acc_tier, c.acc_commission, c.his_spiff, c.total_commission, c.final_commission,
        c.write_ups, c.reimbursements, c.entry_reason, c.notes, c.add_amount_by_mm,
        c.reason_for_add_amount, c.status, c.reason, c.audit_status, c.audited_by_user_id,
        c.payment_status, c.is_locked, c.created_at, c.updated_at,
        m.name AS market, 
        s.name AS store, 
        emp.full_name AS employee_name, 
        u.full_name AS username,
        u2.full_name AS audit_by
      FROM commission_data c
      JOIN markets m ON c.market_id = m.id
      JOIN stores s ON c.store_id = s.id
      JOIN employees emp ON c.employee_id = emp.id
      LEFT JOIN users u ON c.submitted_by_user_id = u.id
      LEFT JOIN users u2 ON c.audited_by_user_id = u2.id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY c.date DESC
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
    console.error("❌ Commission fetch error:", e.message);
    next(e);
  }
};
// --- 2. CREATE COMMISSION ENTRY ---
exports.createCommission = async (req, res, next) => {
  try {
    let payload = req.body;
    const companyId = req.user.company_id; // 🔒
    const marketId = parseInt(payload.market_id || payload.market, 10);

    if (
      req.user.role === ROLES.MARKET_MANAGER &&
      !req.user.market_ids.includes(marketId)
    ) {
      return res
        .status(403)
        .json({ error: "Cannot submit data for a market you do not manage." });
    }

    if (
      !payload.date ||
      !marketId ||
      !payload.store_id ||
      !payload.employee_id
    ) {
      return res.status(400).json({
        error: "Date, Market ID, Store ID, and Employee ID required.",
      });
    }

    // Added company_id to the columns array!
    const columns = [
      "company_id",
      "date",
      "date_period",
      "market_id",
      "store_id",
      "employee_id",
      "submitted_by_user_id",
      "csat_score",
      "csat_comm_loss",
      "rebate_chargeback",
      "deposit_chargeback",
      "inventory_variance_chargeback",
      "late_clock_in_chargeback",
      "write_ups",
      "reimbursements",
      "activation_count",
      "act_comm",
      "upgrade_count",
      "upg_comm",
      "hint_sold",
      "hint_comm",
      "qualified_box",
      "box_comm",
      "vas_mrc",
      "vas_avg",
      "vas_commission",
      "acc_profit",
      "acc_tier",
      "acc_commission",
      "retention_35",
      "retention_65",
      "retention_95",
      "retention_125",
      "retention_155",
      "retention_185",
      "retention_215",
      "retention_245",
      "retention_275",
      "retention_305",
      "retention_335",
      "retention_365",
      "retention_commission",
      "leasing_done",
      "leasing_commission",
      "his_spiff",
      "total_commission",
      "final_commission",
      "status",
      "audit_status",
      "entry_reason",
      "add_amount_by_mm",
      "reason_for_add_amount",
      "payment_status",
    ];

    const values = [];
    const placeholders = [];

    columns.forEach((col, index) => {
      let val = payload[col];

      if (col === "company_id") val = companyId;
      if (col === "market_id") val = marketId;
      if (col === "submitted_by_user_id") val = req.user.userId;
      if (col === "status" || col === "audit_status") val = "pending";
      if (col === "payment_status") val = payload.payment_status || "pending";
      if (val === "" || val === undefined) val = null;

      values.push(val);
      placeholders.push(`$${index + 1}`);
    });

    const sql = `INSERT INTO commission_data (${columns.join(", ")}) VALUES (${placeholders.join(", ")}) RETURNING *`;
    const { rows } = await db.query(sql, values);
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error("❌ Commission Insert Error:", e.message);
    next(e);
  }
};

// --- 3. UPDATE COMMISSION ENTRY (EDIT) ---
exports.updateCommission = async (req, res, next) => {
  try {
    const id = req.params.id;
    let payload = req.body;
    const companyId = req.user.company_id; // 🔒

    const marketId = parseInt(payload.market_id || payload.market, 10);
    if (
      req.user.role === ROLES.MARKET_MANAGER &&
      !req.user.market_ids.includes(marketId)
    ) {
      return res
        .status(403)
        .json({ error: "Cannot update data for a market you do not manage." });
    }

    const columns = [
      "date",
      "date_period",
      "market_id",
      "store_id",
      "employee_id",
      "csat_score",
      "csat_comm_loss",
      "rebate_chargeback",
      "deposit_chargeback",
      "inventory_variance_chargeback",
      "late_clock_in_chargeback",
      "write_ups",
      "reimbursements",
      "activation_count",
      "act_comm",
      "upgrade_count",
      "upg_comm",
      "hint_sold",
      "hint_comm",
      "qualified_box",
      "box_comm",
      "vas_mrc",
      "vas_avg",
      "vas_commission",
      "acc_profit",
      "acc_tier",
      "acc_commission",
      "retention_35",
      "retention_65",
      "retention_95",
      "retention_125",
      "retention_155",
      "retention_185",
      "retention_215",
      "retention_245",
      "retention_275",
      "retention_305",
      "retention_335",
      "retention_365",
      "retention_commission",
      "leasing_done",
      "leasing_commission",
      "his_spiff",
      "total_commission",
      "final_commission",
      "entry_reason",
      "notes",
      "add_amount_by_mm",
      "reason_for_add_amount",
      "payment_status",
    ];

    const setClauses = [];
    const values = [];

    columns.forEach((col) => {
      let val = payload[col];
      if (col === "market_id") val = marketId;
      if (val === "" || val === undefined) val = null;

      values.push(val);
      setClauses.push(`${col} = $${values.length}`);
    });

    setClauses.push(`status = 'pending'`);
    setClauses.push(`audit_status = 'pending'`);
    setClauses.push(`reason = NULL`);

    values.push(id, companyId); // 🔒 Push ID and Company ID

    const sql = `
      UPDATE commission_data 
      SET ${setClauses.join(", ")} 
      WHERE id = $${values.length - 1} AND company_id = $${values.length}
      RETURNING *
    `;

    const { rows } = await db.query(sql, values);
    if (!rows.length)
      return res
        .status(404)
        .json({ error: "Record not found or access denied" });
    return res.json(rows[0]);
  } catch (e) {
    console.error("❌ Commission Update Error:", e.message);
    next(e);
  }
};

// --- IDOR SECURED STATUS UPDATES ---

exports.approveCommission = async (req, res, next) => {
  try {
    const sql = `UPDATE commission_data SET status = 'approved', reason = $2 WHERE id = $1 AND company_id = $3 RETURNING *`;
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

exports.rejectCommission = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const reason = req.body.reason || "";
    await client.query("BEGIN");

    const updateSql = `
      UPDATE commission_data c
      SET status = 'rejected', reason = $2 
      WHERE c.id = $1 AND c.company_id = $3
      RETURNING c.*, 
        (SELECT name FROM stores WHERE id = c.store_id) as store_name,
        (SELECT full_name FROM employees WHERE id = c.employee_id) as emp_name
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
    const message = `Commission for ${item.emp_name} ($${item.final_commission}) in ${item.store_name} was rejected. Reason: ${reason}`;

    // Ensure notifications also receive the company_id constraint!
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

exports.auditCommission = async (req, res, next) => {
  try {
    const sql = `UPDATE commission_data SET audit_status = 'audited', audited_by_user_id = $2 WHERE id = $1 AND company_id = $3 RETURNING *`;
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

exports.raiseIssue = async (req, res, next) => {
  try {
    if (!req.body.notes)
      return res.status(400).json({ error: "Notes required" });

    const sql = `
      UPDATE commission_data
      SET notes = $1, status = 'pending', audit_status = 'pending', reason = NULL 
      WHERE id = $2 AND company_id = $3
      RETURNING *;
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

exports.markCommissionPaid = async (req, res, next) => {
  try {
    const { add_amount_by_mm, reason_for_add_amount } = req.body;

    // Safely parse the amount to a number in case the frontend sends a string
    const mmAmount = add_amount_by_mm ? parseFloat(add_amount_by_mm) : 0;

    // Use a CASE statement to determine if the status should revert to pending.
    // We cast to ::numeric to ensure Postgres does a strict mathematical comparison.
    const sql = `
      UPDATE commission_data
      SET 
        add_amount_by_mm = $1, 
        reason_for_add_amount = $2, 
        payment_status = 'paid', 
        status = CASE 
                   WHEN final_commission::numeric = $1::numeric THEN status 
                   ELSE 'pending' 
                 END,
        audit_status = CASE 
                         WHEN final_commission::numeric = $1::numeric THEN audit_status 
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

// Add this inside src/controllers/commission.controller.js
exports.bulkCreateCommission = async (req, res, next) => {
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

    await client.query("BEGIN");

    //  THE FIX: Removed unique_id, amount, and total_deductions. Updated retention tiers.
    const sql = `
      INSERT INTO commission_data (
        company_id, market_id, store_id, employee_id, submitted_by_user_id,
        date, date_period,
        activation_count, act_comm, upgrade_count, upg_comm, hint_sold, hint_comm,
        qualified_box, box_comm, vas_mrc, vas_avg, vas_commission, leasing_done, leasing_commission,
        retention_35, retention_65, retention_95, retention_125, retention_155, retention_185,
        retention_215, retention_245, retention_275, retention_305, retention_335, retention_365,
        retention_commission, acc_profit, acc_tier, acc_commission, his_spiff, total_commission,
        csat_score, csat_comm_loss, rebate_chargeback, deposit_chargeback, inventory_variance_chargeback,
        late_clock_in_chargeback, write_ups, reimbursements, final_commission,
        notes, entry_reason, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
        $41, $42, $43, $44, $45, $46, $47, $48, $49, 'pending'
      )
    `;

    const parseDbNum = (val) => (isNaN(parseFloat(val)) ? 0 : parseFloat(val));

    for (const rec of records) {
      await client.query(sql, [
        companyId,
        market_id,
        parseInt(rec.store_id, 10),
        parseInt(rec.employee_id, 10),
        submittedBy,
        date,
        rec.date_period || null,

        parseDbNum(rec.activation_count),
        parseDbNum(rec.act_comm),
        parseDbNum(rec.upgrade_count),
        parseDbNum(rec.upg_comm),
        parseDbNum(rec.hint_sold),
        parseDbNum(rec.hint_comm),
        parseDbNum(rec.qualified_box),
        parseDbNum(rec.box_comm),
        parseDbNum(rec.vas_mrc),
        parseDbNum(rec.vas_avg),
        parseDbNum(rec.vas_commission),
        parseDbNum(rec.leasing_done),
        parseDbNum(rec.leasing_commission),

        parseDbNum(rec.retention_35),
        parseDbNum(rec.retention_65),
        parseDbNum(rec.retention_95),
        parseDbNum(rec.retention_125),
        parseDbNum(rec.retention_155),
        parseDbNum(rec.retention_185),
        parseDbNum(rec.retention_215),
        parseDbNum(rec.retention_245),
        parseDbNum(rec.retention_275),
        parseDbNum(rec.retention_305),
        parseDbNum(rec.retention_335),
        parseDbNum(rec.retention_365),

        parseDbNum(rec.retention_commission),
        parseDbNum(rec.acc_profit),
        rec.acc_tier || null,
        parseDbNum(rec.acc_commission),
        parseDbNum(rec.his_spiff),
        parseDbNum(rec.total_commission),
        rec.csat_score || null,
        parseDbNum(rec.csat_comm_loss),
        parseDbNum(rec.rebate_chargeback),
        parseDbNum(rec.deposit_chargeback),
        parseDbNum(rec.inventory_variance_chargeback),
        parseDbNum(rec.late_clock_in_chargeback),
        parseDbNum(rec.write_ups),
        parseDbNum(rec.reimbursements),
        parseDbNum(rec.final_commission),

        rec.notes || null,
        rec.entry_reason || "Bulk Upload",
      ]);
    }

    await client.query("COMMIT");
    res
      .status(201)
      .json({ message: `Successfully uploaded ${records.length} records.` });
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
};
