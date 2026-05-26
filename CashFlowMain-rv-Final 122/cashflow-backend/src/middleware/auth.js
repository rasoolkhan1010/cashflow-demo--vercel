const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  try {
    // Verify token and extract payload
    const decodedUser = jwt.verify(token, process.env.JWT_SECRET);

    // 🚨 STRICT MULTI-TENANT CHECK
    if (!decodedUser.company_id) {
      return res.status(403).json({
        error:
          "Legacy token detected. Please log out and log back in to establish tenant identity.",
      });
    }

    // 🔥 THE FIX: Bulletproof Regex Array Extraction
    // This safely extracts numbers whether the JWT provides [1, 2], "[1]", "1,2", or just 1
    let safeMarketIds = [];
    if (decodedUser.market_ids) {
      const stringifiedIds = String(decodedUser.market_ids);
      const matches = stringifiedIds.match(/\d+/g); // Finds all numbers, ignores brackets/commas

      if (matches) {
        safeMarketIds = matches.map((id) => parseInt(id, 10));
      }
    }

    req.user = {
      ...decodedUser,
      company_id: decodedUser.company_id,
      market_ids: safeMarketIds, // Perfectly clean array of integers: e.g., [1]
    };

    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ error: "Token expired. Please log in again." });
    }

    return res.status(403).json({ error: "Invalid token." });
  }
}

module.exports = { authenticateToken };
