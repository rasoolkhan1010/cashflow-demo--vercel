import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useForm, FormProvider } from "react-hook-form";
import toast from "react-hot-toast";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import { todayCST, num, fmt2, downloadCSV } from "../utils/utils.js";

// 🚀 Extracted Business Logic & UI Components
import { calculatePayrollTotals } from "../utils/payrollCalculator.js";
import PayrollForm from "../components/PayrollForm.jsx";
import PayrollHistoryTable from "../components/PayrollHistoryTable.jsx";
import BookClosedPopup from "../components/BookClosedPopup.jsx";

const ROWS_PER_PAGE = 20;

export default function PayrollExpensePage() {
  const { selectedMarket, selectedStore, markets, refreshPendingBadge } =
    useGlobalState();
  const { user } = useAuth();

  // Pagination & Standard State
  const [rows, setRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageTotal, setPageTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [availableStores, setAvailableStores] = useState([]);
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showClosedPopup, setShowClosedPopup] = useState(false);

  // 🚀 BULK UPLOAD STATE
  const fileInputRef = useRef(null);
  const [previewData, setPreviewData] = useState([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadDate, setUploadDate] = useState(todayCST());

  // Form Methods for single entry
  const methods = useForm({
    defaultValues: {
      date: todayCST(),
      pay_type: "payrate",
      working_days_1: "",
      hours_worked_1: "",
      working_days_2: "",
      hours_worked_2: "",
      days_adjusted: "",
      hours_adjusted: "",
      pay_rate: "",
      salary: "",
      total_days_to_work: "",
      loans_advances: "",
      reimbursements: "",
      lop_count: "",
      notes: "",
      employee_stats: "Standard (Default)",
    },
    mode: "onChange",
  });

  const {
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { isSubmitting },
  } = methods;

  const watchedStoreId = watch("store_id");
  const watchedDate = watch("date");
  const formValues = watch();

  const calculations = useMemo(
    () => calculatePayrollTotals(formValues),
    [formValues],
  );

  // Load Stores
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

  // Load Employees based on store
  useEffect(() => {
    let active = true;
    if (watchedStoreId) {
      api
        .getAdminEmployees(watchedStoreId)
        .then((res) => {
          if (active) {
            // 🚀 THE FIX: Deep parse to guarantee it is an array
            const empArray = Array.isArray(res) ? res : res?.data || [];
            setAvailableEmployees(empArray);
          }
        })
        .catch((err) => {
          console.error(err);
          if (active) setAvailableEmployees([]);
        });
    } else {
      setAvailableEmployees([]);
    }
    return () => {
      active = false;
    };
  }, [watchedStoreId]);

  // Auto-set store from context
  useEffect(() => {
    if (selectedStore) setValue("store_id", selectedStore);
  }, [selectedStore, setValue]);

  // Automatically reset pagination to page 1 if the date or store changes
  useEffect(() => {
    setCurrentPage(1);
  }, [watchedDate, watchedStoreId, selectedMarket]);

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const response = await api.getPayrollExpenses({
        market_id: selectedMarket || undefined,
        store_id: watchedStoreId || undefined,
        date: watchedDate || undefined,
        page: currentPage,
        limit: ROWS_PER_PAGE,
      });

      const dataRows = response.data || [];
      setRows(dataRows);
      setTotalPages(response.pagination?.totalPages || 1);

      setGrandTotal(
        response.summary?.totalAmount ||
          response.summary?.totals?.net_final_pay ||
          0,
      );

      let pt = 0;
      dataRows.forEach((r) => {
        pt +=
          Number(r.net_final_pay) ||
          Number(r.amount) ||
          Number(r.amount_numeric) ||
          0;
      });
      setPageTotal(pt);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load payroll history");
    } finally {
      setIsLoadingHistory(false);
    }
  }, [selectedMarket, watchedStoreId, watchedDate, currentPage]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // --- SINGLE ENTRY SUBMIT ---
  const onSubmit = async (data) => {
    const toastId = toast.loading("Saving payroll entry...");
    try {
      await api.createPayrollExpense({
        ...data,
        market_id: selectedMarket,
        store_id: parseInt(data.store_id, 10),
        employee_id: parseInt(data.employee_id, 10),
        amount: calculations.net_final_pay,
        ...calculations,
      });
      toast.success("Payroll logged successfully!", { id: toastId });

      // Clear specific fields but keep date and store
      reset({ ...data, employee_id: "", notes: "" });
      loadHistory();
      if (refreshPendingBadge) refreshPendingBadge();
    } catch (err) {
      const errCode = err?.response?.data?.error || err?.error;
      const errMsg = err?.response?.data?.message || err?.message || "";

      if (
        errCode === "BOOK_CLOSED" ||
        errMsg.toLowerCase().includes("book closed")
      ) {
        toast.dismiss(toastId);
        setShowClosedPopup(true);
      } else {
        toast.error(errMsg || "Failed to save entry", { id: toastId });
      }
    }
  };

  // ==========================================
  // 🚀 BULK UPLOAD LOGIC
  // ==========================================

  const downloadTemplate = () => {
    const headers = [
      "store_id",
      "employee_id",
      "date_period",
      "pay_type",
      "pay_rate",
      "salary",
      "working_days_1",
      "hours_worked_1",
      "working_days_2",
      "hours_worked_2",
      "days_adjusted",
      "hours_adjusted",
      "total_days_to_work",
      "loans_advances",
      "reimbursements",
      "lop_count",
      "notes",
      "employee_stats",
    ];
    downloadCSV("Payroll_Upload_Template.csv", headers.join(",") + "\n");
    toast.success("Template downloaded!");
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;

      // Safely handle Windows (\r\n) and Mac/Linux (\n) line endings
      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
      if (lines.length < 2) {
        return toast.error("File is empty or invalid format.");
      }

      const parseCSVLine = (line) => {
        const values = [];
        let curr = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            values.push(curr);
            curr = "";
          } else {
            curr += char;
          }
        }
        values.push(curr);
        return values.map((v) => v.trim().replace(/^"|"$/g, "").trim());
      };

      const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase());
      const parsedRecords = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};

        headers.forEach((header, index) => {
          let val = values[index] !== undefined ? values[index] : "";

          if (
            !["notes", "date_period", "employee_stats", "pay_type"].includes(
              header,
            )
          ) {
            val = val.replace(/\$|,/g, "");
          }
          row[header] = val;
        });

        if (row.store_id && row.employee_id) {
          const calculatedData = calculatePayrollTotals(row);
          parsedRecords.push({ ...row, ...calculatedData });
        }
      }

      setPreviewData(parsedRecords);
      setIsPreviewModalOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const submitBulkUpload = async () => {
    if (!selectedMarket) return toast.error("Please select a market.");
    setIsUploading(true);
    const toastId = toast.loading("Processing bulk upload...");

    try {
      await api.bulkCreatePayroll({
        market_id: selectedMarket,
        date: uploadDate,
        records: previewData,
      });

      toast.success(`${previewData.length} records successfully uploaded!`, {
        id: toastId,
      });
      setIsPreviewModalOpen(false);
      setPreviewData([]);
      loadHistory();
      if (refreshPendingBadge) refreshPendingBadge();
    } catch (err) {
      const errCode = err?.response?.data?.error || err?.error;
      const errMsg = err?.response?.data?.message || err?.message || "";

      if (
        errCode === "BOOK_CLOSED" ||
        errMsg.toLowerCase().includes("book closed")
      ) {
        toast.dismiss(toastId);
        setIsPreviewModalOpen(false);
        setShowClosedPopup(true);
      } else {
        toast.error(errMsg || "Failed to upload records.", { id: toastId });
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <section className="p-4 sm:p-6 space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
      {/* --- BULK UPLOAD HEADER --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800">
            Payroll Entry
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Log individual entries or bulk upload via CSV.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={downloadTemplate}
            className="px-4 py-2 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-lg text-sm font-bold shadow-sm transition-colors"
          >
            Download CSV Template
          </button>
          <div>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
              Bulk Upload CSV
            </button>
          </div>
        </div>
      </div>

      {/* --- SINGLE ENTRY FORM --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1">
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <PayrollForm
              calculations={calculations}
              availableStores={availableStores}
              availableEmployees={availableEmployees}
              market={
                markets?.find((m) => String(m.id) === String(selectedMarket))
                  ?.name || "All Markets"
              }
              isSaving={isSubmitting}
            />
          </form>
        </FormProvider>
      </div>

      {/* --- HISTORY TABLE --- */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-2">
          <h2 className="text-lg font-bold text-slate-800">
            Submission History{" "}
            {watchedDate && (
              <span className="text-indigo-600 ml-1">for {watchedDate}</span>
            )}
            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full ml-2">
              {rows.length} shown
            </span>
          </h2>
          <div className="text-sm font-bold bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full shadow-sm border border-indigo-100">
            Grand Total: <b className="text-slate-900">${fmt2(grandTotal)}</b>
          </div>
        </div>

        <PayrollHistoryTable
          rows={rows}
          total={pageTotal}
          isLoading={isLoadingHistory}
        />

        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || isLoadingHistory}
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={
                currentPage === totalPages ||
                totalPages === 0 ||
                isLoadingHistory
              }
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold disabled:opacity-50 hover:bg-slate-200 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* =========================================
          🚀 BULK UPLOAD PREVIEW MODAL
      ========================================= */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl p-6 animate-in zoom-in-95 duration-200 border-t-4 border-emerald-500">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-extrabold text-slate-800">
                  Preview Bulk Upload
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  Verify the calculated totals before saving.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-slate-600">
                  Entry Date:
                </label>
                <input
                  type="date"
                  value={uploadDate}
                  onChange={(e) => setUploadDate(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 border-r">Store ID</th>
                    <th className="px-4 py-3 border-r">Emp ID</th>
                    <th className="px-4 py-3">Pay Type</th>
                    <th className="px-4 py-3 text-right">Base / Rate</th>
                    <th className="px-4 py-3 text-right">Total Hrs</th>
                    <th className="px-4 py-3 text-right text-rose-600">
                      Deductions
                    </th>
                    <th className="px-4 py-3 text-right text-emerald-600">
                      Reimburse
                    </th>
                    <th className="px-4 py-3 text-right bg-indigo-50 text-indigo-800 border-l">
                      Net Final Pay
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {/* <td className="px-4 py-2 border-r font-mono text-slate-600">
                        {row.store_id}
                      </td>
                      <td className="px-4 py-2 border-r font-mono text-slate-600">
                        {row.employee_id}
                      </td> */}
                      {/* Automatically translates IDs to Names if available */}
                      <td className="px-4 py-2 border-r font-mono text-slate-600">
                        {availableStores.find(
                          (s) => String(s.id) === String(row.store_id),
                        )?.name || `Store #${row.store_id}`}
                      </td>
                      <td className="px-4 py-2 border-r font-mono text-slate-600">
                        {row.employee_name ||
                          row.full_name ||
                          `Emp #${row.employee_id}`}
                      </td>
                      <td className="px-4 py-2 uppercase font-medium">
                        {row.pay_type}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        $
                        {fmt2(
                          row.pay_type === "salaried"
                            ? row.salary
                            : row.pay_rate,
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {fmt2(row.total_hours)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-rose-600">
                        -${fmt2(num(row.loans_advances) + num(row.deductions))}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-emerald-600">
                        +${fmt2(row.reimbursements)}
                      </td>
                      <td className="px-4 py-2 text-right bg-indigo-50/30 border-l font-extrabold text-indigo-700">
                        ${fmt2(row.net_final_pay)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
              <div className="text-emerald-700 font-bold bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 text-sm">
                Total Upload Value: $
                {fmt2(
                  previewData.reduce(
                    (acc, row) => acc + num(row.net_final_pay),
                    0,
                  ),
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitBulkUpload}
                  disabled={isUploading}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 rounded-xl shadow-md transition-colors flex items-center gap-2"
                >
                  {isUploading
                    ? "Processing..."
                    : `Confirm & Save ${previewData.length} Records`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- BOOK CLOSED POPUP --- */}
      <BookClosedPopup
        isOpen={showClosedPopup}
        onClose={() => setShowClosedPopup(false)}
      />
    </section>
  );
}
