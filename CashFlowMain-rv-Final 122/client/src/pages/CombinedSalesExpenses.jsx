// import React, { useState, useEffect, useCallback, useMemo } from "react";
// import { useGlobalState } from "../context/GlobalStateContext.jsx";
// import api from "../services/api.js";
// import { toISO, fmt2, num, downloadCSV } from "../utils/utils.js";
// import FinancialCards from "../components/FinancialCards.jsx";
// import SpecificDayFilter from "../components/SpecificDayFilter.jsx";

// const ROWS_PER_PAGE = 20;

// function getCurrentYearMonth() {
//   const d = new Date();
//   return { y: d.getFullYear(), m: d.getMonth() + 1 };
// }
// function pad2(n) {
//   return String(n).padStart(2, "0");
// }
// function daysInMonth(year, month) {
//   return new Date(year, month, 0).getDate();
// }

// export default function CombinedSalesExpenses({ onNavigate }) {
//   // 🔥 PHASE 5: Pulling `markets` to map the ID to the UI string
//   const { selectedMarket, selectedStore, markets } = useGlobalState();
//   const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

//   const currentMarketObj = (markets || []).find((m) => m.id === selectedMarket);
//   const displayMarketName = currentMarketObj
//     ? currentMarketObj.name
//     : "All Markets";

//   // --- Filter State ---
//   const [uiYear, setUiYear] = useState(curY);
//   const [uiMonth, setUiMonth] = useState(curM);
//   const [uiStore, setUiStore] = useState("");
//   const [availableStores, setAvailableStores] = useState([]);
//   const [uiSearch, setUiSearch] = useState("");
//   const [uiSpecificDates, setUiSpecificDates] = useState([]);
//   const [availableDatesInMonth, setAvailableDatesInMonth] = useState([]);

//   // --- Data State ---
//   const [rows, setRows] = useState([]);
//   const [totals, setTotals] = useState({});
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [isLoading, setIsLoading] = useState(false);

//   useEffect(() => {
//     setUiSpecificDates([]);
//   }, [uiMonth, uiYear]);

//   // 🔥 PHASE 5: Load Stores as Objects
//   useEffect(() => {
//     if (selectedMarket) {
//       api
//         .getStores(selectedMarket)
//         .then(setAvailableStores)
//         .catch(console.error);
//     } else {
//       setAvailableStores([]);
//     }
//   }, [selectedMarket]);

//   useEffect(() => {
//     setUiStore(selectedStore || "");
//   }, [selectedStore]);

//   // Auto-reset page when any filter triggers
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [selectedMarket, uiStore, uiYear, uiMonth, uiSearch, uiSpecificDates]);

//   const { fromDate, toDate } = useMemo(() => {
//     const d = daysInMonth(uiYear, uiMonth);
//     return {
//       fromDate: `${uiYear}-${pad2(uiMonth)}-01`,
//       toDate: `${uiYear}-${pad2(uiMonth)}-${pad2(d)}`,
//     };
//   }, [uiYear, uiMonth]);

//   // 🚀 SERVER-SIDE FETCHING
//   const fetchData = useCallback(async () => {
//     setIsLoading(true);
//     try {
//       let querySpecificDates = undefined;
//       let queryDateFrom = fromDate;
//       let queryDateTo = toDate;

//       // Mutually Exclusive Dates
//       if (uiSpecificDates.length > 0) {
//         querySpecificDates = uiSpecificDates.join(",");
//         queryDateFrom = undefined;
//         queryDateTo = undefined;
//       }

//       // 🔥 PHASE 5: Pass integers
//       const data = await api.getDashboard({
//         market_id: selectedMarket || undefined,
//         store_id: uiStore || undefined,
//         date_from: queryDateFrom,
//         date_to: queryDateTo,
//         specific_dates: querySpecificDates,
//         search: uiSearch || undefined,
//         page: currentPage,
//         limit: ROWS_PER_PAGE,
//       });

//       setRows(data.data || []);
//       setTotals(data.summary?.totals || {});
//       setTotalPages(data.pagination?.totalPages || 1);

//       if (uiSpecificDates.length === 0) {
//         setAvailableDatesInMonth(data.summary?.availableDates || []);
//       }
//     } catch (e) {
//       console.error("Failed to load combined data:", e);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [
//     selectedMarket,
//     uiStore,
//     fromDate,
//     toDate,
//     uiSpecificDates,
//     uiSearch,
//     currentPage,
//   ]);

