// import React, { useState, useEffect, useCallback } from "react";
// import { useForm } from "react-hook-form";
// import toast from "react-hot-toast";
// import api from "../services/api.js";
// import { useAuth } from "../context/AuthContext.jsx";

// // --- Icons ---
// const PlusIcon = () => (
//   <svg
//     className="w-4 h-4 mr-2"
//     fill="none"
//     stroke="currentColor"
//     viewBox="0 0 24 24"
//   >
//     <path
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       strokeWidth={2}
//       d="M12 4v16m8-8H4"
//     />
//   </svg>
// );
// const EditIcon = () => (
//   <svg
//     className="w-4 h-4"
//     fill="none"
//     stroke="currentColor"
//     viewBox="0 0 24 24"
//   >
//     <path
//       strokeLinecap="round"
//       strokeLinejoin="round"
//       strokeWidth={2}
//       d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
//     />
//   </svg>
// );

// export default function AdminManagementPage() {
//   const { user } = useAuth();
//   const isPayrollMgr = user?.role === "payroll_manager";

//   // Tab State (Locked to employees for Payroll Manager)
//   const [activeTab, setActiveTab] = useState(
//     isPayrollMgr ? "employees" : "markets",
//   );

//   // Pagination & Data State
//   const [rows, setRows] = useState([]);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [totalRecords, setTotalRecords] = useState(0);
//   const [isLoading, setIsLoading] = useState(false);

//   // Filters
//   const [filterMarket, setFilterMarket] = useState("");

//   // Dropdown Lists (Fetched once without pagination for forms)
//   const [dropdownMarkets, setDropdownMarkets] = useState([]);
//   const [dropdownStores, setDropdownStores] = useState([]);

//   // Modal State
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [modalEntity, setModalEntity] = useState(null);

//   const {
//     register,
//     handleSubmit,
//     reset,
//     watch,
//     setValue,
//     formState: { errors },
//   } = useForm();

//   // Watchers for dynamic form behavior
//   const watchedRole = watch("role");
//   const watchedModalMarketId = watch("market_id"); // 🔥 Watches the Market Dropdown in the Modal

//   // Load Dropdowns once on mount
//   useEffect(() => {
//     const fetchDropdowns = async () => {
//       try {
//         const [mRes, sRes] = await Promise.all([
//           api.request("admin/markets?limit=1000"),
//           api.request("admin/stores?limit=2000"),
//         ]);
//         setDropdownMarkets(mRes.data || []);
//         setDropdownStores(sRes.data || []);
//       } catch (err) {
//         console.error("Failed to load dropdowns");
//       }
//     };
//     fetchDropdowns();
//   }, []);

//   // Reset page when tab or filter changes
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [activeTab, filterMarket]);

//   // Fetch the active tab's paginated data
//   const fetchTabData = useCallback(async () => {
//     setIsLoading(true);
//     try {
//       let endpoint = `admin/${activeTab}?page=${currentPage}&limit=50`;

//       // Apply market filter if on stores or employees tab
//       if (
//         filterMarket &&
//         (activeTab === "stores" || activeTab === "employees")
//       ) {
//         endpoint += `&market_id=${filterMarket}`;
//       }

//       const res = await api.request(endpoint);
//       setRows(res.data || []);
//       setTotalPages(res.pagination?.totalPages || 1);
//       setTotalRecords(res.pagination?.total || 0);
//     } catch (err) {
//       toast.error(`Failed to load ${activeTab} data.`);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [activeTab, currentPage, filterMarket]);

//   useEffect(() => {
//     fetchTabData();
//   }, [fetchTabData]);

//   // Form Handlers
//   const openModal = (entity = null) => {
//     setModalEntity(entity);
//     if (entity) {
//       const defaultValues = { ...entity };

//       // Prep User Data
//       if (activeTab === "users") {
//         // 🚀 BUG FIX: Prevent `.map` crash if market_ids is null/undefined
//         defaultValues.market_ids = Array.isArray(entity.market_ids)
//           ? entity.market_ids.map(String)
//           : [];
//       }

//       // 🔥 Smart Edit: Auto-select Market based on Employee's Store
//       if (activeTab === "employees" && entity.store_id) {
//         const storeObj = dropdownStores.find((s) => s.id === entity.store_id);
//         if (storeObj) {
//           defaultValues.market_id = String(storeObj.market_id);
//         }
//       }

