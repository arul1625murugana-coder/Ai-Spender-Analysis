/* =========================================================
   SmartSpend AI — Shared utilities used on every page
   ========================================================= */

const CATEGORIES = [
  "Food", "Transport", "Shopping", "Bills", "Education", "Medical",
  "Entertainment", "Recharge", "Fitness", "Travel", "Electronics", "Other"
];

const PAYMENT_METHODS = [
  "Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer", "Other"
];

const CATEGORY_COLORS = {
  Food: "#f59e0b", Transport: "#06b6d4", Shopping: "#ec4899", Bills: "#ef4444",
  Education: "#6366f1", Medical: "#14b8a6", Entertainment: "#a855f7",
  Recharge: "#3b82f6", Fitness: "#10b981", Travel: "#f97316",
  Electronics: "#64748b", Other: "#94a3b8"
};

function formatCurrency(value) {
  const num = Number(value) || 0;
  return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  if (h === undefined) return timeStr;
  const hour = parseInt(h, 10);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${m} ${period}`;
}

async function apiRequest(url, options = {}) {
  const opts = Object.assign({ headers: { "Content-Type": "application/json" } }, options);
  const res = await fetch(url, opts);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    data = {};
  }
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong. Please try again.");
  }
  return data;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function showAlert(elId, message, type = "error") {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent = message;
  el.className = `alert alert-${type}`;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 4500);
}

function populateSelect(selectEl, options, placeholder) {
  if (!selectEl) return;
  selectEl.innerHTML = `<option value="">${placeholder}</option>`;
  options.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    selectEl.appendChild(o);
  });
}

function setNowDateTime(dateEl, timeEl) {
  const now = new Date();
  if (dateEl) {
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    dateEl.value = `${yyyy}-${mm}-${dd}`;
  }
  if (timeEl) {
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    timeEl.value = `${hh}:${min}`;
  }
}

/* ---------------- Theme (light/dark) ---------------- */
(function initTheme() {
  const saved = localStorage.getItem("smartspend-theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("themeToggle");
    updateThemeIcon(saved);
    if (btn) {
      btn.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", next);
        localStorage.setItem("smartspend-theme", next);
        updateThemeIcon(next);
      });
    }
  });
})();

function updateThemeIcon(theme) {
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}

/* ---------------- Sidebar toggle (mobile) ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (menuToggle && sidebar) {
    menuToggle.addEventListener("click", () => {
      sidebar.classList.add("open");
      backdrop && backdrop.classList.add("open");
    });
  }
  if (backdrop) {
    backdrop.addEventListener("click", () => {
      sidebar.classList.remove("open");
      backdrop.classList.remove("open");
    });
  }

  // Sidebar quick links: calculator + excel download (present on every page)
  const sidebarCalcBtn = document.getElementById("sidebarCalcBtn");
  if (sidebarCalcBtn) {
    sidebarCalcBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const overlay = document.getElementById("calcModalOverlay");
      if (overlay) overlay.classList.add("open");
    });
  }
  const sidebarExcelBtn = document.getElementById("sidebarExcelBtn");
  if (sidebarExcelBtn) {
    sidebarExcelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "/api/export-excel";
    });
  }
});
