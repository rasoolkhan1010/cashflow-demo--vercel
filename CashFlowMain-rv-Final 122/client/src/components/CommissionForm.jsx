// import React from "react";
// import { useFormContext } from "react-hook-form";
// import { useGlobalState } from "/src/context/GlobalStateContext.jsx";
// import { fmt2 } from "../utils/utils.js";

// const safeNumberParser = {
//   setValueAs: (v) => (v === "" || v === null || isNaN(v) ? "" : Number(v)),
// };

// const NumInput = ({
//   name,
//   label,
//   placeholder = "0.00",
//   isInt = false,
//   register,
// }) => (
//   <div>
//     <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
//       {label}
//     </label>
//     <input
//       type="number"
//       step={isInt ? "1" : "any"}
//       {...register(name, safeNumberParser)}
//       onWheel={(e) => e.target.blur()} // Prevents accidental mouse-wheel scrolling
//       placeholder={placeholder}
//       className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow font-mono"
//     />
//   </div>
// );

// const AutoInput = ({ label, value, isHighlight = false }) => (
//   <div>
//     <label
//       className={`block text-[11px] font-bold uppercase tracking-wide mb-1.5 ${isHighlight ? "text-indigo-600" : "text-slate-400"}`}
//     >
//       {label}
//     </label>
//     <input
//       type="text"
//       value={value}
//       readOnly
//       tabIndex={-1}
//       className={`w-full border rounded-lg px-3 py-2 text-sm outline-none font-mono font-bold cursor-not-allowed ${isHighlight ? "bg-indigo-50/50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}
//     />
//   </div>
// );

// export default function CommissionForm({
//   calculations = {},
//   availableStores = [],
//   availableEmployees = [],
//   market,
//   isSaving,
// }) {
//   const {
//     register,
//     watch, // 🔥 ADDED: Extracted watch to check for historical data
//     formState: { errors },
//   } = useFormContext();

//   const { markets } = useGlobalState();

//   // 🚀 THE FIX: Guarantee these are ALWAYS arrays, even if the parent passes an object or null by mistake
//   const safeStores = Array.isArray(availableStores) ? availableStores : [];
//   const safeEmployees = Array.isArray(availableEmployees)
//     ? availableEmployees
//     : [];

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

//   return (
//     <div className="space-y-6">
//       {/* --- SECTION 1: EMPLOYEE DETAILS --- */}
//       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
//         <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
//           <div className="w-2 h-2 rounded-full bg-blue-500"></div> Employee
//           Details
//         </h3>

//         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
//           <div className="lg:col-span-1">
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
//               Date *
//             </label>
//             <input
//               type="date"
//               {...register("date", { required: "Date is required" })}
//               className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${errors.date ? "border-rose-500 bg-rose-50" : "border-slate-300"}`}
//             />
//             {errors.date && (
//               <span className="text-[10px] text-rose-500 mt-1 block font-medium">
//                 {errors.date.message}
//               </span>
//             )}
//           </div>

//           <div className="lg:col-span-1">
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
//               Market
//             </label>
//             <input
//               type="text"
//               value={displayMarketName}
//               className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed font-medium"
//               readOnly
//               disabled
//             />
//           </div>

//           <div className="lg:col-span-2">
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
//               Store *
//             </label>
//             <select
//               {...register("store_id", {
//                 required: "Store is required",
//                 ...safeNumberParser,
//               })}
//               disabled={safeStores.length === 0 && !selectedStoreId}
//               className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${safeStores.length === 0 && !selectedStoreId ? "bg-slate-50 cursor-not-allowed" : "bg-white"} ${errors.store_id ? "border-rose-500" : "border-slate-300"}`}
//             >
//               <option value="">Select Store...</option>
//               {/* 🔥 VIEW MODE FIX: Historical Store Fallback */}
//               {selectedStoreId && !isStoreInList && (
//                 <option value={selectedStoreId}>
//                   {selectedStoreName
//                     ? `${selectedStoreName}`
//                     : `Loading Store...`}
//                 </option>
//               )}
//               {safeStores.map((s) => {
//                 const storeId = s.id || s.store_id;
//                 const storeName = s.name || s.store_name || "Unknown Store";
//                 const storeCode = s.store_code || s.code;

