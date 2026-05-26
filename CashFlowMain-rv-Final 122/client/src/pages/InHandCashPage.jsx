import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
import { todayCST, fmt, num, toISO, downloadCSV } from "../utils/utils.js";
import toast from "react-hot-toast";

// Components
import FinancialCards from "../components/FinancialCards.jsx";
import SpecificDayFilter from "../components/SpecificDayFilter.jsx";
import BookClosedPopup from "../components/BookClosedPopup.jsx";
import TruncatedTooltip from "../components/TruncatedTooltip.jsx";

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

export default function InHandCashPage() {
  const { selectedMarket, selectedStore, markets } = useGlobalState();

  // Map the integer ID back to the human-readable name for display
  const currentMarketObj = (markets || []).find((m) => m.id === selectedMarket);
  const displayMarketName = currentMarketObj
    ? currentMarketObj.name
    : "All Markets";

  // --- Date Filters ---
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);
  const [year, setYear] = useState(curY);
  const [month, setMonth] = useState(curM);
  const [selectedSpecificDates, setSelectedSpecificDates] = useState([]);
  const [availableDatesInMonth, setAvailableDatesInMonth] = useState([]);

  const { fromDate, toDate } = useMemo(() => {
    const lastDay = daysInMonth(year, month);
    return {
      fromDate: `${year}-${pad2(month)}-01`,
      toDate: `${year}-${pad2(month)}-${pad2(lastDay)}`,
    };
  }, [year, month]);

  // --- Store & Status State ---
  const [fStore, setFStore] = useState("");
  const [availableStores, setAvailableStores] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [auditFilter, setAuditFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // --- Data State ---
  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [grandTotals, setGrandTotals] = useState({
    cash_entry: 0,
    total_amount: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showClosedPopup, setShowClosedPopup] = useState(false);

  // --- Add Entry Modal (Multi-Store Logic Restored) ---
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [date, setDate] = useState(todayCST());
  const [selectedStores, setSelectedStores] = useState([]); // Array of Store IDs
  const [storeAmounts, setStoreAmounts] = useState({}); // Keyed by Store ID
  const [globalNote, setGlobalNote] = useState("");
  const [cashEntryTotal, setCashEntryTotal] = useState("0.00");

  // Calculate the live total as amounts are entered
  useEffect(() => {
    const total = Object.values(storeAmounts).reduce(
      (sum, amt) => sum + (num(amt) || 0),
      0,
    );
    setCashEntryTotal(fmt(total));
  }, [storeAmounts]);

  // Multi-Store Input Handlers
  const addStore = (storeIdStr) => {
    const storeId = parseInt(storeIdStr, 10);
    if (storeId && !selectedStores.includes(storeId)) {
      setSelectedStores([...selectedStores, storeId]);
      setStoreAmounts((prev) => ({ ...prev, [storeId]: "" }));
    }
  };

  const removeStore = (storeId) => {
    setSelectedStores(selectedStores.filter((s) => s !== storeId));
    setStoreAmounts((prev) => {
      const updated = { ...prev };
      delete updated[storeId];
      return updated;
    });
  };

  const updateAmount = (storeId, val) => {
    const clean = val.replace(/[^0-9.]/g, "");
    setStoreAmounts((prev) => ({ ...prev, [storeId]: clean }));
  };

  // Auto-clear dates when month/year changes
  useEffect(() => {
    setSelectedSpecificDates([]);
  }, [month, year]);

  // Fetch stores as objects so we can use .id and .name
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

  useEffect(() => {
    setFStore(selectedStore || "");
  }, [selectedStore]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [
    selectedMarket,
    fStore,
    year,
    month,
    selectedSpecificDates,
    statusFilter,
    auditFilter,
    searchTerm,
  ]);

  // 🚀 SERVER-SIDE DATA FETCHING
  const fetchFiltered = useCallback(async () => {
    setIsLoading(true);
    try {
      let queryDate,
        queryDateFrom = fromDate,
        queryDateTo = toDate,
        querySpecificDates;

      if (selectedSpecificDates.length === 1) {
        queryDate = selectedSpecificDates[0];
        queryDateFrom = undefined;
        queryDateTo = undefined;
      } else if (selectedSpecificDates.length > 1) {
        querySpecificDates = selectedSpecificDates.join(",");
        queryDateFrom = undefined;
        queryDateTo = undefined;
      }

      const response = await api.listMarketCash({
        market_id: selectedMarket || undefined,
        store_id: fStore || undefined,
        date: queryDate,
        date_from: queryDateFrom,
        date_to: queryDateTo,
        specific_dates: querySpecificDates,
        status: statusFilter === "all" ? undefined : statusFilter,
        audit_status: auditFilter === "all" ? undefined : auditFilter,
        search: searchTerm || undefined,
        page: currentPage,
        limit: ROWS_PER_PAGE,
      });

      // Safely unpack the rows depending on how your backend sends them
      const dataRows = response.data || response || [];
      setRows(dataRows);
      setTotalPages(response.pagination?.totalPages || 1);
      setGrandTotals(
        response.summary?.totals || {
          cash_entry: 0,
          total_amount: 0,
        },
      );

      if (selectedSpecificDates.length === 0) {
        setAvailableDatesInMonth(response.summary?.availableDates || []);
      }
    } catch (err) {
      console.error("Failed to load market cash", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedMarket,
    fStore,
    fromDate,
    toDate,
    selectedSpecificDates,
    statusFilter,
    auditFilter,
    searchTerm,
    currentPage,
  ]);

  useEffect(() => {
    fetchFiltered();
  }, [fetchFiltered]);

  // --- Form Handlers ---
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMarket) return toast.error("Please select a market first.");
    if (selectedStores.length === 0)
      return toast.error("Select at least one store.");

    setIsSaving(true);
    const toastId = toast.loading("Saving entries...");

    try {
      // Create a promise for each selected store
      const promises = selectedStores.map((storeId) => {
        const amountVal = num(storeAmounts[storeId] || "0");

        return api.createMarketCash({
          date: date,
          market_id: selectedMarket,
          store_id: storeId,
          cash_entry: amountVal,
          carry_forwarded_amount: 0, // Defaults to 0 permanently
          notes: globalNote, // Applies to all entries in this batch
        });
      });

      await Promise.all(promises);

      toast.success("Saved successfully ✅", { id: toastId });

      // Reset Modal Form
      setIsAddModalOpen(false);
      setSelectedStores([]);
      setStoreAmounts({});
      setGlobalNote("");
      setDate(todayCST());
      fetchFiltered();
    } catch (err) {
      if (
        err?.message === "Book closed for the month. Contact admin." ||
        err?.error === "BOOK_CLOSED"
      ) {
        toast.dismiss(toastId);
        setIsAddModalOpen(false);
        setShowClosedPopup(true);
      } else {
        toast.error(err.message || "Failed to create entries.", {
          id: toastId,
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    const header = [
      "Date",
      "Market",
      "Store",
      "Pickups ($)",
      "Total Amount ($)",
      "Notes",
      "Status",
      "Audit Status",
    ];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push(
        [
          toISO(r.date),
          r.market || "-",
          r.store || "-",
          r.cash_entry || 0,
          r.total_amount || 0,
          (r.notes || "").replace(/,/g, " "),
          r.status || "pending",
          r.audit_status || "pending",
        ].join(","),
      );
    });
    downloadCSV(`in-hand-cash-page-${currentPage}.csv`, lines.join("\n"));
  };

  return (
    <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto relative animate-fadeIn">
      {/* HEADER & ADD BUTTON */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            In-Hand Cash
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Review market-level cash drops and store pickups.
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          disabled={!selectedMarket}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95"
        >
          + Add Entry
        </button>
      </div>

      {/* ADD ENTRY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-extrabold text-slate-800 mb-6 border-b pb-3">
              New Pick Up Amount
            </h2>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Market *
                  </label>
                  <input
                    type="text"
                    disabled
                    value={displayMarketName}
                    className="w-full border bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Add Store *
                </label>
                <select
                  onChange={(e) => {
                    addStore(e.target.value);
                    e.target.value = "";
                  }}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  disabled={!selectedMarket}
                >
                  <option value="">Select Store to Add...</option>
                  {availableStores
                    .filter((s) => !selectedStores.includes(s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.code ? `(${s.code})` : ""}
                      </option>
                    ))}
                </select>
              </div>

              {/* Selected Stores List */}
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1 mt-2">
                {selectedStores.map((storeId) => {
                  const storeObj = availableStores.find(
                    (s) => s.id === storeId,
                  );
                  const storeName = storeObj ? storeObj.name : "Unknown Store";

                  return (
                    <div
                      key={storeId}
                      className="flex items-center gap-3 bg-slate-50 border border-slate-100 p-2.5 rounded-lg shadow-sm"
                    >
                      <span className="flex-1 text-sm font-bold text-slate-700 truncate">
                        {storeName}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={storeAmounts[storeId] || ""}
                        onChange={(e) => updateAmount(storeId, e.target.value)}
                        placeholder="Amount ($)"
                        required
                        className="border border-slate-300 rounded px-2 py-1.5 text-sm w-32 text-right outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => removeStore(storeId)}
                        className="text-rose-400 hover:text-rose-600 text-sm font-bold px-2 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
                {selectedStores.length === 0 && (
                  <div className="text-sm text-slate-400 italic p-4 border border-dashed border-slate-200 rounded-lg text-center bg-slate-50/50">
                    No stores selected yet. Select a store above to assign an
                    amount.
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 mt-2">
                  Notes (Applies to all)
                </label>
                <input
                  type="text"
                  value={globalNote}
                  onChange={(e) => setGlobalNote(e.target.value)}
                  placeholder="Courier details, references..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                <div className="text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-100">
                  Total: ${cashEntryTotal}
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || selectedStores.length === 0}
                    className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl shadow-md transition-colors"
                  >
                    {isSaving ? "Saving..." : "Save Entry"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FILTERS */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Market
            </label>
            <input
              type="text"
              value={displayMarketName}
              disabled
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Store
            </label>
            <select
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={fStore}
              onChange={(e) =>
                setFStore(e.target.value ? parseInt(e.target.value, 10) : "")
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
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[2023, 2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                Month
              </label>
              <SpecificDayFilter
                availableDates={availableDatesInMonth}
                selectedDates={selectedSpecificDates}
                onChange={setSelectedSpecificDates}
              />
            </div>
            <select
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("en", { month: "short" })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Status
            </label>
            <select
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-1">
              Audit Status
            </label>
            <select
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-full bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="audited">Audited</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <h2 className="text-lg font-bold text-slate-800">
            Records{" "}
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full ml-2">
              {rows.length} records
            </span>
          </h2>
          <span className="text-sm font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm">
            Filtered Grand Total: ${fmt(grandTotals.total_amount)}
          </span>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                  Date
                </th>
                <th className="px-4 py-3">Store Location</th>
                <th className="px-4 py-3 text-right">Pickups ($)</th>
                <th className="px-4 py-3 text-right bg-indigo-50/50 text-indigo-800">
                  Total Amount
                </th>
                <th className="px-4 py-3">Notes</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="py-8 text-center text-slate-500 font-medium"
                  >
                    Loading records...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="py-8 text-center text-slate-500 font-medium"
                  >
                    No cash records found.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 transition-colors h-14"
                  >
                    <td className="px-4 py-2 sticky left-0 bg-white border-r border-slate-100 font-medium text-slate-700 z-10">
                      {toISO(r.date)}
                    </td>
                    <td className="px-4 py-2">
                      <div className="font-semibold text-slate-800">
                        {r.store || "Market-Level"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {r.market}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-slate-600">
                      ${fmt(r.cash_entry)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono font-extrabold text-indigo-700 bg-indigo-50/20">
                      ${fmt(r.total_amount)}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">
                      <TruncatedTooltip
                        text={r.notes}
                        maxWidth="max-w-[150px]"
                        placeholder="-"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${r.status === "approved" ? "bg-emerald-100 text-emerald-700" : r.status === "rejected" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${r.audit_status === "audited" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400"}`}
                      >
                        {r.audit_status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50 border-t border-indigo-100">
                <td
                  colSpan="2"
                  className="px-4 py-3 text-right font-extrabold text-indigo-900 uppercase tracking-widest text-xs"
                >
                  Page Totals:
                </td>
                {/* Update this block in your <tfoot> */}
                <td className="px-4 py-3 text-right font-bold font-mono text-indigo-700">
                  $
                  {fmt(
                    rows.reduce((acc, r) => acc + (num(r.cash_entry) || 0), 0),
                  )}
                </td>
                <td className="px-4 py-3 text-right font-extrabold font-mono text-indigo-900">
                  $
                  {fmt(
                    rows.reduce(
                      (acc, r) => acc + (num(r.total_amount) || 0),
                      0,
                    ),
                  )}
                </td>
                <td colSpan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4">
          <span className="text-xs font-bold text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1 || isLoading}
              className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-md text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={
                currentPage === totalPages || totalPages === 0 || isLoading
              }
              className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-md text-xs font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
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
