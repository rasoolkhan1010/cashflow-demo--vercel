// import React, {
//   useState,
//   useEffect,
//   useCallback,
//   useRef,
//   useMemo,
// } from "react";
// import { useForm } from "react-hook-form";
// import toast from "react-hot-toast";
// import { useGlobalState } from "../context/GlobalStateContext.jsx";
// import { useAuth } from "../context/AuthContext.jsx";
// import api from "../services/api.js";
// import { todayLocal, toISO, num, fmt2 } from "../utils/utils.js";
// import TruncatedTooltip from "../components/TruncatedTooltip.jsx";
// import BookClosedPopup from "../components/BookClosedPopup.jsx";
// import CustomDatePicker from "../components/CustomDatePicker.jsx";
// import InHandCashPage from "./InHandCashPage.jsx";

// const ROWS_PER_PAGE = 20;

// const CATEGORY_MAP = {
//   hotel: "hotel",
//   gas: "gas",
//   "team dinner": "team_dinner",
//   team_dinner: "team_dinner",
//   rent: "rent",
//   uber: "uber",
//   "store maintenance": "store_maintenance",
//   "store maintainance": "store_maintenance",
//   store_maintenance: "store_maintenance",
//   "store cleaning": "store_cleaning",
//   store_cleaning: "store_cleaning",
//   furniture: "furniture",
//   cameras: "cameras",
//   incentives: "incentives",
//   "business license": "business_license",
//   business_license: "business_license",
//   business: "business_license",
//   competition: "competition",
//   competation: "competition",
//   "store bonus": "store_bonus",
//   store_bonus: "store_bonus",
//   "store supplies": "store_supplies",
//   store_supplies: "store_supplies",
//   "store supplyes": "store_supplies",
//   handyman: "handyman",
//   "bill pay adjustment": "bill_pay_adjustment",
//   bill_pay_adjustment: "bill_pay_adjustment",
//   "houston office expense": "houston_office_expense",
//   houston_office_expense: "houston_office_expense",
//   office_supply: "office_supply",
//   raffle: "raffle",
//   "ups charges": "ups_charges",
//   ups_charges: "ups_charges",
//   other: "other",
// };

// function ExpensesTab() {
//   const { selectedMarket, selectedStore, markets } = useGlobalState();
//   const { user } = useAuth();

//   const currentMarketObj = (markets || []).find(
//     (m) => String(m.id) === String(selectedMarket),
//   );
//   const displayMarketName = currentMarketObj
//     ? currentMarketObj.name
//     : "All Markets";

//   const [rows, setRows] = useState([]);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [pageTotal, setPageTotal] = useState(0);
//   const [grandTotal, setGrandTotal] = useState(0);
//   const [isLoadingRows, setIsLoadingRows] = useState(false);

//   const [availableStores, setAvailableStores] = useState([]);
//   const [expFile, setExpFile] = useState(null);
//   const fileInputRef = useRef(null);

//   const [showClosedPopup, setShowClosedPopup] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);

//   const {
//     register,
//     handleSubmit,
//     watch,
//     setValue,
//     reset,
//     control,
//     formState: { errors },
//   } = useForm({
//     defaultValues: {
//       date: todayLocal(),
//       store_id: selectedStore || "",
//       category: "",
//       amount: "",
//       managerName: "",
//       comment: "",
//     },
//     mode: "onChange",
//   });

//   const watchedDate = watch("date");
//   const watchedStoreId = watch("store_id");
//   const watchedCategory = watch("category");
//   const watchedAmount = watch("amount");
//   const numericAmount = parseFloat(watchedAmount?.replace(/[$,\s]/g, "") || 0);

//   const canEnterNegative = useMemo(() => {
//     return ["admin", "super_admin", "expense_commission_manager"].includes(
//       user?.role,
//     );
//   }, [user]);

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
//     setValue("store_id", selectedStore || "");
//   }, [selectedStore, setValue]);

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [watchedDate, watchedStoreId, selectedMarket]);

//   const loadExpensesForDate = useCallback(async () => {
//     if (!watchedDate) return;
//     setIsLoadingRows(true);
//     try {
//       const response = await api.getExpensesByDateWithMarket({
//         date: watchedDate,
//         market_id: selectedMarket || undefined,
//         store_id: watchedStoreId || undefined,
//         page: currentPage,
//         limit: ROWS_PER_PAGE,
//       });

//       const dataRows = response.data || [];
//       setRows(dataRows);
//       setTotalPages(response.pagination?.totalPages || 1);
//       setGrandTotal(response.summary?.totalAmount || 0);

//       let pt = 0;
//       dataRows.forEach((r) => (pt += num(r.amount ?? r.amount_numeric ?? 0)));
//       setPageTotal(pt);
//     } catch (err) {
//       console.error("Failed to load expenses", err);
//       toast.error("Failed to load daily expenses.");
//     } finally {
//       setIsLoadingRows(false);
//     }
//   }, [watchedDate, selectedMarket, watchedStoreId, currentPage]);

//   useEffect(() => {
//     loadExpensesForDate();
//   }, [loadExpensesForDate]);

//   const handleAmountChange = (e) => {
//     const value = e.target.value;
//     const regex = canEnterNegative ? /[^0-9.,$-]/g : /[^0-9.,$]/g;
//     const cleaned = value.replace(regex, "");

