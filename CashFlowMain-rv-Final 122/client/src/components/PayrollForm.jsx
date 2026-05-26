// import React, { useEffect, useRef } from "react";
// import { useFormContext } from "react-hook-form";
// import { useGlobalState } from "/src/context/GlobalStateContext.jsx";
// import { fmt2 } from "../utils/utils.js";

// export default function PayrollForm({
//   calculations,
//   availableStores,
//   availableEmployees,
//   market,
//   isSaving,
// }) {
//   const { register, watch, setValue } = useFormContext();
//   const { markets } = useGlobalState();

//   const payType = watch("pay_type");
//   const employeeStats = watch("employee_stats");

//   const isPayrate = payType === "payrate";
//   const isSalaried = payType === "salaried";
//   const showTimesheet = isPayrate || isSalaried;

//   const totalDaysToWork = watch("total_days_to_work");
//   const w1 = watch("working_days_1");
//   const w2 = watch("working_days_2");
//   const dAdj = watch("days_adjusted");

//   const prevTimesheet = useRef("");

//   // Guarantee arrays to prevent .map crashes
//   const safeStores = Array.isArray(availableStores) ? availableStores : [];
//   const safeEmployees = Array.isArray(availableEmployees)
//     ? availableEmployees
//     : [];

//   // Safely parse numbers
//   const safeNumberParser = {
//     setValueAs: (v) => (v === "" || v === null || isNaN(v) ? "" : Number(v)),
//   };

//   // --- Resolve Market Display Name ---
//   let displayMarketName = "All Markets";
//   if (market) {
//     if (typeof market === "object" && market.name) {
//       displayMarketName = market.name;
//     } else {
//       const foundMarket = markets?.find((m) => String(m.id) === String(market));
//       displayMarketName = foundMarket ? foundMarket.name : market;
//     }
//   }

//   // 🔥 VIEW MODE FIX: Extract historical names in case the record is opened in View/Edit mode
//   const selectedEmpId = watch("employee_id");
//   const selectedEmpName =
//     watch("employee_name") || watch("full_name") || watch("employeeName");

//   const isEmpInList = safeEmployees.some((emp) => {
//     const id = emp.id || emp.user_id || emp.employee_id;
//     return String(id) === String(selectedEmpId);
//   });

//   const selectedStoreId = watch("store_id");
//   const selectedStoreName = watch("store_name") || watch("store");
//   const isStoreInList = safeStores.some(
//     (s) => String(s.id) === String(selectedStoreId),
//   );

//   useEffect(() => {
//     if (isSalaried) {
//       const t = parseFloat(totalDaysToWork) || 0;
//       const worked1 = parseFloat(w1) || 0;
//       const worked2 = parseFloat(w2) || 0;
//       const adj = parseFloat(dAdj) || 0;

//       const worked = worked1 + worked2 + adj;
//       const expectedDays = t * 2;
//       const autoLop = worked - expectedDays;

//       const currentTimesheet = `${t}-${worked1}-${worked2}-${adj}`;

//       if (prevTimesheet.current === "") {
//         prevTimesheet.current = currentTimesheet;
//         return;
//       }

//       if (prevTimesheet.current !== currentTimesheet) {
//         setValue("lop_count", autoLop, { shouldDirty: true });
//         prevTimesheet.current = currentTimesheet;
//       }
//     }
//   }, [isSalaried, totalDaysToWork, w1, w2, dAdj, setValue]);

//   return (
//     <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6 transition-all">
//       <h2 className="text-lg font-bold text-slate-800 mb-6 tracking-tight border-b border-slate-100 pb-3">
//         Payroll Record
//       </h2>

//       {/* 1. GENERAL & EMPLOYEE INFO */}
//       <div className="grid gap-4 sm:grid-cols-12 mb-6">
//         <div className="sm:col-span-3">
//           <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//             Date *
//           </label>
//           <input
//             type="date"
//             {...register("date", { required: true })}
//             className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//           />
//         </div>

//         <div className="sm:col-span-4">
//           <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//             Market
//           </label>
//           <input
//             type="text"
//             value={displayMarketName}
//             disabled
//             className="w-full border border-slate-200 bg-slate-50 rounded-md px-3 py-2 text-sm text-slate-500 cursor-not-allowed font-medium"
//           />
//         </div>

