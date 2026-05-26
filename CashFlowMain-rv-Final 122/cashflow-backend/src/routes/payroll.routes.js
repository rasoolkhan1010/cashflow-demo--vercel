const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
  ROLES,
  authorizeRoles,
  authorizeMarketAccess,
} = require("../middleware/rbac");
const checkClosedBook = require("../middleware/checkClosedBook");
const payrollController = require("../controllers/payroll.controller");

// --- Role Groups ---
const READ_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.EXPENSE_COMMISSION_MANAGER,
  ROLES.PAYROLL_MANAGER,
];

const WRITE_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.PAYROLL_MANAGER,
];

const APPROVER_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PAYROLL_MANAGER];

// --- 1. GET ALL PAYROLL ---
router.get(
  "/",
  authenticateToken,
  authorizeRoles(...READ_ROLES),
  payrollController.getPayroll,
);

// --- 2. CREATE PAYROLL ---
router.post(
  "/",
  authenticateToken,
  authorizeRoles(...WRITE_ROLES),
  authorizeMarketAccess, // 🛡️ NEW: Territory Check
  checkClosedBook,
  payrollController.createPayroll,
);

// --- 3. APPROVE PAYROLL ---
router.post(
  "/:id/approve",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES),
  checkClosedBook,
  payrollController.approvePayroll,
);

// --- 4. REJECT PAYROLL ---
router.post(
  "/:id/reject",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES),
  checkClosedBook,
  payrollController.rejectPayroll,
);

// --- 5. AUDIT PAYROLL ---
router.post(
  "/:id/audit",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES),
  checkClosedBook,
  payrollController.auditPayroll,
);
router.post(
  "/bulk",
  authenticateToken,
  authorizeRoles(...WRITE_ROLES),
  authorizeMarketAccess, // 🛡️ Territory Check
  checkClosedBook,
  payrollController.bulkCreatePayroll,
);
// --- 6. RAISE ISSUE ---

router.post(
  "/:id/issue",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES, ROLES.MARKET_MANAGER),
  authorizeMarketAccess, // 🛡️ NEW: Territory Check
  checkClosedBook,
  payrollController.raiseIssue,
);

// --- 7. MARK AS PAID BY MM ---
router.post(
  "/:id/mark-paid",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES, ROLES.MARKET_MANAGER),
  authorizeMarketAccess, // 🛡️ NEW: Territory Check
  checkClosedBook,
  payrollController.markPayrollPaid,
);

// --- 8. UPDATE PAYROLL ---
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles(...WRITE_ROLES),
  authorizeMarketAccess, // 🛡️ NEW: Territory Check
  checkClosedBook,
  payrollController.updatePayrollExpense,
);

module.exports = router;
