/* =========================================================
   SmartSpend AI — Expense History page logic
   ========================================================= */

let allExpenses = [];
let expenseToDelete = null;

document.addEventListener("DOMContentLoaded", async () => {
  populateSelect(document.getElementById("expCategory"), CATEGORIES, "Select category");
  populateSelect(document.getElementById("expPaymentMethod"), PAYMENT_METHODS, "Select method");
  populateSelect(document.getElementById("categoryFilter"), CATEGORIES, "All Categories");
  populateSelect(document.getElementById("paymentFilter"), PAYMENT_METHODS, "All Payment Methods");

  bindEvents();
  await loadExpenses();
});

async function loadExpenses() {
  try {
    allExpenses = await apiRequest("/api/expenses");
    renderTable();
  } catch (e) {
    showAlert("pageAlert", e.message);
  }
}

function getFilteredExpenses() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const category = document.getElementById("categoryFilter").value;
  const payment = document.getElementById("paymentFilter").value;
  const dateFilter = document.getElementById("dateFilter").value;

  return allExpenses.filter(exp => {
    if (search && !exp.reason.toLowerCase().includes(search)) return false;
    if (category && exp.category !== category) return false;
    if (payment && exp.payment_method !== payment) return false;
    if (dateFilter && exp.date !== dateFilter) return false;
    return true;
  });
}

function renderTable() {
  const filtered = getFilteredExpenses();
  const tbody = document.getElementById("expenseTableBody");
  const emptyState = document.getElementById("emptyState");

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    return;
  }
  emptyState.style.display = "none";

  tbody.innerHTML = filtered.map(exp => `
    <tr>
      <td>${formatDate(exp.date)}</td>
      <td>${formatTime(exp.time)}</td>
      <td>${formatCurrency(exp.amount)}</td>
      <td><span class="badge">${exp.category}</span></td>
      <td>${escapeHtml(exp.reason)}</td>
      <td>${exp.payment_method}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openEditModal(${exp.id})">✏️ Edit</button>
        <button class="btn btn-danger btn-sm" onclick="openDeleteModal(${exp.id})">🗑️ Delete</button>
      </td>
    </tr>
  `).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function bindEvents() {
  document.getElementById("searchInput").addEventListener("input", renderTable);
  document.getElementById("categoryFilter").addEventListener("change", renderTable);
  document.getElementById("paymentFilter").addEventListener("change", renderTable);
  document.getElementById("dateFilter").addEventListener("change", renderTable);
  document.getElementById("clearFiltersBtn").addEventListener("click", () => {
    document.getElementById("searchInput").value = "";
    document.getElementById("categoryFilter").value = "";
    document.getElementById("paymentFilter").value = "";
    document.getElementById("dateFilter").value = "";
    renderTable();
  });

  const overlay = document.getElementById("expenseModalOverlay");
  const form = document.getElementById("expenseForm");

  document.getElementById("addExpenseBtn").addEventListener("click", () => {
    document.getElementById("expenseModalTitle").textContent = "➕ Add Expense";
    document.getElementById("editExpenseId").value = "";
    form.reset();
    setNowDateTime(document.getElementById("expDate"), document.getElementById("expTime"));
    overlay.classList.add("open");
  });

  document.getElementById("expenseModalCloseBtn").addEventListener("click", () => overlay.classList.remove("open"));
  document.getElementById("expenseCancelBtn").addEventListener("click", () => overlay.classList.remove("open"));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.classList.remove("open"); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("editExpenseId").value;
    const payload = {
      amount: document.getElementById("expAmount").value,
      category: document.getElementById("expCategory").value,
      reason: document.getElementById("expReason").value,
      payment_method: document.getElementById("expPaymentMethod").value,
      date: document.getElementById("expDate").value,
      time: document.getElementById("expTime").value,
      notes: document.getElementById("expNotes").value,
    };

    try {
      if (id) {
        await apiRequest(`/api/expenses/${id}`, { method: "PUT", body: JSON.stringify(payload) });
        showToast("Expense updated successfully!");
      } else {
        await apiRequest("/api/expenses", { method: "POST", body: JSON.stringify(payload) });
        showToast("Expense added successfully!");
      }
      overlay.classList.remove("open");
      await loadExpenses();
    } catch (err) {
      showAlert("expenseFormAlert", err.message);
    }
  });

  const deleteOverlay = document.getElementById("deleteModalOverlay");
  document.getElementById("cancelDeleteBtn").addEventListener("click", () => {
    deleteOverlay.classList.remove("open");
    expenseToDelete = null;
  });
  document.getElementById("confirmDeleteBtn").addEventListener("click", async () => {
    if (!expenseToDelete) return;
    try {
      await apiRequest(`/api/expenses/${expenseToDelete}`, { method: "DELETE" });
      showToast("Expense deleted.");
      deleteOverlay.classList.remove("open");
      expenseToDelete = null;
      await loadExpenses();
    } catch (err) {
      showAlert("pageAlert", err.message);
      deleteOverlay.classList.remove("open");
    }
  });
}

function openEditModal(id) {
  const exp = allExpenses.find(e => e.id === id);
  if (!exp) return;

  document.getElementById("expenseModalTitle").textContent = "✏️ Edit Expense";
  document.getElementById("editExpenseId").value = exp.id;
  document.getElementById("expAmount").value = exp.amount;
  document.getElementById("expCategory").value = exp.category;
  document.getElementById("expReason").value = exp.reason;
  document.getElementById("expPaymentMethod").value = exp.payment_method;
  document.getElementById("expDate").value = exp.date;
  document.getElementById("expTime").value = exp.time;
  document.getElementById("expNotes").value = exp.notes || "";

  document.getElementById("expenseModalOverlay").classList.add("open");
}

function openDeleteModal(id) {
  expenseToDelete = id;
  document.getElementById("deleteModalOverlay").classList.add("open");
}