//       reset(defaultValues);
//     } else {
//       reset({ is_active: true });
//     }
//     setIsModalOpen(true);
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setModalEntity(null);
//     reset();
//   };

//   const onSubmit = async (formData) => {
//     const toastId = toast.loading(`Saving ${activeTab.slice(0, -1)}...`);
//     try {
//       let payload = { ...formData };

//       if (activeTab === "users") {
//         if (payload.role !== "market_manager") {
//           payload.market_ids = [];
//         } else if (payload.market_ids) {
//           payload.market_ids = Array.isArray(payload.market_ids)
//             ? payload.market_ids.map(Number)
//             : [Number(payload.market_ids)];
//         }
//         if (
//           modalEntity &&
//           (!payload.password || payload.password.trim() === "")
//         ) {
//           delete payload.password;
//         }
//       }

//       if (payload.store_id) payload.store_id = parseInt(payload.store_id, 10);
//       if (payload.market_id)
//         payload.market_id = parseInt(payload.market_id, 10);

//       const method = modalEntity ? "PUT" : "POST";
//       const url = modalEntity
//         ? `admin/${activeTab}/${modalEntity.id}`
//         : `admin/${activeTab}`;

//       await api.request(url, {
//         method,
//         body: JSON.stringify(payload),
//       });

//       toast.success("Saved successfully!", { id: toastId });
//       closeModal();
//       fetchTabData(); // Refresh table
//     } catch (err) {
//       toast.error(err?.message || "Failed to save.", { id: toastId });
//     }
//   };

//   // --- Dynamic Form Rendering ---
//   const renderFormFields = () => {
//     if (activeTab === "markets") {
//       return (
//         <div>
//           <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
//             Market Name *
//           </label>
//           <input
//             {...register("name", { required: true })}
//             className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//           />
//         </div>
//       );
//     }

//     if (activeTab === "stores") {
//       return (
//         <>
//           <div>
//             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Market *
//             </label>
//             <select
//               {...register("market_id", { required: true })}
//               className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
//             >
//               <option value="">Select Market...</option>
//               {dropdownMarkets.map((m) => (
//                 <option key={m.id} value={m.id}>
//                   {m.name}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Store Name *
//             </label>
//             <input
//               {...register("name", { required: true })}
//               className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//             />
//           </div>
//           <div>
//             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Store Code
//             </label>
//             <input
//               {...register("store_code")}
//               className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//             />
//           </div>
//         </>
//       );
//     }

//     if (activeTab === "employees") {
//       // 🔥 Filter stores dynamically based on the Market Dropdown
//       const filteredStores = watchedModalMarketId
//         ? dropdownStores.filter(
//             (s) => String(s.market_id) === String(watchedModalMarketId),
//           )
//         : [];

//       return (
//         <>
//           <div>
//             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Market *
//             </label>
//             <select
//               {...register("market_id", {
//                 required: true,
//                 onChange: () => setValue("store_id", ""), // Wipes out store selection if market changes
//               })}
//               className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
//             >
//               <option value="">Select Market...</option>
//               {dropdownMarkets.map((m) => (
//                 <option key={m.id} value={m.id}>
//                   {m.name}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Store *
//             </label>
//             <select
//               {...register("store_id", { required: true })}
//               disabled={!watchedModalMarketId}
//               className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
//             >
//               <option value="">Select Store...</option>
//               {filteredStores.map((s) => (
//                 <option key={s.id} value={s.id}>
//                   {s.name} {s.store_code ? `(${s.store_code})` : ""}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Full Name *
//             </label>
//             <input
//               {...register("full_name", { required: true })}
//               className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//             />
//           </div>
//           <div>
//             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Employee ID / Code
//             </label>
//             <input
//               {...register("employee_code")}
//               className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//             />
//           </div>
//           <div>
//             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
//               NTID (Optional)
//             </label>
//             <input
//               {...register("ntid")}
//               className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//             />
//           </div>
//         </>
//       );
//     }