//         <div className="sm:col-span-5">
//           <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//             Store *
//           </label>
//           <select
//             {...register("store_id", { required: true, ...safeNumberParser })}
//             disabled={safeStores.length === 0 && !selectedStoreId}
//             className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${safeStores.length === 0 && !selectedStoreId ? "bg-slate-50 cursor-not-allowed text-slate-400" : "bg-white border-slate-300"}`}
//           >
//             <option value="">Select Store...</option>
//             {/* 🔥 VIEW MODE FIX: Historical Store Fallback */}
//             {selectedStoreId && !isStoreInList && (
//               <option value={selectedStoreId}>
//                 {selectedStoreName
//                   ? `${selectedStoreName}`
//                   : `Loading Store...`}
//               </option>
//             )}
//             {safeStores.map((s) => (
//               <option key={s.id} value={s.id}>
//                 {s.name} {s.code ? `(${s.code})` : ""}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div className="sm:col-span-7">
//           <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//             Employee *
//           </label>
//           <select
//             {...register("employee_id", {
//               required: true,
//               ...safeNumberParser,
//             })}
//             disabled={safeEmployees.length === 0 && !selectedEmpId}
//             className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${safeEmployees.length === 0 && !selectedEmpId ? "bg-slate-50 cursor-not-allowed text-slate-400" : "bg-white border-slate-300"}`}
//           >
//             <option value="">Select Employee...</option>
//             {/* 🔥 VIEW MODE FIX: Historical Employee Fallback */}
//             {selectedEmpId && !isEmpInList && (
//               <option value={selectedEmpId}>
//                 {selectedEmpName
//                   ? `${selectedEmpName} (Record)`
//                   : `Loading Employee...`}
//               </option>
//             )}
//             {safeEmployees.map((emp, index) => {
//               const empId = emp.id || emp.user_id || emp.employee_id || index;
//               const empName =
//                 emp.name ||
//                 emp.full_name ||
//                 emp.first_name ||
//                 emp.username ||
//                 "Unknown Employee";
//               const empCode = emp.code || emp.employee_code || emp.ntid || "";
//               return (
//                 <option key={empId} value={empId}>
//                   {empName} {empCode ? `(${empCode})` : ""}
//                 </option>
//               );
//             })}
//           </select>
//           {safeEmployees.length === 0 && !selectedEmpId && (
//             <span className="text-[10px] text-amber-500 mt-1 block">
//               Please select a store to view employees.
//             </span>
//           )}
//         </div>

//         <div className="sm:col-span-5">
//           <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//             Date Period *
//           </label>
//           <div className="flex items-center gap-2">
//             <input
//               type="date"
//               {...register("date_period_start", { required: true })}
//               className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//             />
//             <span className="text-slate-400 font-medium text-sm">to</span>
//             <input
//               type="date"
//               {...register("date_period_end", { required: true })}
//               className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//             />
//           </div>
//         </div>
//       </div>

//       {/* 2. PAY TYPE & CLASSIFICATION */}
//       <div className="grid gap-4 sm:grid-cols-3 mb-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg">
//         <div>
//           <label className="block text-[11px] uppercase font-bold text-indigo-600 mb-1.5 tracking-wider">
//             Pay Type *
//           </label>
//           <select
//             {...register("pay_type", { required: true })}
//             className="w-full border border-indigo-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-900 bg-white"
//           >
//             <option value="">Select Type</option>
//             <option value="payrate">Payrate (Hourly)</option>
//             <option value="salaried">Salaried</option>
//           </select>
//         </div>
//         <div>
//           <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//             Employee Stats
//           </label>
//           <select
//             {...register("employee_stats")}
//             className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
//           >
//             <option value="Standard (Default)">Standard (Default)</option>
//             <option value="newlyjoined">Newly Joined</option>
//             <option value="resigning">Resigning</option>
//           </select>
//         </div>
//         {isSalaried && (
//           <div>
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               Payment Status
//             </label>
//             <select
//               {...register("payment_status")}
//               className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
//             >
//               <option value="pending">Pending</option>
//               <option value="paid">Paid</option>
//             </select>
//           </div>
//         )}
//       </div>

