// module.exports = checkClosedBook;
const db = require("../config/db");

const checkClosedBook = async (req, res, next) => {
  try {
    // 🔒 STRICT TENANT CHECK: Support both snake_case and camelCase injections
    const companyId = req.user?.company_id || req.user?.companyId;
    if (!companyId) {
      return res.status(403).json({ error: "Tenant context missing." });
    }

    // 1. Grab the date and market_id
    const targetDate =
      req.body.date || req.body.expense_date || req.body.expensedate;
    const marketId = req.body.market_id || req.body.market;

    // Skip if vital data is missing (let the controller handle payload validation)
    if (!targetDate || !marketId) {
      return next();
    }

    // 2. Safe Date Parsing
    // Converts any valid date string into an ISO string before slicing,
    // ensuring "05/16/2026" and "2026-05-16" BOTH become "2026-05"
    const dateObj = new Date(targetDate);
    if (isNaN(dateObj.getTime())) {
      return next(); // Pass invalid dates to controller validation
    }
    const targetMonth = dateObj.toISOString().substring(0, 7);

    // 3. Database Check
    // Using CAST to TEXT ensures this works whether reconciliation_month is a Date, Timestamp, or Varchar
    const sql = `
      SELECT id FROM monthly_reconciliations 
      WHERE company_id = $1 
      AND market_id = $2 
      AND CAST(reconciliation_month AS TEXT) LIKE $3 || '%'
      LIMIT 1
    `;

    const { rows } = await db.query(sql, [
      companyId,
      marketId, // Passed natively; PostgreSQL driver will auto-cast string integers to Int or keep as UUID
      targetMonth,
    ]);

    // 4. Block if closed
    if (rows.length > 0) {
      return res.status(400).json({
        error: "BOOK_CLOSED",
        message: "Book closed for the month. Contact admin.",
      });
    }

    next();
  } catch (err) {
    console.error("Closed book check error:", err);
    // 🔥 THE FIX: Never "fail open". If the DB query fails, we must block the request.
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Unable to verify accounting book status.",
    });
  }
};

module.exports = checkClosedBook;