//                 return (
//                   <option key={storeId} value={storeId}>
//                     {storeName} {storeCode ? `(${storeCode})` : ""}
//                   </option>
//                 );
//               })}
//             </select>
//             {errors.store_id && (
//               <span className="text-[10px] text-rose-500 mt-1 block font-medium">
//                 {errors.store_id.message}
//               </span>
//             )}
//             {safeStores.length === 0 && !selectedStoreId && (
//               <span className="text-[10px] text-amber-600 mt-1 block font-medium">
//                 ⚠️ No stores found. Select a market in the sidebar.
//               </span>
//             )}
//           </div>

//           <div className="lg:col-span-2">
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               Date Period *
//             </label>
//             <div className="flex items-center gap-2">
//               <input
//                 type="date"
//                 {...register("date_period_start", {
//                   required: "Start date required",
//                 })}
//                 className={`w-full border rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${errors.date_period_start ? "border-rose-500 bg-rose-50" : "border-slate-300"}`}
//               />
//               <span className="text-slate-400 font-medium text-sm">to</span>
//               <input
//                 type="date"
//                 {...register("date_period_end", {
//                   required: "End date required",
//                 })}
//                 className={`w-full border rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${errors.date_period_end ? "border-rose-500 bg-rose-50" : "border-slate-300"}`}
//               />
//             </div>
//             {(errors.date_period_start || errors.date_period_end) && (
//               <span className="text-[10px] text-rose-500 mt-1 block font-medium">
//                 {errors.date_period_start?.message ||
//                   errors.date_period_end?.message}
//               </span>
//             )}
//           </div>

//           <div className="lg:col-span-3">
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
//               Employee *
//             </label>
//             <select
//               {...register("employee_id", {
//                 required: "Employee is required",
//                 ...safeNumberParser,
//               })}
//               disabled={safeEmployees.length === 0 && !selectedEmpId}
//               className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${safeEmployees.length === 0 && !selectedEmpId ? "bg-slate-50 cursor-not-allowed" : "bg-white"} ${errors.employee_id ? "border-rose-500" : "border-slate-300"}`}
//             >
//               <option value="">Select Employee...</option>
//               {/* 🔥 VIEW MODE FIX: Historical Employee Fallback */}
//               {selectedEmpId && !isEmpInList && (
//                 <option value={selectedEmpId}>
//                   {selectedEmpName
//                     ? `${selectedEmpName} (Record)`
//                     : `Loading Employee...`}
//                 </option>
//               )}
//               {safeEmployees.map((emp, index) => {
//                 const empId = emp.id || emp.user_id || emp.employee_id || index;
//                 const empName =
//                   emp.name ||
//                   emp.full_name ||
//                   emp.first_name ||
//                   emp.username ||
//                   "Unknown Employee";
//                 const empCode = emp.code || emp.employee_code || emp.ntid || "";

//                 return (
//                   <option key={empId} value={empId}>
//                     {empName} {empCode ? `(${empCode})` : ""}
//                   </option>
//                 );
//               })}
//             </select>
//             {errors.employee_id && (
//               <span className="text-[10px] text-rose-500 mt-1 block font-medium">
//                 {errors.employee_id.message}
//               </span>
//             )}
//             {safeEmployees.length === 0 && !selectedEmpId && (
//               <span className="text-[10px] text-amber-500 mt-1 block font-medium">
//                 ℹ️ Please select a store to view its employees.
//               </span>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* --- SECTION 2: CORE SALES & ACCESSORIES --- */}
//       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
//         <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
//           <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Core Sales
//           & Accessories
//         </h3>

//         <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-6 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
//           <NumInput
//             name="activation_count"
//             label="Act Count"
//             placeholder="0"
//             isInt={true}
//             register={register}
//           />
//           <NumInput name="act_comm" label="Act Comm ($)" register={register} />
//           <NumInput
//             name="upgrade_count"
//             label="Upg Count"
//             placeholder="0"
//             isInt={true}
//             register={register}
//           />
//           <NumInput name="upg_comm" label="Upg Comm ($)" register={register} />
//           <NumInput
//             name="hint_sold"
//             label="Hint Sold"
//             placeholder="0"
//             isInt={true}
//             register={register}
//           />
//           <AutoInput
//             label="Hint Comm (Auto)"
//             value={`$${fmt2(calculations?.hint_comm)}`}
//           />
//           <AutoInput
//             label="Qual Box (Auto)"
//             value={calculations?.qualified_box || "0"}
//           />
//           <AutoInput
//             label="Box Comm (Auto)"
//             value={`$${fmt2(calculations?.box_comm)}`}
//             isHighlight={true}
//           />
//         </div>

