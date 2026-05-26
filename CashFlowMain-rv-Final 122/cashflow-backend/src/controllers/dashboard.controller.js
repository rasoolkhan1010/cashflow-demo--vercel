// src/controllers/dashboard.controller.js
const db = require("../config/db");
const { ROLES, hasGlobalAccess } = require("../middleware/rbac");

exports.getDashboardData = async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation

    const market_id = req.query.market_id || req.query.market;
    const store_id = req.query.store_id || req.query.store;
    const { date_from, date_to, specific_dates, search } = req.query;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    // 🔒 Set company_id as parameter $1 globally for all sub-queries
    const baseParams = [companyId];
    const filterRefs = {};
    let pIdx = 2; // Start at 2 because $1 is reserved for company_id

    if (!hasGlobalAccess(req.user.role)) {
      filterRefs.user_market_ids = `$${pIdx++}`;
      baseParams.push(req.user.market_ids);
    }

    if (market_id) {
      filterRefs.market_id = `$${pIdx++}`;
      baseParams.push(parseInt(market_id, 10));
    }
    if (store_id) {
      filterRefs.store_id = `$${pIdx++}`;
      baseParams.push(parseInt(store_id, 10));
    }

    if (specific_dates) {
      const dateList = specific_dates.split(",").map((d) => d.trim());
      const placeholders = [];
      for (const d of dateList) {
        baseParams.push(d);
        placeholders.push(`$${pIdx++}`);
      }
      filterRefs.specific_dates = placeholders.join(",");
    } else {
      if (date_from) {
        filterRefs.date_from = `$${pIdx++}`;
        baseParams.push(date_from);
      }
      if (date_to) {
        filterRefs.date_to = `$${pIdx++}`;
        baseParams.push(date_to);
      }
    }

    // 🚀 FILTER BUILDER: Now securely scopes to company_id = $1
    const buildFilter = (fieldDate) => {
      let clauses = ["company_id = $1"]; // 🔒 Every CTE table MUST belong to this tenant

      if (filterRefs.user_market_ids)
        clauses.push(`market_id = ANY(${filterRefs.user_market_ids}::int[])`);
      if (filterRefs.market_id)
        clauses.push(`market_id = ${filterRefs.market_id}`);
      if (filterRefs.store_id)
        clauses.push(`store_id = ${filterRefs.store_id}`);

      if (filterRefs.specific_dates) {
        clauses.push(`${fieldDate} IN (${filterRefs.specific_dates})`);
      } else {
        if (filterRefs.date_from)
          clauses.push(`${fieldDate} >= ${filterRefs.date_from}`);
        if (filterRefs.date_to)
          clauses.push(`${fieldDate} <= ${filterRefs.date_to}`);
      }
      return clauses.join(" AND ");
    };

    const salesFilter = buildFilter("date");
    const expFilter = buildFilter("expense_date");
    const payFilter = buildFilter("date");
    const cashFilter = buildFilter("date");

    let combinedSearchClause = "";
    const sqlParams = [...baseParams];
    if (search) {
      sqlParams.push(`%${search.trim()}%`);
      combinedSearchClause = `WHERE (m.name ILIKE $${pIdx} OR s.name ILIKE $${pIdx})`;
    }

    const sql = `
      WITH sales AS (
        SELECT date, market_id, store_id, SUM(pos_cash) AS s_cash, SUM(pos_debit) AS s_debit, SUM(qpay_payment) AS s_qpay, SUM(cashinbank) AS cash_in_bank
        FROM pos_data WHERE ${salesFilter} GROUP BY date, market_id, store_id
      ),
      expenses AS (
        SELECT expense_date AS date, market_id, store_id, SUM(amount) AS expense_other
        FROM expenses WHERE ${expFilter} AND status='approved' AND audit_status='audited' AND LOWER(category) NOT IN ('payroll','commission') 
        GROUP BY expense_date, market_id, store_id
      ),
      payroll AS (
        SELECT date, market_id, store_id, SUM(add_amount_by_mm) AS expense_payroll
        FROM payroll_expenses WHERE ${payFilter} AND status='approved' AND audit_status='audited' AND LOWER(category)='payroll' AND payment_status = 'paid'
        GROUP BY date, market_id, store_id
      ),
      commission AS (
        SELECT date, market_id, store_id, SUM(add_amount_by_mm) AS expense_commission
        FROM commission_data WHERE ${payFilter} AND status = 'approved' AND audit_status = 'audited' AND payment_status = 'paid'
        GROUP BY date, market_id, store_id
      ),
      cash AS (
        SELECT date, market_id, store_id, SUM(cash_entry) AS pickup
        FROM market_cash_wallet WHERE ${cashFilter} AND status='approved' AND audit_status='audited'
        GROUP BY date, market_id, store_id
      ),
      combined AS (
        SELECT
          -- 🔥 FIX 1: Grab date directly from USING merge and cast to TEXT to prevent JS Timezone shift
          date::text AS date, 
          market_id,
          store_id,
          COALESCE(s_cash,0) AS sales_cash,
          (COALESCE(s_debit,0) + COALESCE(s_qpay,0)) AS sales_card,
          COALESCE(s_cash,0) AS sales_total,
          COALESCE(cash_in_bank,0) AS cash_in_bank,
          COALESCE(expense_other,0) AS expense_other,
          COALESCE(expense_payroll,0) AS expense_payroll,
          COALESCE(expense_commission,0) AS expense_commission,
          COALESCE(pickup,0) AS pickup
        FROM sales s
        FULL OUTER JOIN expenses e USING(date, market_id, store_id)
        FULL OUTER JOIN payroll p USING(date, market_id, store_id)
        FULL OUTER JOIN commission c USING(date, market_id, store_id)
        FULL OUTER JOIN cash ca USING(date, market_id, store_id)
      )
      SELECT comb.*, m.name AS market, s.name AS store 
      FROM combined comb
      LEFT JOIN markets m ON comb.market_id = m.id
      LEFT JOIN stores s ON comb.store_id = s.id
      ${combinedSearchClause} 
      ORDER BY comb.date DESC, m.name, s.name;
    `;

    const categorySql = `
      SELECT category, SUM(amount) as amount FROM expenses 
      WHERE ${expFilter} AND status='approved' AND audit_status='audited' AND LOWER(category) NOT IN ('payroll','commission') 
      GROUP BY category`;

    const [mainResult, catResult] = await Promise.all([
      db.query(sql, sqlParams),
      db.query(categorySql, baseParams),
    ]);

    const expenseCategories = {};
    catResult.rows.forEach((r) => {
      const cat = r.category
        ? r.category.charAt(0).toUpperCase() + r.category.slice(1)
        : "Other";
      expenseCategories[cat] = Number(r.amount || 0);
    });

    // ==========================================
    // 🔥 SECURE OPENING BALANCE
    // ==========================================
    let openingBalance = 0;
    let earliestDate =
      date_from ||
      (specific_dates ? specific_dates.split(",")[0].trim() : null);

    if (earliestDate) {
      const currentMonthStart = earliestDate.substring(0, 7) + "-01";
      // 🔒 Ensure Opening Balances are tied to $1 (companyId)
      let obParams = [companyId, currentMonthStart];
      let obSql;

      if (market_id) {
        obSql = `
          SELECT opening_balance FROM monthly_reconciliations
          WHERE company_id = $1 AND reconciliation_month < $2 AND market_id = $3
          ORDER BY reconciliation_month DESC LIMIT 1
        `;
        obParams.push(parseInt(market_id, 10));
      } else if (!hasGlobalAccess(req.user.role)) {
        obSql = `
          SELECT SUM(opening_balance) as opening_balance FROM (
            SELECT opening_balance, ROW_NUMBER() OVER(PARTITION BY market_id ORDER BY reconciliation_month DESC) as rn
            FROM monthly_reconciliations WHERE company_id = $1 AND reconciliation_month < $2 AND market_id = ANY($3::int[])
          ) sub WHERE rn = 1
        `;
        obParams.push(req.user.market_ids);
      } else {
        obSql = `
          SELECT SUM(opening_balance) as opening_balance FROM (
            SELECT opening_balance, ROW_NUMBER() OVER(PARTITION BY market_id ORDER BY reconciliation_month DESC) as rn
            FROM monthly_reconciliations WHERE company_id = $1 AND reconciliation_month < $2
          ) sub WHERE rn = 1
        `;
      }

      const obRes = await db.query(obSql, obParams);
      // 🔥 FIX 4: Explicit array length check before array access
      openingBalance =
        obRes.rows.length > 0 ? Number(obRes.rows[0].opening_balance) || 0 : 0;
    }

    let totals = {
      sales: 0,
      sales_total: 0,
      bank: 0,
      expenses: 0,
      expense_other: 0,
      payroll: 0,
      expense_payroll: 0,
      commission: 0,
      expense_commission: 0,
      pickup: 0,
      variance: 0,
      expense_total: 0,
      net: 0,
      cash_in_bank: 0,
      opening_balance: openingBalance,
    };

    const charts = {
      dailyCash: {},
      dailyCard: {},
      payroll: {},
      expenseCategories,
    };
    const availableDatesSet = new Set();

    const processedRows = mainResult.rows.map((r) => {
      const dStr = r.date ? new Date(r.date).toISOString().split("T")[0] : null;
      if (dStr) availableDatesSet.add(dStr);

      const s_cash = Number(r.sales_cash || 0),
        s_card = Number(r.sales_card || 0),
        s_total = Number(r.sales_total || 0);
      const c_bank = Number(r.cash_in_bank || 0),
        e_other = Number(r.expense_other || 0),
        e_pay = Number(r.expense_payroll || 0);
      const e_comm = Number(r.expense_commission || 0),
        pickup = Number(r.pickup || 0);

      const e_total = e_other + e_pay + e_comm;
      const net = s_total - e_total;
      const variance = c_bank - net;

      totals.sales += s_total;
      totals.sales_total += s_total;
      totals.bank += c_bank;
      totals.cash_in_bank += c_bank;
      totals.expenses += e_other;
      totals.expense_other += e_other;
      totals.payroll += e_pay;
      totals.expense_payroll += e_pay;
      totals.commission += e_comm;
      totals.expense_commission += e_comm;
      totals.pickup += pickup;
      totals.expense_total += e_total;
      totals.net += net;
      totals.variance += variance;

      if (dStr) {
        charts.dailyCash[dStr] = (charts.dailyCash[dStr] || 0) + s_cash;
        charts.dailyCard[dStr] = (charts.dailyCard[dStr] || 0) + s_card;
        if (!charts.payroll[dStr]) charts.payroll[dStr] = {};
        charts.payroll[dStr]["Payroll"] =
          (charts.payroll[dStr]["Payroll"] || 0) + e_pay;
        charts.payroll[dStr]["Commission"] =
          (charts.payroll[dStr]["Commission"] || 0) + e_comm;
      }

      return {
        unique_id: `${r.market_id}_${r.store_id}_${dStr}`,
        date: dStr,
        market: r.market || "",
        store: r.store || "",
        pos_cash: s_cash,
        pos_card: s_card,
        qpay: 0,
        sales_total: s_total,
        expense_other: e_other,
        expense_payroll: e_pay,
        expense_commission: e_comm,
        expense_total: e_total,
        net: net,
        cash_in_bank: c_bank,
        variance: variance,
      };
    });

    const offset = (page - 1) * limit;
    const paginatedRows = processedRows.slice(offset, offset + limit);

    res.json({
      data: paginatedRows,
      summary: { totals, availableDates: Array.from(availableDatesSet).sort() },
      charts,
      pagination: {
        total: processedRows.length,
        page,
        limit,
        totalPages: Math.ceil(processedRows.length / limit),
      },
      approvals: {
        expenses: await getApprovalStats(db, "expenses", expFilter, baseParams),
        payroll: await getApprovalStats(
          db,
          "payroll_expenses",
          payFilter + " AND LOWER(category)='payroll'",
          baseParams,
        ),
        commission: await getApprovalStats(
          db,
          "commission_data",
          payFilter,
          baseParams,
        ),
      },
    });
  } catch (e) {
    next(e);
  }
};