//   useEffect(() => {
//     fetchData();
//   }, [fetchData]);

//   // --- Handle Export ---
//   const handleExport = () => {
//     if (!rows || rows.length === 0) return alert("No data to export.");

//     const headers = [
//       "Date",
//       "Market",
//       "Store",
//       "POS Cash",
//       "POS Card",
//       "QPay",
//       "Cash (Sales)",
//       "Store Expenses",
//       "Payroll",
//       "Commission",
//       "Total Expenses",
//       "Net",
//       "Cash in Bank",
//       "Variance",
//     ];
//     const lines = [headers.join(",")];

//     rows.forEach((r) => {
//       lines.push(
//         [
//           r.date,
//           `"${r.market || ""}"`,
//           `"${r.store || ""}"`,
//           r.pos_cash,
//           r.pos_card,
//           r.qpay,
//           r.sales_total,
//           r.expense_other,
//           r.expense_payroll,
//           r.expense_commission,
//           r.expense_total,
//           r.net,
//           r.cash_in_bank,
//           r.variance,
//         ].join(","),
//       );
//     });
//     downloadCSV(
//       `combined_page_${currentPage}_${uiYear}_${pad2(uiMonth)}.csv`,
//       lines.join("\n"),
//     );
//   };

//   const handleNextPage = () =>
//     setCurrentPage((p) => Math.min(p + 1, totalPages));
//   const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

//   const yearOptions = useMemo(
//     () => Array.from({ length: 6 }, (_, i) => curY - 4 + i),
//     [curY],
//   );
//   const monthOptions = [
//     { v: 1, label: "Jan" },
//     { v: 2, label: "Feb" },
//     { v: 3, label: "Mar" },
//     { v: 4, label: "Apr" },
//     { v: 5, label: "May" },
//     { v: 6, label: "Jun" },
//     { v: 7, label: "Jul" },
//     { v: 8, label: "Aug" },
//     { v: 9, label: "Sep" },
//     { v: 10, label: "Oct" },
//     { v: 11, label: "Nov" },
//     { v: 12, label: "Dec" },
//   ];

//   return (
//     <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto relative">
//       {/* --- Financial Cards Section --- */}
//       <FinancialCards
//         sales={totals.sales_total || 0}
//         bank={totals.cash_in_bank || totals.bank || 0}
//         pickup={totals.pickup || 0}
//         expenses={totals.expense_total || 0}
//         storeExpenses={totals.expense_other || 0}
//         payroll={totals.expense_payroll || 0}
//         commission={totals.expense_commission || 0}
//         openingBalance={totals.opening_balance || 0}
//         variance={totals.variance || 0}
//         loading={isLoading}
//         onNavigate={onNavigate}
//       />

//       {/* --- Filters & Search Bar --- */}
//       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
//         {/* Search & Export Row */}
//         <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4">
//           <div className="relative w-full sm:max-w-md">
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 strokeWidth={2}
//                 d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
//               />
//             </svg>
//             <input
//               type="text"
//               placeholder="Search by Market or Store..."
//               value={uiSearch}
//               onChange={(e) => setUiSearch(e.target.value)}
//               className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
//             />
//           </div>
//           <button
//             onClick={handleExport}
//             disabled={rows.length === 0 || isLoading}
//             className="bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-sm px-6 py-2 rounded-lg whitespace-nowrap shadow-sm transition-colors"
//           >
//             Export Page CSV
//           </button>
//         </div>

//         {/* Filters Grid */}

//         <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 items-end">
//           <div className="lg:col-span-2">
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Year
//             </label>
//             <select
//               className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full outline-none bg-white focus:ring-2 focus:ring-indigo-500"
//               value={uiYear}
//               onChange={(e) => setUiYear(Number(e.target.value))}
//             >
//               {yearOptions.map((y) => (
//                 <option key={y} value={y}>
//                   {y}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className="lg:col-span-2">
//             <div className="flex items-center justify-between mb-1">
//               <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
//                 Month
//               </label>
//               <SpecificDayFilter
//                 availableDates={availableDatesInMonth}
//                 selectedDates={uiSpecificDates}
//                 onChange={setUiSpecificDates}
//               />
//             </div>
//             <select
//               className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full outline-none bg-white focus:ring-2 focus:ring-indigo-500"
//               value={uiMonth}
//               onChange={(e) => setUiMonth(Number(e.target.value))}
//             >
//               {monthOptions.map((m) => (
//                 <option key={m.v} value={m.v}>
//                   {m.label}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div className="lg:col-span-2">
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Market
//             </label>
//             <input
//               type="text"
//               value={displayMarketName}
//               className="border border-slate-200 rounded-md px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 cursor-not-allowed"
//               disabled
//             />
//           </div>

