const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

function authHeaders() {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function isValidDate(value) {
  if (!value) return false;
  const d = new Date(value);
  return !isNaN(d.getTime());
}

const api = {
  async request(endpoint, options = {}) {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${BASE_URL}/${endpoint.replace(/^\/+/, "")}`;

    let res;
    try {
      res = await fetch(url, {
        ...options,
        headers: { ...authHeaders(), ...(options.headers || {}) },
      });
    } catch (err) {
      console.error("API network error:", err?.message || err);
      throw new Error(
        `[NETWORK] ${endpoint}: ${err?.message || "Network error"}`,
      );
    }

    let data = null;
    try {
      if (res.status === 204) return { success: true };
      data = await res.json();
    } catch {
      // ignore
    }

    let errorMsg = res.statusText || "";
    if (data) {
      if (typeof data === "string") errorMsg = data;
      else if (typeof data.message === "string") errorMsg = data.message;
      else if (typeof data.error === "string") errorMsg = data.error;
      else errorMsg = JSON.stringify(data);
    }

    const safeError = errorMsg.toLowerCase();
    const isLoginRoute = endpoint.includes("/login");

    if (
      !isLoginRoute &&
      (res.status === 401 ||
        res.status === 403 ||
        safeError.includes("jwt expired") ||
        safeError.includes("token expired") ||
        safeError.includes("invalid token"))
    ) {
      console.warn("Session expired. Auto-logging out...");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/";
      throw new Error("Session expired. Redirecting to login...");
    }

    if (!res.ok) {
      throw new Error(errorMsg || "Request failed");
    }

    return data;
  },

  // --- Auth ---
  login(email, password) {
    return this.request("auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  me() {
    return this.request("auth/me");
  },

  // --- Markets & Stores (Metadata) ---
  getMarkets() {
    return this.request("meta/markets");
  },

  getStores(market_id) {
    const q = market_id ? `?market_id=${market_id}` : "";
    return this.request(`meta/stores${q}`);
  },

  // --- Sales ---
  getAdminSalesAll(payload = {}) {
    const params = new URLSearchParams();
    if (payload.market_id) params.set("market_id", payload.market_id);
    if (payload.store_id) params.set("store_id", payload.store_id);

    if (isValidDate(payload.date)) params.set("date", payload.date);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    return this.request(`sales/all?${params.toString()}`);
  },

  // --- Variance ---
  getVarianceAll(payload = {}) {
    const params = new URLSearchParams();
    if (payload.market_id) params.set("market_id", payload.market_id);
    if (payload.store_id) params.set("store_id", payload.store_id);
    if (payload.status) params.set("status", payload.status);

    if (isValidDate(payload.date)) params.set("date", payload.date);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    return this.request(`variance/all?${params.toString()}`);
  },

  // --- Expenses ---
  getExpensesByDateWithMarket(payload = {}) {
    const params = new URLSearchParams();
    if (payload.market_id) params.set("market_id", payload.market_id);
    if (payload.store_id) params.set("store_id", payload.store_id);
    if (isValidDate(payload.date)) params.set("date", payload.date);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);
    if (payload.search) params.set("search", payload.search);

    return this.request(`expenses?${params.toString()}`);
  },

  createExpense(payload) {
    let { amount } = payload || {};
    const normalizedAmount =
      typeof amount === "string"
        ? amount.trim() || null
        : amount == null
          ? null
          : String(amount).trim() || null;
    return this.request("expenses", {
      method: "POST",
      body: JSON.stringify({ ...payload, amount: normalizedAmount }),
    });
  },

  async uploadExpenseFile(formData) {
    const headers = {};
    const token = localStorage.getItem("token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${BASE_URL}/uploads/receipt`, {
      method: "POST",
      headers,
      body: formData,
    });
    if (!res.ok) {
      const errData = await res
        .json()
        .catch(() => ({ error: "Upload failed" }));
      throw new Error(errData.message || errData.error || "Upload failed");
    }
    return res.json();
  },

  getExpenseApprovals(payload = {}) {
    const params = new URLSearchParams();
    if (payload.market_id) params.set("market_id", payload.market_id);
    if (payload.store_id) params.set("store_id", payload.store_id);
    if (isValidDate(payload.date)) params.set("date", payload.date);
    if (payload.status) params.set("status", payload.status);
    if (payload.audit_status) params.set("audit_status", payload.audit_status);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);

    return this.request(`expense-approvals?${params.toString()}`);
  },

  approveExpense(id, reason = "", date, market_id) {
    return this.request(`expense-approvals/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market_id }),
    });
  },

  rejectExpense(id, reason = "", date, market_id) {
    return this.request(`expense-approvals/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market_id }),
    });
  },

  auditExpense(id, date, market_id) {
    return this.request(`expense-approvals/${id}/audit`, {
      method: "POST",
      body: JSON.stringify({ date, market_id }),
    });
  },

  // --- Till (Cashflow) ---
  listTill(payload = {}) {
    const params = new URLSearchParams();

    // Ensure we send IDs as integers
    if (payload.market_id) params.set("market_id", payload.market_id);
    if (payload.store_id) params.set("store_id", payload.store_id);

    // Date filters
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);

    // Pagination & Search
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    return this.request(`cashflow?${params.toString()}`);
  },

  // 2. Create Till Entry (Matches POST in cashflow.controller)
  createTill(payload) {
    // Backend expects market_id and store_id as integers
    const sanitizedPayload = {
      ...payload,
      market_id: payload.market_id
        ? parseInt(payload.market_id, 10)
        : undefined,
      store_id: payload.store_id ? parseInt(payload.store_id, 10) : undefined,
    };

    return this.request("cashflow", {
      method: "POST",
      body: JSON.stringify(sanitizedPayload),
    });
  },

  // --- Payroll ---
  getPayrollExpenses(payload = {}) {
    const params = new URLSearchParams();
    if (payload.market_id) params.set("market_id", payload.market_id);
    if (payload.store_id) params.set("store_id", payload.store_id);
    if (payload.category) params.set("category", payload.category);
    if (payload.status) params.set("status", payload.status);
    if (payload.audit_status) params.set("audit_status", payload.audit_status);
    if (payload.payment_status)
      params.set("payment_status", payload.payment_status);
    if (payload.date_period) params.set("date_period", payload.date_period);
    if (isValidDate(payload.date)) params.set("date", payload.date);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    return this.request(`payroll-expenses?${params.toString()}`);
  },

  createPayrollExpense(payload) {
    return this.request("payroll-expenses", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updatePayrollExpense(id, payload) {
    return this.request(`payroll-expenses/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  approvePayrollExpense(id, reason = "", date, market_id) {
    return this.request(`payroll-expenses/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market_id }),
    });
  },

  rejectPayrollExpense(id, reason = "", date, market_id) {
    return this.request(`payroll-expenses/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market_id }),
    });
  },

  auditPayrollExpense(id, date, market_id) {
    return this.request(`payroll-expenses/${id}/audit`, {
      method: "POST",
      body: JSON.stringify({ date, market_id }),
    });
  },

  issuePayrollExpense(id, payload) {
    return this.request(`payroll-expenses/${id}/issue`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  markPayrollPaid(id, payload) {
    return this.request(`payroll-expenses/${id}/mark-paid`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },

  // --- Market Cash ---
  listMarketCash(payload = {}) {
    const params = new URLSearchParams();

    if (payload.market_id) params.set("market_id", payload.market_id);
    if (payload.store_id) params.set("store_id", payload.store_id);

    if (payload.status && payload.status !== "all")
      params.set("status", payload.status);

    // 🔥 THE FIX: Added audit_status to the API request
    if (payload.audit_status && payload.audit_status !== "all")
      params.set("audit_status", payload.audit_status);

    if (isValidDate(payload.date)) params.set("date", payload.date);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    return this.request(`market-cash?${params.toString()}`);
  },

  createMarketCash(payload) {
    return this.request("market-cash", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  approveMarketCash(id, reason = "", date, market_id) {
    return this.request(`market-cash/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market_id }),
    });
  },

  rejectMarketCash(id, reason = "", date, market_id) {
    return this.request(`market-cash/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market_id }),
    });
  },

  auditMarketCash(id, date, market_id) {
    return this.request(`market-cash/${id}/audit`, {
      method: "POST",
      body: JSON.stringify({ date, market_id }),
    });
  },

  // --- Notifications ---
  getNotifications(payload = {}) {
    const params = new URLSearchParams();
    if (payload.market_id) params.set("market_id", payload.market_id);
    return this.request(`notifications?${params.toString()}`);
  },

  dismissNotification(id) {
    return this.request(`notifications/${id}/dismiss`, { method: "POST" });
  },

  clearAllNotifications(market_id) {
    return this.request("notifications/clear-all", {
      method: "POST",
      body: JSON.stringify({ market_id }),
    });
  },

  // --- Dashboard ---
  getDashboard(payload = {}) {
    const params = new URLSearchParams();
    if (payload.market_id) params.set("market_id", payload.market_id);
    if (payload.store_id) params.set("store_id", payload.store_id);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    return this.request(`dashboard/combined?${params.toString()}`);
  },

  getPendingCounts(payload = {}) {
    const params = new URLSearchParams();
    if (payload.market_id) params.set("market_id", payload.market_id);
    return this.request(`dashboard/pending-counts?${params.toString()}`);
  },

  // --- Commissions ---
  getCommissions(payload = {}) {
    const params = new URLSearchParams();
    if (payload.market_id) params.set("market_id", payload.market_id);
    if (payload.store_id) params.set("store_id", payload.store_id);
    if (payload.status && payload.status !== "all")
      params.set("status", payload.status);
    if (payload.audit_status && payload.audit_status !== "all")
      params.set("audit_status", payload.audit_status);
    if (payload.payment_status)
      params.set("payment_status", payload.payment_status);
    if (payload.date) params.set("date", payload.date);
    if (payload.date_from) params.set("date_from", payload.date_from);
    if (payload.date_to) params.set("date_to", payload.date_to);
    if (payload.specific_dates)
      params.set("specific_dates", payload.specific_dates);
    if (payload.search) params.set("search", payload.search);
    if (payload.page) params.set("page", payload.page);
    if (payload.limit) params.set("limit", payload.limit);

    return this.request(`commission?${params.toString()}`);
  },

  createCommission(payload) {
    return this.request("commission", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateCommission(id, payload) {
    return this.request(`commission/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  approveCommission(id, reason = "", date, market_id) {
    return this.request(`commission/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market_id }),
    });
  },

  rejectCommission(id, reason = "", date, market_id) {
    return this.request(`commission/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, date, market_id }),
    });
  },

  auditCommission(id, date, market_id) {
    return this.request(`commission/${id}/audit`, {
      method: "POST",
      body: JSON.stringify({ date, market_id }),
    });
  },

  issueCommission(id, payload) {
    return this.request(`commission/${id}/issue`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  markCommissionPaid(id, payload) {
    return this.request(`commission/${id}/mark-paid`, {
      method: "POST",
      body: JSON.stringify(payload || {}),
    });
  },

  // --- Monthly Reconciliations ---
  getReconciliations(market_id) {
    const params = market_id ? `?market_id=${market_id}` : "";
    return this.request(`reconciliations${params}`);
  },

  getOpeningBalance(market_id, year, month) {
    const params = new URLSearchParams({ market_id, year, month }).toString();
    return this.request(`reconciliations/opening-balance?${params}`);
  },

  closeBook(data) {
    return this.request("reconciliations/close", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  reopenBook(id) {
    return this.request(`reconciliations/reopen/${id}`, { method: "DELETE" });
  },

  // ==========================================
  // PHASE 6: ADMIN MANAGEMENT
  // ==========================================

  // -- Markets --
  getAdminMarkets() {
    return this.request("admin/markets");
  },
  createAdminMarket(payload) {
    return this.request("admin/markets", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateAdminMarket(id, payload) {
    return this.request(`admin/markets/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // -- Stores --
  getAdminStores() {
    return this.request("admin/stores");
  },
  createAdminStore(payload) {
    return this.request("admin/stores", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateAdminStore(id, payload) {
    return this.request(`admin/stores/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // -- Employees --
  getAdminEmployees(storeId = null) {
    const endpoint = storeId
      ? `admin/employees?store_id=${storeId}`
      : "admin/employees";
    return this.request(endpoint);
  },
  createAdminEmployee(payload) {
    return this.request("admin/employees", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateAdminEmployee(id, payload) {
    return this.request(`admin/employees/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // -- Users --
  getAdminUsers() {
    return this.request("admin/users");
  },
  createAdminUser(payload) {
    return this.request("admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateAdminUser(id, payload) {
    return this.request(`admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
  // --- Auth ---
  login(email, password) {
    return this.request("auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  // 🔥 ADD THIS METHOD
  registerCompany(payload) {
    return this.request("auth/register-company", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  bulkCreatePayroll(payload) {
    return this.request("payroll-expenses/bulk", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  bulkCreateCommission(payload) {
    return this.request("commission/bulk", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  // Add this inside your api.js file
  // --- TILL (CASHFLOW) ENDPOINTS ---

  getCashflow: async function (params) {
    // Filter out undefined, null, or empty string values
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([_, value]) => value !== undefined && value !== null && value !== "",
      ),
    );

    // Convert clean params to query string
    const query = new URLSearchParams(cleanParams).toString();
    return this.request(`/cashflow?${query}`);
  },

  createCashflow: async function (data) {
    return this.request("/cashflow", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getPreviousTillBalance: async function (store_id, date) {
    // Construct query string for the GET request
    return this.request(
      `/cashflow/previous-balance?store_id=${store_id}&date=${date}`,
    );
  },
  // Add this inside your API object
  // --- TILL (CASHFLOW) ENDPOINTS ---

  auditTill(id, payload) {
    return this.request(`cashflow/till/${id}/audit`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },
};

export default api;
