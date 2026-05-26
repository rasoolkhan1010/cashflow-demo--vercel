// src/controllers/sales.controller.js
const db = require("../config/db");
const { ROLES, hasGlobalAccess } = require("../middleware/rbac");

exports.getSales = async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation

    const store_id = req.query.store_id || req.query.store;
    const market_id = req.query.market_id || req.query.market;
    const { date, date_from, date_to, specific_dates, search } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    let whereClauses = ["p.company_id = $1"]; // 🔒 Lock to company immediately
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
      whereClauses.push(
        `(m.name ILIKE $${searchIdx} OR s.name ILIKE $${searchIdx})`,
      );
    }

    const countSql = `
      SELECT 
        COUNT(*) as total_records, 
        COALESCE(SUM(p.pos_cash), 0) as total_cash,
        COALESCE(SUM(p.pos_debit), 0) as total_card,
        COALESCE(SUM(p.qpay_payment), 0) as total_qpay,
        COALESCE(SUM(p.cashinbank), 0) as total_bank,
        ARRAY_AGG(DISTINCT TO_CHAR(p.date, 'YYYY-MM-DD')) as available_dates
      FROM pos_data p
      JOIN markets m ON p.market_id = m.id
      JOIN stores s ON p.store_id = s.id
      WHERE ${whereClauses.join(" AND ")}
    `;

    const { rows: countRows } = await db.query(countSql, params);
    const totalRecords = parseInt(countRows[0].total_records);
    const availableDates = (countRows[0].available_dates || [])
      .filter(Boolean)
      .sort();

    const totals = {
      cash: parseFloat(countRows[0].total_cash),
      card: parseFloat(countRows[0].total_card),
      qpay: parseFloat(countRows[0].total_qpay),
      cashinbank: parseFloat(countRows[0].total_bank),
      total_sales:
        parseFloat(countRows[0].total_cash) +
        parseFloat(countRows[0].total_card) +
        parseFloat(countRows[0].total_qpay),
    };

    params.push(limit, offset);

    const sql = `
      SELECT p.date, m.name AS market, s.name AS store, p.pos_cash, p.pos_debit, p.qpay_payment, p.cashinbank, p.unique_id
      FROM pos_data p
      JOIN markets m ON p.market_id = m.id
      JOIN stores s ON p.store_id = s.id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY p.date DESC, m.name, s.name
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
    console.error("❌ Sales fetch error:", e.message);
    next(e);
  }
};