//           <div className="lg:col-span-2">
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Store
//             </label>
//             <select
//               className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full outline-none bg-white focus:ring-2 focus:ring-indigo-500"
//               value={uiStore}
//               onChange={(e) =>
//                 setUiStore(e.target.value ? parseInt(e.target.value, 10) : "")
//               }
//             >
//               <option value="">All Stores</option>
//               {availableStores.map((s) => (
//                 <option key={s.id} value={s.id}>
//                   {s.name} {s.code ? `(${s.code})` : ""}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* --- Data Table --- */}
//       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
//         <div className="flex justify-between items-center mb-4">
//           <h2 className="text-lg font-bold text-slate-800 capitalize">
//             Combined Sales & Expenses
//           </h2>
//           <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
//             {rows.length} records shown
//           </span>
//         </div>

//         <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
//           <table className="w-full text-left text-xs whitespace-nowrap">
//             <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
//               <tr>
//                 {/* 🔒 LOCKED COLUMNS */}
//                 <th className="w-[100px] min-w-[100px] max-w-[100px] px-3 py-3 sticky left-0 bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
//                   Date
//                 </th>
//                 <th className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-3 sticky left-[100px] bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
//                   Market/Store
//                 </th>

//                 <th className="px-3 py-3 text-right">Cash (Sales)</th>
//                 <th className="px-3 py-3 text-right">Store Exp</th>
//                 <th className="px-3 py-3 text-right">Payroll</th>
//                 <th className="px-3 py-3 text-right">Comm</th>
//                 <th className="px-3 py-3 text-right text-rose-600 border-l border-slate-200">
//                   Total Exp
//                 </th>
//                 <th className="px-3 py-3 text-right text-indigo-700 bg-indigo-50/50">
//                   Net (Profit)
//                 </th>
//                 <th className="px-3 py-3 text-right bg-slate-100 border-l-2 border-slate-200">
//                   Cash in Bank
//                 </th>
//                 <th className="px-3 py-3 text-right font-extrabold text-slate-700 bg-slate-50">
//                   Variance
//                 </th>
//               </tr>
//             </thead>

//             <tbody className="divide-y divide-slate-100 bg-white">
//               {isLoading ? (
//                 <tr>
//                   <td colSpan="10" className="py-12 text-center text-slate-500">
//                     Loading Data...
//                   </td>
//                 </tr>
//               ) : rows.length === 0 ? (
//                 <tr>
//                   <td
//                     colSpan="10"
//                     className="py-12 text-center text-slate-500 font-medium"
//                   >
//                     No data to display
//                   </td>
//                 </tr>
//               ) : (
//                 rows.map((r, idx) => (
//                   <tr
//                     key={r.unique_id || idx}
//                     className="hover:bg-blue-50 transition-colors group h-12"
//                   >
//                     <td className="w-[100px] min-w-[100px] max-w-[100px] px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r font-medium text-slate-700">
//                       {r.date}
//                     </td>
//                     <td className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-2 sticky left-[100px] bg-white group-hover:bg-blue-50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
//                       <div className="font-semibold text-slate-800 truncate">
//                         {r.store || "-"}
//                       </div>
//                       <div className="text-[10px] text-slate-400 font-mono truncate">
//                         {r.market || "-"}
//                       </div>
//                     </td>
//                     <td className="px-3 py-2 text-right font-medium">
//                       ${fmt2(r.sales_total)}
//                     </td>
//                     <td className="px-3 py-2 text-right font-mono text-slate-600">
//                       ${fmt2(r.expense_other)}
//                     </td>
//                     <td className="px-3 py-2 text-right font-mono text-slate-600">
//                       ${fmt2(r.expense_payroll)}
//                     </td>
//                     <td className="px-3 py-2 text-right font-mono text-slate-600">
//                       ${fmt2(r.expense_commission)}
//                     </td>
//                     <td className="px-3 py-2 text-right text-rose-600 font-bold border-l border-slate-100 bg-rose-50/10">
//                       ${fmt2(r.expense_total)}
//                     </td>
//                     <td
//                       className={`px-3 py-2 text-right font-extrabold bg-indigo-50/20 ${r.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}
//                     >
//                       ${fmt2(r.net)}
//                     </td>
//                     <td className="px-3 py-2 text-right font-mono bg-slate-50/50 border-l-2 border-slate-100">
//                       ${fmt2(r.cash_in_bank)}
//                     </td>
//                     <td
//                       className={`px-3 py-2 text-right font-extrabold tracking-tight bg-slate-50/30 ${r.variance >= 0 ? "text-indigo-600" : "text-orange-600"}`}
//                     >
//                       ${fmt2(r.variance)}
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>