//     if (activeTab === "users") {
//       return (
//         <>
//           <div>
//             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Full Name *
//             </label>
//             <input
//               {...register("full_name", { required: true })}
//               className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//             />
//           </div>
//           <div>
//             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Email Address *
//             </label>
//             <input
//               type="email"
//               {...register("email", { required: true })}
//               className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//             />
//           </div>
//           <div>
//             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Password {modalEntity ? "(Leave blank to keep current)" : "*"}
//             </label>
//             <input
//               type="password"
//               placeholder={modalEntity ? "••••••••" : "Enter new password"}
//               {...register("password", { required: !modalEntity })}
//               className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
//             />
//           </div>
//           <div>
//             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Role *
//             </label>
//             <select
//               {...register("role", { required: true })}
//               className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
//             >
//               <option value="">Select Role...</option>
//               <option value="market_manager">Market Manager</option>
//               <option value="payroll_manager">Payroll Manager</option>
//               <option value="expense_commission_manager">
//                 Expense & Commission Manager
//               </option>
//               <option value="admin">Admin</option>
//               <option value="super_admin">Super Admin</option>
//             </select>
//           </div>
//           {watchedRole === "market_manager" && (
//             <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 col-span-full">
//               <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wide mb-2">
//                 Assign Markets
//               </label>
//               <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
//                 {dropdownMarkets.map((m) => (
//                   <label
//                     key={m.id}
//                     className="flex items-center gap-2 p-2 hover:bg-white rounded border border-transparent hover:border-slate-200 cursor-pointer"
//                   >
//                     <input
//                       type="checkbox"
//                       value={m.id}
//                       {...register("market_ids")}
//                       className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
//                     />
//                     <span className="text-sm font-medium text-slate-700 truncate">
//                       {m.name}
//                     </span>
//                   </label>
//                 ))}
//               </div>
//             </div>
//           )}
//         </>
//       );
//     }
//   };

//   // --- Dynamic Table Rendering ---
//   const renderTableHeaders = () => {
//     switch (activeTab) {
//       case "markets":
//         return (
//           <>
//             <th className="px-4 py-3">Market Name</th>
//             <th className="px-4 py-3 text-center">Status</th>
//           </>
//         );
//       case "stores":
//         return (
//           <>
//             <th className="px-4 py-3">Store Name</th>
//             <th className="px-4 py-3">Store Code</th>
//             <th className="px-4 py-3">Market</th>
//             <th className="px-4 py-3 text-center">Status</th>
//           </>
//         );
//       case "employees":
//         return (
//           <>
//             <th className="px-4 py-3">Employee Name</th>
//             <th className="px-4 py-3">Emp ID</th>
//             <th className="px-4 py-3">NTID</th>
//             <th className="px-4 py-3">Store</th>
//             <th className="px-4 py-3 text-center">Status</th>
//           </>
//         );
//       case "users":
//         return (
//           <>
//             <th className="px-4 py-3">Full Name</th>
//             <th className="px-4 py-3">Email</th>
//             <th className="px-4 py-3">Role</th>
//             <th className="px-4 py-3">Assigned Markets</th>
//             <th className="px-4 py-3 text-center">Status</th>
//           </>
//         );
//       default:
//         return null;
//     }
//   };

//   const renderTableRows = () => {
//     return rows.map((row) => (
//       <tr
//         key={row.id}
//         className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
//       >
//         <td className="px-4 py-2 w-16 text-center">
//           <button
//             onClick={() => openModal(row)}
//             className="text-blue-500 hover:bg-blue-100 p-1.5 rounded transition-colors"
//           >
//             <EditIcon />
//           </button>
//         </td>

//         {activeTab === "markets" && (
//           <td className="px-4 py-2 font-medium text-slate-800">{row.name}</td>
//         )}

//         {activeTab === "stores" && (
//           <>
//             <td className="px-4 py-2 font-medium text-slate-800">{row.name}</td>
//             <td className="px-4 py-2 font-mono text-slate-500 text-xs">
//               {row.store_code || "-"}
//             </td>
//             <td className="px-4 py-2 text-slate-600 text-sm">
//               {row.market_name || "-"}
//             </td>
//           </>
//         )}

//         {activeTab === "employees" && (
//           <>
//             <td className="px-4 py-2 font-medium text-slate-800">
//               {row.full_name}
//             </td>
//             <td className="px-4 py-2 font-mono text-slate-500 text-xs">
//               {row.employee_code || "-"}
//             </td>
//             <td className="px-4 py-2 font-mono text-slate-500 text-xs">
//               {row.ntid || "-"}
//             </td>
//             <td className="px-4 py-2 text-slate-600 text-sm">
//               {row.store_name || "-"}
//             </td>
//           </>
//         )}