//     if (cleaned === "-" && canEnterNegative) {
//       setValue("amount", cleaned, { shouldValidate: true });
//       return;
//     }

//     const withoutFormat = cleaned.replace(/[$,\s]/g, "");
//     if (/^-?\d*\.?\d{0,2}$/.test(withoutFormat) || cleaned === "") {
//       setValue("amount", cleaned, { shouldValidate: true });
//     }
//   };

//   const onSubmit = async (data) => {
//     if (isProcessing) return;
//     setIsProcessing(true);

//     const toastId = toast.loading("Processing expense...");

//     try {
//       let finalUrl = null;

//       if (expFile) {
//         toast.loading("Uploading receipt...", { id: toastId });
//         const formData = new FormData();
//         formData.append("file", expFile);
//         const up = await api.uploadExpenseFile(formData);
//         finalUrl = up.url || null;
//       }

//       const category = (
//         CATEGORY_MAP[data.category.toLowerCase().trim()] || data.category
//       )
//         .trim()
//         .toLowerCase();

//       const payload = {
//         expensedate: data.date,
//         market_id: selectedMarket,
//         store_id: parseInt(data.store_id, 10),
//         category,
//         amount: num(data.amount) || null,
//         uploadurl: finalUrl,
//         comment: data.comment,
//         managername: data.managerName,
//       };

//       if (category === "important") {
//         payload.status = "approved";
//         payload.reason = "";
//       }

//       toast.loading("Saving expense...", { id: toastId });
//       await api.createExpense(payload);

//       toast.success("Expense saved successfully!", { id: toastId });

//       loadExpensesForDate();
//       reset({
//         ...data,
//         category: "",
//         amount: "",
//         comment: "",
//         managerName: "",
//       });
//       setExpFile(null);
//       if (fileInputRef.current) fileInputRef.current.value = "";
//     } catch (err) {
//       console.error(err);

//       // 🔥 THE FIX: Deeply unpack Axios error objects to catch the backend's "BOOK_CLOSED" response
//       const errCode = err?.response?.data?.error || err?.error;
//       const errMsg = err?.response?.data?.message || err?.message || "";