//         <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-6 mt-6">
//           <NumInput name="vas_mrc" label="VAS MRC ($)" register={register} />
//           <NumInput name="vas_avg" label="VAS AVG ($)" register={register} />
//           <div className="border-r border-slate-200 pr-4">
//             <AutoInput
//               label="VAS Comm (Auto)"
//               value={`$${fmt2(calculations?.vas_commission)}`}
//               isHighlight={true}
//             />
//           </div>
//           <NumInput
//             name="acc_profit"
//             label="Acc Profit ($)"
//             register={register}
//           />
//           <div>
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
//               Acc Tier
//             </label>
//             <select
//               {...register("acc_tier")}
//               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
//             >
//               {["Tier 0", "Tier 1", "Tier 2", "Tier 3", "Tier 4"].map((t) => (
//                 <option key={t} value={t}>
//                   {t}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <NumInput
//             name="acc_commission"
//             label="Acc Comm ($)"
//             register={register}
//           />
//         </div>
//       </div>

//       {/* --- SECTION 3: RETENTIONS & EXTRAS --- */}
//       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
//         <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
//           <div className="w-2 h-2 rounded-full bg-orange-400"></div> Retentions
//           & Additions
//         </h3>

//         <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-6 bg-orange-50/30 p-4 rounded-lg border border-orange-100">
//           {[
//             "35",
//             "65",
//             "95",
//             "125",
//             "155",
//             "185",
//             "215",
//             "245",
//             "275",
//             "305",
//             "335",
//             "365",
//           ].map((day) => (
//             <NumInput
//               key={day}
//               name={`retention_${day}`}
//               label={`Ret ${day}`}
//               register={register}
//             />
//           ))}

//           <div className="col-span-3 sm:col-span-4 lg:col-span-6 border-t border-orange-200 pt-4 mt-2">
//             <div className="w-full sm:w-1/3 lg:w-1/4">
//               <AutoInput
//                 label="Retention Comm (Auto)"
//                 value={`$${fmt2(calculations?.retention_commission)}`}
//                 isHighlight={true}
//               />
//             </div>
//           </div>
//         </div>

//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//           <NumInput
//             name="leasing_done"
//             label="Leasing Done (Count)"
//             placeholder="0"
//             isInt={true}
//             register={register}
//           />
//           <AutoInput
//             label="Leasing Comm (Auto)"
//             value={`$${fmt2(calculations?.leasing_commission)}`}
//             isHighlight={true}
//           />
//           <NumInput
//             name="his_spiff"
//             label="HIS SPIFF ($)"
//             register={register}
//           />
//         </div>
//       </div>

//       {/* --- SECTION 4: DEDUCTIONS, CHARGEBACKS & REIMBURSEMENTS --- */}
//       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 border-l-4 border-l-rose-500">
//         <h3 className="text-sm font-bold text-rose-700 uppercase tracking-wider mb-4 border-b border-rose-100 pb-2 flex items-center gap-2">
//           <div className="w-2 h-2 rounded-full bg-rose-500"></div> Deductions &
//           Chargebacks (-)
//         </h3>

//         <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 bg-rose-50/30 p-4 rounded-lg border border-rose-100 mb-4">
//           <NumInput
//             name="csat_score"
//             label="CSAT Score"
//             placeholder="e.g. 95.5"
//             register={register}
//           />
//           <NumInput
//             name="csat_comm_loss"
//             label="CSAT Loss ($)"
//             placeholder="0.00"
//             register={register}
//           />
//           <NumInput
//             name="rebate_chargeback"
//             label="Rebate CB ($)"
//             register={register}
//           />
//           <NumInput
//             name="deposit_chargeback"
//             label="Deposit CB ($)"
//             register={register}
//           />
//           <NumInput
//             name="inventory_variance_chargeback"
//             label="Inv Var CB ($)"
//             register={register}
//           />
//           <NumInput
//             name="late_clock_in_chargeback"
//             label="Late Clock In CB ($)"
//             register={register}
//           />
//           <NumInput
//             name="write_ups"
//             label="Write Ups ($)"
//             register={register}
//           />
//         </div>