//         {activeTab === "users" && (
//           <>
//             <td className="px-4 py-2 font-medium text-slate-800">
//               {row.full_name}
//             </td>
//             <td className="px-4 py-2 text-slate-600 text-sm">{row.email}</td>
//             <td className="px-4 py-2">
//               {/* 🚀 BUG FIX: Added string fallback for role to prevent replace() crash */}
//               <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
//                 {String(row.role || "No Role").replace(/_/g, " ")}
//               </span>
//             </td>
//             <td className="px-4 py-2 text-xs text-slate-500 max-w-[200px] truncate">
//               {/* 🚀 BUG FIX: Added Array.isArray check to prevent map() crash */}
//               {row.role === "market_manager" &&
//               Array.isArray(row.market_ids) &&
//               row.market_ids.length > 0
//                 ? row.market_ids
//                     .map((id) => dropdownMarkets.find((m) => m.id === id)?.name)
//                     .filter(Boolean)
//                     .join(", ")
//                 : row.role === "market_manager"
//                   ? "None"
//                   : "All (Global Access)"}
//             </td>
//           </>
//         )}

//         <td className="px-4 py-2 text-center">
//           <span
//             className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${row.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
//           >
//             {row.is_active ? "Active" : "Inactive"}
//           </span>
//         </td>
//       </tr>
//     ));
//   };

//   let tabs = [
//     { id: "markets", label: "Markets" },
//     { id: "stores", label: "Stores" },
//     { id: "employees", label: "Employees" },
//     { id: "users", label: "System Users" },
//   ];
//   if (isPayrollMgr) {
//     tabs = [{ id: "employees", label: "Employees" }];
//   }

//   return (
//     <section className="p-4 sm:p-6 space-y-6 max-w-[1200px] mx-auto animate-fadeIn">
//       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
//         <div>
//           <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
//             System Settings
//           </h1>
//           <p className="text-sm text-slate-500 font-medium mt-1">
//             Manage global hierarchy, locations, and access control.
//           </p>
//         </div>
//         <button
//           onClick={() => openModal()}
//           className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95"
//         >
//           <PlusIcon /> Add {activeTab.slice(0, -1)}
//         </button>
//       </div>

//       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4 pb-0 mb-4">
//         {/* Filter Section for Stores & Employees */}
//         {["stores", "employees"].includes(activeTab) && (
//           <div className="mb-4 w-full sm:w-64">
//             <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
//               Filter by Market
//             </label>
//             <select
//               value={filterMarket}
//               onChange={(e) => setFilterMarket(e.target.value)}
//               className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 hover:bg-white transition-colors"
//             >
//               <option value="">All Markets</option>
//               {dropdownMarkets.map((m) => (
//                 <option key={m.id} value={m.id}>
//                   {m.name}
//                 </option>
//               ))}
//             </select>
//           </div>
//         )}
//       </div>

//       <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
//         <div className="flex border-b border-slate-200 overflow-x-auto custom-scrollbar">
//           {tabs.map((t) => (
//             <button
//               key={t.id}
//               onClick={() => setActiveTab(t.id)}
//               className={`flex-1 py-3 px-6 text-sm font-bold tracking-wide uppercase transition-colors whitespace-nowrap ${
//                 activeTab === t.id
//                   ? "border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/50"
//                   : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
//               }`}
//             >
//               {t.label}
//             </button>
//           ))}
//         </div>

//         <div className="p-0 overflow-x-auto custom-scrollbar min-h-[400px]">
//           {isLoading ? (
//             <div className="flex justify-center items-center py-20 text-slate-400 font-medium">
//               Loading records...
//             </div>
//           ) : rows.length === 0 ? (
//             <div className="flex justify-center items-center py-20 text-slate-400 font-medium">
//               No records found. Click "Add" to create one.
//             </div>
//           ) : (
//             <table className="w-full text-left text-sm whitespace-nowrap">
//               <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
//                 <tr>
//                   <th className="px-4 py-3 w-16 text-center">Edit</th>
//                   {renderTableHeaders()}
//                 </tr>
//               </thead>
//               <tbody>{renderTableRows()}</tbody>
//             </table>
//           )}
//         </div>

