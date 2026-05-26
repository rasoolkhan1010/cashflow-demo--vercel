// import React, { useState, useEffect } from "react";
// import { useGlobalState } from "/src/context/GlobalStateContext.jsx";
// import { useAuth } from "/src/context/AuthContext.jsx";
// import { XIcon } from "/src/components/icons/Icons.jsx";
// import logo from "../../assets/logo-dark.png";
// import MonthlyReconciliations from "/src/components/MonthlyReconciliations.jsx";

// const ChevronDown = ({ className }) => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="currentColor"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//     className={className}
//   >
//     <polyline points="6 9 12 15 18 9" />
//   </svg>
// );

// const navStructure = [
//   { name: "Dashboard", path: "dashboard" },
//   { name: "Cash Tracker", path: "combined-sales-expenses" },
//   { name: "Sales", path: "sales" },
//   { name: "Variance", path: "variance" },
//   { name: "Till Amount", path: "till" },
//   {
//     name: "Store Expenses",
//     id: "group-store-expenses",
//     isGroup: true,
//     children: [
//       { name: "Expense Entry", path: "store-expense" },
//       { name: "Expense Approval", path: "expense-approval", adminOnly: true },
//       { name: "Expense History", path: "expense-history" },
//     ],
//   },
//   {
//     name: "Payroll",
//     id: "group-payroll",
//     isGroup: true,
//     children: [
//       { name: "Payroll Expense", path: "payroll-expense", adminOnly: true },
//       { name: "Payroll Approval", path: "payroll-approval", adminOnly: true },
//       { name: "Payroll History", path: "payroll-history" },
//     ],
//   },
//   {
//     name: "Commission",
//     id: "group-commission",
//     isGroup: true,
//     children: [
//       { name: "Commission Entry", path: "commission-entry", adminOnly: true },
//       {
//         name: "Commission Approval",
//         path: "commission-approval",
//         adminOnly: true,
//       },
//       { name: "Commission History", path: "commission-history" },
//     ],
//   },
//   {
//     name: "Pick Up",
//     id: "group-pickup",
//     isGroup: true,
//     children: [
//       { name: "Pick Up Approval", path: "pickup-approval", adminOnly: true },
//     ],
//   },
//   {
//     name: "Admin Tools",
//     id: "group-admin",
//     isGroup: true,
//     adminOnly: true,
//     children: [
//       {
//         name: "Hierarchy Management",
//         path: "admin-management",
//         adminOnly: true,
//       },
//     ],
//   },
// ];

// const getFlatNavItems = (structure) => {
//   const flat = [];
//   const seenPaths = new Set();
//   structure.forEach((item) => {
//     if (item.isGroup) {
//       item.children.forEach((child) => {
//         if (!seenPaths.has(child.path)) {
//           flat.push(child);
//           seenPaths.add(child.path);
//         }
//       });
//     } else {
//       if (!seenPaths.has(item.path)) {
//         flat.push(item);
//         seenPaths.add(item.path);
//       }
//     }
//   });
//   return flat;
// };

// const allNavItems = getFlatNavItems(navStructure);

// export default function Sidebar({ onNavigate, currentPage, onClose }) {
//   const {
//     markets,
//     selectedMarket,
//     setSelectedMarket,
//     pendingApprovalsCount,
//     pendingPayrollCount,
//     pendingCommissionCount,
//     hasGlobalAccess,
//   } = useGlobalState();

//   const { user } = useAuth();

//   const isAdminBase =
//     user && (user.role === "admin" || user.role === "super_admin");
//   const isExpenseCommissionMgr = user?.role === "expense_commission_manager";
//   const isPayrollMgr = user?.role === "payroll_manager";

//   let allowedPaths;
//   if (isExpenseCommissionMgr) {
//     allowedPaths = [
//       "dashboard",
//       "sales",
//       "variance",
//       "till",
//       "store-expense",
//       "expense-approval",
//       "expense-history",
//       "commission-entry",
//       "commission-approval",
//       "commission-history",
//       "combined-sales-expenses",
//       "in-hand-cash",
//       "pickup-approval",
//     ];
//   } else if (isPayrollMgr) {
//     allowedPaths = [
//       "dashboard",
//       "payroll-expense",
//       "payroll-approval",
//       "payroll-history",
//       "combined-sales-expenses",
//       "in-hand-cash",
//       "admin-management",
//     ];
//   } else if (isAdminBase) {
//     allowedPaths = allNavItems.map((i) => i.path).concat("in-hand-cash");
//   } else {
//     allowedPaths = allNavItems
//       .filter((i) => !i.adminOnly)
//       .map((i) => i.path)
//       .concat("in-hand-cash");
//   }

//   const [expandedGroups, setExpandedGroups] = useState({});