//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
//           <NumInput
//             name="reimbursements"
//             label="Reimbursements / Other Payouts (+)"
//             register={register}
//           />
//         </div>
//       </div>

//       {/* --- SECTION 5: ENTRY DETAILS & PAYMENT STATUS --- */}
//       <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5">
//         <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
//           <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Entry
//           Details & Payment Status
//         </h3>

//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
//           <div>
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
//               Entry / Edit Reason <span className="text-rose-500">*</span>
//             </label>
//             <input
//               type="text"
//               {...register("entry_reason", { required: "Reason is required" })}
//               placeholder="Why are you creating or editing this record?"
//               className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${errors.entry_reason ? "border-rose-500 bg-rose-50" : "border-slate-300 bg-white"}`}
//             />
//             {errors.entry_reason && (
//               <span className="text-[10px] text-rose-500 mt-1 block font-medium">
//                 {errors.entry_reason.message}
//               </span>
//             )}
//           </div>
//           <div>
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
//               General Notes (Optional)
//             </label>
//             <input
//               type="text"
//               {...register("notes")}
//               placeholder="Any additional information..."
//               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
//             />
//           </div>
//         </div>

//         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-4 mt-4">
//           <div>
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               Payment Status
//             </label>
//             <select
//               {...register("payment_status")}
//               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold text-slate-700"
//             >
//               <option value="pending">Pending</option>
//               <option value="paid">Paid</option>
//             </select>
//           </div>
//           <NumInput
//             name="add_amount_by_mm"
//             label="MM Paid Amount ($)"
//             register={register}
//           />
//           <div>
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               MM Reason
//             </label>
//             <input
//               type="text"
//               {...register("reason_for_add_amount")}
//               placeholder="Reason if amount differs"
//               className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
//             />
//           </div>
//         </div>
//       </div>

//       {/* --- NON-STICKY FOOTER SUMMARY --- */}
//       <div className="bg-slate-800 rounded-xl shadow-lg p-5 text-white flex flex-col lg:flex-row items-center justify-between gap-6">
//         <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-8 w-full">
//           <div className="flex flex-col">
//             <span className="text-[10px] uppercase font-bold text-slate-400">
//               Gross Comm (+)
//             </span>
//             <span className="text-xl font-bold text-amber-400 font-mono">
//               ${fmt2(calculations?.total_commission)}
//             </span>
//           </div>
//           <div className="w-px h-8 bg-slate-600 hidden sm:block"></div>

//           <div className="flex flex-col">
//             <span className="text-[10px] uppercase font-bold text-slate-400">
//               Deductions (-)
//             </span>
//             <span className="text-xl font-bold text-rose-400 font-mono">
//               -${fmt2(calculations?.total_deductions)}
//             </span>
//           </div>
//           <div className="w-px h-8 bg-slate-600 hidden sm:block"></div>

//           <div className="flex flex-col">
//             <span className="text-[10px] uppercase font-bold text-slate-400">
//               Reimbursements (+)
//             </span>
//             <span className="text-xl font-bold text-emerald-400 font-mono">
//               +${fmt2(calculations?.reimbursements)}
//             </span>
//           </div>
//           <div className="w-px h-8 bg-slate-600 hidden sm:block"></div>

//           <div className="flex flex-col bg-indigo-600/30 px-5 py-2 rounded-lg border border-indigo-500/50">
//             <span className="text-[11px] uppercase font-extrabold text-indigo-300">
//               Final Commission
//             </span>
//             <span className="text-2xl font-extrabold text-white font-mono">
//               ${fmt2(calculations?.final_commission)}
//             </span>
//           </div>
//         </div>

