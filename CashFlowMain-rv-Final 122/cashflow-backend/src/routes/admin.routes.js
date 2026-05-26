const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middleware/auth");
const { ROLES, authorizeRoles } = require("../middleware/rbac");
const adminController = require("../controllers/admin.controller");

// 🔥 Apply authentication globally, but NOT authorization
router.use(authenticateToken);

// 🔒 Write Roles: Only true Admins can create or edit structural data
const WRITE_ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];

// 📖 Read Roles: Managers MUST be able to read lists to populate their form dropdowns!
const READ_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.MARKET_MANAGER,
  ROLES.EXPENSE_COMMISSION_MANAGER,
  ROLES.PAYROLL_MANAGER,
];
const WRITE_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.PAYROLL_MANAGER];
// ==========================================
// MARKETS
// ==========================================
router.get(
  "/markets",
  authorizeRoles(...READ_ROLES),
  adminController.getMarkets,
);
router.post(
  "/markets",
  authorizeRoles(...WRITE_ADMIN_ROLES),
  adminController.createMarket,
);
router.put(
  "/markets/:id",
  authorizeRoles(...WRITE_ADMIN_ROLES),
  adminController.updateMarket,
);

// ==========================================
// STORES
// ==========================================
router.get("/stores", authorizeRoles(...READ_ROLES), adminController.getStores);
router.post(
  "/stores",
  authorizeRoles(...WRITE_ADMIN_ROLES),
  adminController.createStore,
);
router.put(
  "/stores/:id",
  authorizeRoles(...WRITE_ADMIN_ROLES),
  adminController.updateStore,
);

// ==========================================
// EMPLOYEES
// ==========================================
router.get(
  "/employees",
  authorizeRoles(...READ_ROLES),
  adminController.getEmployees,
);
router.post(
  "/employees",
  authorizeRoles(...WRITE_ROLES),
  adminController.createEmployee,
);
router.put(
  "/employees/:id",
  authorizeRoles(...WRITE_ROLES),
  adminController.updateEmployee,
);

// ==========================================
// SYSTEM USERS
// ==========================================
router.get("/users", authorizeRoles(...READ_ROLES), adminController.getUsers);
router.post(
  "/users",
  authorizeRoles(...WRITE_ADMIN_ROLES),
  adminController.createUser,
);
router.put(
  "/users/:id",
  authorizeRoles(...WRITE_ADMIN_ROLES),
  adminController.updateUser,
);

module.exports = router;