//   useEffect(() => {
//     navStructure.forEach((item) => {
//       if (item.isGroup && item.children.some((c) => c.path === currentPage)) {
//         setExpandedGroups((prev) => ({ ...prev, [item.id]: true }));
//       }
//     });
//   }, [currentPage]);

//   const toggleGroup = (groupId) =>
//     setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

//   const [stagedMarket, setStagedMarket] = useState(selectedMarket || "");

//   useEffect(() => setStagedMarket(selectedMarket || ""), [selectedMarket]);

//   const handleMarketApply = () => {
//     setSelectedMarket(stagedMarket);
//   };

//   const handleNav = (path) => {
//     onNavigate(path);
//     if (onClose) onClose();
//   };

//   const getBadgeForPath = (path) => {
//     if (path === "expense-approval") return Number(pendingApprovalsCount) || 0;
//     if (path === "payroll-approval") return Number(pendingPayrollCount) || 0;
//     if (path === "commission-approval")
//       return Number(pendingCommissionCount) || 0;
//     return 0;
//   };

//   const renderNavLink = (item, isChild = false, parentId = "root") => {
//     const isActive = currentPage === item.path;
//     const badgeCount = getBadgeForPath(item.path);
//     return (
//       <button
//         key={`${parentId}-${item.path}`}
//         type="button"
//         onClick={() => handleNav(item.path)}
//         className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 ${isChild ? "pl-9 text-sm" : ""} ${isActive ? "bg-slate-700 text-white shadow-sm" : "text-slate-200 hover:bg-slate-800 hover:text-white"}`}
//       >
//         <span className="truncate">{item.name}</span>
//         {badgeCount > 0 && (
//           <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[1.25rem] flex items-center justify-center">
//             {badgeCount > 99 ? "99+" : badgeCount}
//           </span>
//         )}
//       </button>
//     );
//   };

//   return (
//     <aside
//       id="sidebar"
//       className="w-64 h-screen bg-slate-900 text-slate-100 p-4 pb-6 flex flex-col shadow-xl border-r border-slate-800 overflow-y-auto no-scrollbar relative"
//     >
//       <button
//         onClick={onClose}
//         className="absolute top-3 right-3 p-2 text-slate-400 rounded-lg lg:hidden hover:bg-slate-800 hover:text-white"
//       >
//         <XIcon className="w-5 h-5" />
//       </button>

//       <div className="mb-2 mt-2 flex items-start">
//         <img
//           src={logo}
//           alt="CashFlow Pro"
//           className="h-14 w-auto object-contain"
//         />
//       </div>

//       <div id="sidebar-markets" className="mb-5 space-y-1">
//         <label className="block text-[11px] uppercase tracking-wide text-slate-400">
//           Market Filter
//         </label>
//         <div className="grid grid-cols-[1fr_auto] gap-2 mt-1">
//           <select
//             value={stagedMarket}
//             onChange={(e) => {
//               const value = e.target.value ? parseInt(e.target.value, 10) : "";
//               setStagedMarket(value);
//             }}
//             className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
//             disabled={!hasGlobalAccess && markets.length <= 1}
//           >
//             {/* 🔥 FIX: Render "All Markets" if they are global OR manage multiple markets */}
//             {(hasGlobalAccess || markets.length > 1) && (
//               <option value="">All Markets</option>
//             )}
//             {markets.map((m) => (
//               <option key={m.id} value={m.id}>
//                 {m.name}
//               </option>
//             ))}
//           </select>
//           <button
//             onClick={handleMarketApply}
//             disabled={
//               stagedMarket === selectedMarket ||
//               (!hasGlobalAccess && markets.length <= 1)
//             }
//             className="text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition"
//           >
//             Apply
//           </button>
//         </div>
//       </div>

//       {isAdminBase && (
//         <div className="mb-6">
//           <MonthlyReconciliations />
//         </div>
//       )}

//       <nav className="space-y-0.5 text-sm flex-1">
//         <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">
//           Menu
//         </p>
//         {navStructure.map((item) => {
//           if (item.isGroup) {
//             const visibleChildren = item.children.filter((child) =>
//               allowedPaths.includes(child.path),
//             );
//             if (visibleChildren.length === 0) return null;
//             const isExpanded = expandedGroups[item.id];
//             const groupBadgeTotal = visibleChildren.reduce(
//               (acc, child) => acc + getBadgeForPath(child.path),
//               0,
//             );

