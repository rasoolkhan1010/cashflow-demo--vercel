// // // src/routes/notifications.routes.js

// // const express = require("express");
// // const router = express.Router();
// // const db = require("../config/db");
// // const { authenticateToken } = require("../middleware/auth");
// // const { ROLES } = require("../middleware/rbac");

// // // Roles with global access
// // const hasGlobalAccess = (role) =>
// //   [
// //     ROLES.ADMIN,
// //     ROLES.SUPER_ADMIN,
// //     ROLES.EXPENSE_COMMISSION_MANAGER,
// //     ROLES.PAYROLL_MANAGER,
// //   ].includes(role);

// // // --- GET NOTIFICATIONS ---
// // router.get("/", authenticateToken, async (req, res, next) => {
// //   try {
// //     let targetMarket = req.query.market;

// //     // 🔐 MARKET ISOLATION
// //     if (!hasGlobalAccess(req.user.role)) {
// //       targetMarket = req.user.market;
// //     }

// //     // 🛑 SAFETY CHECK
// //     if (!targetMarket) {
// //       console.log("❌ No market found for user");
// //       return res.json([]);
// //     }

// //     // ✅ NORMALIZE MARKET (VERY IMPORTANT)
// //     targetMarket = targetMarket.toLowerCase().trim();

// //     let sql = `
// //       SELECT *
// //       FROM notifications
// //       WHERE is_read = false
// //       AND LOWER(TRIM(market)) = LOWER(TRIM($1))
// //       ORDER BY created_at DESC
// //     `;

// //     const { rows } = await db.query(sql, [targetMarket]);

// //     res.json(rows);
// //   } catch (err) {
// //     console.error(" Notification fetch error:", err.message);
// //     next(err);
// //   }
// // });

// // // --- DISMISS NOTIFICATION ---
// // router.post("/:id/dismiss", authenticateToken, async (req, res, next) => {
// //   try {
// //     const id = req.params.id;

// //     await db.query("UPDATE notifications SET is_read = true WHERE id = $1", [
// //       id,
// //     ]);

// //     res.json({ success: true });
// //   } catch (err) {
// //     console.error("❌ Dismiss error:", err.message);
// //     next(err);
// //   }
// // });
// // // --- CLEAR ALL NOTIFICATIONS ---
// // router.post("/clear-all", authenticateToken, async (req, res, next) => {
// //   try {
// //     let targetMarket = req.body.market;

// //     if (!hasGlobalAccess(req.user.role)) {
// //       targetMarket = req.user.market;
// //     }

// //     if (!targetMarket) {
// //       return res.json({ success: false });
// //     }

// //     targetMarket = targetMarket.toLowerCase().trim();

// //     await db.query(
// //       `UPDATE notifications
// //        SET is_read = true
// //        WHERE LOWER(TRIM(market)) = LOWER(TRIM($1))
// //        AND is_read = false`,
// //       [targetMarket],
// //     );

// //     res.json({ success: true });
// //   } catch (err) {
// //     console.error("❌ Clear all error:", err.message);
// //     next(err);
// //   }
// // });

// // module.exports = router;
// // src/routes/notifications.routes.js
// const express = require("express");
// const router = express.Router();
// const db = require("../config/db");
// const { authenticateToken } = require("../middleware/auth");
// const { ROLES, hasGlobalAccess } = require("../middleware/rbac"); // 🔥 Reusing our centralized RBAC!

// // --- GET NOTIFICATIONS ---
// router.get("/", authenticateToken, async (req, res, next) => {
//   try {
//     // 1. Swap String Filters for ID Filters
//     const market_id = req.query.market_id || req.query.market;

//     let sql = `SELECT * FROM notifications WHERE is_read = false`;
//     let params = [];

//     // 🛡️ MARKET ISOLATION GUARD 🛡️
//     if (!hasGlobalAccess(req.user.role)) {
//       // If a specific market is requested, make sure they own it
//       if (market_id) {
//         const parsedId = parseInt(market_id, 10);
//         if (!req.user.market_ids.includes(parsedId)) {
//           return res
//             .status(403)
//             .json({
//               error: "Forbidden: Cannot access this market's notifications.",
//             });
//         }
//         params.push(parsedId);
//         sql += ` AND market_id = $${params.length}`;
//       } else {
//         // 🔥 MULTI-MARKET MAGIC: If no market is specified, fetch notifications for ALL markets they own!
//         if (!req.user.market_ids || req.user.market_ids.length === 0) {
//           return res.json([]); // They own no markets
//         }
//         params.push(req.user.market_ids);
//         sql += ` AND market_id = ANY($${params.length}::int[])`;
//       }
//     } else {
//       // Global Access (Admin/Payroll/etc.)
//       if (market_id) {
//         params.push(parseInt(market_id, 10));
//         sql += ` AND market_id = $${params.length}`;
//       }
//     }

//     sql += ` ORDER BY created_at DESC`;

//     const { rows } = await db.query(sql, params);
//     res.json(rows);
//   } catch (err) {
//     console.error("❌ Notification fetch error:", err.message);
//     next(err);
//   }
// });