//             <tfoot>
//               {/* GRAND TOTALS */}
//               <tr className="font-bold bg-indigo-50/30 border-t border-indigo-100 text-indigo-900 uppercase tracking-wider">
//                 <td
//                   className="px-3 py-3 text-right text-indigo-900 sticky left-0 z-20 bg-indigo-50/30"
//                   colSpan="2"
//                 >
//                   <span className="pr-4">Filtered Grand Total:</span>
//                 </td>
//                 <td className="px-3 py-3 text-right">
//                   ${fmt2(totals.sales_total || 0)}
//                 </td>
//                 <td className="px-3 py-3 text-right font-mono text-indigo-800">
//                   ${fmt2(totals.expense_other || 0)}
//                 </td>
//                 <td className="px-3 py-3 text-right font-mono text-indigo-800">
//                   ${fmt2(totals.expense_payroll || 0)}
//                 </td>
//                 <td className="px-3 py-3 text-right font-mono text-indigo-800">
//                   ${fmt2(totals.expense_commission || 0)}
//                 </td>
//                 <td className="px-3 py-3 text-right text-rose-600 font-bold border-l border-indigo-200">
//                   ${fmt2(totals.expense_total || 0)}
//                 </td>
//                 <td
//                   className={`px-3 py-3 text-right font-extrabold bg-indigo-100/50 ${(totals.net || 0) >= 0 ? "text-emerald-700" : "text-rose-700"}`}
//                 >
//                   ${fmt2(totals.net || 0)}
//                 </td>
//                 <td className="px-3 py-3 text-right bg-indigo-50 border-l-2 border-indigo-200">
//                   ${fmt2(totals.cash_in_bank || 0)}
//                 </td>
//                 <td
//                   className={`px-3 py-3 text-right font-extrabold tracking-tight bg-indigo-100/30 ${(totals.variance || 0) >= 0 ? "text-indigo-700" : "text-orange-700"}`}
//                 >
//                   ${fmt2(totals.variance || 0)}
//                 </td>
//               </tr>
//             </tfoot>
//           </table>
//         </div>

//         {/* Pagination Controls */}
//         <div className="flex items-center justify-between pt-4">
//           <span className="text-xs font-bold text-slate-500">
//             Page {currentPage} of {totalPages}
//           </span>
//           <div className="flex gap-2">
//             <button
//               onClick={handlePrevPage}
//               disabled={currentPage === 1 || isLoading}
//               className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors"
//             >
//               Prev
//             </button>
//             <button
//               onClick={handleNextPage}
//               disabled={
//                 currentPage === totalPages || totalPages === 0 || isLoading
//               }
//               className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors"
//             >
//               Next
//             </button>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
import { toISO, fmt2, num, downloadCSV } from "../utils/utils.js";
import FinancialCards from "../components/FinancialCards.jsx";
import SpecificDayFilter from "../components/SpecificDayFilter.jsx";

const ROWS_PER_PAGE = 20;

function getCurrentYearMonth() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}
function pad2(n) {
  return String(n).padStart(2, "0");
}
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