//       {/* 3. RATES & DYNAMIC INPUTS */}
//       {showTimesheet && (
//         <div className="animate-in fade-in slide-in-from-top-2 duration-300">
//           <div className="grid gap-4 sm:grid-cols-4 mb-6">
//             {isPayrate && (
//               <>
//                 <div>
//                   <label className="block text-[11px] uppercase font-bold text-blue-600 mb-1.5 tracking-wider">
//                     Pay Rate ($/hr)
//                   </label>
//                   <input
//                     type="number"
//                     step="0.01"
//                     {...register("pay_rate", safeNumberParser)}
//                     onWheel={(e) => e.target.blur()}
//                     placeholder="0.00"
//                     className="w-full border border-blue-200 bg-blue-50 rounded-md px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] uppercase font-bold text-blue-600 mb-1.5 tracking-wider">
//                     Pay Rate Hike ($)
//                   </label>
//                   <input
//                     type="number"
//                     step="0.01"
//                     {...register("pay_rate_hike", safeNumberParser)}
//                     onWheel={(e) => e.target.blur()}
//                     placeholder="0.00"
//                     className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
//                   />
//                 </div>
//               </>
//             )}

//             {isSalaried && (
//               <>
//                 <div>
//                   <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">
//                     Salary ($)
//                   </label>
//                   <input
//                     type="number"
//                     step="0.01"
//                     {...register("salary", safeNumberParser)}
//                     onWheel={(e) => e.target.blur()}
//                     placeholder="0.00"
//                     className="w-full border border-emerald-200 bg-emerald-50 rounded-md px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">
//                     Salary Hike ($)
//                   </label>
//                   <input
//                     type="number"
//                     step="0.01"
//                     {...register("salary_hike", safeNumberParser)}
//                     onWheel={(e) => e.target.blur()}
//                     placeholder="0.00"
//                     className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
//                   />
//                 </div>
//                 <div>
//                   <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//                     No of Days in Week (To Work)
//                   </label>
//                   <input
//                     type="number"
//                     step="0.5"
//                     {...register("total_days_to_work", safeNumberParser)}
//                     onWheel={(e) => e.target.blur()}
//                     placeholder="0"
//                     className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
//                   />
//                 </div>
//               </>
//             )}
//           </div>

//           {/* TIMESHEET */}
//           <div className="grid gap-4 sm:grid-cols-12 items-end mb-6">
//             <div className="sm:col-span-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
//               <label className="block text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">
//                 Week 1
//               </label>
//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="text-[10px] text-slate-500 block mb-1">
//                     Days
//                   </label>
//                   <input
//                     type="number"
//                     step="0.5"
//                     {...register("working_days_1", safeNumberParser)}
//                     onWheel={(e) => e.target.blur()}
//                     className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-[10px] text-slate-500 block mb-1">
//                     Hours
//                   </label>
//                   <input
//                     type="number"
//                     step="0.01"
//                     {...register("hours_worked_1", safeNumberParser)}
//                     onWheel={(e) => e.target.blur()}
//                     className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono"
//                   />
//                 </div>
//               </div>
//             </div>

//             <div className="sm:col-span-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
//               <label className="block text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">
//                 Week 2
//               </label>
//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="text-[10px] text-slate-500 block mb-1">
//                     Days
//                   </label>
//                   <input
//                     type="number"
//                     step="0.5"
//                     {...register("working_days_2", safeNumberParser)}
//                     onWheel={(e) => e.target.blur()}
//                     className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-[10px] text-slate-500 block mb-1">
//                     Hours
//                   </label>
//                   <input
//                     type="number"
//                     step="0.01"
//                     {...register("hours_worked_2", safeNumberParser)}
//                     onWheel={(e) => e.target.blur()}
//                     className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono"
//                   />
//                 </div>
//               </div>
//             </div>

//             <div className="sm:col-span-2 space-y-3">
//               {isPayrate && (
//                 <div>
//                   <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase text-center">
//                     Adj Hrs
//                   </label>
//                   <input
//                     type="number"
//                     step="0.01"
//                     {...register("hours_adjusted", safeNumberParser)}
//                     onWheel={(e) => e.target.blur()}
//                     placeholder="0"
//                     className="w-full border border-slate-300 rounded-md px-2 py-2 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono"
//                   />
//                 </div>
//               )}
//               {isSalaried && (
//                 <div>
//                   <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase text-center">
//                     Adj Days
//                   </label>
//                   <input
//                     type="number"
//                     step="0.5"
//                     {...register("days_adjusted", safeNumberParser)}
//                     onWheel={(e) => e.target.blur()}
//                     placeholder="0"
//                     className="w-full border border-slate-300 rounded-md px-2 py-2 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono"
//                   />
//                 </div>
//               )}
//             </div>

