// // module.exports = router;
// // src/routes/markets.routes.js
// const express = require("express");
// const router = express.Router();
// const db = require("../config/db"); // Your pg pool

// // Import the middlewares
// const { authenticateToken } = require("../middleware/auth");
// const { ROLES, authorizeRoles } = require("../middleware/rbac");

// // Route: Get all markets
// // Only global roles can hit this endpoint to populate their Market Dropdowns
// router.get(
//   "/all",
//   authenticateToken,
//   // 🛡️ CRITICAL FIX: Updated to match unified roles and added SUPER_ADMIN
//   authorizeRoles(
//     ROLES.ADMIN,
//     ROLES.SUPER_ADMIN,
//     ROLES.EXPENSE_COMMISSION_MANAGER,
//     ROLES.PAYROLL_MANAGER,
//   ),
//   async (req, res) => {
//     try {
//       // 🔥 PHASE 4 FIX:
//       // 1. We query the actual `markets` table instead of the deleted `all_info` table.
//       // 2. We no longer need DISTINCT or TRIM because the table enforces unique, clean names.

//       let sql = `
//         SELECT id, name
//         FROM public.markets
//         ORDER BY name
//       `;
//       let params = [];

//       // 💡 MULTI-TENANT OPTION:
//       // If you added company_id to the users table earlier, uncomment the lines below
//       // so users only see markets belonging to their company!
//       /*
//       sql = `
//         SELECT id, name
//         FROM public.markets
//         WHERE company_id = $1
//         ORDER BY name
//       `;
//       params.push(req.user.company_id);
//       */

//       const { rows } = await db.query(sql, params);

//       // 🔥 RETURN OBJECTS INSTEAD OF STRINGS
//       // Previously: res.json(rows.map((r) => r.market)); -> ['Austin', 'Corpus']
//       // Now: res.json(rows); -> [{ id: 1, name: 'Austin' }, { id: 2, name: 'Corpus' }]
//       res.json(rows);
//     } catch (e) {
//       console.error("markets list error:", e);
//       res.status(500).json({ error: "Failed to load markets" });
//     }
//   },
// );

// module.exports = router;
// src/routes/markets.routes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");

const { authenticateToken } = require("../middleware/auth");
const { ROLES, authorizeRoles } = require("../middleware/rbac");

// Route: Get all markets
router.get(
  "/all",
  authenticateToken,
  authorizeRoles(
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.EXPENSE_COMMISSION_MANAGER,
    ROLES.PAYROLL_MANAGER,
  ),
  async (req, res) => {
    try {
      const companyId = req.user.company_id; // 🔒 Tenant Isolation

      // 🔒 Strictly locked to the user's company
      const sql = `
        SELECT id, name
        FROM public.markets
        WHERE company_id = $1
        ORDER BY name
      `;

      const { rows } = await db.query(sql, [companyId]);

      res.json(rows);
    } catch (e) {
      console.error("markets list error:", e);
      res.status(500).json({ error: "Failed to load markets" });
    }
  },
);

module.exports = router;