//         {/* Pagination UI */}
//         <div className="flex items-center justify-between p-4 border-t border-slate-200">
//           <span className="text-[11px] font-bold text-slate-400 uppercase">
//             Page {currentPage} of {totalPages}{" "}
//             <span className="ml-2 lowercase text-slate-400">
//               ({totalRecords} total records)
//             </span>
//           </span>
//           <div className="flex gap-2">
//             <button
//               onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
//               disabled={currentPage === 1 || isLoading}
//               className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
//             >
//               Prev
//             </button>
//             <button
//               onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
//               disabled={
//                 currentPage === totalPages || totalPages === 0 || isLoading
//               }
//               className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
//             >
//               Next
//             </button>
//           </div>
//         </div>
//       </div>

//       {isModalOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
//           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
//             <h2 className="text-xl font-extrabold text-slate-800 mb-6 border-b pb-3 capitalize">
//               {modalEntity ? "Edit" : "New"} {activeTab.slice(0, -1)}
//             </h2>
//             <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//               <div
//                 className={
//                   activeTab === "users"
//                     ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
//                     : "space-y-4"
//                 }
//               >
//                 {renderFormFields()}
//               </div>
//               {modalEntity && (
//                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 col-span-full">
//                   <label className="flex items-center gap-3 cursor-pointer p-1 rounded hover:bg-slate-200">
//                     <input
//                       type="checkbox"
//                       {...register("is_active")}
//                       className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
//                     />
//                     <span className="text-sm font-bold text-slate-700">
//                       Entity is Active
//                     </span>
//                   </label>
//                   <p className="text-[10px] text-slate-500 mt-1 ml-1">
//                     Unchecking this hides it from dropdowns but preserves
//                     historical data.
//                   </p>
//                 </div>
//               )}
//               <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
//                 <button
//                   type="button"
//                   onClick={closeModal}
//                   className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors capitalize"
//                 >
//                   Save {activeTab.slice(0, -1)}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </section>
//   );
// }
import React, { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import api from "../services/api.js";
import { useAuth } from "../context/AuthContext.jsx";

// --- Icons ---
const PlusIcon = () => (
  <svg
    className="w-4 h-4 mr-2"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 4v16m8-8H4"
    />
  </svg>
);
const EditIcon = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
);