//             return (
//               <div key={item.id} className="mb-1">
//                 <button
//                   onClick={() => toggleGroup(item.id)}
//                   className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-200 ${isExpanded ? "text-slate-100 bg-slate-800/50" : "text-slate-200 hover:bg-slate-800 hover:text-white"}`}
//                 >
//                   <span className="font-medium">{item.name}</span>
//                   <div className="flex items-center gap-2">
//                     {groupBadgeTotal > 0 && (
//                       <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
//                         {groupBadgeTotal}
//                       </span>
//                     )}
//                     <ChevronDown
//                       className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
//                     />
//                   </div>
//                 </button>
//                 {isExpanded && (
//                   <div className="mt-1 space-y-0.5 animate-fadeIn">
//                     {visibleChildren.map((child) =>
//                       renderNavLink(child, true, item.id),
//                     )}
//                   </div>
//                 )}
//               </div>
//             );
//           }
//           if (allowedPaths.includes(item.path))
//             return renderNavLink(item, false, "root");
//           return null;
//         })}
//       </nav>
//       <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
//         <p>© {new Date().getFullYear()} CashFlow Pro</p>
//       </div>
//     </aside>
//   );
// }
import React, { useState, useEffect } from "react";
import { useGlobalState } from "/src/context/GlobalStateContext.jsx";
import { useAuth } from "/src/context/AuthContext.jsx";
import { XIcon } from "/src/components/icons/Icons.jsx";
import logo from "../../assets/logo-dark.png";
import MonthlyReconciliations from "/src/components/MonthlyReconciliations.jsx";

const ChevronDown = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const navStructure = [
  { name: "Dashboard", path: "dashboard" },
  { name: "Cash Tracker", path: "combined-sales-expenses" },
  { name: "Sales", path: "sales" },
  { name: "Variance", path: "variance" },
  { name: "Till Amount", path: "till" },
  {
    name: "Store Expenses",
    id: "group-store-expenses",
    isGroup: true,
    children: [
      { name: "Expense Entry", path: "store-expense" },
      { name: "Expense Approval", path: "expense-approval", adminOnly: true },
      { name: "Expense History", path: "expense-history" },
    ],
  },
  {
    name: "Payroll",
    id: "group-payroll",
    isGroup: true,
    children: [
      { name: "Payroll Expense", path: "payroll-expense", adminOnly: true },
      { name: "Payroll Approval", path: "payroll-approval", adminOnly: true },
      { name: "Payroll History", path: "payroll-history" },
    ],
  },
  {
    name: "Commission",
    id: "group-commission",
    isGroup: true,
    children: [
      { name: "Commission Entry", path: "commission-entry", adminOnly: true },
      {
        name: "Commission Approval",
        path: "commission-approval",
        adminOnly: true,
      },
      { name: "Commission History", path: "commission-history" },
    ],
  },
  {
    name: "Pick Up",
    id: "group-pickup",
    isGroup: true,
    children: [
      { name: "Pick Up Approval", path: "pickup-approval", adminOnly: true },
    ],
  },
  {
    name: "Admin Tools",
    id: "group-admin",
    isGroup: true,
    adminOnly: true,
    children: [
      {
        name: "Hierarchy Management",
        path: "admin-management",
        adminOnly: true,
      },
    ],
  },
];

const getFlatNavItems = (structure) => {
  const flat = [];
  const seenPaths = new Set();
  structure.forEach((item) => {
    if (item.isGroup) {
      item.children.forEach((child) => {
        if (!seenPaths.has(child.path)) {
          flat.push(child);
          seenPaths.add(child.path);
        }
      });
    } else {
      if (!seenPaths.has(item.path)) {
        flat.push(item);
        seenPaths.add(item.path);
      }
    }
  });
  return flat;
};

const allNavItems = getFlatNavItems(navStructure);