//             <div className="sm:col-span-4 grid grid-cols-2 gap-2 h-[68px]">
//               <div className="bg-yellow-50 rounded-lg flex flex-col items-center justify-center border border-yellow-200 shadow-sm">
//                 <span className="text-[9px] font-bold text-yellow-800 uppercase tracking-wider text-center">
//                   Total Days
//                 </span>
//                 <span className="text-base font-extrabold text-slate-900 mt-0.5">
//                   {fmt2(calculations?.total_days_worked)}
//                 </span>
//               </div>
//               <div className="bg-yellow-50 rounded-lg flex flex-col items-center justify-center border border-yellow-200 shadow-sm">
//                 <span className="text-[9px] font-bold text-yellow-800 uppercase tracking-wider text-center">
//                   Total Hrs
//                 </span>
//                 <span className="text-base font-extrabold text-slate-900 mt-0.5">
//                   {fmt2(calculations?.total_hours)}
//                 </span>
//               </div>
//             </div>
//           </div>

//           {/* 4. DEDUCTIONS & POST-NET ADJUSTMENTS */}
//           <div className="border-t border-slate-100 pt-5 mb-6">
//             <div className="grid gap-4 sm:grid-cols-4 items-end mb-4">
//               {isSalaried ? (
//                 <>
//                   <div>
//                     <label className="flex items-center justify-between text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//                       <span>LOP Count</span>
//                       <span className="text-[9px] bg-indigo-50 text-indigo-500 border border-indigo-100 px-1.5 py-0.5 rounded normal-case tracking-normal">
//                         Editable
//                       </span>
//                     </label>
//                     <input
//                       type="number"
//                       step="0.5"
//                       {...register("lop_count", safeNumberParser)}
//                       onWheel={(e) => e.target.blur()}
//                       className="w-full border border-indigo-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-colors hover:border-indigo-400"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">
//                       Auto Credits ($)
//                     </label>
//                     <input
//                       type="text"
//                       readOnly
//                       value={fmt2(calculations?.credits)}
//                       className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono bg-slate-50 text-slate-500 cursor-not-allowed"
//                     />
//                   </div>
//                   <div>
//                     <label className="block text-[11px] uppercase font-bold text-rose-600 mb-1.5 tracking-wider">
//                       Auto Deductions ($)
//                     </label>
//                     <input
//                       type="text"
//                       readOnly
//                       value={fmt2(calculations?.deductions)}
//                       className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono bg-slate-50 text-slate-500 cursor-not-allowed"
//                     />
//                   </div>
//                 </>
//               ) : (
//                 <div className="sm:col-span-3"></div>
//               )}
//             </div>

//             <div className="grid gap-4 sm:grid-cols-4 mb-6">
//               <div>
//                 <label className="block text-[11px] uppercase font-bold text-rose-600 mb-1.5 tracking-wider">
//                   Loans/Advances ($)
//                 </label>
//                 <input
//                   type="number"
//                   step="0.01"
//                   {...register("loans_advances", safeNumberParser)}
//                   onWheel={(e) => e.target.blur()}
//                   placeholder="0.00"
//                   className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
//                 />
//               </div>
//               <div>
//                 <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">
//                   Reimbursements ($)
//                 </label>
//                 <input
//                   type="number"
//                   step="0.01"
//                   {...register("reimbursements", safeNumberParser)}
//                   onWheel={(e) => e.target.blur()}
//                   placeholder="0.00"
//                   className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
//                 />
//               </div>
//               <div>
//                 <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">
//                   Final Amount Paid By MM ($)
//                 </label>
//                 <input
//                   type="number"
//                   step="0.01"
//                   {...register("add_amount_by_mm", safeNumberParser)}
//                   onWheel={(e) => e.target.blur()}
//                   placeholder="0.00"
//                   className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
//                 />
//               </div>
//               <div>
//                 <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//                   Reason for MM Amount
//                 </label>
//                 <input
//                   type="text"
//                   {...register("reason_for_add_amount")}
//                   placeholder="Brief reason"
//                   className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//                 />
//               </div>
//             </div>

