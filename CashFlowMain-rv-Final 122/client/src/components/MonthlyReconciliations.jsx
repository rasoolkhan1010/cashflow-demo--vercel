// import React, { useState, useEffect } from "react";
// import { useGlobalState } from "../context/GlobalStateContext.jsx";
// import api from "../services/api.js";

// export default function MonthlyReconciliations() {
//   // 🔥 Pull 'markets' to map the selectedMarket ID to a string name
//   const { selectedMarket, markets } = useGlobalState();
//   const [isOpen, setIsOpen] = useState(false);
//   const [history, setHistory] = useState([]);
//   const [loading, setLoading] = useState(false);

//   // Map the integer ID back to the human-readable name for display
//   const currentMarketObj = markets.find((m) => m.id === selectedMarket);
//   const displayMarketName = currentMarketObj ? currentMarketObj.name : null;

//   const today = new Date();
//   const defaultYear = today.getFullYear();
//   const defaultMonth = today.getMonth() === 0 ? 12 : today.getMonth();
//   const initialYear = today.getMonth() === 0 ? defaultYear - 1 : defaultYear;

//   const [year, setYear] = useState(initialYear);
//   const [month, setMonth] = useState(defaultMonth);

//   const loadHistory = async () => {
//     if (!selectedMarket) return;
//     try {
//       setLoading(true);
//       // api.js was updated to handle market_id automatically
//       const data = await api.getReconciliations(selectedMarket);
//       setHistory(data);
//     } catch (err) {
//       console.error("Failed to load history:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (isOpen) {
//       loadHistory();
//     }
//   }, [isOpen, selectedMarket]);

//   const handleCloseBook = async () => {
//     if (!selectedMarket) return alert("Select a market first.");

//     const confirmMessage = `Are you sure you want to CLOSE books for ${month}/${year} in ${displayMarketName.toUpperCase()}?\n\nNo new entries, approvals, or modifications can be made for this month once closed.`;

//     if (!window.confirm(confirmMessage)) return;

//     try {
//       setLoading(true);
//       // 🔥 Pass market_id explicitly to the backend
//       await api.closeBook({ market_id: selectedMarket, year, month });
//       loadHistory();
//     } catch (err) {
//       alert(err.message || "Failed to close the book.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleReopen = async (id, recordMonth) => {
//     const formattedMonth = new Date(recordMonth).toISOString().substring(0, 7);

//     if (
//       !window.confirm(
//         `⚠️ WARNING: Are you sure you want to REOPEN ${formattedMonth}?\n\nThis will unlock all records and allow users to edit and add entries for this month again.`,
//       )
//     )
//       return;

//     try {
//       setLoading(true);
//       await api.reopenBook(id);
//       loadHistory();
//     } catch (err) {
//       alert(err.message || "Failed to reopen the book.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <>
//       <button
//         onClick={() => setIsOpen(true)}
//         className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-950 text-white font-bold text-sm px-4 py-2.5 rounded-lg shadow-[0_4px_10px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-0.5 border border-slate-700 w-full"
//       >
//         <svg
//           xmlns="http://www.w3.org/2000/svg"
//           className="h-4 w-4 text-emerald-400"
//           viewBox="0 0 20 20"
//           fill="currentColor"
//         >
//           <path
//             fillRule="evenodd"
//             d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
//             clipRule="evenodd"
//           />
//         </svg>
//         Monthly Reconciliations
//       </button>

//       {isOpen && (
//         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all animate-in zoom-in-95 duration-200">
//             <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
//               <div className="flex items-center gap-4">
//                 <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shadow-sm border border-indigo-100">
//                   <svg
//                     xmlns="http://www.w3.org/2000/svg"
//                     className="h-6 w-6"
//                     fill="none"
//                     viewBox="0 0 24 24"
//                     stroke="currentColor"
//                     strokeWidth={2}
//                   >
//                     <path
//                       strokeLinecap="round"
//                       strokeLinejoin="round"
//                       d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
//                     />
//                   </svg>
//                 </div>
//                 <div>
//                   <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
//                     Monthly Reconciliations
//                   </h2>
//                   <p className="text-xs text-slate-500 font-medium mt-0.5">
//                     Lock accounting books and carry forward balances
//                   </p>
//                 </div>
//               </div>
//               <button
//                 onClick={() => setIsOpen(false)}
//                 className="text-slate-400 hover:bg-slate-100 hover:text-slate-700 p-2 rounded-full transition-colors"
//               >
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   className="h-6 w-6"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   stroke="currentColor"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M6 18L18 6M6 6l12 12"
//                   />
//                 </svg>
//               </button>
//             </div>

