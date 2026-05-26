// const express = require("express");
// const router = express.Router();
// const { authenticateToken } = require("../middleware/auth");
// const {
//   ROLES,
//   authorizeRoles,
//   authorizeMarketAccess,
// } = require("../middleware/rbac"); // 🔥 IMPORTED authorizeMarketAccess
// const expenseController = require("../controllers/expense.controller");
// const checkClosedBook = require("../middleware/checkClosedBook");

// const GLOBAL_ROLES = [
//   ROLES.ADMIN,
//   ROLES.SUPER_ADMIN,
//   ROLES.MARKET_MANAGER,
//   ROLES.EXPENSE_COMMISSION_MANAGER,
//   ROLES.PAYROLL_MANAGER,
// ];

// router.get(
//   "/",
//   authenticateToken,
//   authorizeRoles(...GLOBAL_ROLES),
//   expenseController.getExpenses,
// );

// router.post(
//   "/",
//   authenticateToken,
//   authorizeRoles(...GLOBAL_ROLES),
//   authorizeMarketAccess, // 🛡️ NEW: Territory Check for Market Managers
//   checkClosedBook,
//   expenseController.createExpense,
// );

// module.exports = router;
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
  ROLES,
  authorizeRoles,
  authorizeMarketAccess,
} = require("../middleware/rbac"); // 🔥 IMPORTED authorizeMarketAccess
const expenseController = require("../controllers/expense.controller");
const checkClosedBook = require("../middleware/checkClosedBook");

const GLOBAL_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.EXPENSE_COMMISSION_MANAGER,
  ROLES.PAYROLL_MANAGER,
];

router.get(
  "/",
  authenticateToken,
  authorizeRoles(...GLOBAL_ROLES),
  expenseController.getExpenses,
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles(...GLOBAL_ROLES),
  authorizeMarketAccess, // 🛡️ NEW: Territory Check for Market Managers
  checkClosedBook,
  expenseController.createExpense,
);

module.exports = router;
