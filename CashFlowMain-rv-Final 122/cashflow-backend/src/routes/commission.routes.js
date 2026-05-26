const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
  ROLES,
  authorizeRoles,
  authorizeMarketAccess,
} = require("../middleware/rbac"); // 🔥 IMPORTED authorizeMarketAccess
const commissionController = require("../controllers/commission.controller");
const checkClosedBook = require("../middleware/checkClosedBook");

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
  ROLES.EXPENSE_COMMISSION_MANAGER,
];

const APPROVER_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.EXPENSE_COMMISSION_MANAGER,
];

// --- 1. GET ALL COMMISSIONS ---
router.get(
  "/",
  authenticateToken,
  authorizeRoles(...READ_ROLES),
  // No authorizeMarketAccess here because the GET controller dynamically filters the list
  commissionController.getCommissions,
);

// --- 2. CREATE COMMISSION ENTRY ---
router.post(
  "/",
  authenticateToken,
  authorizeRoles(...WRITE_ROLES),
  authorizeMarketAccess, // 🛡️ NEW: Territory Check
  checkClosedBook,
  commissionController.createCommission,
);

// --- 3. UPDATE COMMISSION ENTRY (EDIT) ---
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles(...WRITE_ROLES),
  authorizeMarketAccess, // 🛡️ NEW: Territory Check
  checkClosedBook,
  commissionController.updateCommission,
);

// --- 4. APPROVE ---
router.post(
  "/:id/approve",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES),
  checkClosedBook,
  commissionController.approveCommission,
);

// --- 5. REJECT ---
router.post(
  "/:id/reject",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES),
  checkClosedBook,
  commissionController.rejectCommission,
);

// --- 6. AUDIT ---
router.post(
  "/:id/audit",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES),
  checkClosedBook,
  commissionController.auditCommission,
);

// --- 7. RAISE ISSUE (Reset to Pending) ---
router.post(
  "/:id/issue",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES, ROLES.MARKET_MANAGER),
  authorizeMarketAccess, // 🛡️ NEW: Territory Check
  checkClosedBook,
  commissionController.raiseIssue,
);

// --- 8. MARK AS PAID ---
router.post(
  "/:id/mark-paid",
  authenticateToken,
  authorizeRoles(...APPROVER_ROLES, ROLES.MARKET_MANAGER),
  authorizeMarketAccess, // 🛡️ NEW: Territory Check
  checkClosedBook,
  commissionController.markCommissionPaid,
);
// --- 3. BULK CREATE COMMISSION (CSV UPLOAD) ---
router.post(
  "/bulk",
  authenticateToken,
  authorizeRoles(...WRITE_ROLES),
  authorizeMarketAccess, // 🛡️ Territory Check
  checkClosedBook,
  commissionController.bulkCreateCommission,
);
module.exports = router;
