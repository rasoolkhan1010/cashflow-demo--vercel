// src/middleware/rbac.js

const ROLES = {
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
  MARKET_MANAGER: "market_manager",
  EXPENSE_COMMISSION_MANAGER: "expense_commission_manager",
  PAYROLL_MANAGER: "payroll_manager",
};

// 1. Centralized Global Access Check
// Note: "Global" here means "Has access to all markets WITHIN THEIR SPECIFIC COMPANY"
const hasGlobalAccess = (role) => {
  return [
    ROLES.ADMIN,
    ROLES.SUPER_ADMIN,
    ROLES.EXPENSE_COMMISSION_MANAGER,
    ROLES.PAYROLL_MANAGER,
  ].includes(role);
};

// 2. Standard Role Authorization Middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Forbidden: Insufficient privileges for this action." });
    }
    next();
  };
};

// 3. 🛡️ NEW: Territory Isolation Middleware
// Drop this into routes where a user is creating/editing data for a specific market.
const authorizeMarketAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // If the user is an admin/payroll manager, they bypass the specific market check
  if (hasGlobalAccess(req.user.role)) {
    return next();
  }

  // If the user is a Market Manager, we must verify their territory
  if (req.user.role === ROLES.MARKET_MANAGER) {
    // Intelligently grab the target market from the request (Body, Query, or Params)
    // Adjust 'req.params.id' if your route is something like PUT /markets/:id
    const targetMarketId = parseInt(
      req.body.market_id ||
        req.query.market_id ||
        req.params.market_id ||
        req.params.id,
      10,
    );

    if (!targetMarketId || isNaN(targetMarketId)) {
      return res.status(400).json({
        error: "Market ID is required to verify your territory access.",
      });
    }

    // Verify the target market is in their assigned array (populated by auth.js)
    if (!req.user.market_ids.includes(targetMarketId)) {
      return res.status(403).json({
        error: "Forbidden: You are not assigned to manage this market.",
      });
    }

    return next(); // They have access, proceed!
  }

  // Default deny for any unknown roles that slip through
  return res
    .status(403)
    .json({ error: "Forbidden: Role access level unknown." });
};

// 4. EXPORT EVERYTHING
module.exports = {
  ROLES,
  authorizeRoles,
  hasGlobalAccess,
  authorizeMarketAccess, // <-- Export the new security check
};