//             {/* 5. AUTO-CALCULATED RESULTS */}
//             <div className="grid gap-4 sm:grid-cols-3 items-center">
//               <div className="h-full">
//                 <div className="bg-slate-100 text-slate-700 rounded-lg h-full flex flex-col items-center justify-center py-3 shadow-inner border border-slate-200">
//                   <span className="text-[10px] uppercase font-bold tracking-wider">
//                     Gross Pay
//                   </span>
//                   <span className="text-2xl font-mono font-extrabold">
//                     ${fmt2(calculations?.gross_pay)}
//                   </span>
//                 </div>
//               </div>
//               <div className="h-full">
//                 <div className="bg-[#4a148c] text-white rounded-lg h-full flex flex-col items-center justify-center py-3 shadow-md">
//                   <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">
//                     Net Pay
//                   </span>
//                   <span className="text-2xl font-mono font-extrabold">
//                     ${fmt2(calculations?.net_pay)}
//                   </span>
//                 </div>
//               </div>
//               <div className="h-full">
//                 <div className="bg-[#d32f2f] text-white rounded-lg h-full flex flex-col items-center justify-center py-3 shadow-lg">
//                   <span className="text-[10px] uppercase font-bold text-red-100 tracking-wider">
//                     Net Final Pay
//                   </span>
//                   <span className="text-3xl font-mono font-extrabold">
//                     ${fmt2(calculations?.net_final_pay)}
//                   </span>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div className="border-t border-slate-100 pt-5">
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               Notes *
//             </label>
//             <input
//               type="text"
//               {...register("notes", { required: true })}
//               placeholder="Description/Notes"
//               className="w-full border border-slate-300 rounded-md px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
//             />
//           </div>
//         </div>
//       )}

