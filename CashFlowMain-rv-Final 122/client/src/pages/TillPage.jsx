import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
import { todayCST, fmt2, num, toISO } from "../utils/utils.js";
import toast from "react-hot-toast";

import BookClosedPopup from "../components/BookClosedPopup.jsx";

const ROWS_PER_PAGE = 20;

function getCurrentYearMonth() {
  const d = new Date();
  return { y: d.getFullYear(), m: d.getMonth() + 1 };
}
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}
function pad2(n) {
  return String(n).padStart(2, "0");
}

export default function TillPage() {
  const { selectedMarket, selectedStore, markets } = useGlobalState();

  const currentMarketObj = (markets || []).find(
    (m) => String(m.id) === String(selectedMarket),
  );
  const displayMarketName = currentMarketObj
    ? currentMarketObj.name
    : "All Markets";

  const [availableStores, setAvailableStores] = useState([]);

  // --- Form & Popup State ---
  const [carryForwardBal, setCarryForwardBal] = useState(0);
  const [isLoadingCF, setIsLoadingCF] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showClosedPopup, setShowClosedPopup] = useState(false);

  // 🔥 Lockout State
  const [lockedDate, setLockedDate] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      date: todayCST(),
      store_id: selectedStore || "",
      till_entry: "",
    },
    mode: "onChange",
  });

  const watchedDate = watch("date");
  const watchedStoreId = watch("store_id");
  const watchedTillEntry = watch("till_entry");

  // --- Audit Modal State ---
  const [auditModal, setAuditModal] = useState({
    isOpen: false,
    id: null,
    startingTotal: 0,
  });
  const [auditSpent, setAuditSpent] = useState("");
  const [auditReason, setAuditReason] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);

  // --- History Filter State ---
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);
  const [filterYear, setFilterYear] = useState(curY);
  const [filterMonth, setFilterMonth] = useState(curM);
  const [filterStore, setFilterStore] = useState(selectedStore || "");

  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const { fromDate, toDate } = useMemo(() => {
    const lastDay = daysInMonth(filterYear, filterMonth);
    return {
      fromDate: `${filterYear}-${pad2(filterMonth)}-01`,
      toDate: `${filterYear}-${pad2(filterMonth)}-${pad2(lastDay)}`,
    };
  }, [filterYear, filterMonth]);

  // Real-time calculation for Opening Till
  const calculatedOpeningTotal = useMemo(() => {
    return num(carryForwardBal) + num(watchedTillEntry);
  }, [carryForwardBal, watchedTillEntry]);

  // Load Stores
  useEffect(() => {
    if (selectedMarket) {
      api
        .getStores(selectedMarket)
        .then((data) => setAvailableStores(data || []))
        .catch(console.error);
    } else {
      setAvailableStores([]);
    }
  }, [selectedMarket]);

  // Sync Form Store to Global Store initially
  useEffect(() => {
    setValue("store_id", selectedStore || "");
    setFilterStore(selectedStore || "");
  }, [selectedStore, setValue]);

  // Fetch Previous Balance & Check Lock Status
  useEffect(() => {
    const fetchCF = async () => {
      if (!watchedStoreId || !watchedDate) {
        setCarryForwardBal(0);
        setLockedDate(null);
        return;
      }
      setIsLoadingCF(true);
      try {
        const res = await api.getPreviousTillBalance(
          watchedStoreId,
          watchedDate,
        );
        if (res?.is_locked) {
          setLockedDate(res.locked_date);
          setCarryForwardBal(0);
        } else {
          setLockedDate(null);
          setCarryForwardBal(res?.carry_forward_bal || 0);
        }
      } catch (err) {
        console.error("Failed to fetch previous balance", err);
        setCarryForwardBal(0);
        setLockedDate(null);
      } finally {
        setIsLoadingCF(false);
      }
    };
    fetchCF();
  }, [watchedStoreId, watchedDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStore, filterYear, filterMonth, selectedMarket]);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const response = await api.getCashflow({
        market_id: selectedMarket || undefined,
        store_id:
          filterStore && filterStore !== "undefined"
            ? parseInt(filterStore, 10)
            : undefined,
        date_from: fromDate,
        date_to: toDate,
        page: currentPage,
        limit: ROWS_PER_PAGE,
      });

      setRows(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load till history");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [selectedMarket, filterStore, fromDate, toDate, currentPage]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onSubmit = async (data) => {
    if (!selectedMarket) return toast.error("Please select a market.");
    const toastId = toast.loading("Opening Till...");
    setIsSaving(true);

    try {
      await api.createCashflow({
        date: data.date,
        market_id: selectedMarket,
        store_id: parseInt(data.store_id, 10),
        carry_forward_bal: carryForwardBal,
        till_entry: num(data.till_entry),
      });

      toast.success("Till opened successfully!", { id: toastId });
      reset({ ...data, till_entry: "" });
      loadHistory();
    } catch (err) {
      const errCode = err?.response?.data?.error || err?.error;
      const errMsg = err?.response?.data?.message || err?.message || "";

      if (errCode === "BOOK_CLOSED" || errMsg.includes("Book closed")) {
        toast.dismiss(toastId);
        setShowClosedPopup(true);
      } else {
        toast.error(errMsg || "Failed to open till", { id: toastId });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // const submitAudit = async () => {
  //   if (num(auditSpent) > 0 && !auditReason.trim()) {
  //     return toast.error("Please provide a reason for the spent amount.");
  //   }

  //   setIsAuditing(true);
  //   const toastId = toast.loading("Auditing till...");
  //   try {
  //     await api.auditTill(auditModal.id, {
  //       spent_amount: num(auditSpent),
  //       reason_for_spending: auditReason,
  //     });
  //     toast.success("Till audited successfully!", { id: toastId });
  //     setAuditModal({ isOpen: false, id: null, startingTotal: 0 });
  //     setAuditSpent("");
  //     setAuditReason("");

  //     // Re-trigger balance check to unlock form
  //     setValue("store_id", watchedStoreId, { shouldValidate: true });
  //     loadHistory();
  //   } catch (err) {
  //     toast.error(err?.response?.data?.error || "Failed to audit till", {
  //       id: toastId,
  //     });
  //   } finally {
  //     setIsAuditing(false);
  //   }
  // };
  const submitAudit = async () => {
    // 1. Safely parse the number, defaulting to 0
    const finalSpentAmount = num(auditSpent) || 0;

    // 2. Safely parse the reason, defaulting to null if empty
    const finalReason = auditReason.trim() === "" ? null : auditReason.trim();

    if (finalSpentAmount > 0 && !finalReason) {
      return toast.error("Please provide a reason for the spent amount.");
    }

    setIsAuditing(true);
    const toastId = toast.loading("Auditing till...");
    try {
      await api.auditTill(auditModal.id, {
        spent_amount: finalSpentAmount,
        reason_for_spending: finalReason, // Sends null instead of ""
      });

      toast.success("Till audited successfully!", { id: toastId });
      setAuditModal({ isOpen: false, id: null, startingTotal: 0 });
      setAuditSpent("");
      setAuditReason("");

      // Re-trigger balance check to unlock form
      setValue("store_id", watchedStoreId, { shouldValidate: true });
      loadHistory();
    } catch (err) {
      // 💡 Tip: Checking err.response.data can give you the exact validation error from the backend
      console.error("Audit Error Payload:", err?.response?.data);
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Failed to audit till",
        {
          id: toastId,
        },
      );
    } finally {
      setIsAuditing(false);
    }
  };
  return (
    <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto animate-fadeIn relative">
      {/* --- AUDIT MODAL --- */}
      {auditModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200 border-t-4 border-indigo-500">
            <h2 className="text-xl font-extrabold text-slate-800 mb-2">
              Audit Till
            </h2>
            <p className="text-sm text-slate-500 mb-6 border-b pb-4">
              Record any money spent before locking the till for the day.
            </p>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg flex justify-between items-center border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase">
                  Starting Balance
                </span>
                <span className="text-lg font-mono font-bold text-slate-800">
                  ${fmt2(auditModal.startingTotal)}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-rose-600 uppercase tracking-wide mb-1.5">
                  Spent Amount (-)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                    $
                  </span>
                  <input
                    type="number"
                    step="any"
                    value={auditSpent}
                    onChange={(e) => setAuditSpent(e.target.value)}
                    onWheel={(e) => e.target.blur()}
                    placeholder="0.00"
                    className="w-full border border-rose-300 bg-rose-50 rounded-lg pl-7 pr-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
              </div>

              <div
                className={`transition-all duration-300 overflow-hidden ${num(auditSpent) > 0 ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}
              >
                <label className="block text-[11px] font-bold text-rose-600 uppercase tracking-wide mb-1.5">
                  Reason for Spending *
                </label>
                <input
                  type="text"
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  placeholder="Why was cash removed?"
                  className="w-full border border-rose-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="bg-indigo-50 p-4 rounded-lg flex justify-between items-center border border-indigo-200 mt-2 shadow-inner">
                <span className="text-xs font-extrabold text-indigo-700 uppercase tracking-wider">
                  Final Audited Balance
                </span>
                <span className="text-2xl font-mono font-extrabold text-indigo-900">
                  ${fmt2(auditModal.startingTotal - num(auditSpent))}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 mt-2">
              <button
                onClick={() =>
                  setAuditModal({ isOpen: false, id: null, startingTotal: 0 })
                }
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitAudit}
                disabled={isAuditing}
                className="px-6 py-2.5 text-white rounded-xl text-sm font-bold shadow-sm transition-colors bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isAuditing ? "Auditing..." : "Confirm & Audit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD ENTRY FORM --- */}
      <div
        className={`bg-white rounded-xl shadow-sm border p-5 transition-colors ${lockedDate ? "border-rose-300" : "border-slate-200"}`}
      >
        <h2 className="text-xl font-extrabold text-slate-800 mb-6 border-b border-slate-100 pb-3 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Open Till
        </h2>

        {lockedDate && (
          <div className="mb-6 bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-rose-500 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-bold text-rose-800">
                Action Required: Pending Audit
              </h3>
              <p className="text-xs text-rose-600 mt-1 font-medium">
                You cannot open a new till for this store. The till from{" "}
                <b>{toISO(lockedDate)}</b> is still pending. Please audit it in
                the history table below first.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Date (Today) *
              </label>
              <input
                type="date"
                {...register("date", { required: true })}
                readOnly
                className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-500 font-medium cursor-not-allowed outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Market *
              </label>
              <input
                type="text"
                value={displayMarketName}
                disabled
                className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-500 font-medium cursor-not-allowed outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Store *
              </label>
              <select
                {...register("store_id", { required: true })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="">Select Store...</option>
                {availableStores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-xl border items-start transition-opacity ${lockedDate ? "opacity-50 pointer-events-none bg-slate-50 border-slate-200" : "bg-slate-50 border-slate-200"}`}
          >
            <div>
              <label className="flex justify-between items-center text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                <span>Carry Forward Bal</span>
                {isLoadingCF && (
                  <span className="text-emerald-500 animate-pulse">
                    Loading...
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  $
                </span>
                <input
                  type="text"
                  value={fmt2(carryForwardBal)}
                  disabled
                  className="w-full border border-slate-200 bg-slate-100 rounded-lg pl-7 pr-3 py-2 text-sm font-mono font-bold text-slate-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-600 uppercase tracking-wide mb-1.5">
                Add Cash to Till (+)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                  $
                </span>
                <input
                  type="number"
                  step="any"
                  {...register("till_entry", {
                    setValueAs: (v) => (v === "" ? "" : Number(v)),
                  })}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0.00"
                  className="w-full border border-emerald-300 bg-emerald-50 rounded-lg pl-7 pr-3 py-2 text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-indigo-600 uppercase tracking-wide mb-1.5">
                Total Opening Balance
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400 font-bold">
                  $
                </span>
                <input
                  type="text"
                  value={fmt2(calculatedOpeningTotal)}
                  disabled
                  className="w-full border border-indigo-200 bg-indigo-100 rounded-lg pl-7 pr-3 py-2 text-sm font-mono font-extrabold text-indigo-800 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving || isLoadingCF || lockedDate}
              className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white font-bold py-2.5 px-8 rounded-lg shadow transition-all"
            >
              {isSaving ? "Opening..." : "Open Till"}
            </button>
          </div>
        </form>
      </div>

      {/* --- HISTORY FILTERS --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Market
            </label>
            <input
              type="text"
              value={displayMarketName}
              disabled
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 font-medium cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Store
            </label>
            <select
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={filterStore}
              onChange={(e) =>
                setFilterStore(
                  e.target.value ? parseInt(e.target.value, 10) : "",
                )
              }
            >
              <option value="">All Stores</option>
              {availableStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Year
            </label>
            <select
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={filterYear}
              onChange={(e) => setFilterYear(Number(e.target.value))}
            >
              {[2023, 2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Month
            </label>
            <select
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={filterMonth}
              onChange={(e) => setFilterMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("en", { month: "short" })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* --- HISTORY TABLE --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Till History</h2>
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full">
            {rows.length} shown
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 sticky left-0 bg-slate-50 border-r z-10">
                  Action
                </th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Store</th>
                <th className="px-4 py-3 text-right">Added (+)</th>
                <th className="px-4 py-3 text-right text-rose-600">
                  Spent (-)
                </th>
                <th className="px-4 py-3 text-right bg-indigo-50 text-indigo-800 border-l">
                  Final Balance
                </th>
                <th className="px-4 py-3 border-l text-center">Audit Status</th>
                <th className="px-4 py-3">Audit By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingHistory ? (
                <tr>
                  <td
                    colSpan="8"
                    className="py-8 text-center text-slate-500 font-medium"
                  >
                    Loading history...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="py-8 text-center text-slate-500 font-medium"
                  >
                    No records found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const isAudited = r.audit_status === "audited";
                  return (
                    <tr
                      key={r.id}
                      className={`hover:bg-slate-50 ${!isAudited ? "bg-rose-50/20" : ""}`}
                    >
                      <td className="px-4 py-2 sticky left-0 bg-white border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] z-10 w-24">
                        {!isAudited ? (
                          <button
                            onClick={() =>
                              setAuditModal({
                                isOpen: true,
                                id: r.id,
                                startingTotal: r.total_bal,
                              })
                            }
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold px-3 py-1.5 rounded w-full shadow-sm transition-colors"
                          >
                            Audit Till
                          </button>
                        ) : (
                          <span className="block text-center text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                            Locked
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 font-medium text-slate-700">
                        {toISO(r.date)}
                      </td>
                      <td className="px-4 py-2 font-semibold text-slate-800">
                        {r.store || "-"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-600">
                        {num(r.till_entry) > 0
                          ? `+$${fmt2(r.till_entry)}`
                          : "$0.00"}
                      </td>

                      <td
                        className={`px-4 py-2 text-right font-mono ${isAudited ? "text-rose-600" : "text-slate-400 italic"}`}
                      >
                        {isAudited
                          ? num(r.spent_amount) > 0
                            ? `-$${fmt2(r.spent_amount)}`
                            : "$0.00"
                          : "Pending..."}
                      </td>
                      <td className="px-4 py-2 text-right bg-indigo-50/30 border-l font-extrabold text-indigo-700">
                        ${fmt2(r.total_bal)}
                      </td>

                      <td className="px-4 py-2 border-l text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${isAudited ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700 animate-pulse"}`}
                        >
                          {isAudited ? "Audited" : "Pending"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-[10px] text-slate-500 font-medium">
                        {r.audit_by || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-4">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isLoadingHistory}
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={
                currentPage === totalPages ||
                totalPages === 0 ||
                isLoadingHistory
              }
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
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
    </section>
  );
}
