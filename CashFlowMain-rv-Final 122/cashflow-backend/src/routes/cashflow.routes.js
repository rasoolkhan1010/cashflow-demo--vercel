// src/routes/cashflow.routes.js
const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const {
  ROLES,
  authorizeRoles,
  authorizeMarketAccess,
} = require("../middleware/rbac"); // 🔥 IMPORTED Market Access
const checkClosedBook = require("../middleware/checkClosedBook"); // 🔥 IMPORTED Closed Book Check
const cashflowController = require("../controllers/cashflow.controller");

const GLOBAL_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.EXPENSE_COMMISSION_MANAGER,
  ROLES.PAYROLL_MANAGER,
];

// Auditors purposefully left out of POST so they cannot write data
const WRITE_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.EXPENSE_COMMISSION_MANAGER,
];

// --- GET PREVIOUS BALANCE (AUTO CARRY FORWARD) ---
// 🚀 NEW: Fetches yesterday's total balance for the automated till logic
router.get(
  "/previous-balance",
  authenticateToken,
  authorizeRoles(...GLOBAL_ROLES),
  cashflowController.getPreviousBalance,
);

// --- GET CASHFLOW (TILL) ---
// Handles pagination, search, totals, and mutually exclusive date fetching
router.get(
  "/",
  authenticateToken,
  authorizeRoles(...GLOBAL_ROLES),
  cashflowController.getCashflow,
);

// --- POST CASHFLOW (TILL) ---
// Handles creating a new Till record with Market Guard isolation
router.post(
  "/",
  authenticateToken,
  authorizeRoles(...WRITE_ROLES),
  authorizeMarketAccess, // 🛡️ NEW: Territory Check for Market Managers
  checkClosedBook, // 🔒 NEW: Block posts to mathematically closed months
  cashflowController.createCashflow,
);
router.put("/till/:id/audit", authenticateToken, cashflowController.auditTill);
module.exports = router;
