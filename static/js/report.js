/* =========================================================
   SmartSpend AI — Analysis Report page logic
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const data = await apiRequest("/api/report");
    renderReport(data);
  } catch (e) {
    showAlert("pageAlert", e.message);
  }

  document.getElementById("downloadExcelBtn").addEventListener("click", () => {
    window.location.href = "/api/export-excel";
  });
  document.getElementById("printReportBtn").addEventListener("click", () => window.print());
});

function renderReport(data) {
  const s = data.summary;
  document.getElementById("reportGeneratedAt").textContent = `Generated on ${data.generated_at}`;

  document.getElementById("rSalary").textContent = formatCurrency(s.monthly_salary);
  document.getElementById("rTotalExpenses").textContent = formatCurrency(s.total_spending);
  document.getElementById("rBalance").textContent = formatCurrency(s.remaining_balance);
  document.getElementById("rToday").textContent = formatCurrency(s.today_spending);
  document.getElementById("rWeekly").textContent = formatCurrency(s.week_spending);
  document.getElementById("rMonthly").textContent = formatCurrency(s.month_spending);
  document.getElementById("rDailyAvg").textContent = formatCurrency(data.average_daily_spending);
  document.getElementById("rWeeklyAvg").textContent = formatCurrency(data.average_weekly_spending);
  document.getElementById("rHighestCat").textContent = data.highest_category ? data.highest_category.category : "N/A";
  document.getElementById("rHighestAmt").textContent = data.highest_category ? formatCurrency(data.highest_category.total) : formatCurrency(0);
  document.getElementById("rPaymentMethod").textContent = data.most_used_payment_method;
  document.getElementById("rTransactions").textContent = s.num_transactions;

  const catBody = document.getElementById("reportCategoryBody");
  if (!data.category_breakdown.length) {
    catBody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">No expense data yet.</td></tr>`;
  } else {
    catBody.innerHTML = data.category_breakdown.map(c => `
      <tr>
        <td><span class="badge">${c.category}</span></td>
        <td>${formatCurrency(c.total)}</td>
        <td>${c.percentage.toFixed(2)}%</td>
      </tr>
    `).join("");
  }

  const insightList = document.getElementById("reportInsightList");
  insightList.innerHTML = data.insights.map(text => `
    <div class="insight-item"><span class="insight-icon">✨</span><span>${text}</span></div>
  `).join("");
}