// // --- DISMISS SINGLE NOTIFICATION ---
// // (Already perfect since it relies purely on the Primary Key ID!)
// router.post("/:id/dismiss", authenticateToken, async (req, res, next) => {
//   try {
//     const id = req.params.id;
//     await db.query("UPDATE notifications SET is_read = true WHERE id = $1", [
//       id,
//     ]);
//     res.json({ success: true });
//   } catch (err) {
//     console.error("❌ Dismiss error:", err.message);
//     next(err);
//   }
// });

// // --- CLEAR ALL NOTIFICATIONS ---
// router.post("/clear-all", authenticateToken, async (req, res, next) => {
//   try {
//     const market_id = req.body.market_id || req.body.market;

//     let sql = `UPDATE notifications SET is_read = true WHERE is_read = false`;
//     let params = [];

//     // 🛡️ MARKET ISOLATION GUARD 🛡️
//     if (!hasGlobalAccess(req.user.role)) {
//       if (market_id) {
//         const parsedId = parseInt(market_id, 10);
//         if (!req.user.market_ids.includes(parsedId)) {
//           return res.status(403).json({ error: "Forbidden." });
//         }
//         params.push(parsedId);
//         sql += ` AND market_id = $${params.length}`;
//       } else {
//         // Clear all notifications across ALL their assigned markets
//         if (!req.user.market_ids || req.user.market_ids.length === 0) {
//           return res.json({ success: false });
//         }
//         params.push(req.user.market_ids);
//         sql += ` AND market_id = ANY($${params.length}::int[])`;
//       }
//     } else {
//       // Global admin
//       if (market_id) {
//         params.push(parseInt(market_id, 10));
//         sql += ` AND market_id = $${params.length}`;
//       }
//     }

//     await db.query(sql, params);
//     res.json({ success: true });
//   } catch (err) {
//     console.error("❌ Clear all error:", err.message);
//     next(err);
//   }
// });

// module.exports = router;
// src/routes/notifications.routes.js
const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const { ROLES, hasGlobalAccess } = require("../middleware/rbac");

// --- GET NOTIFICATIONS ---
router.get("/", authenticateToken, async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation
    const market_id = req.query.market_id || req.query.market;

    let sql = `SELECT * FROM notifications WHERE is_read = false AND company_id = $1`;
    let params = [companyId];

    // 🛡️ MARKET ISOLATION GUARD 🛡️
    if (!hasGlobalAccess(req.user.role)) {
      if (market_id) {
        const parsedId = parseInt(market_id, 10);
        if (!req.user.market_ids.includes(parsedId)) {
          return res
            .status(403)
            .json({
              error: "Forbidden: Cannot access this market's notifications.",
            });
        }
        params.push(parsedId);
        sql += ` AND market_id = $${params.length}`;
      } else {
        if (!req.user.market_ids || req.user.market_ids.length === 0) {
          return res.json([]);
        }
        params.push(req.user.market_ids);
        sql += ` AND market_id = ANY($${params.length}::int[])`;
      }
    } else {
      if (market_id) {
        params.push(parseInt(market_id, 10));
        sql += ` AND market_id = $${params.length}`;
      }
    }

    sql += ` ORDER BY created_at DESC`;

    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Notification fetch error:", err.message);
    next(err);
  }
});

// --- DISMISS SINGLE NOTIFICATION ---
router.post("/:id/dismiss", authenticateToken, async (req, res, next) => {
  try {
    const id = req.params.id;
    const companyId = req.user.company_id; // 🔒 Prevent IDOR (modifying another tenant's notification)

    await db.query(
      "UPDATE notifications SET is_read = true WHERE id = $1 AND company_id = $2",
      [id, companyId],
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Dismiss error:", err.message);
    next(err);
  }
});

// --- CLEAR ALL NOTIFICATIONS ---
router.post("/clear-all", authenticateToken, async (req, res, next) => {
  try {
    const companyId = req.user.company_id; // 🔒 Tenant Isolation
    const market_id = req.body.market_id || req.body.market;

    let sql = `UPDATE notifications SET is_read = true WHERE is_read = false AND company_id = $1`;
    let params = [companyId];

    // 🛡️ MARKET ISOLATION GUARD 🛡️
    if (!hasGlobalAccess(req.user.role)) {
      if (market_id) {
        const parsedId = parseInt(market_id, 10);
        if (!req.user.market_ids.includes(parsedId)) {
          return res.status(403).json({ error: "Forbidden." });
        }
        params.push(parsedId);
        sql += ` AND market_id = $${params.length}`;
      } else {
        if (!req.user.market_ids || req.user.market_ids.length === 0) {
          return res.json({ success: false });
        }
        params.push(req.user.market_ids);
        sql += ` AND market_id = ANY($${params.length}::int[])`;
      }
    } else {
      if (market_id) {
        params.push(parseInt(market_id, 10));
        sql += ` AND market_id = $${params.length}`;
      }
    }

    await db.query(sql, params);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Clear all error:", err.message);
    next(err);
  }
});

module.exports = router;