//         <button
//           type="submit"
//           disabled={isSaving}
//           className="w-full lg:w-auto shrink-0 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white font-bold py-3 px-10 rounded-lg shadow-md transition-all hover:shadow-lg whitespace-nowrap"
//         >
//           {isSaving ? "Saving..." : "Save Commission Entry"}
//         </button>
//       </div>
//     </div>
//   );
// }
import React, { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { useGlobalState } from "/src/context/GlobalStateContext.jsx";
import { fmt2 } from "../utils/utils.js";

const safeNumberParser = {
  setValueAs: (v) => (v === "" || v === null || isNaN(v) ? "" : Number(v)),
};

const NumInput = ({
  name,
  label,
  placeholder = "0.00",
  isInt = false,
  register,
}) => (
  <div>
    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
      {label}
    </label>
    <input
      type="number"
      step={isInt ? "1" : "any"}
      {...register(name, safeNumberParser)}
      onWheel={(e) => e.target.blur()} // Prevents accidental mouse-wheel scrolling
      placeholder={placeholder}
      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow font-mono"
    />
  </div>
);

const AutoInput = ({ label, value, isHighlight = false }) => (
  <div>
    <label
      className={`block text-[11px] font-bold uppercase tracking-wide mb-1.5 ${isHighlight ? "text-indigo-600" : "text-slate-400"}`}
    >
      {label}
    </label>
    <input
      type="text"
      value={value}
      readOnly
      tabIndex={-1}
      className={`w-full border rounded-lg px-3 py-2 text-sm outline-none font-mono font-bold cursor-not-allowed ${isHighlight ? "bg-indigo-50/50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-500"}`}
    />
  </div>
);

export default function CommissionForm({
  calculations = {},
  availableStores = [],
  availableEmployees = [],
  market,
  isSaving,
}) {
  const {
    register,
    watch,
    setValue, // 🔥 ADDED: Necessary for injecting the hidden Date Period field
    formState: { errors },
  } = useFormContext();

  const { markets } = useGlobalState();

  // 🚀 THE FIX: Guarantee these are ALWAYS arrays, even if the parent passes an object or null by mistake
  const safeStores = Array.isArray(availableStores) ? availableStores : [];
  const safeEmployees = Array.isArray(availableEmployees)
    ? availableEmployees
    : [];

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

  // 🔥 VIEW MODE FIX: Extract historical names in case the record is opened in View/Edit mode
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

  return (
    <div className="space-y-6">
      {/* 🔥 Hidden field capturing the perfectly formatted Date Period */}
      <input type="hidden" {...register("date_period")} />

      {/* --- SECTION 1: EMPLOYEE DETAILS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div> Employee
          Details
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="lg:col-span-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Date *
            </label>
            <input
              type="date"
              {...register("date", { required: "Date is required" })}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${errors.date ? "border-rose-500 bg-rose-50" : "border-slate-300"}`}
            />
            {errors.date && (
              <span className="text-[10px] text-rose-500 mt-1 block font-medium">
                {errors.date.message}
              </span>
            )}
          </div>

          <div className="lg:col-span-1">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Market
            </label>
            <input
              type="text"
              value={displayMarketName}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed font-medium"
              readOnly
              disabled
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Store *
            </label>
            <select
              {...register("store_id", {
                required: "Store is required",
                ...safeNumberParser,
              })}
              disabled={safeStores.length === 0 && !selectedStoreId}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${safeStores.length === 0 && !selectedStoreId ? "bg-slate-50 cursor-not-allowed" : "bg-white"} ${errors.store_id ? "border-rose-500" : "border-slate-300"}`}
            >
              <option value="">Select Store...</option>
              {selectedStoreId && !isStoreInList && (
                <option value={selectedStoreId}>
                  {selectedStoreName
                    ? `${selectedStoreName}`
                    : `Loading Store...`}
                </option>
              )}
              {safeStores.map((s) => {
                const storeId = s.id || s.store_id;
                const storeName = s.name || s.store_name || "Unknown Store";
                const storeCode = s.store_code || s.code;

                return (
                  <option key={storeId} value={storeId}>
                    {storeName} {storeCode ? `(${storeCode})` : ""}
                  </option>
                );
              })}
            </select>
            {errors.store_id && (
              <span className="text-[10px] text-rose-500 mt-1 block font-medium">
                {errors.store_id.message}
              </span>
            )}
            {safeStores.length === 0 && !selectedStoreId && (
              <span className="text-[10px] text-amber-600 mt-1 block font-medium">
                ⚠️ No stores found. Select a market in the sidebar.
              </span>
            )}
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Date Period *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                {...register("date_period_start", {
                  required: "Start date required",
                })}
                className={`w-full border rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${errors.date_period_start ? "border-rose-500 bg-rose-50" : "border-slate-300"}`}
              />
              <span className="text-slate-400 font-medium text-sm">to</span>
              <input
                type="date"
                {...register("date_period_end", {
                  required: "End date required",
                })}
                className={`w-full border rounded-md px-2 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${errors.date_period_end ? "border-rose-500 bg-rose-50" : "border-slate-300"}`}
              />
            </div>
            {(errors.date_period_start || errors.date_period_end) && (
              <span className="text-[10px] text-rose-500 mt-1 block font-medium">
                {errors.date_period_start?.message ||
                  errors.date_period_end?.message}
              </span>
            )}
          </div>

          <div className="lg:col-span-3">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Employee *
            </label>
            <select
              {...register("employee_id", {
                required: "Employee is required",
                ...safeNumberParser,
              })}
              disabled={safeEmployees.length === 0 && !selectedEmpId}
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${safeEmployees.length === 0 && !selectedEmpId ? "bg-slate-50 cursor-not-allowed" : "bg-white"} ${errors.employee_id ? "border-rose-500" : "border-slate-300"}`}
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
            {errors.employee_id && (
              <span className="text-[10px] text-rose-500 mt-1 block font-medium">
                {errors.employee_id.message}
              </span>
            )}
            {safeEmployees.length === 0 && !selectedEmpId && (
              <span className="text-[10px] text-amber-500 mt-1 block font-medium">
                ℹ️ Please select a store to view its employees.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* --- SECTION 2: CORE SALES & ACCESSORIES --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Core Sales
          & Accessories
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-6 bg-slate-50/50 p-4 rounded-lg border border-slate-100">
          <NumInput
            name="activation_count"
            label="Act Count"
            placeholder="0"
            isInt={true}
            register={register}
          />
          <NumInput name="act_comm" label="Act Comm ($)" register={register} />
          <NumInput
            name="upgrade_count"
            label="Upg Count"
            placeholder="0"
            isInt={true}
            register={register}
          />
          <NumInput name="upg_comm" label="Upg Comm ($)" register={register} />
          <NumInput
            name="hint_sold"
            label="Hint Sold"
            placeholder="0"
            isInt={true}
            register={register}
          />
          <AutoInput
            label="Hint Comm (Auto)"
            value={`$${fmt2(calculations?.hint_comm)}`}
          />
          <AutoInput
            label="Qual Box (Auto)"
            value={calculations?.qualified_box || "0"}
          />
          <AutoInput
            label="Box Comm (Auto)"
            value={`$${fmt2(calculations?.box_comm)}`}
            isHighlight={true}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-6 mt-6">
          <NumInput name="vas_mrc" label="VAS MRC ($)" register={register} />
          <NumInput name="vas_avg" label="VAS AVG ($)" register={register} />
          <div className="border-r border-slate-200 pr-4">
            <AutoInput
              label="VAS Comm (Auto)"
              value={`$${fmt2(calculations?.vas_commission)}`}
              isHighlight={true}
            />
          </div>
          <NumInput
            name="acc_profit"
            label="Acc Profit ($)"
            register={register}
          />
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Acc Tier
            </label>
            <select
              {...register("acc_tier")}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              {["Tier 0", "Tier 1", "Tier 2", "Tier 3", "Tier 4"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <NumInput
            name="acc_commission"
            label="Acc Comm ($)"
            register={register}
          />
        </div>
      </div>

      {/* --- SECTION 3: RETENTIONS & EXTRAS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400"></div> Retentions
          & Additions
        </h3>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-6 bg-orange-50/30 p-4 rounded-lg border border-orange-100">
          {[
            "35",
            "65",
            "95",
            "125",
            "155",
            "185",
            "215",
            "245",
            "275",
            "305",
            "335",
            "365",
          ].map((day) => (
            <NumInput
              key={day}
              name={`retention_${day}`}
              label={`Ret ${day}`}
              register={register}
            />
          ))}

          <div className="col-span-3 sm:col-span-4 lg:col-span-6 border-t border-orange-200 pt-4 mt-2">
            <div className="w-full sm:w-1/3 lg:w-1/4">
              <AutoInput
                label="Retention Comm (Auto)"
                value={`$${fmt2(calculations?.retention_commission)}`}
                isHighlight={true}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumInput
            name="leasing_done"
            label="Leasing Done (Count)"
            placeholder="0"
            isInt={true}
            register={register}
          />
          <AutoInput
            label="Leasing Comm (Auto)"
            value={`$${fmt2(calculations?.leasing_commission)}`}
            isHighlight={true}
          />
          <NumInput
            name="his_spiff"
            label="HIS SPIFF ($)"
            register={register}
          />
        </div>
      </div>

      {/* --- SECTION 4: DEDUCTIONS, CHARGEBACKS & REIMBURSEMENTS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 border-l-4 border-l-rose-500">
        <h3 className="text-sm font-bold text-rose-700 uppercase tracking-wider mb-4 border-b border-rose-100 pb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500"></div> Deductions &
          Chargebacks (-)
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 bg-rose-50/30 p-4 rounded-lg border border-rose-100 mb-4">
          <NumInput
            name="csat_score"
            label="CSAT Score"
            placeholder="e.g. 95.5"
            register={register}
          />
          <NumInput
            name="csat_comm_loss"
            label="CSAT Loss ($)"
            placeholder="0.00"
            register={register}
          />
          <NumInput
            name="rebate_chargeback"
            label="Rebate CB ($)"
            register={register}
          />
          <NumInput
            name="deposit_chargeback"
            label="Deposit CB ($)"
            register={register}
          />
          <NumInput
            name="inventory_variance_chargeback"
            label="Inv Var CB ($)"
            register={register}
          />
          <NumInput
            name="late_clock_in_chargeback"
            label="Late Clock In CB ($)"
            register={register}
          />
          <NumInput
            name="write_ups"
            label="Write Ups ($)"
            register={register}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-emerald-50/50 rounded-lg border border-emerald-100">
          <NumInput
            name="reimbursements"
            label="Reimbursements / Other Payouts (+)"
            register={register}
          />
        </div>
      </div>

      {/* --- SECTION 5: ENTRY DETAILS & PAYMENT STATUS --- */}
      <div className="bg-slate-50 rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500"></div> Entry
          Details & Payment Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              Entry / Edit Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...register("entry_reason", { required: "Reason is required" })}
              placeholder="Why are you creating or editing this record?"
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${errors.entry_reason ? "border-rose-500 bg-rose-50" : "border-slate-300 bg-white"}`}
            />
            {errors.entry_reason && (
              <span className="text-[10px] text-rose-500 mt-1 block font-medium">
                {errors.entry_reason.message}
              </span>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
              General Notes (Optional)
            </label>
            <input
              type="text"
              {...register("notes")}
              placeholder="Any additional information..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-4 mt-4">
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Payment Status
            </label>
            <select
              {...register("payment_status")}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-bold text-slate-700"
            >
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <NumInput
            name="add_amount_by_mm"
            label="MM Paid Amount ($)"
            register={register}
          />
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              MM Reason
            </label>
            <input
              type="text"
              {...register("reason_for_add_amount")}
              placeholder="Reason if amount differs"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            />
          </div>
        </div>
      </div>

      {/* --- NON-STICKY FOOTER SUMMARY --- */}
      <div className="bg-slate-800 rounded-xl shadow-lg p-5 text-white flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 sm:gap-8 w-full">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Gross Comm (+)
            </span>
            <span className="text-xl font-bold text-amber-400 font-mono">
              ${fmt2(calculations?.total_commission)}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-600 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Deductions (-)
            </span>
            <span className="text-xl font-bold text-rose-400 font-mono">
              -${fmt2(calculations?.total_deductions)}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-600 hidden sm:block"></div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Reimbursements (+)
            </span>
            <span className="text-xl font-bold text-emerald-400 font-mono">
              +${fmt2(calculations?.reimbursements)}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-600 hidden sm:block"></div>

          <div className="flex flex-col bg-indigo-600/30 px-5 py-2 rounded-lg border border-indigo-500/50">
            <span className="text-[11px] uppercase font-extrabold text-indigo-300">
              Final Commission
            </span>
            <span className="text-2xl font-extrabold text-white font-mono">
              ${fmt2(calculations?.final_commission)}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full lg:w-auto shrink-0 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-400 text-white font-bold py-3 px-10 rounded-lg shadow-md transition-all hover:shadow-lg whitespace-nowrap"
        >
          {isSaving ? "Saving..." : "Save Commission Entry"}
        </button>
      </div>
    </div>
  );
}
