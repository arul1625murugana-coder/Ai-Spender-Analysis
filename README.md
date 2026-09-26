<<<<<<< HEAD
# 💰 SmartSpend AI — Smart Expense Tracker with AI Analysis

A complete full-stack expense management web application built with **Flask, SQLite,
vanilla JavaScript and Chart.js**. Designed as a polished, professional final-year
college project.

---

## 1. Features

- First-run salary setup screen that becomes your starting balance
- Live dashboard with 7 summary cards (salary, spending, balance, today/week/month, transactions)
- Add / edit / delete expenses with category, reason, payment method, date & time, notes
- Expense History page with search, category/payment/date filters
- Spending Analysis page: category pie, payment pie, daily bar, trend line, income vs expense
- AI Spending Analysis page: dynamic, rule-based insights computed live from your data
  (nothing is hard-coded)
- Analysis Report page: a professional, printable summary report
- One-click Excel export (3 sheets: Expense Details, Summary, Category Analysis) with a
  category pie chart embedded in the workbook
- Built-in calculator (accessible from the dashboard and sidebar on every page)
- Light / dark mode toggle, responsive sidebar + top navigation, mobile-friendly layout

---

## 2. Project Structure

```
SmartExpenseTracker/
│
├── app.py                     # Flask application (routes, DB, AI engine, Excel export)
├── requirements.txt
├── README.md
│
├── database/
│   └── expenses.db            # Auto-created on first run (not included in the repo)
│
├── templates/
│   ├── index.html              # Dashboard + first-run salary setup
│   ├── expenses.html           # Expense History
│   ├── analysis.html           # Spending Analysis
│   ├── ai_analysis.html        # AI Spending Analysis
│   ├── report.html             # Analysis Report
│   ├── _sidebar.html           # Shared sidebar partial
│   ├── _topbar.html            # Shared top bar partial
│   └── _modals.html            # Shared calculator modal + toast partial
│
├── static/
│   ├── css/
│   │   └── style.css          # All application styling (light + dark themes)
│   │
│   └── js/
│       ├── app-common.js      # Shared helpers: fetch wrapper, formatting, theme, sidebar
│       ├── calculator.js       # Calculator logic
│       ├── dashboard.js        # Dashboard + salary setup + Add Expense
│       ├── expenses.js         # Expense History: filters, edit, delete
│       ├── analysis.js         # Spending Analysis charts
│       ├── ai_analysis.js      # AI insight rendering
│       └── report.js           # Analysis Report rendering
│
└── exports/                    # Generated Excel files are cached here as a backup copy
```

---

## 3. Setup Instructions (VS Code)

### Step 1 — Open the project

Open the `SmartExpenseTracker` folder in VS Code (`File → Open Folder…`).

### Step 2 — Create a virtual environment (recommended)

```bash
python -m venv venv
```

Activate it:

- **Windows:** `venv\Scripts\activate`
- **macOS / Linux:** `source venv/bin/activate`

### Step 3 — Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4 — Run the application

```bash
python app.py
```

The console will show:

```
Running on http://127.0.0.1:5000
```

Open that address in your browser. The SQLite database (`database/expenses.db`) is
created automatically the first time the app runs — there is nothing to set up manually.

### Step 5 — First run

You'll see the **Welcome to Smart Expense Tracker** screen. Enter your monthly salary
(e.g. `50000`) and click **Get Started**. This becomes your starting balance, and you're
taken straight to the dashboard.

---

## 4. How the Frontend Connects to the Backend

- Flask serves HTML pages from `templates/` using `render_template()`.
- Every page loads its CSS from `static/css/style.css` and its JS from `static/js/*.js`,
  both wired through Flask's `url_for('static', filename=...)` so paths never break.
- The JavaScript files never touch the database directly — they call **JSON APIs** under
  `/api/...` using the browser's `fetch()` API (wrapped in a small `apiRequest()` helper
  in `app-common.js`).
