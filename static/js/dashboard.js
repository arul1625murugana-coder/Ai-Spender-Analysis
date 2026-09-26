/* =========================================================
   SmartSpend AI — Dashboard page logic
   ========================================================= */

let dailyChartInstance, weeklyChartInstance, monthlyChartInstance;

document.addEventListener("DOMContentLoaded", async () => {
  await checkSalarySetup();
});

async function checkSalarySetup() {
  try {
    const data = await apiRequest("/api/settings");
    if (!data.has_salary) {
      showWelcomeScreen();
    } else {
      showAppShell();
      await loadDashboard();
    }
  } catch (e) {
    showWelcomeScreen();
  }

  bindWelcomeScreenEvents();
  bindExpenseModalEvents();
}

function showWelcomeScreen() {
  document.getElementById("welcomeScreen").style.display = "flex";
  document.getElementById("appShell").style.display = "none";
}

function showAppShell() {
  document.getElementById("welcomeScreen").style.display = "none";
  document.getElementById("appShell").style.display = "flex";
}

function bindWelcomeScreenEvents() {
  const btn = document.getElementById("saveSalaryBtn");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "true";

  btn.addEventListener("click", async () => {
    const input = document.getElementById("salaryInput");
    const salary = parseFloat(input.value);

    if (!salary || salary <= 0) {
      showAlert("welcomeAlert", "Please enter a valid monthly salary greater than zero.");
      return;
    }

    btn.disabled = true;
    btn.textContent = "Saving...";
    try {
      await apiRequest("/api/settings", {
        method: "POST",
        body: JSON.stringify({ monthly_salary: salary })
      });
      showAppShell();
      await loadDashboard();
    } catch (e) {
      showAlert("welcomeAlert", e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = "Get Started 🚀";
    }
  });
}

async function loadDashboard() {
  try {
    const summary = await apiRequest("/api/dashboard");
    renderSummaryCards(summary);

    const charts = await apiRequest("/api/dashboard/charts");
    renderDailyChart(charts.daily);
    renderWeeklyChart(charts.weekly);
    renderMonthlyChart(charts.monthly);
  } catch (e) {
    showAlert("dashboardAlert", e.message);
  }
}

function renderSummaryCards(summary) {
  const grid = document.getElementById("summaryGrid");
  const cards = [
    { label: "Monthly Salary", value: summary.monthly_salary, icon: "💵", bg: "bg-indigo" },
    { label: "Total Spending", value: summary.total_spending, icon: "💸", bg: "bg-red" },
    { label: "Remaining Balance", value: summary.remaining_balance, icon: "🏦", bg: "bg-green" },
    { label: "Today's Spending", value: summary.today_spending, icon: "📅", bg: "bg-amber" },
    { label: "This Week's Spending", value: summary.week_spending, icon: "📆", bg: "bg-cyan" },
    { label: "This Month's Spending", value: summary.month_spending, icon: "🗓️", bg: "bg-purple" },
  ];

  grid.innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-icon ${c.bg}">${c.icon}</div>
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${formatCurrency(c.value)}</div>
    </div>
  `).join("") + `
    <div class="stat-card">
      <div class="stat-icon bg-pink">🔢</div>
      <div class="stat-label">Number of Transactions</div>
      <div class="stat-value">${summary.num_transactions}</div>
    </div>
  `;
}

function renderDailyChart(daily) {
  const ctx = document.getElementById("dailyChart");
  if (!ctx) return;
  if (dailyChartInstance) dailyChartInstance.destroy();
  dailyChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: daily.map(d => d.label),
      datasets: [{
        label: "Daily Spending",
        data: daily.map(d => d.total),
        borderColor: "#4f46e5",
        backgroundColor: "rgba(79,70,229,0.12)",
        fill: true,
        tension: 0.35,
        pointRadius: 3,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderWeeklyChart(weekly) {
  const ctx = document.getElementById("weeklyChart");
  if (!ctx) return;
  if (weeklyChartInstance) weeklyChartInstance.destroy();
  weeklyChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: weekly.map(w => w.label),
      datasets: [{
        label: "Weekly Spending",
        data: weekly.map(w => w.total),
        backgroundColor: "#06b6d4",
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderMonthlyChart(monthly) {
  const ctx = document.getElementById("monthlyChart");
  if (!ctx) return;
  if (monthlyChartInstance) monthlyChartInstance.destroy();
  monthlyChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: monthly.map(m => m.label),
      datasets: [{
        label: "Monthly Spending",
        data: monthly.map(m => m.total),
        backgroundColor: "#a855f7",
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

/* ---------------- Add Expense modal (dashboard quick action) ---------------- */
function bindExpenseModalEvents() {
  const overlay = document.getElementById("expenseModalOverlay");
  const openBtn = document.getElementById("qaAddExpense");
  const closeBtn = document.getElementById("expenseModalCloseBtn");
  const cancelBtn = document.getElementById("expenseCancelBtn");
  const form = document.getElementById("expenseForm");
  const qaCalc = document.getElementById("qaCalculator");
  const qaExcel = document.getElementById("qaExcel");

  if (!overlay || overlay.dataset.bound) return;
  overlay.dataset.bound = "true";

  populateSelect(document.getElementById("expCategory"), CATEGORIES, "Select category");
  populateSelect(document.getElementById("expPaymentMethod"), PAYMENT_METHODS, "Select method");

  function openModal() {
    setNowDateTime(document.getElementById("expDate"), document.getElementById("expTime"));
    overlay.classList.add("open");
  }
  function closeModal() {
    overlay.classList.remove("open");
    form.reset();
  }

  if (openBtn) openBtn.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });

  if (qaCalc) {
    qaCalc.addEventListener("click", () => {
      document.getElementById("calcModalOverlay").classList.add("open");
    });
  }
  if (qaExcel) {
    qaExcel.addEventListener("click", () => { window.location.href = "/api/export-excel"; });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
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
      await apiRequest("/api/expenses", { method: "POST", body: JSON.stringify(payload) });
      closeModal();
      showToast("Expense added successfully!");
      await loadDashboard();
    } catch (err) {
      showAlert("expenseFormAlert", err.message);
    }
  });
}