export default function Sidebar({ onNavigate, currentPage, onClose }) {
  const {
    markets,
    selectedMarket,
    setSelectedMarket,
    pendingApprovalsCount,
    pendingPayrollCount,
    pendingCommissionCount,
    hasGlobalAccess,
  } = useGlobalState();

  const { user } = useAuth();

  const isAdminBase =
    user && (user.role === "admin" || user.role === "super_admin");
  const isExpenseCommissionMgr = user?.role === "expense_commission_manager";
  const isPayrollMgr = user?.role === "payroll_manager";

  let allowedPaths;
  if (isExpenseCommissionMgr) {
    allowedPaths = [
      "dashboard",
      "sales",
      "variance",
      "till",
      "store-expense",
      "expense-approval",
      "expense-history",
      "commission-entry",
      "commission-approval",
      "commission-history",
      "combined-sales-expenses",
      "in-hand-cash",
      "pickup-approval",
    ];
  } else if (isPayrollMgr) {
    allowedPaths = [
      "dashboard",
      "payroll-expense",
      "payroll-approval",
      "payroll-history",
      "combined-sales-expenses",
      "in-hand-cash",
      "admin-management",
    ];
  } else if (isAdminBase) {
    allowedPaths = allNavItems.map((i) => i.path).concat("in-hand-cash");
  } else {
    allowedPaths = allNavItems
      .filter((i) => !i.adminOnly)
      .map((i) => i.path)
      .concat("in-hand-cash");
  }

  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    navStructure.forEach((item) => {
      if (item.isGroup && item.children.some((c) => c.path === currentPage)) {
        setExpandedGroups((prev) => ({ ...prev, [item.id]: true }));
      }
    });
  }, [currentPage]);

  const toggleGroup = (groupId) =>
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

  const [stagedMarket, setStagedMarket] = useState(selectedMarket || "");

  useEffect(() => setStagedMarket(selectedMarket || ""), [selectedMarket]);

  const handleMarketApply = () => {
    setSelectedMarket(stagedMarket);
  };

  const handleNav = (path) => {
    onNavigate(path);
    if (onClose) onClose();
  };

  const getBadgeForPath = (path) => {
    if (path === "expense-approval") return Number(pendingApprovalsCount) || 0;
    if (path === "payroll-approval") return Number(pendingPayrollCount) || 0;
    if (path === "commission-approval")
      return Number(pendingCommissionCount) || 0;
    return 0;
  };

  const renderNavLink = (item, isChild = false, parentId = "root") => {
    const isActive = currentPage === item.path;
    const badgeCount = getBadgeForPath(item.path);
    return (
      <button
        key={`${parentId}-${item.path}`}
        type="button"
        onClick={() => handleNav(item.path)}
        className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 ${isChild ? "pl-9 text-sm" : ""} ${isActive ? "bg-slate-700 text-white shadow-sm" : "text-slate-200 hover:bg-slate-800 hover:text-white"}`}
      >
        <span className="truncate">{item.name}</span>
        {badgeCount > 0 && (
          <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-medium min-w-[1.25rem] flex items-center justify-center">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside
      id="sidebar"
      className="w-64 h-screen bg-slate-900 text-slate-100 p-4 pb-6 flex flex-col shadow-xl border-r border-slate-800 overflow-y-auto no-scrollbar relative"
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-2 text-slate-400 rounded-lg lg:hidden hover:bg-slate-800 hover:text-white"
      >
        <XIcon className="w-5 h-5" />
      </button>

      {/* 🔥 THE FIX: Company Name displayed under the logo */}
      <div className="mb-4 mt-2 flex flex-col items-start gap-1">
        <img
          src={logo}
          alt="CashFlow Pro"
          className="h-14 w-auto object-contain"
        />
        {user?.companyName && (
          <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest truncate w-full px-1">
            {user.companyName}
          </span>
        )}
      </div>

      <div id="sidebar-markets" className="mb-5 space-y-1">
        <label className="block text-[11px] uppercase tracking-wide text-slate-400">
          Market Filter
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2 mt-1">
          <select
            value={stagedMarket}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value, 10) : "";
              setStagedMarket(value);
            }}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none"
            disabled={!hasGlobalAccess && markets.length <= 1}
          >
            {(hasGlobalAccess || markets.length > 1) && (
              <option value="">All Markets</option>
            )}
            {markets.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleMarketApply}
            disabled={
              stagedMarket === selectedMarket ||
              (!hasGlobalAccess && markets.length <= 1)
            }
            className="text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg disabled:opacity-50 transition"
          >
            Apply
          </button>
        </div>
      </div>

      {isAdminBase && (
        <div className="mb-6">
          <MonthlyReconciliations />
        </div>
      )}

      <nav className="space-y-0.5 text-sm flex-1">
        <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-1.5">
          Menu
        </p>
        {navStructure.map((item) => {
          if (item.isGroup) {
            const visibleChildren = item.children.filter((child) =>
              allowedPaths.includes(child.path),
            );
            if (visibleChildren.length === 0) return null;
            const isExpanded = expandedGroups[item.id];
            const groupBadgeTotal = visibleChildren.reduce(
              (acc, child) => acc + getBadgeForPath(child.path),
              0,
            );

            return (
              <div key={item.id} className="mb-1">
                <button
                  onClick={() => toggleGroup(item.id)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-200 ${isExpanded ? "text-slate-100 bg-slate-800/50" : "text-slate-200 hover:bg-slate-800 hover:text-white"}`}
                >
                  <span className="font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    {groupBadgeTotal > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                        {groupBadgeTotal}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                    />
                  </div>
                </button>
                {isExpanded && (
                  <div className="mt-1 space-y-0.5 animate-fadeIn">
                    {visibleChildren.map((child) =>
                      renderNavLink(child, true, item.id),
                    )}
                  </div>
                )}
              </div>
            );
          }
          if (allowedPaths.includes(item.path))
            return renderNavLink(item, false, "root");
          return null;
        })}
      </nav>
      <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500">
        <p>© {new Date().getFullYear()} CashFlow Pro</p>
      </div>
    </aside>
  );
}