- Example flow for adding an expense: the Add Expense form in `dashboard.js` /
  `expenses.js` collects the form fields → `POST /api/expenses` with a JSON body →
  Flask validates and inserts a row into SQLite → the frontend then re-fetches
  `/api/dashboard` so every summary card and chart updates immediately with the new totals.
- The same pattern is used for editing, deleting, filtering, chart data, AI insights, and
  the report page — everything you see on screen is fetched live from SQLite through Flask,
  never hard-coded in the HTML.

---

## 5. How SQLite Works Here

- On startup, `init_db()` in `app.py` creates two tables if they don't already exist:
  - `settings` — stores the monthly salary history (the most recent row is the active salary)
  - `expenses` — stores every expense record (amount, category, reason, payment method,
    date, time, notes, created_at)
- Flask opens a fresh SQLite connection per request (`get_db()`), and closes it
  automatically when the request ends (`teardown_appcontext`).
- All dashboard numbers (spending totals, balances, averages, category breakdowns) are
  computed **on the fly** from the rows currently in the `expenses` table using Pandas —
  nothing is cached or hard-coded, so adding, editing or deleting an expense immediately
  changes every number across the app.

---

## 6. How Excel Download Works

- Clicking **Download Excel Report** (on the dashboard, sidebar, or Analysis Report page)
  calls `GET /api/export-excel`.
- The backend reads the current data from SQLite, builds a workbook in memory with
  **openpyxl**, and writes three sheets:
  1. **Expense Details** — every transaction, one row per expense
  2. **Summary** — salary, totals, balance, averages, highest category, transaction count
  3. **Category Analysis** — category totals and percentage of total spending, plus an
     embedded pie chart
- The workbook is streamed back to the browser as a file download
  (`SmartSpend_Report_YYYYMMDD_HHMMSS.xlsx`) using Flask's `send_file()`, and a backup
  copy is also saved under `exports/`.

---

## 7. How AI Analysis Works

The "AI Spending Analysis" page uses a **rule-based analysis engine**
(`generate_ai_insights()` in `app.py`) that reads your real expense data through Pandas
and produces plain-English insights, for example:

- Highest and lowest spending category, and what share of total spending the top
  category represents
- Most frequently used category (by transaction count, not just amount)
- The single highest-spending day
- Average daily and weekly spending, calculated from the actual date range of your data
- Most-used payment method
- Week-over-week spending trend (increase / decrease / stable)
- Statistical outlier detection for unusually large transactions
  (amount > mean + 2×standard deviation)
- A discretionary-spending check (Entertainment, Shopping, Recharge, Other) that flags
  potential unnecessary spending when it exceeds 25% of your total
- A budgeting suggestion when one category consumes more than 30% of your salary

Every sentence is generated dynamically from whatever is currently in your database —
add, edit or delete an expense and the insights change immediately on refresh. No
insight text or number is hard-coded.

---

## 8. Validation Rules

- Amount must be a number greater than zero (rejects negative and zero values)
- Category must be one of the 12 supported categories
- Payment method must be one of the 6 supported methods
- Spending reason, date, and time are required fields
- Dates must be valid `YYYY-MM-DD` values
- All database errors are caught and returned as friendly JSON error messages instead of
  crashing the server

---

## 9. Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript, Chart.js |
| Backend | Python, Flask |
| Database | SQLite |
| Excel Export | Pandas, OpenPyXL |

No frontend frameworks (React/Angular/Vue) are used, per the project requirements.

---

## 10. Notes

- The `database/` and `exports/` folders are created automatically if missing — you do
  not need to create `expenses.db` yourself.
- To reset the app completely (start over with a new salary), stop the server and delete
  `database/expenses.db`, then restart with `python app.py`.
=======
# Smart-Expence-Tracker
>>>>>>> e836dd8cfe04ebaa70693eee0309e272ff0230c6
