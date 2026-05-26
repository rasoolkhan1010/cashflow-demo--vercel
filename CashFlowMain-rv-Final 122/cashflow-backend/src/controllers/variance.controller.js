// src/controllers/variance.controller.js
const db = require("../config/db");
const { ROLES, hasGlobalAccess } = require("../middleware/rbac");

exports.getVariance = async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation

    const store_id = req.query.store_id || req.query.store;
    const market_id = req.query.market_id || req.query.market;
    const { date, date_from, date_to, specific_dates, search, status } =
      req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    let whereClauses = ["v.company_id = $1"]; // 🔒 Lock to company
    let params = [companyId];

    if (!hasGlobalAccess(req.user.role)) {
      params.push(req.user.market_ids);
      whereClauses.push(`v.market_id = ANY($${params.length}::int[])`);
    }

    if (market_id) {
      params.push(parseInt(market_id, 10));
      whereClauses.push(`v.market_id = $${params.length}`);
    }
    if (store_id) {
      params.push(parseInt(store_id, 10));
      whereClauses.push(`v.store_id = $${params.length}`);
    }
    if (status && status.toLowerCase() !== "all") {
      params.push(status.trim().toLowerCase());
      whereClauses.push(`v.status = $${params.length}`);
    }

    if (date) {
      params.push(date);
      whereClauses.push(`v.date = $${params.length}`);
    } else if (specific_dates) {
      const dateList = specific_dates.split(",").map((d) => d.trim());
      const placeholders = [];
      for (const d of dateList) {
        params.push(d);
        placeholders.push(`$${params.length}`);
      }
      whereClauses.push(`v.date IN (${placeholders.join(",")})`);
    } else {
      if (date_from) {
        params.push(date_from);
        whereClauses.push(`v.date >= $${params.length}`);
      }
      if (date_to) {
        params.push(date_to);
        whereClauses.push(`v.date <= $${params.length}`);
      }
    }

    if (search) {
      params.push(`%${search.trim()}%`);
      const searchIdx = params.length;
      whereClauses.push(`(
        m.name ILIKE $${searchIdx} OR 
        s.name ILIKE $${searchIdx} OR
        u1.full_name ILIKE $${searchIdx} OR
        v.reason ILIKE $${searchIdx} 
      )`);
    }

    const countSql = `
      SELECT 
        COUNT(*) as total_records, 
        COALESCE(SUM(v.variance_amount), 0) as total_variance,
        COALESCE(SUM(v.resolved_amount), 0) as total_resolved,
        COALESCE(SUM(v.pending_amount), 0) as total_pending,
        ARRAY_AGG(DISTINCT TO_CHAR(v.date, 'YYYY-MM-DD')) as available_dates
      FROM variance_data v
      JOIN markets m ON v.market_id = m.id
      JOIN stores s ON v.store_id = s.id
      LEFT JOIN users u1 ON v.dm_user_id = u1.id
      WHERE ${whereClauses.join(" AND ")}
    `;

    const { rows: countRows } = await db.query(countSql, params);
    const totalRecords = parseInt(countRows[0].total_records);
    const availableDates = (countRows[0].available_dates || [])
      .filter(Boolean)
      .sort();

    const totals = {
      variance: parseFloat(countRows[0].total_variance),
      resolved: parseFloat(countRows[0].total_resolved),
      pending: parseFloat(countRows[0].total_pending),
    };

    params.push(limit, offset);

    const sql = `
      SELECT v.date, m.name AS market, s.name AS store, u1.full_name AS dm_name,
        v.variance_amount, v.resolved_amount, v.pending_amount, v.reason, 
        u2.full_name AS approved_by, v.status, v.chargeback_per_head,
        v.responsible_employee_notes, v.back_office_comment, u3.full_name AS audit_by_arjun
      FROM variance_data v
      JOIN markets m ON v.market_id = m.id
      JOIN stores s ON v.store_id = s.id
      LEFT JOIN users u1 ON v.dm_user_id = u1.id
      LEFT JOIN users u2 ON v.approved_by_user_id = u2.id
      LEFT JOIN users u3 ON v.audited_by_user_id = u3.id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY v.date DESC, m.name, s.name
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
    console.error("❌ Variance fetch error:", e.message);
    next(e);
  }
};