//       {/* Submit Button */}
//       <div className="mt-6 pt-4 flex flex-col sm:flex-row items-center gap-4">
//         <button
//           type="submit"
//           disabled={!showTimesheet || isSaving}
//           className={`px-8 py-3 w-full sm:w-auto rounded-lg font-bold text-sm shadow transition-all ${
//             showTimesheet
//               ? "bg-indigo-600 hover:bg-indigo-700 text-white"
//               : "bg-slate-100 text-slate-400 cursor-not-allowed"
//           }`}
//         >
//           {isSaving ? "Saving Record..." : "Save Record"}
//         </button>
//         {!showTimesheet && (
//           <span className="text-xs text-rose-500 font-bold">
//             * Please select a Pay Type to continue
//           </span>
//         )}
//       </div>
//     </div>
//   );
// }
import React, { useEffect, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { useGlobalState } from "/src/context/GlobalStateContext.jsx";
import { fmt2 } from "../utils/utils.js";

export default function PayrollForm({
  calculations,
  availableStores,
  availableEmployees,
  market,
  isSaving,
}) {
  const { register, watch, setValue } = useFormContext();
  const { markets } = useGlobalState();

  const payType = watch("pay_type");
  const employeeStats = watch("employee_stats");

  const isPayrate = payType === "payrate";
  const isSalaried = payType === "salaried";
  const showTimesheet = isPayrate || isSalaried;

  const totalDaysToWork = watch("total_days_to_work");
  const w1 = watch("working_days_1");
  const w2 = watch("working_days_2");
  const dAdj = watch("days_adjusted");

  const prevTimesheet = useRef("");

  // 🚀 THE FIX: Guarantee these are ALWAYS arrays to prevent .map crashes
  const safeStores = Array.isArray(availableStores) ? availableStores : [];
  const safeEmployees = Array.isArray(availableEmployees)
    ? availableEmployees
    : [];

  // Safely parse numbers from inputs to prevent NaN crashes
  const safeNumberParser = {
    setValueAs: (v) => (v === "" || v === null || isNaN(v) ? "" : Number(v)),
  };

  // --- Resolve Market Display Name ---
  let displayMarketName = "All Markets";
  if (market) {
    if (typeof market === "object" && market.name) {
      displayMarketName = market.name;
    } else {
      const foundMarket = markets?.find((m) => String(m.id) === String(market));
      displayMarketName = foundMarket ? foundMarket.name : market;
    }
  }

  // 🔥 VIEW MODE FIX: Extract historical names
  const selectedEmpId = watch("employee_id");
  const selectedEmpName =
    watch("employee_name") || watch("full_name") || watch("employeeName");

  const isEmpInList = safeEmployees.some((emp) => {
    const id = emp.id || emp.user_id || emp.employee_id;
    return String(id) === String(selectedEmpId);
  });

  const selectedStoreId = watch("store_id");
  const selectedStoreName = watch("store_name") || watch("store");
  const isStoreInList = safeStores.some(
    (s) => String(s.id) === String(selectedStoreId),
  );

  // ==========================================
  // 🔥 DATE PERIOD FORMATTER (DD-MM-YYYY to DD-MM-YYYY)
  // ==========================================
  const dStart = watch("date_period_start");
  const dEnd = watch("date_period_end");
  const historicalDatePeriod = watch("date_period");

  // 1. REVERSE PARSE: If we open an existing record, split the string to populate the inputs
  useEffect(() => {
    if (
      historicalDatePeriod &&
      historicalDatePeriod.includes(" to ") &&
      !dStart &&
      !dEnd
    ) {
      const parts = historicalDatePeriod.split(" to ");
      if (parts.length === 2) {
        const [d1, m1, y1] = parts[0].split("-");
        const [d2, m2, y2] = parts[1].split("-");
        if (y1 && m1 && d1) setValue("date_period_start", `${y1}-${m1}-${d1}`);
        if (y2 && m2 && d2) setValue("date_period_end", `${y2}-${m2}-${d2}`);
      }
    }
  }, [historicalDatePeriod, dStart, dEnd, setValue]);

  // 2. FORWARD PARSE: Combine the inputs into the strict backend format automatically
  useEffect(() => {
    if (dStart && dEnd) {
      const [y1, m1, d1] = dStart.split("-");
      const [y2, m2, d2] = dEnd.split("-");
      if (y1 && y2) {
        setValue("date_period", `${d1}-${m1}-${y1} to ${d2}-${m2}-${y2}`);
      }
    }
  }, [dStart, dEnd, setValue]);

  useEffect(() => {
    if (isSalaried) {
      const t = parseFloat(totalDaysToWork) || 0;
      const worked1 = parseFloat(w1) || 0;
      const worked2 = parseFloat(w2) || 0;
      const adj = parseFloat(dAdj) || 0;

      const worked = worked1 + worked2 + adj;
      const expectedDays = t * 2;
      const autoLop = worked - expectedDays;

      const currentTimesheet = `${t}-${worked1}-${worked2}-${adj}`;

      if (prevTimesheet.current === "") {
        prevTimesheet.current = currentTimesheet;
        return;
      }

      if (prevTimesheet.current !== currentTimesheet) {
        setValue("lop_count", autoLop, { shouldDirty: true });
        prevTimesheet.current = currentTimesheet;
      }
    }
  }, [isSalaried, totalDaysToWork, w1, w2, dAdj, setValue]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6 transition-all">
      {/* 🔥 Hidden field capturing the perfectly formatted Date Period */}
      <input type="hidden" {...register("date_period")} />

      <h2 className="text-lg font-bold text-slate-800 mb-6 tracking-tight border-b border-slate-100 pb-3">
        Payroll Record
      </h2>

      {/* 1. GENERAL & EMPLOYEE INFO */}
      <div className="grid gap-4 sm:grid-cols-12 mb-6">
        <div className="sm:col-span-3">
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
            Date *
          </label>
          <input
            type="date"
            {...register("date", { required: true })}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="sm:col-span-4">
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
            Market
          </label>
          <input
            type="text"
            value={displayMarketName}
            disabled
            className="w-full border border-slate-200 bg-slate-50 rounded-md px-3 py-2 text-sm text-slate-500 cursor-not-allowed font-medium"
          />
        </div>

        <div className="sm:col-span-5">
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
            Store *
          </label>
          <select
            {...register("store_id", { required: true, ...safeNumberParser })}
            disabled={safeStores.length === 0 && !selectedStoreId}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${safeStores.length === 0 && !selectedStoreId ? "bg-slate-50 cursor-not-allowed text-slate-400" : "bg-white border-slate-300"}`}
          >
            <option value="">Select Store...</option>
            {selectedStoreId && !isStoreInList && (
              <option value={selectedStoreId}>
                {selectedStoreName
                  ? `${selectedStoreName}`
                  : `Loading Store...`}
              </option>
            )}
            {safeStores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.code ? `(${s.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-7">
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
            Employee *
          </label>
          <select
            {...register("employee_id", {
              required: true,
              ...safeNumberParser,
            })}
            disabled={safeEmployees.length === 0 && !selectedEmpId}
            className={`w-full border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${safeEmployees.length === 0 && !selectedEmpId ? "bg-slate-50 cursor-not-allowed text-slate-400" : "bg-white border-slate-300"}`}
          >
            <option value="">Select Employee...</option>
            {selectedEmpId && !isEmpInList && (
              <option value={selectedEmpId}>
                {selectedEmpName
                  ? `${selectedEmpName} (Record)`
                  : `Loading Employee...`}
              </option>
            )}
            {safeEmployees.map((emp, index) => {
              const empId = emp.id || emp.user_id || emp.employee_id || index;
              const empName =
                emp.name ||
                emp.full_name ||
                emp.first_name ||
                emp.username ||
                "Unknown Employee";
              const empCode = emp.code || emp.employee_code || emp.ntid || "";
              return (
                <option key={empId} value={empId}>
                  {empName} {empCode ? `(${empCode})` : ""}
                </option>
              );
            })}
          </select>
          {safeEmployees.length === 0 && !selectedEmpId && (
            <span className="text-[10px] text-amber-500 mt-1 block">
              Please select a store to view employees.
            </span>
          )}
        </div>

        <div className="sm:col-span-5">
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
            Date Period *
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              {...register("date_period_start", { required: true })}
              className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <span className="text-slate-400 font-medium text-sm">to</span>
            <input
              type="date"
              {...register("date_period_end", { required: true })}
              className="w-full border border-slate-300 rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* 2. PAY TYPE & CLASSIFICATION */}
      <div className="grid gap-4 sm:grid-cols-3 mb-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg">
        <div>
          <label className="block text-[11px] uppercase font-bold text-indigo-600 mb-1.5 tracking-wider">
            Pay Type *
          </label>
          <select
            {...register("pay_type", { required: true })}
            className="w-full border border-indigo-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-900 bg-white"
          >
            <option value="">Select Type</option>
            <option value="payrate">Payrate (Hourly)</option>
            <option value="salaried">Salaried</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
            Employee Stats
          </label>
          <select
            {...register("employee_stats")}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            <option value="Standard (Default)">Standard (Default)</option>
            <option value="newlyjoined">Newly Joined</option>
            <option value="resigning">Resigning</option>
          </select>
        </div>
        {isSalaried && (
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Payment Status
            </label>
            <select
              {...register("payment_status")}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        )}
      </div>

      {/* 3. RATES & DYNAMIC INPUTS */}
      {showTimesheet && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="grid gap-4 sm:grid-cols-4 mb-6">
            {isPayrate && (
              <>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-blue-600 mb-1.5 tracking-wider">
                    Pay Rate ($/hr)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("pay_rate", safeNumberParser)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0.00"
                    className="w-full border border-blue-200 bg-blue-50 rounded-md px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-blue-600 mb-1.5 tracking-wider">
                    Pay Rate Hike ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("pay_rate_hike", safeNumberParser)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </>
            )}

            {isSalaried && (
              <>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">
                    Salary ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("salary", safeNumberParser)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0.00"
                    className="w-full border border-emerald-200 bg-emerald-50 rounded-md px-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">
                    Salary Hike ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("salary_hike", safeNumberParser)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0.00"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
                    No of Days in Week (To Work)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    {...register("total_days_to_work", safeNumberParser)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0"
                    className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </>
            )}
          </div>

          {/* TIMESHEET */}
          <div className="grid gap-4 sm:grid-cols-12 items-end mb-6">
            <div className="sm:col-span-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <label className="block text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">
                Week 1
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Days
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    {...register("working_days_1", safeNumberParser)}
                    onWheel={(e) => e.target.blur()}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Hours
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("hours_worked_1", safeNumberParser)}
                    onWheel={(e) => e.target.blur()}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <label className="block text-[11px] font-bold text-slate-600 mb-2 uppercase tracking-wide">
                Week 2
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Days
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    {...register("working_days_2", safeNumberParser)}
                    onWheel={(e) => e.target.blur()}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">
                    Hours
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("hours_worked_2", safeNumberParser)}
                    onWheel={(e) => e.target.blur()}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-2 space-y-3">
              {isPayrate && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase text-center">
                    Adj Hrs
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("hours_adjusted", safeNumberParser)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0"
                    className="w-full border border-slate-300 rounded-md px-2 py-2 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono"
                  />
                </div>
              )}
              {isSalaried && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase text-center">
                    Adj Days
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    {...register("days_adjusted", safeNumberParser)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0"
                    className="w-full border border-slate-300 rounded-md px-2 py-2 text-xs text-center focus:ring-1 focus:ring-indigo-400 outline-none font-mono"
                  />
                </div>
              )}
            </div>

            <div className="sm:col-span-4 grid grid-cols-2 gap-2 h-[68px]">
              <div className="bg-yellow-50 rounded-lg flex flex-col items-center justify-center border border-yellow-200 shadow-sm">
                <span className="text-[9px] font-bold text-yellow-800 uppercase tracking-wider text-center">
                  Total Days
                </span>
                <span className="text-base font-extrabold text-slate-900 mt-0.5">
                  {fmt2(calculations?.total_days_worked)}
                </span>
              </div>
              <div className="bg-yellow-50 rounded-lg flex flex-col items-center justify-center border border-yellow-200 shadow-sm">
                <span className="text-[9px] font-bold text-yellow-800 uppercase tracking-wider text-center">
                  Total Hrs
                </span>
                <span className="text-base font-extrabold text-slate-900 mt-0.5">
                  {fmt2(calculations?.total_hours)}
                </span>
              </div>
            </div>
          </div>

          {/* 4. DEDUCTIONS & POST-NET ADJUSTMENTS */}
          <div className="border-t border-slate-100 pt-5 mb-6">
            <div className="grid gap-4 sm:grid-cols-4 items-end mb-4">
              {isSalaried ? (
                <>
                  <div>
                    <label className="flex items-center justify-between text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
                      <span>LOP Count</span>
                      <span className="text-[9px] bg-indigo-50 text-indigo-500 border border-indigo-100 px-1.5 py-0.5 rounded normal-case tracking-normal">
                        Editable
                      </span>
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      {...register("lop_count", safeNumberParser)}
                      onWheel={(e) => e.target.blur()}
                      className="w-full border border-indigo-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-colors hover:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">
                      Auto Credits ($)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={fmt2(calculations?.credits)}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase font-bold text-rose-600 mb-1.5 tracking-wider">
                      Auto Deductions ($)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={fmt2(calculations?.deductions)}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono bg-slate-50 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </>
              ) : (
                <div className="sm:col-span-3"></div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-4 mb-6">
              <div>
                <label className="block text-[11px] uppercase font-bold text-rose-600 mb-1.5 tracking-wider">
                  Loans/Advances ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("loans_advances", safeNumberParser)}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0.00"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">
                  Reimbursements ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("reimbursements", safeNumberParser)}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0.00"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-bold text-emerald-600 mb-1.5 tracking-wider">
                  Final Amount Paid By MM ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("add_amount_by_mm", safeNumberParser)}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0.00"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
                  Reason for MM Amount
                </label>
                <input
                  type="text"
                  {...register("reason_for_add_amount")}
                  placeholder="Brief reason"
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* 5. AUTO-CALCULATED RESULTS */}
            <div className="grid gap-4 sm:grid-cols-3 items-center">
              <div className="h-full">
                <div className="bg-slate-100 text-slate-700 rounded-lg h-full flex flex-col items-center justify-center py-3 shadow-inner border border-slate-200">
                  <span className="text-[10px] uppercase font-bold tracking-wider">
                    Gross Pay
                  </span>
                  <span className="text-2xl font-mono font-extrabold">
                    ${fmt2(calculations?.gross_pay)}
                  </span>
                </div>
              </div>
              <div className="h-full">
                <div className="bg-[#4a148c] text-white rounded-lg h-full flex flex-col items-center justify-center py-3 shadow-md">
                  <span className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">
                    Net Pay
                  </span>
                  <span className="text-2xl font-mono font-extrabold">
                    ${fmt2(calculations?.net_pay)}
                  </span>
                </div>
              </div>
              <div className="h-full">
                <div className="bg-[#d32f2f] text-white rounded-lg h-full flex flex-col items-center justify-center py-3 shadow-lg">
                  <span className="text-[10px] uppercase font-bold text-red-100 tracking-wider">
                    Net Final Pay
                  </span>
                  <span className="text-3xl font-mono font-extrabold">
                    ${fmt2(calculations?.net_final_pay)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-5">
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Notes *
            </label>
            <input
              type="text"
              {...register("notes", { required: true })}
              placeholder="Description/Notes"
              className="w-full border border-slate-300 rounded-md px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow"
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-6 pt-4 flex flex-col sm:flex-row items-center gap-4">
        <button
          type="submit"
          disabled={!showTimesheet || isSaving}
          className={`px-8 py-3 w-full sm:w-auto rounded-lg font-bold text-sm shadow transition-all ${
            showTimesheet
              ? "bg-indigo-600 hover:bg-indigo-700 text-white"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          }`}
        >
          {isSaving ? "Saving Record..." : "Save Record"}
        </button>
        {!showTimesheet && (
          <span className="text-xs text-rose-500 font-bold">
            * Please select a Pay Type to continue
          </span>
        )}
      </div>
    </div>
  );
}