async function getApprovalStats(db, table, filter, params) {
  const amountField =
    table === "commission_data" ? "final_commission" : "amount";
  const sql = `SELECT status, COUNT(*) as count, SUM(${amountField}) as amount FROM ${table} WHERE ${filter} GROUP BY status`;
  const { rows } = await db.query(sql, params);

  const result = {
    pending: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
  };
  rows.forEach((r) => {
    const s = (r.status || "").toLowerCase();
    if (result[s])
      result[s] = { count: Number(r.count), amount: Number(r.amount || 0) };
  });
  return result;
}

exports.getPendingCounts = async (req, res) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation
    const market_id = req.query.market_id || req.query.market;

    // Base parameter is the company ID
    const params = [companyId];
    let marketFilter = "AND company_id = $1";

    if (!hasGlobalAccess(req.user.role)) {
      params.push(req.user.market_ids);
      marketFilter += ` AND market_id = ANY($${params.length}::int[])`;
    }

    if (market_id) {
      params.push(parseInt(market_id, 10));
      marketFilter += ` AND market_id = $${params.length}`;
    }

    const [expenses, payroll, commission] = await Promise.all([
      db.query(
        `SELECT COUNT(*) FROM expenses WHERE status='pending' ${marketFilter}`,
        params,
      ),
      db.query(
        `SELECT COUNT(*) FROM payroll_expenses WHERE status='pending' AND LOWER(category)='payroll' ${marketFilter}`,
        params,
      ),
      db.query(
        `SELECT COUNT(*) FROM commission_data WHERE status='pending' ${marketFilter}`,
        params,
      ),
    ]);

    res.json({
      success: true,
      data: {
        expenses: Number(expenses.rows[0].count || 0),
        payroll: Number(payroll.rows[0].count || 0),
        commission: Number(commission.rows[0].count || 0),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};
