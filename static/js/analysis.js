/* =========================================================
   SmartSpend AI — Spending Analysis page logic
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const data = await apiRequest("/api/analysis");
    renderSummary(data);
    renderCategoryChart(data.category_breakdown);
    renderPaymentChart(data.payment_breakdown);
    renderDailyBarChart(data.daily_series);
    renderTrendLineChart(data.monthly_series);
    renderIncomeExpenseChart(data.summary);
    renderCategoryTable(data.category_breakdown);
  } catch (e) {
    showAlert("pageAlert", e.message);
  }
});

function renderSummary(data) {
  const grid = document.getElementById("analysisSummaryGrid");
  const s = data.summary;
  const cards = [
    { label: "Highest Category", value: data.highest_category ? data.highest_category.category : "N/A", icon: "🏆", bg: "bg-amber", isCurrency: false },
    { label: "Lowest Category", value: data.lowest_category ? data.lowest_category.category : "N/A", icon: "📉", bg: "bg-cyan", isCurrency: false },
    { label: "Avg. Daily Spending", value: data.average_daily_spending, icon: "📅", bg: "bg-indigo", isCurrency: true },
    { label: "Avg. Weekly Spending", value: data.average_weekly_spending, icon: "📆", bg: "bg-purple", isCurrency: true },
    { label: "Total Transactions", value: data.total_transactions, icon: "🔢", bg: "bg-pink", isCurrency: false },
    { label: "Total Spending", value: s.total_spending, icon: "💸", bg: "bg-red", isCurrency: true },
  ];

  grid.innerHTML = cards.map(c => `
    <div class="stat-card">
      <div class="stat-icon ${c.bg}">${c.icon}</div>
      <div class="stat-label">${c.label}</div>
      <div class="stat-value">${c.isCurrency ? formatCurrency(c.value) : c.value}</div>
    </div>
  `).join("");
}

function renderCategoryChart(breakdown) {
  const ctx = document.getElementById("categoryChart");
  if (!ctx) return;
  if (!breakdown.length) return;
  new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: breakdown.map(c => c.category),
      datasets: [{
        data: breakdown.map(c => c.total),
        backgroundColor: breakdown.map(c => CATEGORY_COLORS[c.category] || "#94a3b8"),
        borderWidth: 2,
        borderColor: "#fff"
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "right" } }
    }
  });
}

function renderPaymentChart(breakdown) {
  const ctx = document.getElementById("paymentChart");
  if (!ctx) return;
  if (!breakdown.length) return;
  const colors = ["#4f46e5", "#06b6d4", "#f59e0b", "#10b981", "#ec4899", "#94a3b8"];
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: breakdown.map(p => p.method),
      datasets: [{
        data: breakdown.map(p => p.total),
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: "#fff"
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "right" } }
    }
  });
}

function renderDailyBarChart(daily) {
  const ctx = document.getElementById("dailyBarChart");
  if (!ctx) return;
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: daily.map(d => d.label),
      datasets: [{
        label: "Daily Spending",
        data: daily.map(d => d.total),
        backgroundColor: "#4f46e5",
        borderRadius: 5
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderTrendLineChart(monthly) {
  const ctx = document.getElementById("trendLineChart");
  if (!ctx) return;
  new Chart(ctx, {
    type: "line",
    data: {
      labels: monthly.map(m => m.label),
      datasets: [{
        label: "Spending Trend",
        data: monthly.map(m => m.total),
        borderColor: "#ec4899",
        backgroundColor: "rgba(236,72,153,0.12)",
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderIncomeExpenseChart(summary) {
  const ctx = document.getElementById("incomeExpenseChart");
  if (!ctx) return;
  new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["This Month"],
      datasets: [
        { label: "Income (Salary)", data: [summary.monthly_salary], backgroundColor: "#10b981", borderRadius: 5 },
        { label: "Expense", data: [summary.total_spending], backgroundColor: "#ef4444", borderRadius: 5 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

function renderCategoryTable(breakdown) {
  const tbody = document.getElementById("categoryTableBody");
  if (!breakdown.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">No expense data yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = breakdown.map(c => `
    <tr>
      <td><span class="badge">${c.category}</span></td>
      <td>${formatCurrency(c.total)}</td>
      <td>${c.percentage.toFixed(2)}%</td>
      <td>${c.count}</td>
    </tr>
  `).join("");
}