//       if (errCode === "BOOK_CLOSED" || errMsg.includes("Book closed")) {
//         toast.dismiss(toastId);
//         setShowClosedPopup(true);
//       } else {
//         toast.error(errMsg || "Failed to save expense", { id: toastId });
//       }
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   return (
//     <div className="space-y-6 px-4 py-4 sm:px-6">
//       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6">
//         <h2 className="text-lg font-bold text-slate-800 mb-5 tracking-tight flex items-center gap-2">
//           <div className="w-2 h-2 rounded-full bg-blue-500"></div>Add Expense
//           Record
//         </h2>

//         <form
//           onSubmit={handleSubmit(onSubmit)}
//           className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
//         >
//           <div>
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               Date *
//             </label>
//             <CustomDatePicker
//               name="date"
//               control={control}
//               rules={{ required: "Date is required" }}
//               error={!!errors.date}
//             />
//             {errors.date && (
//               <p className="mt-1 text-xs text-rose-600">
//                 {errors.date.message}
//               </p>
//             )}
//           </div>

//           <div>
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               Market
//             </label>
//             <input
//               type="text"
//               value={displayMarketName}
//               readOnly
//               className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 cursor-not-allowed"
//             />
//           </div>

//           <div>
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               Store *
//             </label>
//             <select
//               {...register("store_id", { required: "Store is required" })}
//               className={`border rounded-lg px-3 py-2 text-sm w-full outline-none transition-shadow bg-white ${errors.store_id ? "border-rose-500 bg-rose-50" : "border-slate-300 focus:ring-2 focus:ring-indigo-500"}`}
//             >
//               <option value="">Select Store</option>
//               {availableStores.map((s) => (
//                 <option key={s.id} value={s.id}>
//                   {s.name} {s.code ? `(${s.code})` : ""}
//                 </option>
//               ))}
//             </select>
//             {errors.store_id && (
//               <p className="mt-1 text-xs text-rose-600">
//                 {errors.store_id.message}
//               </p>
//             )}
//           </div>

//           <div>
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               Category *
//             </label>
//             <select
//               {...register("category", { required: "Category is required" })}
//               className={`border rounded-lg px-3 py-2 text-sm w-full outline-none transition-shadow bg-white ${errors.category ? "border-rose-500 bg-rose-50" : "border-slate-300 focus:ring-2 focus:ring-indigo-500"}`}
//             >
//               <option value="">Select category</option>
//               <option value="hotel">Hotel</option>
//               <option value="gas">Gas</option>
//               <option value="team_dinner">Team Dinner</option>
//               <option value="rent">Rent</option>
//               <option value="uber">Uber</option>
//               <option value="store_maintenance">Store Maintenance</option>
//               <option value="store_cleaning">Store Cleaning</option>
//               <option value="furniture">Furniture</option>
//               <option value="cameras">Cameras</option>
//               <option value="incentives">Incentives</option>
//               <option value="business_license">Business License</option>
//               <option value="competition">Competition</option>
//               <option value="store_bonus">Store Bonus</option>
//               <option value="store_supplies">Store Supplies</option>
//               <option value="office_supply">Office Supply</option>
//               <option value="handyman">Handyman</option>
//               <option value="bill_pay_adjustment">Bill Pay Adjustment</option>
//               <option value="houston_office_expense">
//                 Houston Office Expense
//               </option>
//               <option value="raffle">Raffle</option>
//               <option value="ups_charges">UPS charges</option>
//               <option value="cashout">Payout</option>
//               <option value="important">Important</option>
//               <option value="water">Water</option>
//               <option value="Advance">Advance</option>
//               <option value="other">Other</option>
//             </select>
//             {errors.category && (
//               <p className="mt-1 text-xs text-rose-600">
//                 {errors.category.message}
//               </p>
//             )}
//           </div>

//           <div>
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               Amount *{" "}
//               {watchedCategory?.toLowerCase() === "important" && (
//                 <span className="text-rose-600 normal-case tracking-normal ml-1">
//                   (max $100)
//                 </span>
//               )}
//             </label>
//             <input
//               type="text"
//               placeholder={
//                 canEnterNegative ? "e.g. 125.50 or -50.00" : "e.g. 125.50"
//               }
//               {...register("amount", {
//                 required: "Amount is required",
//                 validate: (val) => {
//                   const numVal = parseFloat(val.replace(/[$,\s]/g, ""));
//                   if (isNaN(numVal)) return "Amount is required";
//                   if (numVal === 0) return "Amount cannot be 0";
//                   if (numVal < 0 && !canEnterNegative)
//                     return "Amount must be positive";
//                   if (watchedCategory === "important" && numVal > 100)
//                     return "Important max is $100";
//                   return true;
//                 },
//               })}
//               onChange={handleAmountChange}
//               className={`border rounded-lg px-3 py-2 text-sm w-full outline-none transition-shadow font-mono ${errors.amount ? "border-rose-500 bg-rose-50 text-rose-900" : "border-slate-300 focus:ring-2 focus:ring-indigo-500"}`}
//             />
//             {errors.amount && (
//               <p className="mt-1 text-xs text-rose-600">
//                 {errors.amount.message}
//               </p>
//             )}
//           </div>

//           <div>
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               Manager Name *
//             </label>
//             <input
//               type="text"
//               placeholder="Manager name"
//               {...register("managerName", {
//                 required: "Manager name is required",
//               })}
//               className={`border rounded-lg px-3 py-2 text-sm w-full outline-none transition-shadow ${errors.managerName ? "border-rose-500 bg-rose-50" : "border-slate-300 focus:ring-2 focus:ring-indigo-500"}`}
//             />
//             {errors.managerName && (
//               <p className="mt-1 text-xs text-rose-600">
//                 {errors.managerName.message}
//               </p>
//             )}
//           </div>

//           <div>
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               Logged In User
//             </label>
//             <input
//               type="text"
//               value={user?.fullName || user?.email || "Unknown"}
//               readOnly
//               className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 cursor-not-allowed"
//             />
//           </div>

//           <div className="lg:col-span-2">
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               Receipt file
//               {numericAmount > 25 ? (
//                 <span className="text-rose-500 ml-1">*</span>
//               ) : (
//                 <span className="text-slate-400 normal-case tracking-normal ml-1">
//                   (Optional for $25 or less)
//                 </span>
//               )}
//             </label>
//             <input
//               type="file"
//               ref={fileInputRef}
//               accept=".jpg,.jpeg,.png,.pdf,.csv,.xls,.xlsx,image/jpeg,image/png,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//               onChange={(e) => setExpFile(e.target.files[0] || null)}
//               className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full outline-none transition-shadow bg-white focus:ring-2 focus:ring-indigo-500"
//             />
//             {numericAmount > 25 && !expFile && (
//               <p className="mt-1 text-xs text-rose-600 font-medium">
//                 Receipt is required for amounts over $25
//               </p>
//             )}
//           </div>

//           <div className="lg:col-span-2">
//             <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
//               Comment *
//             </label>
//             <textarea
//               rows="1"
//               placeholder="Note about this expense"
//               {...register("comment", { required: "Comment is required" })}
//               className={`border rounded-lg px-3 py-2 text-sm w-full outline-none transition-shadow ${errors.comment ? "border-rose-500 bg-rose-50" : "border-slate-300 focus:ring-2 focus:ring-indigo-500"}`}
//             />
//             {errors.comment && (
//               <p className="mt-1 text-xs text-rose-600">
//                 {errors.comment.message}
//               </p>
//             )}
//           </div>

//           <div className="lg:col-span-4 flex items-center gap-3 pt-2">
//             <button
//               type="submit"
//               disabled={isProcessing || (numericAmount > 25 && !expFile)}
//               className={`px-8 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${isProcessing || (numericAmount > 25 && !expFile) ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md"}`}
//             >
//               {isProcessing ? "Processing..." : "Save Expense"}
//             </button>
//           </div>
//         </form>
//       </div>

//       {/* --- TABLE SECTION --- */}
//       <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
//         <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
//           <div>
//             <h2 className="text-lg font-bold text-slate-800 capitalize">
//               Daily Expenses Sheet
//             </h2>
//             <p className="text-xs text-slate-500 mt-1">
//               Showing records for{" "}
//               <strong className="text-slate-700">{watchedDate}</strong>
//             </p>
//           </div>
//           <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
//             {rows.length} rows shown
//           </span>
//         </div>

//         <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
//           <table className="w-full text-left text-xs whitespace-nowrap">
//             <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
//               <tr>
//                 <th className="px-3 py-3 sticky left-0 bg-slate-50 z-10 border-r">
//                   Date
//                 </th>
//                 <th className="px-3 py-3">Market/Store</th>
//                 <th className="px-3 py-3">Manager</th>
//                 <th className="px-3 py-3">Category</th>
//                 <th className="px-3 py-3 text-right">Amount</th>
//                 <th className="px-3 py-3 text-center">Receipt</th>
//                 <th className="px-3 py-3 border-l-2 border-slate-200 w-48">
//                   Comment
//                 </th>
//               </tr>
//             </thead>

//             <tbody className="divide-y divide-slate-100 bg-white">
//               {isLoadingRows ? (
//                 <tr>
//                   <td
//                     colSpan="7"
//                     className="py-12 text-center text-slate-500 font-medium"
//                   >
//                     Loading...
//                   </td>
//                 </tr>
//               ) : rows.length === 0 ? (
//                 <tr>
//                   <td
//                     colSpan="7"
//                     className="py-12 text-center text-slate-500 font-medium"
//                   >
//                     No expenses logged for this date.
//                   </td>
//                 </tr>
//               ) : (
//                 rows.map((r, index) => {
//                   const url =
//                     r.upload_url ?? r.uploadurl ?? r.receipt_url ?? "";
//                   const amtNum = num(r.amount);

//                   return (
//                     <tr
//                       key={r.id || index}
//                       className="hover:bg-blue-50 transition-colors h-12 group"
//                     >
//                       <td className="px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium text-slate-700">
//                         {toISO(r.expense_date ?? r.expensedate ?? r.date)}
//                       </td>
//                       <td className="px-3 py-2">
//                         <div className="font-semibold text-slate-800">
//                           {r.store ?? r.storeid ?? "-"}
//                         </div>
//                         <div className="text-[10px] text-slate-400 font-mono">
//                           {r.market ?? "-"}
//                         </div>
//                       </td>
//                       <td className="px-3 py-2 font-semibold text-slate-800">
//                         {r.managername ?? r.manager_name ?? "-"}
//                       </td>
//                       <td className="px-3 py-2 capitalize font-medium text-slate-600">
//                         {r.category ?? "-"}
//                       </td>
//                       <td
//                         className={`px-3 py-2 text-right font-extrabold tracking-tight ${amtNum < 0 ? "text-rose-600" : "text-slate-900"}`}
//                       >
//                         ${fmt2(amtNum)}
//                       </td>
//                       <td className="px-3 py-2 text-center">
//                         {url ? (
//                           <a
//                             className="text-blue-600 hover:text-blue-800 underline font-medium transition-colors"
//                             href={url}
//                             target="_blank"
//                             rel="noopener noreferrer"
//                           >
//                             View
//                           </a>
//                         ) : (
//                           <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
//                             No File
//                           </span>
//                         )}
//                       </td>
//                       <td className="px-3 py-2 border-l-2 border-slate-100">
//                         <TruncatedTooltip
//                           text={r.comment ?? ""}
//                           maxWidth="max-w-[200px]"
//                           placeholder="-"
//                         />
//                       </td>
//                     </tr>
//                   );
//                 })
//               )}
//             </tbody>

//             <tfoot>
//               <tr className="bg-indigo-50/30 border-t border-indigo-100">
//                 <td
//                   className="px-3 py-3 text-right font-extrabold text-indigo-900 uppercase"
//                   colSpan="4"
//                 >
//                   Grand Total (All Pages):
//                 </td>
//                 <td className="px-3 py-3 text-right font-extrabold text-indigo-900 text-base">
//                   ${fmt2(grandTotal)}
//                 </td>
//                 <td className="px-3 py-3 whitespace-nowrap" colSpan="2"></td>
//               </tr>
//             </tfoot>
//           </table>
//         </div>

//         <div className="flex items-center justify-between pt-4">
//           <span className="text-xs font-bold text-slate-500">
//             Page {totalPages > 0 ? currentPage : 0} of {totalPages}
//           </span>
//           <div className="flex gap-2">
//             <button
//               onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
//               disabled={currentPage === 1}
//               className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs disabled:opacity-50 font-bold hover:bg-slate-300 transition-colors"
//             >
//               Prev
//             </button>
//             <button
//               onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
//               disabled={currentPage === totalPages || totalPages === 0}
//               className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs disabled:opacity-50 font-bold hover:bg-slate-300 transition-colors"
//             >
//               Next
//             </button>
//           </div>
//         </div>
//       </div>

//       <BookClosedPopup
//         isOpen={showClosedPopup}
//         onClose={() => setShowClosedPopup(false)}
//       />
//     </div>
//   );
// }

// export default function StoreExpensePage() {
//   const [activeTab, setActiveTab] = useState("expenses");

//   return (
//     <section className="h-full flex flex-col">
//       <div className="px-4 sm:px-6 pt-4 border-b border-slate-200 bg-slate-50/50 backdrop-blur-sm sticky top-0 z-30 flex items-end space-x-2">
//         <div
//           onClick={() => setActiveTab("expenses")}
//           className={`group relative min-w-[140px] max-w-[200px] flex items-center justify-center py-2 px-4 text-xs sm:text-sm font-bold tracking-wide uppercase transition-all duration-200 select-none cursor-pointer rounded-t-lg border-t border-l border-r -mb-px ${activeTab === "expenses" ? "bg-white text-indigo-700 border-slate-200 shadow-[0_-2px_6px_rgba(0,0,0,0.03)] z-10" : "bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200 hover:text-slate-700"}`}
//         >
//           Store Expenses
//         </div>
//         <div
//           onClick={() => setActiveTab("handincash")}
//           className={`group relative min-w-[140px] max-w-[200px] flex items-center justify-center py-2 px-4 text-xs sm:text-sm font-bold tracking-wide uppercase transition-all duration-200 select-none cursor-pointer rounded-t-lg border-t border-l border-r -mb-px ${activeTab === "handincash" ? "bg-white text-indigo-700 border-slate-200 shadow-[0_-2px_6px_rgba(0,0,0,0.03)] z-10" : "bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200 hover:text-slate-700"}`}
//         >
//           Pick Up Amount
//         </div>
//       </div>
//       <div className="flex-1 bg-slate-50/30">
//         {activeTab === "expenses" ? <ExpensesTab /> : <InHandCashPage />}
//       </div>
//     </section>
//   );
// }
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import { todayLocal, toISO, num, fmt2 } from "../utils/utils.js";
import TruncatedTooltip from "../components/TruncatedTooltip.jsx";
import BookClosedPopup from "../components/BookClosedPopup.jsx";
import CustomDatePicker from "../components/CustomDatePicker.jsx";
import InHandCashPage from "./InHandCashPage.jsx";

const ROWS_PER_PAGE = 20;

const CATEGORY_MAP = {
  hotel: "hotel",
  gas: "gas",
  "team dinner": "team_dinner",
  team_dinner: "team_dinner",
  rent: "rent",
  uber: "uber",
  "store maintenance": "store_maintenance",
  "store maintainance": "store_maintenance",
  store_maintenance: "store_maintenance",
  "store cleaning": "store_cleaning",
  store_cleaning: "store_cleaning",
  furniture: "furniture",
  cameras: "cameras",
  incentives: "incentives",
  "business license": "business_license",
  business_license: "business_license",
  business: "business_license",
  competition: "competition",
  competation: "competition",
  "store bonus": "store_bonus",
  store_bonus: "store_bonus",
  "store supplies": "store_supplies",
  store_supplies: "store_supplies",
  "store supplyes": "store_supplies",
  handyman: "handyman",
  "bill pay adjustment": "bill_pay_adjustment",
  bill_pay_adjustment: "bill_pay_adjustment",
  "houston office expense": "houston_office_expense",
  houston_office_expense: "houston_office_expense",
  office_supply: "office_supply",
  raffle: "raffle",
  "ups charges": "ups_charges",
  ups_charges: "ups_charges",
  other: "other",
};

function ExpensesTab() {
  const { selectedMarket, selectedStore, markets } = useGlobalState();
  const { user } = useAuth();

  const currentMarketObj = (markets || []).find(
    (m) => String(m.id) === String(selectedMarket),
  );
  const displayMarketName = currentMarketObj
    ? currentMarketObj.name
    : "All Markets";

  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageTotal, setPageTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [isLoadingRows, setIsLoadingRows] = useState(false);

  const [availableStores, setAvailableStores] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]); // 🔥 Added Employee Fetch State
  const [expFile, setExpFile] = useState(null);
  const fileInputRef = useRef(null);

  const [showClosedPopup, setShowClosedPopup] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      date: todayLocal(),
      store_id: selectedStore || "",
      category: "",
      amount: "",
      manager_user_id: "",
      comment: "",
    },
    mode: "onChange",
  });

  const watchedDate = watch("date");
  const watchedStoreId = watch("store_id");
  const watchedCategory = watch("category");
  const watchedAmount = watch("amount");
  const numericAmount = parseFloat(
    String(watchedAmount || "0").replace(/[$,\s]/g, ""),
  );

  const canEnterNegative = useMemo(() => {
    return ["admin", "super_admin", "expense_commission_manager"].includes(
      user?.role,
    );
  }, [user]);

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
    setValue("store_id", selectedStore || "");
  }, [selectedStore, setValue]);

  // 🔥 Fetch Store Managers/Employees dynamically
  // 🔥 Fetch Admins and Market Managers dynamically based on the Market
  useEffect(() => {
    let active = true;
    if (selectedMarket) {
      // Fetch from the master users list instead of store-level employees
      api
        .request("admin/users")
        .then((res) => {
          if (!active) return;

          // Depending on your axios setup, the array might be directly in res or in res.data
          const allUsers = Array.isArray(res) ? res : res?.data || [];

          const filteredManagers = allUsers.filter((u) => {
            const role = String(u.role || "").toLowerCase();

            // 1. Always include global admins
            const isAdmin = [
              "admin",
              "super_admin",
              "expense_commission_manager",
            ].includes(role);

            // 2. Include Market Managers ONLY if they are assigned to this specific market
            const isMarketManager =
              role === "market_manager" &&
              (u.market_ids || []).includes(Number(selectedMarket));

            return isAdmin || isMarketManager;
          });

          // Optional: Sort them alphabetically for a cleaner dropdown UX
          filteredManagers.sort((a, b) =>
            (a.full_name || "").localeCompare(b.full_name || ""),
          );

          setAvailableEmployees(filteredManagers);
        })
        .catch(console.error);
    } else {
      setAvailableEmployees([]);
    }
    return () => {
      active = false;
    };
  }, [selectedMarket]); // 🔥 Changed dependency from watchedStoreId to selectedMarket
  useEffect(() => {
    setCurrentPage(1);
  }, [watchedDate, watchedStoreId, selectedMarket]);

  const loadExpensesForDate = useCallback(async () => {
    if (!watchedDate) return;
    setIsLoadingRows(true);
    try {
      const response = await api.getExpensesByDateWithMarket({
        date: watchedDate,
        market_id: selectedMarket || undefined,
        store_id: watchedStoreId || undefined,
        page: currentPage,
        limit: ROWS_PER_PAGE,
      });

      const dataRows = response.data || [];
      setRows(dataRows);
      setTotalPages(response.pagination?.totalPages || 1);
      setGrandTotal(response.summary?.totalAmount || 0);

      let pt = 0;
      dataRows.forEach((r) => (pt += num(r.amount ?? r.amount_numeric ?? 0)));
      setPageTotal(pt);
    } catch (err) {
      console.error("Failed to load expenses", err);
      toast.error("Failed to load daily expenses.");
    } finally {
      setIsLoadingRows(false);
    }
  }, [watchedDate, selectedMarket, watchedStoreId, currentPage]);

  useEffect(() => {
    loadExpensesForDate();
  }, [loadExpensesForDate]);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    const regex = canEnterNegative ? /[^0-9.,$-]/g : /[^0-9.,$]/g;
    const cleaned = value.replace(regex, "");

    if (cleaned === "-" && canEnterNegative) {
      setValue("amount", cleaned, { shouldValidate: true });
      return;
    }

    const withoutFormat = cleaned.replace(/[$,\s]/g, "");
    if (/^-?\d*\.?\d{0,2}$/.test(withoutFormat) || cleaned === "") {
      setValue("amount", cleaned, { shouldValidate: true });
    }
  };

  const onSubmit = async (data) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const toastId = toast.loading("Processing expense...");

    try {
      let finalUrl = null;

      if (expFile) {
        toast.loading("Uploading receipt...", { id: toastId });
        const formData = new FormData();
        formData.append("file", expFile);
        const up = await api.uploadExpenseFile(formData);
        finalUrl = up.url || null;
      }

      const category = (
        CATEGORY_MAP[data.category.toLowerCase().trim()] || data.category
      )
        .trim()
        .toLowerCase();

      const payload = {
        expensedate: data.date,
        market_id: selectedMarket,
        store_id: parseInt(data.store_id, 10),
        category,
        amount: parseFloat(String(data.amount).replace(/[$,\s]/g, "")) || null,
        uploadurl: finalUrl,
        comment: data.comment,
        manager_user_id: parseInt(data.manager_user_id, 10), // 🔥 Transmit valid User ID
      };

      if (category === "important") {
        payload.status = "approved";
        payload.reason = "";
      }

      toast.loading("Saving expense...", { id: toastId });
      await api.createExpense(payload);

      toast.success("Expense saved successfully!", { id: toastId });

      loadExpensesForDate();
      reset({
        ...data,
        category: "",
        amount: "",
        comment: "",
        manager_user_id: "",
      });
      setExpFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const errCode = err?.response?.data?.error || err?.error;
      const errMsg = err?.response?.data?.message || err?.message || "";

      if (errCode === "BOOK_CLOSED" || errMsg.includes("Book closed")) {
        toast.dismiss(toastId);
        setShowClosedPopup(true);
      } else {
        toast.error(errMsg || "Failed to save expense", { id: toastId });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 px-4 py-4 sm:px-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-5 tracking-tight flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>Add Expense
          Record
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Date *
            </label>
            <CustomDatePicker
              name="date"
              control={control}
              rules={{ required: "Date is required" }}
              error={!!errors.date}
            />
            {errors.date && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.date.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Market
            </label>
            <input
              type="text"
              value={displayMarketName}
              readOnly
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Store *
            </label>
            <select
              {...register("store_id", { required: "Store is required" })}
              className={`border rounded-lg px-3 py-2 text-sm w-full outline-none transition-shadow bg-white ${errors.store_id ? "border-rose-500 bg-rose-50" : "border-slate-300 focus:ring-2 focus:ring-indigo-500"}`}
            >
              <option value="">Select Store</option>
              {availableStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.code ? `(${s.code})` : ""}
                </option>
              ))}
            </select>
            {errors.store_id && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.store_id.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Category *
            </label>
            <select
              {...register("category", { required: "Category is required" })}
              className={`border rounded-lg px-3 py-2 text-sm w-full outline-none transition-shadow bg-white ${errors.category ? "border-rose-500 bg-rose-50" : "border-slate-300 focus:ring-2 focus:ring-indigo-500"}`}
            >
              <option value="">Select category</option>
              <option value="hotel">Hotel</option>
              <option value="gas">Gas</option>
              <option value="team_dinner">Team Dinner</option>
              <option value="rent">Rent</option>
              <option value="uber">Uber</option>
              <option value="store_maintenance">Store Maintenance</option>
              <option value="store_cleaning">Store Cleaning</option>
              <option value="furniture">Furniture</option>
              <option value="cameras">Cameras</option>
              <option value="incentives">Incentives</option>
              <option value="business_license">Business License</option>
              <option value="competition">Competition</option>
              <option value="store_bonus">Store Bonus</option>
              <option value="store_supplies">Store Supplies</option>
              <option value="office_supply">Office Supply</option>
              <option value="handyman">Handyman</option>
              <option value="bill_pay_adjustment">Bill Pay Adjustment</option>
              <option value="houston_office_expense">
                Houston Office Expense
              </option>
              <option value="raffle">Raffle</option>
              <option value="ups_charges">UPS charges</option>
              <option value="cashout">Payout</option>
              <option value="important">Important</option>
              <option value="water">Water</option>
              <option value="Advance">Advance</option>
              <option value="other">Other</option>
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.category.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Amount *{" "}
              {watchedCategory?.toLowerCase() === "important" && (
                <span className="text-rose-600 normal-case tracking-normal ml-1">
                  (max $100)
                </span>
              )}
            </label>
            <input
              type="text"
              placeholder={
                canEnterNegative ? "e.g. 125.50 or -50.00" : "e.g. 125.50"
              }
              {...register("amount", {
                required: "Amount is required",
                onChange: handleAmountChange, // 🔥 Bound correctly to RHF
                validate: (val) => {
                  const numVal = parseFloat(String(val).replace(/[$,\s]/g, ""));
                  if (isNaN(numVal)) return "Amount is required";
                  if (numVal === 0) return "Amount cannot be 0";
                  if (numVal < 0 && !canEnterNegative)
                    return "Amount must be positive";
                  if (watchedCategory === "important" && numVal > 100)
                    return "Important max is $100";
                  return true;
                },
              })}
              className={`border rounded-lg px-3 py-2 text-sm w-full outline-none transition-shadow font-mono ${errors.amount ? "border-rose-500 bg-rose-50 text-rose-900" : "border-slate-300 focus:ring-2 focus:ring-indigo-500"}`}
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* 🔥 UPDATED: Replaced text input with dynamic Employee dropdown */}
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Manager Name *
            </label>
            <select
              {...register("manager_user_id", {
                required: "Manager name is required",
              })}
              disabled={availableEmployees.length === 0}
              className={`border rounded-lg px-3 py-2 text-sm w-full outline-none transition-shadow bg-white ${errors.manager_user_id ? "border-rose-500 bg-rose-50" : "border-slate-300 focus:ring-2 focus:ring-indigo-500"} ${availableEmployees.length === 0 ? "bg-slate-50 cursor-not-allowed" : ""}`}
            >
              <option value="">Select Manager</option>
              {availableEmployees.map((emp, idx) => {
                const empId = emp.id || emp.user_id || emp.employee_id || idx;
                const empName =
                  emp.name || emp.full_name || emp.first_name || "Unknown";
                return (
                  <option key={empId} value={empId}>
                    {empName}
                  </option>
                );
              })}
            </select>
            {errors.manager_user_id && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.manager_user_id.message}
              </p>
            )}
            {availableEmployees.length === 0 && (
              <p className="mt-1 text-[10px] text-amber-500">
                Select a store to view managers.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Logged In User
            </label>
            <input
              type="text"
              value={user?.fullName || user?.email || "Unknown"}
              readOnly
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Receipt file
              {numericAmount > 25 ? (
                <span className="text-rose-500 ml-1">*</span>
              ) : (
                <span className="text-slate-400 normal-case tracking-normal ml-1">
                  (Optional for $25 or less)
                </span>
              )}
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".jpg,.jpeg,.png,.pdf,.csv,.xls,.xlsx,image/jpeg,image/png,application/pdf,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setExpFile(e.target.files[0] || null)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm w-full outline-none transition-shadow bg-white focus:ring-2 focus:ring-indigo-500"
            />
            {numericAmount > 25 && !expFile && (
              <p className="mt-1 text-xs text-rose-600 font-medium">
                Receipt is required for amounts over $25
              </p>
            )}
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
              Comment *
            </label>
            <textarea
              rows="1"
              placeholder="Note about this expense"
              {...register("comment", { required: "Comment is required" })}
              className={`border rounded-lg px-3 py-2 text-sm w-full outline-none transition-shadow ${errors.comment ? "border-rose-500 bg-rose-50" : "border-slate-300 focus:ring-2 focus:ring-indigo-500"}`}
            />
            {errors.comment && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.comment.message}
              </p>
            )}
          </div>

          <div className="lg:col-span-4 flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isProcessing || (numericAmount > 25 && !expFile)}
              className={`px-8 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${isProcessing || (numericAmount > 25 && !expFile) ? "bg-slate-200 text-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-md"}`}
            >
              {isProcessing ? "Processing..." : "Save Expense"}
            </button>
          </div>
        </form>
      </div>

      {/* --- TABLE SECTION --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800 capitalize">
              Daily Expenses Sheet
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Showing records for{" "}
              <strong className="text-slate-700">{watchedDate}</strong>
            </p>
          </div>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {rows.length} rows shown
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 sticky left-0 bg-slate-50 z-10 border-r">
                  Date
                </th>
                <th className="px-3 py-3">Market/Store</th>
                <th className="px-3 py-3">Manager</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3 text-right">Amount</th>
                <th className="px-3 py-3 text-center">Receipt</th>
                <th className="px-3 py-3 border-l-2 border-slate-200 w-48">
                  Comment
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 bg-white">
              {isLoadingRows ? (
                <tr>
                  <td
                    colSpan="7"
                    className="py-12 text-center text-slate-500 font-medium"
                  >
                    Loading...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="py-12 text-center text-slate-500 font-medium"
                  >
                    No expenses logged for this date.
                  </td>
                </tr>
              ) : (
                rows.map((r, index) => {
                  const url =
                    r.upload_url ?? r.uploadurl ?? r.receipt_url ?? "";
                  const amtNum = num(r.amount);

                  return (
                    <tr
                      key={r.id || index}
                      className="hover:bg-blue-50 transition-colors h-12 group"
                    >
                      <td className="px-3 py-2 sticky left-0 bg-white group-hover:bg-blue-50 z-10 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium text-slate-700">
                        {toISO(r.expense_date ?? r.expensedate ?? r.date)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800">
                          {r.store ?? r.storeid ?? "-"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {r.market ?? "-"}
                        </div>
                      </td>
                      <td className="px-3 py-2 font-semibold text-slate-800">
                        {r.managername ?? r.manager_name ?? "-"}
                      </td>
                      <td className="px-3 py-2 capitalize font-medium text-slate-600">
                        {r.category ?? "-"}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-extrabold tracking-tight ${amtNum < 0 ? "text-rose-600" : "text-slate-900"}`}
                      >
                        ${fmt2(amtNum)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {url ? (
                          <a
                            className="text-blue-600 hover:text-blue-800 underline font-medium transition-colors"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                            No File
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 border-l-2 border-slate-100">
                        <TruncatedTooltip
                          text={r.comment ?? ""}
                          maxWidth="max-w-[200px]"
                          placeholder="-"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>

            <tfoot>
              <tr className="bg-indigo-50/30 border-t border-indigo-100">
                <td
                  className="px-3 py-3 text-right font-extrabold text-indigo-900 uppercase"
                  colSpan="4"
                >
                  Grand Total (All Pages):
                </td>
                <td className="px-3 py-3 text-right font-extrabold text-indigo-900 text-base">
                  ${fmt2(grandTotal)}
                </td>
                <td className="px-3 py-3 whitespace-nowrap" colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex items-center justify-between pt-4">
          <span className="text-xs font-bold text-slate-500">
            Page {totalPages > 0 ? currentPage : 0} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs disabled:opacity-50 font-bold hover:bg-slate-300 transition-colors"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-4 py-1.5 bg-slate-200 text-slate-700 rounded-md text-xs disabled:opacity-50 font-bold hover:bg-slate-300 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <BookClosedPopup
        isOpen={showClosedPopup}
        onClose={() => setShowClosedPopup(false)}
      />
    </div>
  );
}

export default function StoreExpensePage() {
  const [activeTab, setActiveTab] = useState("expenses");

  return (
    <section className="h-full flex flex-col">
      <div className="px-4 sm:px-6 pt-4 border-b border-slate-200 bg-slate-50/50 backdrop-blur-sm sticky top-0 z-30 flex items-end space-x-2">
        <div
          onClick={() => setActiveTab("expenses")}
          className={`group relative min-w-[140px] max-w-[200px] flex items-center justify-center py-2 px-4 text-xs sm:text-sm font-bold tracking-wide uppercase transition-all duration-200 select-none cursor-pointer rounded-t-lg border-t border-l border-r -mb-px ${activeTab === "expenses" ? "bg-white text-indigo-700 border-slate-200 shadow-[0_-2px_6px_rgba(0,0,0,0.03)] z-10" : "bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200 hover:text-slate-700"}`}
        >
          Store Expenses
        </div>
        <div
          onClick={() => setActiveTab("handincash")}
          className={`group relative min-w-[140px] max-w-[200px] flex items-center justify-center py-2 px-4 text-xs sm:text-sm font-bold tracking-wide uppercase transition-all duration-200 select-none cursor-pointer rounded-t-lg border-t border-l border-r -mb-px ${activeTab === "handincash" ? "bg-white text-indigo-700 border-slate-200 shadow-[0_-2px_6px_rgba(0,0,0,0.03)] z-10" : "bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200 hover:text-slate-700"}`}
        >
          Pick Up Amount
        </div>
      </div>
      <div className="flex-1 bg-slate-50/30">
        {activeTab === "expenses" ? <ExpensesTab /> : <InHandCashPage />}
      </div>
    </section>
  );
}