export default function AdminManagementPage() {
  const { user } = useAuth();
  const isPayrollMgr = user?.role === "payroll_manager";

  // Tab State (Locked to employees for Payroll Manager)
  const [activeTab, setActiveTab] = useState(
    isPayrollMgr ? "employees" : "markets",
  );

  // Pagination & Data State
  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [filterMarket, setFilterMarket] = useState("");
  const [filterMissingNtid, setFilterMissingNtid] = useState(false); // 🔥 NEW: Toggle filter
  const [missingNtidCount, setMissingNtidCount] = useState(0); // 🔥 NEW: Total missing

  // Dropdown Lists (Fetched once without pagination for forms)
  const [dropdownMarkets, setDropdownMarkets] = useState([]);
  const [dropdownStores, setDropdownStores] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEntity, setModalEntity] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm();

  // Watchers for dynamic form behavior
  const watchedRole = watch("role");
  const watchedModalMarketId = watch("market_id");

  // Load Dropdowns once on mount
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [mRes, sRes] = await Promise.all([
          api.request("admin/markets?limit=1000"),
          api.request("admin/stores?limit=2000"),
        ]);
        setDropdownMarkets(mRes.data || []);
        setDropdownStores(sRes.data || []);
      } catch (err) {
        console.error("Failed to load dropdowns");
      }
    };
    fetchDropdowns();
  }, []);

  // Reset page when tab or any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, filterMarket, filterMissingNtid]);

  // Fetch the active tab's paginated data
  const fetchTabData = useCallback(async () => {
    setIsLoading(true);
    try {
      let endpoint = `admin/${activeTab}?page=${currentPage}&limit=50`;

      // Apply market filter if on stores or employees tab
      if (
        filterMarket &&
        (activeTab === "stores" || activeTab === "employees")
      ) {
        endpoint += `&market_id=${filterMarket}`;
      }

      // 🔥 Apply Missing NTID filter
      if (filterMissingNtid && activeTab === "employees") {
        endpoint += `&missing_ntid=true`;
      }

      const res = await api.request(endpoint);

      // Robust array extraction
      const isPaginated = res && res.data !== undefined;
      const dataRows = isPaginated ? res.data : Array.isArray(res) ? res : [];

      setRows(dataRows);
      setTotalPages(res?.pagination?.totalPages || 1);
      setTotalRecords(res?.pagination?.total || dataRows.length);

      // 🔥 Capture the missing count from backend
      if (activeTab === "employees") {
        if (res?.missing_ntid_count !== undefined) {
          setMissingNtidCount(res.missing_ntid_count);
        } else if (!isPaginated) {
          const missing = dataRows.filter(
            (e) => (!e.ntid || e.ntid.trim() === "") && e.is_active,
          );
          setMissingNtidCount(missing.length);
        }
      }
    } catch (err) {
      toast.error(`Failed to load ${activeTab} data.`);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, currentPage, filterMarket, filterMissingNtid]);

  useEffect(() => {
    fetchTabData();
  }, [fetchTabData]);

  // Form Handlers
  const openModal = (entity = null) => {
    setModalEntity(entity);
    if (entity) {
      const defaultValues = { ...entity };

      // Prep User Data
      if (activeTab === "users") {
        defaultValues.market_ids = Array.isArray(entity.market_ids)
          ? entity.market_ids.map(String)
          : [];
      }

      // Smart Edit: Auto-select Market based on Employee's Store
      if (activeTab === "employees" && entity.store_id) {
        const storeObj = dropdownStores.find((s) => s.id === entity.store_id);
        if (storeObj) {
          defaultValues.market_id = String(storeObj.market_id);
        }
      }

      reset(defaultValues);
    } else {
      reset({ is_active: true });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalEntity(null);
    reset();
  };

  const onSubmit = async (formData) => {
    const toastId = toast.loading(`Saving ${activeTab.slice(0, -1)}...`);
    try {
      let payload = { ...formData };

      if (activeTab === "users") {
        if (payload.role !== "market_manager") {
          payload.market_ids = [];
        } else if (payload.market_ids) {
          payload.market_ids = Array.isArray(payload.market_ids)
            ? payload.market_ids.map(Number)
            : [Number(payload.market_ids)];
        }
        if (
          modalEntity &&
          (!payload.password || payload.password.trim() === "")
        ) {
          delete payload.password;
        }
      }

      if (payload.store_id) payload.store_id = parseInt(payload.store_id, 10);
      if (payload.market_id)
        payload.market_id = parseInt(payload.market_id, 10);

      const method = modalEntity ? "PUT" : "POST";
      const url = modalEntity
        ? `admin/${activeTab}/${modalEntity.id}`
        : `admin/${activeTab}`;

      await api.request(url, {
        method,
        body: JSON.stringify(payload),
      });

      toast.success("Saved successfully!", { id: toastId });
      closeModal();
      fetchTabData(); // Refresh table
    } catch (err) {
      toast.error(err?.message || "Failed to save.", { id: toastId });
    }
  };

  // --- Dynamic Form Rendering ---
  const renderFormFields = () => {
    if (activeTab === "markets") {
      return (
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
            Market Name *
          </label>
          <input
            {...register("name", { required: true })}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      );
    }

    if (activeTab === "stores") {
      return (
        <>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Market *
            </label>
            <select
              {...register("market_id", { required: true })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="">Select Market...</option>
              {dropdownMarkets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Store Name *
            </label>
            <input
              {...register("name", { required: true })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Store Code
            </label>
            <input
              {...register("store_code")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </>
      );
    }

    if (activeTab === "employees") {
      // Filter stores dynamically based on the Market Dropdown
      const filteredStores = watchedModalMarketId
        ? dropdownStores.filter(
            (s) => String(s.market_id) === String(watchedModalMarketId),
          )
        : [];

      return (
        <>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Market *
            </label>
            <select
              {...register("market_id", {
                required: true,
                onChange: () => setValue("store_id", ""), // Wipes out store selection if market changes
              })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="">Select Market...</option>
              {dropdownMarkets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Store *
            </label>
            <select
              {...register("store_id", { required: true })}
              disabled={!watchedModalMarketId}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Select Store...</option>
              {filteredStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.store_code ? `(${s.store_code})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Full Name *
            </label>
            <input
              {...register("full_name", { required: true })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Employee ID / Code
            </label>
            <input
              {...register("employee_code")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              NTID (Optional)
            </label>
            <input
              {...register("ntid")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </>
      );
    }

    if (activeTab === "users") {
      return (
        <>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Full Name *
            </label>
            <input
              {...register("full_name", { required: true })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Email Address *
            </label>
            <input
              type="email"
              {...register("email", { required: true })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Password {modalEntity ? "(Leave blank to keep current)" : "*"}
            </label>
            <input
              type="password"
              placeholder={modalEntity ? "••••••••" : "Enter new password"}
              {...register("password", { required: !modalEntity })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Role *
            </label>
            <select
              {...register("role", { required: true })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="">Select Role...</option>
              <option value="market_manager">Market Manager</option>
              <option value="payroll_manager">Payroll Manager</option>
              <option value="expense_commission_manager">
                Expense & Commission Manager
              </option>
              <option value="admin">Admin</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>
          {watchedRole === "market_manager" && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 col-span-full">
              <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wide mb-2">
                Assign Markets
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                {dropdownMarkets.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-center gap-2 p-2 hover:bg-white rounded border border-transparent hover:border-slate-200 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      value={m.id}
                      {...register("market_ids")}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {m.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      );
    }
  };

  // --- Dynamic Table Rendering ---
  const renderTableHeaders = () => {
    switch (activeTab) {
      case "markets":
        return (
          <>
            <th className="px-4 py-3">Market Name</th>
            <th className="px-4 py-3 text-center">Status</th>
          </>
        );
      case "stores":
        return (
          <>
            <th className="px-4 py-3">Store Name</th>
            <th className="px-4 py-3">Store Code</th>
            <th className="px-4 py-3">Market</th>
            <th className="px-4 py-3 text-center">Status</th>
          </>
        );
      case "employees":
        return (
          <>
            <th className="px-4 py-3">Employee Name</th>
            <th className="px-4 py-3">Emp ID</th>
            <th className="px-4 py-3 text-rose-600 font-extrabold">NTID</th>
            <th className="px-4 py-3">Store</th>
            <th className="px-4 py-3 text-center">Status</th>
          </>
        );
      case "users":
        return (
          <>
            <th className="px-4 py-3">Full Name</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Assigned Markets</th>
            <th className="px-4 py-3 text-center">Status</th>
          </>
        );
      default:
        return null;
    }
  };

  const renderTableRows = () => {
    return rows.map((row) => (
      <tr
        key={row.id}
        className="hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
      >
        <td className="px-4 py-2 w-16 text-center">
          <button
            onClick={() => openModal(row)}
            className="text-blue-500 hover:bg-blue-100 p-1.5 rounded transition-colors"
          >
            <EditIcon />
          </button>
        </td>

        {activeTab === "markets" && (
          <td className="px-4 py-2 font-medium text-slate-800">{row.name}</td>
        )}

        {activeTab === "stores" && (
          <>
            <td className="px-4 py-2 font-medium text-slate-800">{row.name}</td>
            <td className="px-4 py-2 font-mono text-slate-500 text-xs">
              {row.store_code || "-"}
            </td>
            <td className="px-4 py-2 text-slate-600 text-sm">
              {row.market_name || "-"}
            </td>
          </>
        )}

        {activeTab === "employees" && (
          <>
            <td className="px-4 py-2 font-medium text-slate-800">
              {row.full_name}
            </td>
            <td className="px-4 py-2 font-mono text-slate-500 text-xs">
              {row.employee_code || "-"}
            </td>
            <td className="px-4 py-2 font-mono font-bold text-xs">
              {row.ntid ? (
                <span className="text-slate-500">{row.ntid}</span>
              ) : (
                <span className="text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 uppercase tracking-widest text-[9px]">
                  Missing
                </span>
              )}
            </td>
            <td className="px-4 py-2 text-slate-600 text-sm">
              {row.store_name || "-"}
            </td>
          </>
        )}

        {activeTab === "users" && (
          <>
            <td className="px-4 py-2 font-medium text-slate-800">
              {row.full_name}
            </td>
            <td className="px-4 py-2 text-slate-600 text-sm">{row.email}</td>
            <td className="px-4 py-2">
              <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                {String(row.role || "No Role").replace(/_/g, " ")}
              </span>
            </td>
            <td className="px-4 py-2 text-xs text-slate-500 max-w-[200px] truncate">
              {row.role === "market_manager" &&
              Array.isArray(row.market_ids) &&
              row.market_ids.length > 0
                ? row.market_ids
                    .map((id) => dropdownMarkets.find((m) => m.id === id)?.name)
                    .filter(Boolean)
                    .join(", ")
                : row.role === "market_manager"
                  ? "None"
                  : "All (Global Access)"}
            </td>
          </>
        )}

        <td className="px-4 py-2 text-center">
          <span
            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${row.is_active ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
          >
            {row.is_active ? "Active" : "Inactive"}
          </span>
        </td>
      </tr>
    ));
  };

  let tabs = [
    { id: "markets", label: "Markets" },
    { id: "stores", label: "Stores" },
    { id: "employees", label: "Employees" },
    { id: "users", label: "System Users" },
  ];
  if (isPayrollMgr) {
    tabs = [{ id: "employees", label: "Employees" }];
  }

  return (
    <section className="p-4 sm:p-6 space-y-6 max-w-[1200px] mx-auto animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            System Settings
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Manage global hierarchy, locations, and access control.
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95"
        >
          <PlusIcon /> Add {activeTab.slice(0, -1)}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-4 pb-0 mb-4 flex flex-col sm:flex-row gap-4">
        {/* Filter Section for Stores & Employees */}
        {["stores", "employees"].includes(activeTab) && (
          <div className="mb-4 w-full sm:w-64">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Filter by Market
            </label>
            <select
              value={filterMarket}
              onChange={(e) => setFilterMarket(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 hover:bg-white transition-colors"
            >
              <option value="">All Markets</option>
              {dropdownMarkets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 🔥 NEW: Missing NTID Action Card */}
        {activeTab === "employees" && (
          <div
            onClick={() => setFilterMissingNtid(!filterMissingNtid)}
            className={`mb-4 cursor-pointer border rounded-xl p-3 flex items-center justify-between transition-all w-full sm:w-72 shadow-sm ${
              filterMissingNtid
                ? "bg-rose-600 border-rose-700 text-white shadow-md ring-2 ring-rose-300 scale-[1.02]"
                : "bg-rose-50 border-rose-200 text-rose-800 hover:bg-rose-100 hover:shadow-md"
            }`}
          >
            <div>
              <p
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  filterMissingNtid ? "text-rose-100" : "text-rose-500"
                }`}
              >
                Action Required
              </p>
              <h3 className="text-sm font-extrabold mt-0.5">Missing NT IDs</h3>
            </div>
            <div
              className={`text-2xl font-black font-mono ${
                filterMissingNtid ? "text-white" : "text-rose-600"
              }`}
            >
              {missingNtidCount}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 overflow-x-auto custom-scrollbar">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-3 px-6 text-sm font-bold tracking-wide uppercase transition-colors whitespace-nowrap ${
                activeTab === t.id
                  ? "border-b-2 border-indigo-600 text-indigo-700 bg-indigo-50/50"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-0 overflow-x-auto custom-scrollbar min-h-[400px]">
          {isLoading ? (
            <div className="flex justify-center items-center py-20 text-slate-400 font-medium">
              Loading records...
            </div>
          ) : rows.length === 0 ? (
            <div className="flex justify-center items-center py-20 text-slate-400 font-medium">
              No records found. Click "Add" to create one.
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 w-16 text-center">Edit</th>
                  {renderTableHeaders()}
                </tr>
              </thead>
              <tbody>{renderTableRows()}</tbody>
            </table>
          )}
        </div>

        {/* Pagination UI */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Page {currentPage} of {totalPages}{" "}
            <span className="ml-2 lowercase text-slate-400">
              ({totalRecords} total records)
            </span>
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isLoading}
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={
                currentPage === totalPages || totalPages === 0 || isLoading
              }
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-extrabold text-slate-800 mb-6 border-b pb-3 capitalize">
              {modalEntity ? "Edit" : "New"} {activeTab.slice(0, -1)}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div
                className={
                  activeTab === "users"
                    ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
                    : "space-y-4"
                }
              >
                {renderFormFields()}
              </div>
              {modalEntity && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 col-span-full">
                  <label className="flex items-center gap-3 cursor-pointer p-1 rounded hover:bg-slate-200">
                    <input
                      type="checkbox"
                      {...register("is_active")}
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm font-bold text-slate-700">
                      Entity is Active
                    </span>
                  </label>
                  <p className="text-[10px] text-slate-500 mt-1 ml-1">
                    Unchecking this hides it from dropdowns but preserves
                    historical data.
                  </p>
                </div>
              )}
              <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors capitalize"
                >
                  Save {activeTab.slice(0, -1)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