export default function CombinedSalesExpenses({ onNavigate }) {
  const { selectedMarket, selectedStore, markets } = useGlobalState();
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

  const currentMarketObj = (markets || []).find(
    (m) => String(m.id) === String(selectedMarket),
  );
  const displayMarketName = currentMarketObj
    ? currentMarketObj.name
    : "All Markets";

  // --- Filter State ---
  const [uiYear, setUiYear] = useState(curY);
  const [uiMonth, setUiMonth] = useState(curM);
  const [uiStore, setUiStore] = useState("");
  const [availableStores, setAvailableStores] = useState([]);
  const [uiSearch, setUiSearch] = useState("");
  const [uiSpecificDates, setUiSpecificDates] = useState([]);
  const [availableDatesInMonth, setAvailableDatesInMonth] = useState([]);

  // --- Data State ---
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUiSpecificDates([]);
  }, [uiMonth, uiYear]);

  useEffect(() => {
    if (selectedMarket) {
      api
        .getStores(selectedMarket)
        .then(setAvailableStores)
        .catch(console.error);
    } else {
      setAvailableStores([]);
    }
  }, [selectedMarket]);

  useEffect(() => {
    setUiStore(selectedStore || "");
  }, [selectedStore]);

  // Auto-reset page when any filter triggers
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMarket, uiStore, uiYear, uiMonth, uiSearch, uiSpecificDates]);

  const { fromDate, toDate } = useMemo(() => {
    const d = daysInMonth(uiYear, uiMonth);
    return {
      fromDate: `${uiYear}-${pad2(uiMonth)}-01`,
      toDate: `${uiYear}-${pad2(uiMonth)}-${pad2(d)}`,
    };
  }, [uiYear, uiMonth]);

  // 🚀 SERVER-SIDE FETCHING
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      let querySpecificDates = undefined;
      let queryDateFrom = fromDate;
      let queryDateTo = toDate;

      // Mutually Exclusive Dates
      if (uiSpecificDates.length > 0) {
        querySpecificDates = uiSpecificDates.join(",");
        queryDateFrom = undefined;
        queryDateTo = undefined;
      }

      // 🔥 FIX 1: Explicit integer casting for IDOR & Data Coercion Safety
      const payload = {
        market_id: selectedMarket ? parseInt(selectedMarket, 10) : undefined,
        store_id: uiStore ? parseInt(uiStore, 10) : undefined,
        date_from: queryDateFrom,
        date_to: queryDateTo,
        specific_dates: querySpecificDates,
        search: uiSearch || undefined,
        page: currentPage,
        limit: ROWS_PER_PAGE,
      };

      const data = await api.getDashboard(payload);

      // 🔥 FIX 2: Bulletproof row normalization to prevent NaN in table and CSV exports
      const processedRows = (data.data || []).map((row) => ({
        ...row,
        pos_cash: Number(row.pos_cash) || 0,
        pos_card: Number(row.pos_card) || 0,
        qpay: Number(row.qpay) || 0,
        sales_total: Number(row.sales_total) || 0,
        expense_other: Number(row.expense_other) || 0,
        expense_payroll: Number(row.expense_payroll) || 0,
        expense_commission: Number(row.expense_commission) || 0,
        expense_total: Number(row.expense_total) || 0,
        net: Number(row.net) || 0,
        cash_in_bank: Number(row.cash_in_bank) || 0,
        variance: Number(row.variance) || 0,
      }));
      setRows(processedRows);

      // 🔥 FIX 3: Bulletproof Totals normalization
      const rawTotals = data.summary?.totals || {};
      setTotals({
        sales_total: Number(rawTotals.sales_total) || 0,
        cash_in_bank:
          Number(rawTotals.cash_in_bank) || Number(rawTotals.bank) || 0,
        pickup: Number(rawTotals.pickup) || 0,
        expense_total: Number(rawTotals.expense_total) || 0,
        expense_other: Number(rawTotals.expense_other) || 0,
        expense_payroll: Number(rawTotals.expense_payroll) || 0,
        expense_commission: Number(rawTotals.expense_commission) || 0,
        opening_balance: Number(rawTotals.opening_balance) || 0,
        variance: Number(rawTotals.variance) || 0,
        net: Number(rawTotals.net) || 0,
      });

      setTotalPages(data.pagination?.totalPages || 1);

      if (uiSpecificDates.length === 0) {
        setAvailableDatesInMonth(data.summary?.availableDates || []);
      }
    } catch (e) {
      console.error("Failed to load combined data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedMarket,
    uiStore,
    fromDate,
    toDate,
    uiSpecificDates,
    uiSearch,
    currentPage,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handle Export ---
  const handleExport = () => {
    if (!rows || rows.length === 0) return alert("No data to export.");

    const headers = [
      "Date",
      "Market",
      "Store",
      "POS Cash",
      "POS Card",
      "QPay",
      "Cash (Sales)",
      "Store Expenses",
      "Payroll",
      "Commission",
      "Total Expenses",
      "Net",
      "Cash in Bank",
      "Variance",
    ];
    const lines = [headers.join(",")];

    rows.forEach((r) => {
      lines.push(
        [
          r.date,
          `"${r.market || ""}"`,
          `"${r.store || ""}"`,
          r.pos_cash,
          r.pos_card,
          r.qpay,
          r.sales_total,
          r.expense_other,
          r.expense_payroll,
          r.expense_commission,
          r.expense_total,
          r.net,
          r.cash_in_bank,
          r.variance,
        ].join(","),
      );
    });
    downloadCSV(
      `combined_page_${currentPage}_${uiYear}_${pad2(uiMonth)}.csv`,
      lines.join("\n"),
    );
  };

  const handleNextPage = () =>
    setCurrentPage((p) => Math.min(p + 1, totalPages));
  const handlePrevPage = () => setCurrentPage((p) => Math.max(p - 1, 1));

  const yearOptions = useMemo(
    () => Array.from({ length: 6 }, (_, i) => curY - 4 + i),
    [curY],
  );
  const monthOptions = [
    { v: 1, label: "Jan" },
    { v: 2, label: "Feb" },
    { v: 3, label: "Mar" },
    { v: 4, label: "Apr" },
    { v: 5, label: "May" },
    { v: 6, label: "Jun" },
    { v: 7, label: "Jul" },
    { v: 8, label: "Aug" },
    { v: 9, label: "Sep" },
    { v: 10, label: "Oct" },
    { v: 11, label: "Nov" },
    { v: 12, label: "Dec" },
  ];

  return (
    <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto relative">
      {/* --- Financial Cards Section --- */}
      <FinancialCards
        sales={totals.sales_total}
        bank={totals.cash_in_bank}
        pickup={totals.pickup}
        expenses={totals.expense_total}
        storeExpenses={totals.expense_other}
        payroll={totals.expense_payroll}
        commission={totals.expense_commission}
        openingBalance={totals.opening_balance}
        variance={totals.variance}
        loading={isLoading}
        onNavigate={onNavigate}
      />

      {/* --- Filters & Search Bar --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        {/* Search & Export Row */}
        <div className="mb-4 flex flex-col sm:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-4">
          <div className="relative w-full sm:max-w-md">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by Market or Store..."
              value={uiSearch}
              onChange={(e) => setUiSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
            />
          </div>
          <button
            onClick={handleExport}
            disabled={rows.length === 0 || isLoading}
            className="bg-slate-700 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold text-sm px-6 py-2 rounded-lg whitespace-nowrap shadow-sm transition-colors"
          >
            Export Page CSV
          </button>
        </div>

        {/* Filters Grid */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 items-end">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Year
            </label>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full outline-none bg-white focus:ring-2 focus:ring-indigo-500"
              value={uiYear}
              onChange={(e) => setUiYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Month
              </label>
              <SpecificDayFilter
                availableDates={availableDatesInMonth}
                selectedDates={uiSpecificDates}
                onChange={setUiSpecificDates}
              />
            </div>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full outline-none bg-white focus:ring-2 focus:ring-indigo-500"
              value={uiMonth}
              onChange={(e) => setUiMonth(Number(e.target.value))}
            >
              {monthOptions.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Market
            </label>
            <input
              type="text"
              value={displayMarketName}
              className="border border-slate-200 rounded-md px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 cursor-not-allowed"
              disabled
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Store
            </label>
            <select
              className="border border-slate-300 rounded-md px-3 py-2 text-sm w-full outline-none bg-white focus:ring-2 focus:ring-indigo-500"
              value={uiStore}
              onChange={(e) =>
                setUiStore(e.target.value ? parseInt(e.target.value, 10) : "")
              }
            >
              <option value="">All Stores</option>
              {availableStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* --- Data Table --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-slate-800 capitalize">
            Combined Sales & Expenses
          </h2>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {rows.length} records shown
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="w-[100px] min-w-[100px] max-w-[100px] px-3 py-3 sticky left-0 bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Date
                </th>
                <th className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-3 sticky left-[100px] bg-slate-50 z-20 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  Market/Store
                </th>
                <th className="px-3 py-3 text-right">Cash (Sales)</th>
                <th className="px-3 py-3 text-right">Store Exp</th>
                <th className="px-3 py-3 text-right">Payroll</th>
                <th className="px-3 py-3 text-right">Comm</th>
                <th className="px-3 py-3 text-right text-rose-600 border-l border-slate-200">
                  Total Exp
                </th>
                <th className="px-3 py-3 text-right text-indigo-700 bg-indigo-50/50">
                  Net (Profit)
                </th>
                <th className="px-3 py-3 text-right bg-slate-100 border-l-2 border-slate-200">
                  Cash in Bank
                </th>
                <th className="px-3 py-3 text-right font-extrabold text-slate-700 bg-slate-50">
                  Variance
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-500">
                    Loading Data...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="py-12 text-center text-slate-500 font-medium"
                  >
                    No data to display
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => (
                  <tr
                    key={r.unique_id || idx}
                    className="hover:bg-blue-50 transition-colors group h-12"
                  >
                    <td className="w-[100px] min-w-[100px] max-w-[100px] px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r font-medium text-slate-700">
                      {r.date}
                    </td>
                    <td className="w-[180px] min-w-[180px] max-w-[180px] px-3 py-2 sticky left-[100px] bg-white group-hover:bg-blue-50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="font-semibold text-slate-800 truncate">
                        {r.store || "-"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {r.market || "-"}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      ${fmt2(r.sales_total)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">
                      ${fmt2(r.expense_other)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">
                      ${fmt2(r.expense_payroll)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-600">
                      ${fmt2(r.expense_commission)}
                    </td>
                    <td className="px-3 py-2 text-right text-rose-600 font-bold border-l border-slate-100 bg-rose-50/10">
                      ${fmt2(r.expense_total)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-extrabold bg-indigo-50/20 ${r.net >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      ${fmt2(r.net)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono bg-slate-50/50 border-l-2 border-slate-100">
                      ${fmt2(r.cash_in_bank)}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-extrabold tracking-tight bg-slate-50/30 ${r.variance >= 0 ? "text-indigo-600" : "text-orange-600"}`}
                    >
                      ${fmt2(r.variance)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot>
              {/* GRAND TOTALS */}
              <tr className="font-bold bg-indigo-50/30 border-t border-indigo-100 text-indigo-900 uppercase tracking-wider">
                <td
                  className="px-3 py-3 text-right text-indigo-900 sticky left-0 z-20 bg-indigo-50/30"
                  colSpan="2"
                >
                  <span className="pr-4">Filtered Grand Total:</span>
                </td>
                <td className="px-3 py-3 text-right">
                  ${fmt2(totals.sales_total)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-indigo-800">
                  ${fmt2(totals.expense_other)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-indigo-800">
                  ${fmt2(totals.expense_payroll)}
                </td>
                <td className="px-3 py-3 text-right font-mono text-indigo-800">
                  ${fmt2(totals.expense_commission)}
                </td>
                <td className="px-3 py-3 text-right text-rose-600 font-bold border-l border-indigo-200">
                  ${fmt2(totals.expense_total)}
                </td>
                <td
                  className={`px-3 py-3 text-right font-extrabold bg-indigo-100/50 ${totals.net >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                >
                  ${fmt2(totals.net)}
                </td>
                <td className="px-3 py-3 text-right bg-indigo-50 border-l-2 border-indigo-200">
                  ${fmt2(totals.cash_in_bank)}
                </td>
                <td
                  className={`px-3 py-3 text-right font-extrabold tracking-tight bg-indigo-100/30 ${totals.variance >= 0 ? "text-indigo-700" : "text-orange-700"}`}
                >
                  ${fmt2(totals.variance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs font-bold text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1 || isLoading}
              className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={handleNextPage}
              disabled={
                currentPage === totalPages || totalPages === 0 || isLoading
              }
              className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-300 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
