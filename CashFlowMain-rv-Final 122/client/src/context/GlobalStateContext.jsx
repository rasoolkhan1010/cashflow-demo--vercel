// import React, {
//   useState,
//   useEffect,
//   useContext,
//   createContext,
//   useCallback,
// } from "react";
// import { useAuth } from "./AuthContext.jsx";
// import api from "../services/api.js";

// const GlobalStateContext = createContext(null);

// const MARKET_KEY = "selected_market_id";

// export function GlobalStateProvider({ children }) {
//   const { user, isAuthenticated } = useAuth();
//   const role = user?.role;

//   const isAdmin = role === "admin" || role === "super_admin";
//   const hasGlobalAccess = [
//     "admin",
//     "super_admin",
//     "expense_commission_manager",
//     "payroll_manager",
//   ].includes(role);

//   // States hold Arrays of Objects [{ id: 1, name: "Austin" }]
//   const [markets, setMarkets] = useState([]);

//   // Selected states hold Integer IDs
//   const [selectedMarket, setSelectedMarket] = useState(() => {
//     const saved = localStorage.getItem(MARKET_KEY);
//     const parsed = parseInt(saved, 10);
//     return !isNaN(parsed) ? parsed : ""; // Prevent NaN crashes
//   });

//   // Pending Badges
//   const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
//   const [pendingPayrollCount, setPendingPayrollCount] = useState(0);
//   const [pendingCommissionCount, setPendingCommissionCount] = useState(0);

//   // --- FETCHERS ---
//   const fetchMarkets = useCallback(async () => {
//     if (!isAuthenticated) return;
//     try {
//       const data = await api.getMarkets();
//       setMarkets(data || []);

//       // 🚀 BUG FIX: Strict Market Enforcement
//       if (!selectedMarket && data?.length > 0) {
//         if (!hasGlobalAccess) {
//           // If a non-global manager logs in without a selected market,
//           // FORCE select their first assigned market to prevent the "All Markets" leak.
//           handleSetSelectedMarket(data[0].id);
//         } else if (data.length === 1) {
//           // Admins with exactly 1 market should auto-select it
//           handleSetSelectedMarket(data[0].id);
//         }
//       }
//     } catch (err) {
//       console.error("Failed to fetch markets:", err);
//     }
//   }, [isAuthenticated, selectedMarket, hasGlobalAccess]); // Added hasGlobalAccess dependency

//   const refreshPendingBadge = useCallback(async () => {
//     if (!isAuthenticated) return;
//     try {
//       const res = await api.getPendingCounts(selectedMarket || undefined);

//       // 🛡️ Safely handle if Axios wraps the response in 'data'
//       const payload = res?.data ? res.data : res;

//       // 🛡️ Force strict Number casting to prevent string concatenation bugs
//       setPendingApprovalsCount(Number(payload?.expenses) || 0);
//       setPendingPayrollCount(Number(payload?.payroll) || 0);
//       setPendingCommissionCount(Number(payload?.commission) || 0);
//     } catch (err) {
//       console.error("Failed to refresh badges:", err);
//     }
//   }, [isAuthenticated, selectedMarket]);

//   // --- EFFECTS ---
//   useEffect(() => {
//     if (isAuthenticated) fetchMarkets();
//   }, [isAuthenticated, fetchMarkets]);

//   useEffect(() => {
//     if (isAuthenticated) refreshPendingBadge();
//   }, [isAuthenticated, selectedMarket, refreshPendingBadge]);

//   // --- HANDLERS ---
//   const handleSetSelectedMarket = (marketId) => {
//     const parsedId = marketId ? parseInt(marketId, 10) : "";
//     setSelectedMarket(parsedId);

//     if (parsedId && !isNaN(parsedId)) {
//       localStorage.setItem(MARKET_KEY, parsedId);
//     } else {
//       localStorage.removeItem(MARKET_KEY);
//     }
//   };

//   const value = {
//     markets,
//     selectedMarket,
//     setSelectedMarket: handleSetSelectedMarket,
//     pendingApprovalsCount,
//     pendingPayrollCount,
//     pendingCommissionCount,
//     refreshPendingBadge,
//     hasGlobalAccess,
//     isAdmin,
//   };

//   return (
//     <GlobalStateContext.Provider value={value}>
//       {children}
//     </GlobalStateContext.Provider>
//   );
// }

// export const useGlobalState = () => {
//   const context = useContext(GlobalStateContext);
//   if (!context) {
//     throw new Error("useGlobalState must be used within a GlobalStateProvider");
//   }
//   return context;
// };
import React, {
  useState,
  useEffect,
  useContext,
  createContext,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext.jsx";
import api from "../services/api.js";

const GlobalStateContext = createContext(null);

const MARKET_KEY = "selected_market_id";

export function GlobalStateProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const role = user?.role;

  const isAdmin = role === "admin" || role === "super_admin";
  const hasGlobalAccess = [
    "admin",
    "super_admin",
    "expense_commission_manager",
    "payroll_manager",
  ].includes(role);

  const [markets, setMarkets] = useState([]);

  const [selectedMarket, setSelectedMarket] = useState(() => {
    const saved = localStorage.getItem(MARKET_KEY);
    const parsed = parseInt(saved, 10);
    return !isNaN(parsed) ? parsed : "";
  });

  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [pendingPayrollCount, setPendingPayrollCount] = useState(0);
  const [pendingCommissionCount, setPendingCommissionCount] = useState(0);

  const fetchMarkets = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await api.getMarkets();
      setMarkets(data || []);

      if (!selectedMarket && data?.length > 0) {
        if (!hasGlobalAccess) {
          handleSetSelectedMarket(data[0].id);
        } else if (data.length === 1) {
          handleSetSelectedMarket(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch markets:", err);
    }
  }, [isAuthenticated, selectedMarket, hasGlobalAccess]);

  const refreshPendingBadge = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      // 🔥 FIX: Pass as an object so Axios formats it correctly (e.g., ?market_id=1)
      const res = await api.getPendingCounts({
        market_id: selectedMarket || undefined,
      });

      const payload = res?.data ? res.data : res;

      setPendingApprovalsCount(Number(payload?.expenses) || 0);
      setPendingPayrollCount(Number(payload?.payroll) || 0);
      setPendingCommissionCount(Number(payload?.commission) || 0);
    } catch (err) {
      console.error("Failed to refresh badges:", err);
    }
  }, [isAuthenticated, selectedMarket]);

  useEffect(() => {
    if (isAuthenticated) fetchMarkets();
  }, [isAuthenticated, fetchMarkets]);

  useEffect(() => {
    if (isAuthenticated) refreshPendingBadge();
  }, [isAuthenticated, selectedMarket, refreshPendingBadge]);

  const handleSetSelectedMarket = (marketId) => {
    const parsedId = marketId ? parseInt(marketId, 10) : "";
    setSelectedMarket(parsedId);

    if (parsedId && !isNaN(parsedId)) {
      localStorage.setItem(MARKET_KEY, parsedId);
    } else {
      localStorage.removeItem(MARKET_KEY);
    }
  };

  const value = {
    markets,
    selectedMarket,
    setSelectedMarket: handleSetSelectedMarket,
    pendingApprovalsCount,
    pendingPayrollCount,
    pendingCommissionCount,
    refreshPendingBadge,
    hasGlobalAccess,
    isAdmin,
  };

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
}

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
};