//             <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
//               <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm mb-8">
//                 <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
//                   <div className="w-2 h-2 rounded-full bg-rose-500"></div>
//                   Lock Month
//                 </h3>

//                 <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
//                   <div className="sm:col-span-1">
//                     <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
//                       Market
//                     </label>
//                     <input
//                       type="text"
//                       value={
//                         displayMarketName
//                           ? displayMarketName.toUpperCase()
//                           : "Select Market"
//                       }
//                       disabled
//                       className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-500 bg-slate-50 cursor-not-allowed"
//                     />
//                   </div>

//                   <div className="sm:col-span-1">
//                     <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
//                       Year
//                     </label>
//                     <input
//                       type="number"
//                       value={year}
//                       onChange={(e) => setYear(e.target.value)}
//                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
//                     />
//                   </div>

//                   <div className="sm:col-span-1">
//                     <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
//                       Month
//                     </label>
//                     <select
//                       value={month}
//                       onChange={(e) => setMonth(e.target.value)}
//                       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
//                     >
//                       {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
//                         <option key={m} value={m}>
//                           {new Date(0, m - 1).toLocaleString("default", {
//                             month: "short",
//                           })}{" "}
//                           ({m})
//                         </option>
//                       ))}
//                     </select>
//                   </div>

//                   <div className="sm:col-span-1">
//                     <button
//                       onClick={handleCloseBook}
//                       disabled={loading || !selectedMarket}
//                       className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
//                     >
//                       {loading ? (
//                         <span className="animate-pulse">Locking...</span>
//                       ) : (
//                         "Lock Book"
//                       )}
//                     </button>
//                   </div>
//                 </div>
//                 {!selectedMarket && (
//                   <p className="text-xs text-amber-600 font-bold mt-3 flex items-center gap-1.5 bg-amber-50 p-2 rounded-md border border-amber-100">
//                     Please select a Market from the sidebar first.
//                   </p>
//                 )}
//               </div>

//               {/* History Section */}
//               <div className="flex items-center justify-between mb-3 px-1">
//                 <h3 className="text-sm font-bold text-slate-800">
//                   Closed Months History
//                 </h3>
//                 <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md uppercase tracking-wider">
//                   {displayMarketName || "None"}
//                 </span>
//               </div>

//               <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-h-[300px] flex flex-col">
//                 {history.length === 0 ? (
//                   <div className="flex flex-col items-center justify-center p-10 text-center">
//                     <p className="text-slate-500 font-bold text-sm">
//                       No closed months found.
//                     </p>
//                   </div>
//                 ) : (
//                   <div className="overflow-y-auto custom-scrollbar flex-1">
//                     <table className="w-full text-left text-sm whitespace-nowrap">
//                       <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px] sticky top-0 z-10">
//                         <tr>
//                           <th className="px-5 py-3">Locked Month</th>
//                           <th className="px-5 py-3">Market</th>
//                           <th className="px-5 py-3 text-right">
//                             Carry Fwd Balance
//                           </th>
//                           <th className="px-5 py-3 text-center">Action</th>
//                         </tr>
//                       </thead>
//                       <tbody className="divide-y divide-slate-100 bg-white">
//                         {history.map((record) => (
//                           <tr
//                             key={record.id}
//                             className="hover:bg-slate-50/50 transition-colors group h-12"
//                           >
//                             <td className="px-5 py-2 font-bold text-slate-700">
//                               {new Date(record.reconciliation_month)
//                                 .toISOString()
//                                 .substring(0, 7)}
//                             </td>
//                             {/* Record.market is passed as a string from the JOIN in our backend! */}
//                             <td className="px-5 py-2 capitalize font-medium text-slate-600">
//                               {record.market}
//                             </td>
//                             <td className="px-5 py-2 text-right">
//                               <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
//                                 ${Number(record.opening_balance).toFixed(2)}
//                               </span>
//                             </td>
//                             <td className="px-5 py-2 text-center">
//                               <button
//                                 onClick={() =>
//                                   handleReopen(
//                                     record.id,
//                                     record.reconciliation_month,
//                                   )
//                                 }
//                                 disabled={loading}
//                                 className="text-[11px] font-bold text-slate-500 hover:text-rose-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
//                               >
//                                 Reopen
//                               </button>
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }
import React, { useState, useEffect } from "react";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";

