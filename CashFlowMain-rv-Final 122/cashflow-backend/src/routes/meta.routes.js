// src/routes/meta.routes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const { ROLES, hasGlobalAccess } = require("../middleware/rbac");

// GET /api/meta/markets
router.get("/markets", authenticateToken, async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation
    let sql;
    const params = [companyId]; // Start params with company_id

    // 🛡️ MARKET ISOLATION GUARD 🛡️
    if (hasGlobalAccess(req.user.role)) {
      sql = `SELECT id, name FROM public.markets WHERE company_id = $1 ORDER BY name`;
    } else if (req.user.market_ids && req.user.market_ids.length > 0) {
      params.push(req.user.market_ids);
      sql = `SELECT id, name FROM public.markets WHERE company_id = $1 AND id = ANY($2::int[]) ORDER BY name`;
    } else {
      return res.json([]);
    }

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// GET /api/meta/stores
router.get("/stores", authenticateToken, async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation
    let targetMarketId = req.query.market_id || req.query.market;

    // 🔒 Lock query to the tenant immediately
    let whereClauses = ["s.company_id = $1"];
    const params = [companyId];

    // 🛡️ MARKET ISOLATION GUARD 🛡️
    if (!hasGlobalAccess(req.user.role)) {
      params.push(req.user.market_ids);
      whereClauses.push(`s.market_id = ANY($${params.length}::int[])`);
    }

    if (targetMarketId) {
      params.push(parseInt(targetMarketId, 10));
      whereClauses.push(`s.market_id = $${params.length}`);
    }

    const sql = `
      SELECT 
        s.id, s.name, s.store_code AS code, s.market_id, m.name AS market_name
      FROM public.stores s
      JOIN public.markets m ON s.market_id = m.id
      WHERE ${whereClauses.join(" AND ")}
      ORDER BY s.name
    `;

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
