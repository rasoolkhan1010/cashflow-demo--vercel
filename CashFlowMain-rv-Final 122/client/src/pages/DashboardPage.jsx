import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useGlobalState } from "../context/GlobalStateContext.jsx";
import api from "../services/api.js";
import { fmt, num } from "../utils/utils.js";
import FinancialCards from "../components/FinancialCards.jsx";
import { Chart, registerables } from "chart.js";

// Register Chart.js components
Chart.register(...registerables);

// --- INLINE SVG ICONS ---
const BarChartIcon = ({ className = "w-4 h-4" }) => (
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

const FilterIcon = ({ className = "w-4 h-4" }) => (
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const CalendarIcon = ({ className = "w-4 h-4" }) => (
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
    <line x1="16" x2="16" y1="2" y2="6" />
    <line x1="8" x2="8" y1="2" y2="6" />
    <line x1="3" x2="21" y1="10" y2="10" />
  </svg>
);

const TrendingUpIcon = ({ className = "w-5 h-5" }) => (
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
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const RefreshCwIcon = ({ className = "w-5 h-5" }) => (
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
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

// --- Helper Functions ---
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

const EmptyState = ({ color, title, subtitle }) => {
  const colorMap = {
    purple: "bg-purple-100 text-purple-500",
    orange: "bg-orange-100 text-orange-500",
    blue: "bg-blue-100 text-blue-500",
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${colorMap[color]} shadow-inner`}
      >
        <div className="w-6 h-6 rounded-full border-2 border-current border-t-transparent animate-spin opacity-40"></div>
      </div>
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="text-xs text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
};

const GhostChart = ({ type = "bars" }) => {
  return (
    <div className="absolute inset-0 opacity-40 blur-[2px] pointer-events-none">
      {type === "bars" && (
        <div className="flex items-end justify-between h-full px-6">
          {[40, 60, 30, 70, 50, 80, 45].map((h, i) => (
            <div
              key={i}
              style={{ height: `${h}%` }}
              className="w-4 bg-gradient-to-t from-purple-200 to-purple-100 rounded-md"
            />
          ))}
        </div>
      )}
      {type === "line" && (
        <svg
          className="w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 300 200"
        >
          <polyline
            fill="none"
            stroke="#c7d2fe"
            strokeWidth="3"
            points="0,200 50,150 100,180 150,120 200,140 250,90 300,110"
          />
        </svg>
      )}
      {type === "pie" && (
        <div className="flex items-center justify-center h-full">
          <div className="w-32 h-32 rounded-full bg-gradient-to-r from-orange-100 to-orange-200"></div>
        </div>
      )}
    </div>
  );
};

export default function DashboardPage({ onNavigate }) {
  const { selectedMarket, selectedStore, markets } = useGlobalState();
  const { y: curY, m: curM } = useMemo(getCurrentYearMonth, []);

  const [year, setYear] = useState(curY);
  const [month, setMonth] = useState(curM);
  const [loading, setLoading] = useState(false);

  const [fStore, setFStore] = useState("");
  const [availableStores, setAvailableStores] = useState([]);

  // Resolve Market Name
  const currentMarketObj = (markets || []).find(
    (m) => String(m.id) === String(selectedMarket),
  );
  const displayMarketName = currentMarketObj
    ? currentMarketObj.name
    : "All Markets";

  const emptyStatus = {
    pending: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
  };

  const [dashboardData, setDashboardData] = useState({
    statusCounts: {
      store: emptyStatus,
      payroll: emptyStatus,
      commission: emptyStatus,
    },
    financials: {
      cash: 0,
      cashInBank: 0,
      inHand: 0,
      storeExpenses: 0,
      payroll: 0,
      commission: 0,
      variance: 0,
      openingBalance: 0,
    },
    chartData: {
      dailyCash: [],
      dailyCard: [],
      payrollByDay: {},
      expenseCategories: {},
    },
  });

  const isEmptyArray = (arr) => !arr || arr.every((v) => !v || v === 0);

  const isSplitEmpty =
    isEmptyArray(dashboardData.chartData.dailyCash) &&
    isEmptyArray(dashboardData.chartData.dailyCard);
  const isPayrollEmpty =
    Object.values(dashboardData.chartData.payrollByDay || {}).length === 0;
  const isExpenseEmpty =
    Object.keys(dashboardData.chartData.expenseCategories || {}).length === 0;

  const chartRefs = {
    split: useRef(null),
    expenses: useRef(null),
    payroll: useRef(null),
  };
  const chartInstances = useRef({});

  // 1. Fetch available stores based on selected market
  useEffect(() => {
    if (selectedMarket) {
      api
        .getStores(selectedMarket)
        .then((data) => {
          setAvailableStores(data || []);
        })
        .catch((err) => console.error("Failed to load stores", err));
    } else {
      setAvailableStores([]);
    }
  }, [selectedMarket]);

  useEffect(() => {
    setFStore(selectedStore || "");
  }, [selectedStore]);

  const { fromDate, toDate, labelsDaily } = useMemo(() => {
    const d = daysInMonth(year, month);
    const from = `${year}-${pad2(month)}-01`;
    const to = `${year}-${pad2(month)}-${pad2(d)}`;
    const labels = Array.from(
      { length: d },
      (_, i) => `${year}-${pad2(month)}-${pad2(i + 1)}`,
    );
    return { fromDate: from, toDate: to, labelsDaily: labels };
  }, [year, month]);

  // 2. Fetch main dashboard data
  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);

    try {
      // 🔥 FIX: Explicit Integer Casting for strict schema matching & IDOR safety
      const payload = {
        market_id: selectedMarket ? parseInt(selectedMarket, 10) : undefined,
        store_id: fStore ? parseInt(fStore, 10) : undefined,
        date_from: fromDate,
        date_to: toDate,
      };

      const data = await api.getDashboard(payload);

      if (controller.signal.aborted) return;

      const totals = data.summary?.totals || {};
      const charts = data.charts || {};
      const approvals = data.approvals || {};

      setDashboardData({
        statusCounts: {
          store: approvals.expenses || emptyStatus,
          payroll: approvals.payroll || emptyStatus,
          commission: approvals.commission || emptyStatus,
        },
        financials: {
          cash: num(totals.sales),
          cashInBank: num(totals.bank),
          inHand: num(totals.pickup),
          storeExpenses: num(totals.expenses),
          payroll: num(totals.payroll),
          commission: num(totals.commission),
          variance: num(totals.variance),
          openingBalance: num(totals.opening_balance),
        },
        chartData: {
          dailyCash: labelsDaily.map((d) => num(charts.dailyCash?.[d])),
          dailyCard: labelsDaily.map((d) => num(charts.dailyCard?.[d])),
          payrollByDay: charts.payroll || {},
          expenseCategories: charts.expenseCategories || {},
        },
      });
    } catch (e) {
      if (!controller.signal.aborted) console.error("Dashboard API error:", e);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
    return () => controller.abort();
  }, [selectedMarket, fStore, fromDate, toDate, labelsDaily]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 3. Render Charts
  const createChart = useCallback((key, ctx, config) => {
    if (!ctx || !window.Chart) return;
    if (chartInstances.current[key]) chartInstances.current[key].destroy();
    chartInstances.current[key] = new window.Chart(ctx, config);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (isSplitEmpty && isExpenseEmpty && isPayrollEmpty) return;

    const { dailyCash, dailyCard, payrollByDay, expenseCategories } =
      dashboardData.chartData;

    // Convert YYYY-MM-DD to DD/MM for cleaner X-axis labels
    const displayLabels = labelsDaily.map((d) => String(d).slice(-5));

    const colors = {
      purple: "#7c3aed",
      purpleLight: "#a78bfa",
      orange: "#f97316",
      orangeLight: "#fdba74",
      darkBlue: "#312e81",
      grid: "#f1f5f9",
    };

    const palette = [
      colors.purple,
      colors.orange,
      colors.darkBlue,
      colors.purpleLight,
      colors.orangeLight,
      "#10b981",
      "#ef4444",
      "#3b82f6",
    ];

    const globalOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 1200 },
      scales: {
        x: { grid: { display: false }, border: { display: false } },
        y: {
          grid: { color: colors.grid },
          border: { display: false },
          beginAtZero: true,
        },
      },
      plugins: { legend: { display: false } },
    };

    if (!isSplitEmpty && chartRefs.split.current) {
      createChart("split", chartRefs.split.current.getContext("2d"), {
        type: "bar",
        data: {
          labels: displayLabels,
          datasets: [
            {
              label: "Cash",
              data: dailyCash,
              backgroundColor: colors.purple,
              stack: "t",
              borderRadius: 6,
            },
            {
              label: "Card",
              data: dailyCard,
              backgroundColor: colors.orangeLight,
              stack: "t",
              borderRadius: 6,
            },
          ],
        },
        options: {
          ...globalOptions,
          scales: { x: { stacked: true }, y: { stacked: true } },
        },
      });
    }

    if (!isExpenseEmpty && chartRefs.expenses.current) {
      const expLabels = Object.keys(expenseCategories);
      const expData = Object.values(expenseCategories);

      createChart("expenses", chartRefs.expenses.current.getContext("2d"), {
        type: "pie",
        data: {
          labels: expLabels,
          datasets: [
            {
              data: expData,
              backgroundColor: palette.slice(0, expLabels.length),
              borderWidth: 2,
              borderColor: "#fff",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 8,
                usePointStyle: true,
                font: { size: 10, weight: "bold" },
              },
            },
          },
        },
      });
    }

    if (!isPayrollEmpty && chartRefs.payroll.current) {
      createChart("payroll", chartRefs.payroll.current.getContext("2d"), {
        type: "line",
        data: {
          labels: displayLabels,
          datasets: [
            {
              label: "Payroll",
              data: labelsDaily.map(
                (d) => (payrollByDay[d] || {}).Payroll || 0,
              ),
              borderColor: colors.darkBlue,
              tension: 0.4,
            },
            {
              label: "Commission",
              data: labelsDaily.map(
                (d) => (payrollByDay[d] || {}).Commission || 0,
              ),
              borderColor: colors.orange,
              tension: 0.4,
            },
          ],
        },
        options: globalOptions,
      });
    }

    // Cleanup to prevent canvas memory leaks
    return () => {
      Object.values(chartInstances.current).forEach((c) => c?.destroy());
    };
  }, [
    dashboardData,
    loading,
    isSplitEmpty,
    isExpenseEmpty,
    isPayrollEmpty,
    labelsDaily,
    createChart,
  ]);

  const { financials } = dashboardData;
  const monthOptions = useMemo(
    () => [
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
    ],
    [],
  );
  const yearOptions = useMemo(
    () => Array.from({ length: 6 }, (_, i) => curY - 4 + i),
    [curY],
  );

  return (
    <section className="bg-slate-50 min-h-screen pl-4 pr-4 sm:p-6 lg:pl-6 pt-16 sm:pt-6 pb-4 sm:pb-6 space-y-8">
      {/* 1. Header & Global Refresh */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <TrendingUpIcon className="w-5 h-5 text-indigo-600" />
            Performance Overview
          </h2>
          <p className="text-xs text-slate-500 font-medium ml-7">
            Real-time financial breakdown
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
        >
          <RefreshCwIcon
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
          {loading ? "Syncing..." : "Refresh Data"}
        </button>
      </div>

      {/* 2. Filters Grid (Year, Month, Market, Store) */}
      <div className="bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-slate-100 p-4 sm:p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">
              Year
            </label>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">
              Month
            </label>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {monthOptions.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">
              Market
            </label>
            <input
              type="text"
              value={displayMarketName}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-slate-50 text-slate-500 cursor-not-allowed font-medium"
              disabled
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider font-bold text-slate-500 mb-2">
              Store
            </label>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              value={fStore}
              onChange={(e) => setFStore(e.target.value)}
            >
              <option value="">All Stores</option>
              {availableStores.map((s) => {
                const sId = s.id || s;
                const sName = s.name || s;
                const sCode = s.code ? `(${s.code})` : "";
                return (
                  <option key={sId} value={sId}>
                    {sName} {sCode}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {loading && (
        <div className="w-full text-center py-12 bg-white/50 rounded-2xl animate-pulse text-slate-500 font-medium">
          Fetching dashboard data...
        </div>
      )}

      {!loading && (
        <div className="space-y-8 animate-fadeIn">
          {/* 3. Financial Overview */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 px-1">
              Financial Overview{" "}
              <span className="text-slate-400 font-medium text-lg">
                ({monthOptions[month - 1].label} {year})
              </span>
            </h2>
            <FinancialCards
              sales={financials.cash}
              bank={financials.cashInBank}
              pickup={financials.inHand}
              expenses={
                financials.storeExpenses +
                financials.payroll +
                financials.commission
              }
              storeExpenses={financials.storeExpenses}
              payroll={financials.payroll}
              commission={financials.commission}
              openingBalance={financials.openingBalance}
              loading={loading}
              onNavigate={onNavigate}
            />
          </div>

          {/* 4. Approvals Status */}
          <div>
            <h2 className="text-xl font-bold text-slate-800 mb-4 px-1">
              Approvals Status
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  label: "Store Expenses",
                  key: "store",
                  route: "expense-history",
                },
                { label: "Payroll", key: "payroll", route: "payroll-history" },
                {
                  label: "Commission",
                  key: "commission",
                  route: "commission-history",
                },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() =>
                    typeof onNavigate === "function" && onNavigate(item.route)
                  }
                  className="text-left bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] p-5 border border-slate-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-slate-800 group-hover:text-purple-600 transition-colors text-lg">
                      {item.label}
                    </span>
                    <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                      View Details &rarr;
                    </span>
                  </div>
                  <div className="flex justify-between text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex flex-col items-start">
                      <span className="text-[11px] uppercase font-bold text-slate-400 mb-1">
                        Pending
                      </span>
                      <b className="text-amber-500 text-lg">
                        {dashboardData.statusCounts[item.key].pending.count}
                      </b>
                      <span className="text-xs text-slate-500">
                        $
                        {fmt(
                          dashboardData.statusCounts[item.key].pending.amount,
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[11px] uppercase font-bold text-slate-400 mb-1">
                        Approved
                      </span>
                      <b className="text-emerald-500 text-lg">
                        {dashboardData.statusCounts[item.key].approved.count}
                      </b>
                      <span className="text-xs text-slate-500">
                        $
                        {fmt(
                          dashboardData.statusCounts[item.key].approved.amount,
                        )}
                      </span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[11px] uppercase font-bold text-slate-400 mb-1">
                        Rejected
                      </span>
                      <b className="text-rose-500 text-lg">
                        {dashboardData.statusCounts[item.key].rejected.count}
                      </b>
                      <span className="text-xs text-slate-500">
                        $
                        {fmt(
                          dashboardData.statusCounts[item.key].rejected.amount,
                        )}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Split Chart */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-white pointer-events-none" />
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 z-10 relative">
                <BarChartIcon className="w-4 h-4 text-purple-600" />
                Cash & Card Sales
              </h3>
              <div className="relative h-[300px] z-10">
                {isSplitEmpty && <GhostChart type="bars" />}
                {isSplitEmpty ? (
                  <EmptyState
                    color="purple"
                    title="No sales data"
                    subtitle="Try another filter"
                  />
                ) : (
                  <canvas ref={chartRefs.split}></canvas>
                )}
              </div>
            </div>

            {/* Expenses Chart */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 to-white pointer-events-none" />
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 z-10 relative">
                <FilterIcon className="w-4 h-4 text-orange-600" />
                Store Operating Expenses
              </h3>
              <div className="relative h-[300px] flex items-center justify-center z-10">
                {isExpenseEmpty && <GhostChart type="pie" />}
                {isExpenseEmpty ? (
                  <EmptyState
                    color="orange"
                    title="No expenses"
                    subtitle="No data for this period"
                  />
                ) : (
                  <canvas ref={chartRefs.expenses}></canvas>
                )}
              </div>
            </div>

            {/* Payroll Chart */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 lg:col-span-2 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-white pointer-events-none" />
              <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2 z-10 relative">
                <CalendarIcon className="w-4 h-4 text-blue-800" />
                Payroll & Commissions
              </h3>
              <div className="relative h-[300px] z-10">
                {isPayrollEmpty && <GhostChart type="line" />}
                {isPayrollEmpty ? (
                  <EmptyState
                    color="blue"
                    title="No Payroll & Commissions data"
                    subtitle="Will appear after processing"
                  />
                ) : (
                  <canvas ref={chartRefs.payroll}></canvas>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