export default function MonthlyReconciliations() {
  const { user } = useAuth();
  const { selectedMarket, markets } = useGlobalState();
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔥 The Bouncer: Instantly hides the component for non-admins
  if (user?.role !== "admin" && user?.role !== "super_admin") {
    return null;
  }

  // 🔥 Safe mapping: prevents strict equality (===) failures between strings and ints
  const currentMarketObj = (markets || []).find(
    (m) => String(m.id) === String(selectedMarket),
  );
  const displayMarketName = currentMarketObj ? currentMarketObj.name : null;

  const today = new Date();
  const defaultYear = today.getFullYear();
  const defaultMonth = today.getMonth() === 0 ? 12 : today.getMonth();
  const initialYear = today.getMonth() === 0 ? defaultYear - 1 : defaultYear;

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(defaultMonth);

  const loadHistory = async () => {
    // 🔥 Removed the `if (!selectedMarket) return` block so Admins can view "All Markets"
    try {
      setLoading(true);
      const data = await api.getReconciliations(selectedMarket || undefined);
      setHistory(data);
    } catch (err) {
      console.error("Failed to load history:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, selectedMarket]);

  const handleCloseBook = async () => {
    if (!selectedMarket) return alert("Select a market first.");

    const confirmMessage = `Are you sure you want to CLOSE books for ${month}/${year} in ${displayMarketName.toUpperCase()}?\n\nNo new entries, approvals, or modifications can be made for this month once closed.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      setLoading(true);
      await api.closeBook({ market_id: selectedMarket, year, month });
      loadHistory();
    } catch (err) {
      alert(err.message || "Failed to close the book.");
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async (id, recordMonth) => {
    const formattedMonth = new Date(recordMonth).toISOString().substring(0, 7);

    if (
      !window.confirm(
        `⚠️ WARNING: Are you sure you want to REOPEN ${formattedMonth}?\n\nThis will unlock all records and allow users to edit and add entries for this month again.`,
      )
    )
      return;

    try {
      setLoading(true);
      await api.reopenBook(id);
      loadHistory();
    } catch (err) {
      alert(err.message || "Failed to reopen the book.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-950 text-white font-bold text-sm px-4 py-2.5 rounded-lg shadow-[0_4px_10px_rgba(0,0,0,0.2)] transition-all hover:-translate-y-0.5 border border-slate-700 w-full"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-emerald-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
        Monthly Reconciliations
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] transform transition-all animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl shadow-sm border border-indigo-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                    Monthly Reconciliations
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Lock accounting books and secure previous months balances
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:bg-slate-100 hover:text-slate-700 p-2 rounded-full transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50">
              <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm mb-8">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                  Lock Month
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Market
                    </label>
                    <input
                      type="text"
                      value={
                        displayMarketName
                          ? displayMarketName.toUpperCase()
                          : "Select Market"
                      }
                      disabled
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-500 bg-slate-50 cursor-not-allowed"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Year
                    </label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Month
                    </label>
                    <select
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(0, m - 1).toLocaleString("default", {
                            month: "short",
                          })}{" "}
                          ({m})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-1">
                    <button
                      onClick={handleCloseBook}
                      disabled={loading || !selectedMarket}
                      className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                    >
                      {loading ? (
                        <span className="animate-pulse">Locking...</span>
                      ) : (
                        "Lock Book"
                      )}
                    </button>
                  </div>
                </div>
                {!selectedMarket && (
                  <p className="text-xs text-amber-600 font-bold mt-3 flex items-center gap-1.5 bg-amber-50 p-2 rounded-md border border-amber-100">
                    Please select a Market from the sidebar first.
                  </p>
                )}
              </div>

              {/* History Section */}
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Closed Months History
                </h3>
                <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {displayMarketName || "None"}
                </span>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl shadow-sm max-h-[300px] flex flex-col">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center">
                    <p className="text-slate-500 font-bold text-sm">
                      No closed months found.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-y-auto custom-scrollbar flex-1">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px] sticky top-0 z-10">
                        <tr>
                          <th className="px-5 py-3">Locked Month</th>
                          <th className="px-5 py-3">Market</th>
                          <th className="px-5 py-3 text-right">
                            Previous Months Balance
                          </th>
                          <th className="px-5 py-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {history.map((record) => (
                          <tr
                            key={record.id}
                            className="hover:bg-slate-50/50 transition-colors group h-12"
                          >
                            <td className="px-5 py-2 font-bold text-slate-700">
                              {new Date(record.reconciliation_month)
                                .toISOString()
                                .substring(0, 7)}
                            </td>
                            <td className="px-5 py-2 capitalize font-medium text-slate-600">
                              {record.market}
                            </td>
                            <td className="px-5 py-2 text-right">
                              <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                                ${Number(record.opening_balance).toFixed(2)}
                              </span>
                            </td>
                            <td className="px-5 py-2 text-center">
                              <button
                                onClick={() =>
                                  handleReopen(
                                    record.id,
                                    record.reconciliation_month,
                                  )
                                }
                                disabled={loading}
                                className="text-[11px] font-bold text-slate-500 hover:text-rose-700 bg-white border border-slate-200 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                              >
                                Reopen
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
