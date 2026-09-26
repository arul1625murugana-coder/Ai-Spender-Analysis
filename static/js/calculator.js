/* =========================================================
   SmartSpend AI — Built-in Calculator
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("calcModalOverlay");
  const display = document.getElementById("calcDisplay");
  const closeBtn = document.getElementById("calcCloseBtn");
  if (!overlay || !display) return;

  let expression = "";

  function render() {
    display.textContent = expression === "" ? "0" : expression;
  }

  function sanitizeForEval(expr) {
    // Only allow digits, operators, decimal point and percent
    if (!/^[0-9+\-*/.%\s]*$/.test(expr)) {
      throw new Error("Invalid expression");
    }
    // Convert trailing % usages like "50%" into "(50/100)"
    return expr.replace(/(\d+(\.\d+)?)%/g, "($1/100)");
  }

  document.querySelectorAll(".calc-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      const value = btn.getAttribute("data-value");

      if (action === "clear") {
        expression = "";
      } else if (action === "delete") {
        expression = expression.slice(0, -1);
      } else if (action === "equals") {
        try {
          const safeExpr = sanitizeForEval(expression);
          if (!safeExpr) return;
          // eslint-disable-next-line no-new-func
          const result = Function(`"use strict"; return (${safeExpr})`)();
          if (result === Infinity || result === -Infinity || Number.isNaN(result)) {
            expression = "Error";
          } else {
            expression = String(Math.round(result * 100000) / 100000);
          }
        } catch (e) {
          expression = "Error";
        }
      } else if (value !== null) {
        if (expression === "Error") expression = "";
        expression += value;
      }
      render();
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => overlay.classList.remove("open"));
  }
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });

  render();
});
