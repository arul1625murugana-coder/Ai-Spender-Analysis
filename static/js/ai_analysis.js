/* =========================================================
   SmartSpend AI — AI Spending Analysis page logic
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  await loadInsights();
  const refreshBtn = document.getElementById("refreshInsightsBtn");
  if (refreshBtn) refreshBtn.addEventListener("click", loadInsights);
});

async function loadInsights() {
  const list = document.getElementById("insightList");
  list.innerHTML = `<div class="empty-state"><div class="emoji">🤖</div><p>Analyzing your data...</p></div>`;
  try {
    const data = await apiRequest("/api/ai-analysis");
    if (!data.insights || !data.insights.length) {
      list.innerHTML = `<div class="empty-state"><div class="emoji">🤖</div><p>Not enough data yet. Add some expenses to see AI insights.</p></div>`;
      return;
    }
    list.innerHTML = data.insights.map(text => `
      <div class="insight-item">
        <span class="insight-icon">✨</span>
        <span>${text}</span>
      </div>
    `).join("");
  } catch (e) {
    showAlert("pageAlert", e.message);
    list.innerHTML = "";
  }
}
