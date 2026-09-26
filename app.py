"""
SmartSpend AI - Smart Expense Tracker with AI Analysis
Flask backend application.

This file wires together:
 - SQLite database (auto-created on first run)
 - JSON APIs consumed by the frontend JavaScript files
 - Excel report generation (Pandas + OpenPyXL)
 - A simple rule-based "AI" analysis engine built from real DB data
"""

import os
import sqlite3
from datetime import datetime, timedelta, date
from io import BytesIO

from flask import Flask, render_template, request, jsonify, send_file, g

import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter
from openpyxl.chart import PieChart, BarChart, Reference

# --------------------------------------------------------------------------
# App configuration
# --------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE = os.path.join(BASE_DIR, "database", "expenses.db")
EXPORT_DIR = os.path.join(BASE_DIR, "exports")

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False

VALID_CATEGORIES = [
    "Food", "Transport", "Shopping", "Bills", "Education", "Medical",
    "Entertainment", "Recharge", "Fitness", "Travel", "Electronics", "Other"
]

VALID_PAYMENT_METHODS = [
    "Cash", "UPI", "Credit Card", "Debit Card", "Bank Transfer", "Other"
]


# --------------------------------------------------------------------------
# Database helpers
# --------------------------------------------------------------------------
def get_db():
    """Open a new database connection if one doesn't exist for this request."""
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create tables if they do not already exist, and ensure folders exist."""
    os.makedirs(os.path.join(BASE_DIR, "database"), exist_ok=True)
    os.makedirs(EXPORT_DIR, exist_ok=True)

    conn = sqlite3.connect(DATABASE)
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            monthly_salary REAL NOT NULL,
            created_at TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            reason TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()


# --------------------------------------------------------------------------
# Shared query helpers (used by dashboard, analysis, AI analysis, Excel export)
# --------------------------------------------------------------------------
def get_latest_salary(db):
    row = db.execute(
        "SELECT monthly_salary FROM settings ORDER BY id DESC LIMIT 1"
    ).fetchone()
    return row["monthly_salary"] if row else None


def get_all_expenses(db):
    rows = db.execute(
        "SELECT * FROM expenses ORDER BY date DESC, time DESC, id DESC"
    ).fetchall()
    return [dict(r) for r in rows]


def to_dataframe(expenses):
    if not expenses:
        return pd.DataFrame(columns=[
            "id", "amount", "category", "reason", "payment_method",
            "date", "time", "notes", "created_at"
        ])
    df = pd.DataFrame(expenses)
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)
    df["date_parsed"] = pd.to_datetime(df["date"], errors="coerce")
    return df


def period_bounds(today=None):
    """Return (start_of_week, start_of_month, today_date) as date objects."""
    if today is None:
        today = date.today()
    start_of_week = today - timedelta(days=today.weekday())  # Monday
    start_of_month = today.replace(day=1)
    return start_of_week, start_of_month, today


def compute_summary(db):
    """Central place that computes every number used across the app."""
    salary = get_latest_salary(db) or 0
    expenses = get_all_expenses(db)
    df = to_dataframe(expenses)

    total_spending = float(df["amount"].sum()) if not df.empty else 0.0
    remaining_balance = salary - total_spending

    start_of_week, start_of_month, today = period_bounds()

    if not df.empty:
        today_mask = df["date_parsed"].dt.date == today
        week_mask = df["date_parsed"].dt.date >= start_of_week
        month_mask = df["date_parsed"].dt.date >= start_of_month

        today_spending = float(df.loc[today_mask, "amount"].sum())
        week_spending = float(df.loc[week_mask, "amount"].sum())
        month_spending = float(df.loc[month_mask, "amount"].sum())
    else:
        today_spending = week_spending = month_spending = 0.0

    num_transactions = int(len(df))

    return {
        "monthly_salary": round(salary, 2),
        "total_spending": round(total_spending, 2),
        "remaining_balance": round(remaining_balance, 2),
        "today_spending": round(today_spending, 2),
        "week_spending": round(week_spending, 2),
        "month_spending": round(month_spending, 2),
        "num_transactions": num_transactions,
    }


def compute_category_breakdown(df):
    if df.empty:
        return []
    grouped = df.groupby("category")["amount"].sum().sort_values(ascending=False)
    total = grouped.sum()
    result = []
    for cat, amt in grouped.items():
        pct = (amt / total * 100) if total > 0 else 0
        count = int((df["category"] == cat).sum())
        result.append({
            "category": cat,
            "total": round(float(amt), 2),
            "percentage": round(float(pct), 2),
            "count": count
        })
    return result


def compute_payment_breakdown(df):
    if df.empty:
        return []
    grouped = df.groupby("payment_method")["amount"].sum().sort_values(ascending=False)
    total = grouped.sum()
    result = []
    for method, amt in grouped.items():
        pct = (amt / total * 100) if total > 0 else 0
        result.append({
            "method": method,
            "total": round(float(amt), 2),
            "percentage": round(float(pct), 2)
        })
    return result


def compute_daily_series(df, days=14):
    """Last `days` days of spending, oldest first, always filling zero days."""
    today = date.today()
    series = []
    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        if not df.empty:
            total = float(df.loc[df["date_parsed"].dt.date == day, "amount"].sum())
        else:
            total = 0.0
        series.append({"label": day.strftime("%d %b"), "date": day.isoformat(), "total": round(total, 2)})
    return series


def compute_weekly_series(df, weeks=8):
    """Last `weeks` calendar weeks (Mon-Sun) of spending, oldest first."""
    start_of_week, _, today = period_bounds()
    series = []
    for i in range(weeks - 1, -1, -1):
        w_start = start_of_week - timedelta(weeks=i)
        w_end = w_start + timedelta(days=6)
        if not df.empty:
            mask = (df["date_parsed"].dt.date >= w_start) & (df["date_parsed"].dt.date <= w_end)
            total = float(df.loc[mask, "amount"].sum())
        else:
            total = 0.0
        series.append({
            "label": f"{w_start.strftime('%d %b')}",
            "total": round(total, 2)
        })
    return series


def compute_monthly_series(df, months=6):
    today = date.today()
    series = []
    year, month = today.year, today.month
    month_list = []
    for i in range(months - 1, -1, -1):
        m = month - i
        y = year
        while m <= 0:
            m += 12
            y -= 1
        month_list.append((y, m))

    for (y, m) in month_list:
        if not df.empty:
            mask = (df["date_parsed"].dt.year == y) & (df["date_parsed"].dt.month == m)
            total = float(df.loc[mask, "amount"].sum())
        else:
            total = 0.0
        series.append({"label": f"{y}-{m:02d}", "total": round(total, 2)})
    return series


def generate_ai_insights(summary, df):
    """
    Rule-based 'AI' analysis engine.
    Every insight is derived dynamically from the actual expense data --
    nothing here is hard-coded to specific numbers.
    """
    insights = []

    total_spending = summary["total_spending"]
    salary = summary["monthly_salary"]
    remaining = summary["remaining_balance"]

    insights.append(f"Your total spending so far is ₹{total_spending:,.2f}.")

    if salary > 0:
        insights.append(f"Your remaining balance is ₹{remaining:,.2f} out of a monthly salary of ₹{salary:,.2f}.")
        if remaining < 0:
            insights.append("⚠️ You have exceeded your monthly salary. Consider reducing discretionary spending immediately.")
        elif remaining < salary * 0.1:
            insights.append("⚠️ Your remaining balance is below 10% of your salary. Spend cautiously for the rest of the month.")

    if df.empty:
        insights.append("Add a few expenses to unlock deeper AI insights about your spending habits.")
        return insights

    # Highest & lowest spending category
    cat_group = df.groupby("category")["amount"].sum().sort_values(ascending=False)
    if not cat_group.empty:
        top_cat, top_amt = cat_group.index[0], cat_group.iloc[0]
        low_cat, low_amt = cat_group.index[-1], cat_group.iloc[-1]
        insights.append(f"Your highest spending category is {top_cat} with ₹{top_amt:,.2f}.")
        if len(cat_group) > 1:
            insights.append(f"Your lowest spending category is {low_cat} with ₹{low_amt:,.2f}.")
        share = (top_amt / total_spending * 100) if total_spending else 0
        insights.append(f"{top_cat} accounts for {share:.1f}% of your total spending.")

    # Most frequently used category
    freq_group = df.groupby("category").size().sort_values(ascending=False)
    if not freq_group.empty:
        most_freq_cat = freq_group.index[0]
        insights.append(f"You spend most frequently in the '{most_freq_cat}' category ({int(freq_group.iloc[0])} transactions).")

    # Highest spending day
    day_group = df.groupby(df["date_parsed"].dt.date)["amount"].sum().sort_values(ascending=False)
    if not day_group.empty:
        top_day = day_group.index[0]
        insights.append(f"Your highest spending day was {top_day.strftime('%d %b %Y')} with ₹{day_group.iloc[0]:,.2f} spent.")

    # Averages
    num_days = df["date_parsed"].dt.date.nunique()
    avg_daily = total_spending / num_days if num_days else 0
    insights.append(f"Your average daily spending is ₹{avg_daily:,.2f}.")

    earliest = df["date_parsed"].min()
    latest = df["date_parsed"].max()
    if pd.notnull(earliest) and pd.notnull(latest):
        span_weeks = max(1, ((latest - earliest).days // 7) + 1)
        avg_weekly = total_spending / span_weeks
        insights.append(f"Your average weekly spending is ₹{avg_weekly:,.2f}.")

    # Payment method usage
    pay_group = df.groupby("payment_method")["amount"].sum().sort_values(ascending=False)
    if not pay_group.empty:
        top_method = pay_group.index[0]
        insights.append(f"You use {top_method} most often for payments, totalling ₹{pay_group.iloc[0]:,.2f}.")

    # Spending trend: compare this week vs previous week
    start_of_week, start_of_month, today = period_bounds()
    prev_week_start = start_of_week - timedelta(days=7)
    prev_week_end = start_of_week - timedelta(days=1)
    this_week_total = df.loc[df["date_parsed"].dt.date >= start_of_week, "amount"].sum()
    prev_week_total = df.loc[
        (df["date_parsed"].dt.date >= prev_week_start) & (df["date_parsed"].dt.date <= prev_week_end),
        "amount"
    ].sum()
    if prev_week_total > 0:
        change_pct = ((this_week_total - prev_week_total) / prev_week_total) * 100
        if change_pct > 5:
            insights.append(f"Your spending this week increased by {change_pct:.1f}% compared to last week.")
        elif change_pct < -5:
            insights.append(f"Good job! Your spending this week decreased by {abs(change_pct):.1f}% compared to last week.")
        else:
            insights.append("Your weekly spending has remained fairly stable.")

    # Unusual / large transactions (statistical outliers: > mean + 2*std)
    mean_amt = df["amount"].mean()
    std_amt = df["amount"].std(ddof=0) or 0
    threshold = mean_amt + 2 * std_amt
    unusual = df[df["amount"] > threshold] if threshold > 0 else pd.DataFrame()
    if not unusual.empty:
        top_unusual = unusual.sort_values("amount", ascending=False).iloc[0]
        insights.append(
            f"Unusual spending detected: ₹{top_unusual['amount']:,.2f} on '{top_unusual['reason']}' "
            f"({top_unusual['category']}) is much higher than your typical transaction."
        )

    # Potential unnecessary expenses (Entertainment, Shopping, Recharge, Other combined)
    discretionary_cats = ["Entertainment", "Shopping", "Recharge", "Other"]
    discretionary_total = df.loc[df["category"].isin(discretionary_cats), "amount"].sum()
    if total_spending > 0:
        disc_pct = discretionary_total / total_spending * 100
        if disc_pct > 25:
            insights.append(
                f"₹{discretionary_total:,.2f} ({disc_pct:.1f}%) went to discretionary categories "
                f"(Entertainment, Shopping, Recharge, Other). This may include unnecessary spending worth reviewing."
            )

    # Budget suggestion for top category
    if not cat_group.empty and salary > 0:
        top_cat, top_amt = cat_group.index[0], cat_group.iloc[0]
        if top_amt > salary * 0.3:
            insights.append(f"Consider setting a monthly budget for {top_cat}, as it exceeds 30% of your salary.")

    return insights


# --------------------------------------------------------------------------
# Page routes (render templates)
# --------------------------------------------------------------------------
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/expenses")
def expenses_page():
    return render_template("expenses.html")


@app.route("/analysis")
def analysis_page():
    return render_template("analysis.html")


@app.route("/ai-analysis")
def ai_analysis_page():
    return render_template("ai_analysis.html")


@app.route("/report")
def report_page():
    return render_template("report.html")


# --------------------------------------------------------------------------
# Settings / Salary API
# --------------------------------------------------------------------------
@app.route("/api/settings", methods=["GET"])
def api_get_settings():
    db = get_db()
    salary = get_latest_salary(db)
    return jsonify({"has_salary": salary is not None, "monthly_salary": salary or 0})


@app.route("/api/settings", methods=["POST"])
def api_set_settings():
    data = request.get_json(silent=True) or {}
    salary = data.get("monthly_salary")

    try:
        salary = float(salary)
    except (TypeError, ValueError):
        return jsonify({"error": "Monthly salary must be a valid number."}), 400

    if salary <= 0:
        return jsonify({"error": "Monthly salary must be greater than zero."}), 400

    db = get_db()
    db.execute(
        "INSERT INTO settings (monthly_salary, created_at) VALUES (?, ?)",
        (salary, datetime.now().isoformat())
    )
    db.commit()
    return jsonify({"success": True, "monthly_salary": salary})


# --------------------------------------------------------------------------
# Dashboard API
# --------------------------------------------------------------------------
@app.route("/api/dashboard", methods=["GET"])
def api_dashboard():
    db = get_db()
    summary = compute_summary(db)
    return jsonify(summary)


@app.route("/api/dashboard/charts", methods=["GET"])
def api_dashboard_charts():
    db = get_db()
    df = to_dataframe(get_all_expenses(db))
    return jsonify({
        "daily": compute_daily_series(df, days=14),
        "weekly": compute_weekly_series(df, weeks=8),
        "monthly": compute_monthly_series(df, months=6),
    })


# --------------------------------------------------------------------------
# Expenses CRUD API
# --------------------------------------------------------------------------
def validate_expense_payload(data, partial=False):
    errors = []

    amount = data.get("amount")
    if amount is None and not partial:
        errors.append("Amount is required.")
    elif amount is not None:
        try:
            amount = float(amount)
            if amount <= 0:
                errors.append("Amount must be greater than zero.")
        except (TypeError, ValueError):
            errors.append("Amount must be a valid number.")

    category = data.get("category")
    if not category and not partial:
        errors.append("Category is required.")
    elif category and category not in VALID_CATEGORIES:
        errors.append(f"Invalid category: {category}")

    reason = data.get("reason")
    if not reason and not partial:
        errors.append("Spending reason is required.")

    payment_method = data.get("payment_method")
    if not payment_method and not partial:
        errors.append("Payment method is required.")
    elif payment_method and payment_method not in VALID_PAYMENT_METHODS:
        errors.append(f"Invalid payment method: {payment_method}")

    exp_date = data.get("date")
    if not exp_date and not partial:
        errors.append("Date is required.")
    elif exp_date:
        try:
            datetime.strptime(exp_date, "%Y-%m-%d")
        except ValueError:
            errors.append("Date must be in YYYY-MM-DD format.")

    exp_time = data.get("time")
    if not exp_time and not partial:
        errors.append("Time is required.")

    return errors


@app.route("/api/expenses", methods=["GET"])
def api_get_expenses():
    db = get_db()
    expenses = get_all_expenses(db)
    return jsonify(expenses)


@app.route("/api/expenses", methods=["POST"])
def api_add_expense():
    data = request.get_json(silent=True) or {}
    errors = validate_expense_payload(data)
    if errors:
        return jsonify({"error": " ".join(errors)}), 400

    db = get_db()
    try:
        db.execute(
            """INSERT INTO expenses
               (amount, category, reason, payment_method, date, time, notes, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                float(data["amount"]),
                data["category"],
                data["reason"].strip(),
                data["payment_method"],
                data["date"],
                data["time"],
                (data.get("notes") or "").strip(),
                datetime.now().isoformat(),
            )
        )
        db.commit()
    except sqlite3.Error as e:
        return jsonify({"error": f"Database error: {e}"}), 500

    return jsonify({"success": True})


@app.route("/api/expenses/<int:expense_id>", methods=["PUT"])
def api_update_expense(expense_id):
    data = request.get_json(silent=True) or {}
    errors = validate_expense_payload(data, partial=True)
    if errors:
        return jsonify({"error": " ".join(errors)}), 400

    db = get_db()
    existing = db.execute("SELECT * FROM expenses WHERE id = ?", (expense_id,)).fetchone()
    if not existing:
        return jsonify({"error": "Expense not found."}), 404

    merged = dict(existing)
    for field in ["amount", "category", "reason", "payment_method", "date", "time", "notes"]:
        if field in data and data[field] is not None:
            merged[field] = data[field]

    try:
        db.execute(
            """UPDATE expenses SET amount=?, category=?, reason=?, payment_method=?,
               date=?, time=?, notes=? WHERE id=?""",
            (
                float(merged["amount"]),
                merged["category"],
                str(merged["reason"]).strip(),
                merged["payment_method"],
                merged["date"],
                merged["time"],
                str(merged.get("notes") or "").strip(),
                expense_id,
            )
        )
        db.commit()
    except sqlite3.Error as e:
        return jsonify({"error": f"Database error: {e}"}), 500

    return jsonify({"success": True})


@app.route("/api/expenses/<int:expense_id>", methods=["DELETE"])
def api_delete_expense(expense_id):
    db = get_db()
    existing = db.execute("SELECT id FROM expenses WHERE id = ?", (expense_id,)).fetchone()
    if not existing:
        return jsonify({"error": "Expense not found."}), 404

    db.execute("DELETE FROM expenses WHERE id = ?", (expense_id,))
    db.commit()
    return jsonify({"success": True})


# --------------------------------------------------------------------------
# Spending Analysis API
# --------------------------------------------------------------------------
@app.route("/api/analysis", methods=["GET"])
def api_analysis():
    db = get_db()
    summary = compute_summary(db)
    df = to_dataframe(get_all_expenses(db))

    category_breakdown = compute_category_breakdown(df)
    payment_breakdown = compute_payment_breakdown(df)

    highest_category = category_breakdown[0] if category_breakdown else None
    lowest_category = category_breakdown[-1] if category_breakdown else None

    num_days = df["date_parsed"].dt.date.nunique() if not df.empty else 0
    avg_daily = (summary["total_spending"] / num_days) if num_days else 0

    earliest = df["date_parsed"].min() if not df.empty else None
    latest = df["date_parsed"].max() if not df.empty else None
    if pd.notnull(earliest) and pd.notnull(latest):
        span_weeks = max(1, ((latest - earliest).days // 7) + 1)
        avg_weekly = summary["total_spending"] / span_weeks
    else:
        avg_weekly = 0

    return jsonify({
        "summary": summary,
        "category_breakdown": category_breakdown,
        "payment_breakdown": payment_breakdown,
        "daily_series": compute_daily_series(df, days=14),
        "weekly_series": compute_weekly_series(df, weeks=8),
        "monthly_series": compute_monthly_series(df, months=6),
        "highest_category": highest_category,
        "lowest_category": lowest_category,
        "average_daily_spending": round(avg_daily, 2),
        "average_weekly_spending": round(avg_weekly, 2),
        "total_transactions": summary["num_transactions"],
    })


# --------------------------------------------------------------------------
# AI Analysis API
# --------------------------------------------------------------------------
@app.route("/api/ai-analysis", methods=["GET"])
def api_ai_analysis():
    db = get_db()
    summary = compute_summary(db)
    df = to_dataframe(get_all_expenses(db))
    insights = generate_ai_insights(summary, df)
    return jsonify({
        "summary": summary,
        "insights": insights
    })


# --------------------------------------------------------------------------
# Analysis Report API
# --------------------------------------------------------------------------
@app.route("/api/report", methods=["GET"])
def api_report():
    db = get_db()
    summary = compute_summary(db)
    df = to_dataframe(get_all_expenses(db))

    category_breakdown = compute_category_breakdown(df)
    payment_breakdown = compute_payment_breakdown(df)
    insights = generate_ai_insights(summary, df)

    num_days = df["date_parsed"].dt.date.nunique() if not df.empty else 0
    avg_daily = (summary["total_spending"] / num_days) if num_days else 0

    earliest = df["date_parsed"].min() if not df.empty else None
    latest = df["date_parsed"].max() if not df.empty else None
    if pd.notnull(earliest) and pd.notnull(latest):
        span_weeks = max(1, ((latest - earliest).days // 7) + 1)
        avg_weekly = summary["total_spending"] / span_weeks
    else:
        avg_weekly = 0

    most_used_payment = payment_breakdown[0]["method"] if payment_breakdown else "N/A"
    highest_category = category_breakdown[0] if category_breakdown else None

    return jsonify({
        "summary": summary,
        "average_daily_spending": round(avg_daily, 2),
        "average_weekly_spending": round(avg_weekly, 2),
        "highest_category": highest_category,
        "most_used_payment_method": most_used_payment,
        "category_breakdown": category_breakdown,
        "payment_breakdown": payment_breakdown,
        "insights": insights,
        "generated_at": datetime.now().strftime("%d %b %Y, %I:%M %p"),
    })


# --------------------------------------------------------------------------
# Excel Export
# --------------------------------------------------------------------------
HEADER_FILL = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
HEADER_FONT = Font(color="FFFFFF", bold=True, size=11, name="Calibri")
TITLE_FONT = Font(bold=True, size=16, color="4F46E5", name="Calibri")
SUBTLE_FONT = Font(italic=True, size=9, color="666666", name="Calibri")
THIN_BORDER = Border(
    left=Side(style="thin", color="D1D5DB"),
    right=Side(style="thin", color="D1D5DB"),
    top=Side(style="thin", color="D1D5DB"),
    bottom=Side(style="thin", color="D1D5DB"),
)


def style_header_row(ws, row_idx, num_cols):
    for col in range(1, num_cols + 1):
        cell = ws.cell(row=row_idx, column=col)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center")
        cell.border = THIN_BORDER


def autofit_columns(ws, widths):
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w


@app.route("/api/export-excel", methods=["GET"])
def api_export_excel():
    db = get_db()
    summary = compute_summary(db)
    expenses = get_all_expenses(db)
    df = to_dataframe(expenses)
    category_breakdown = compute_category_breakdown(df)
    payment_breakdown = compute_payment_breakdown(df)

    num_days = df["date_parsed"].dt.date.nunique() if not df.empty else 0
    avg_daily = (summary["total_spending"] / num_days) if num_days else 0
    earliest = df["date_parsed"].min() if not df.empty else None
    latest = df["date_parsed"].max() if not df.empty else None
    if pd.notnull(earliest) and pd.notnull(latest):
        span_weeks = max(1, ((latest - earliest).days // 7) + 1)
        avg_weekly = summary["total_spending"] / span_weeks
    else:
        avg_weekly = 0

    wb = Workbook()

    # ---------------- Sheet 1: Expense Details ----------------
    ws1 = wb.active
    ws1.title = "Expense Details"
    ws1.merge_cells("A1:G1")
    ws1["A1"] = "SmartSpend AI - Expense Details"
    ws1["A1"].font = TITLE_FONT
    ws1.append([])

    headers = ["Date", "Time", "Amount (₹)", "Category", "Reason", "Payment Method", "Notes"]
    ws1.append(headers)
    style_header_row(ws1, 3, len(headers))

    for exp in expenses:
        ws1.append([
            exp["date"], exp["time"], exp["amount"], exp["category"],
            exp["reason"], exp["payment_method"], exp.get("notes") or ""
        ])

    for row in ws1.iter_rows(min_row=4, max_row=ws1.max_row, max_col=7):
        for cell in row:
            cell.border = THIN_BORDER
            if cell.column == 3:
                cell.number_format = '₹#,##0.00'

    autofit_columns(ws1, [14, 12, 14, 16, 28, 18, 30])

    # ---------------- Sheet 2: Summary ----------------
    ws2 = wb.create_sheet("Summary")
    ws2.merge_cells("A1:B1")
    ws2["A1"] = "SmartSpend AI - Summary"
    ws2["A1"].font = TITLE_FONT
    ws2.append([])

    ws2.append(["Metric", "Value"])
    style_header_row(ws2, 3, 2)

    summary_rows = [
        ("Monthly Salary", summary["monthly_salary"]),
        ("Total Expenses", summary["total_spending"]),
        ("Remaining Balance", summary["remaining_balance"]),
        ("Today's Spending", summary["today_spending"]),
        ("Weekly Spending", summary["week_spending"]),
        ("Monthly Spending", summary["month_spending"]),
        ("Daily Average", round(avg_daily, 2)),
        ("Weekly Average", round(avg_weekly, 2)),
        ("Highest Spending Category", category_breakdown[0]["category"] if category_breakdown else "N/A"),
        ("Total Transactions", summary["num_transactions"]),
    ]
    for label, value in summary_rows:
        ws2.append([label, value])

    for row in ws2.iter_rows(min_row=4, max_row=ws2.max_row, max_col=2):
        for cell in row:
            cell.border = THIN_BORDER
            if isinstance(cell.value, (int, float)) and cell.column == 2:
                cell.number_format = '₹#,##0.00'

    autofit_columns(ws2, [28, 22])

    # ---------------- Sheet 3: Category Analysis ----------------
    ws3 = wb.create_sheet("Category Analysis")
    ws3.merge_cells("A1:C1")
    ws3["A1"] = "SmartSpend AI - Category Analysis"
    ws3["A1"].font = TITLE_FONT
    ws3.append([])

    ws3.append(["Category", "Total Amount (₹)", "Percentage of Total (%)"])
    style_header_row(ws3, 3, 3)

    for cat in category_breakdown:
        ws3.append([cat["category"], cat["total"], cat["percentage"]])

    for row in ws3.iter_rows(min_row=4, max_row=ws3.max_row, max_col=3):
        for cell in row:
            cell.border = THIN_BORDER
            if cell.column == 2:
                cell.number_format = '₹#,##0.00'
            if cell.column == 3:
                cell.number_format = '0.00"%"'

    autofit_columns(ws3, [20, 20, 24])

    # Pie chart of categories
    if category_breakdown:
        pie = PieChart()
        pie.title = "Spending by Category"
        data_ref = Reference(ws3, min_col=2, min_row=3, max_row=3 + len(category_breakdown))
        cats_ref = Reference(ws3, min_col=1, min_row=4, max_row=3 + len(category_breakdown))
        pie.add_data(data_ref, titles_from_data=True)
        pie.set_categories(cats_ref)
        ws3.add_chart(pie, "E3")

    wb.save(os.path.join(EXPORT_DIR, "_last_export.xlsx"))

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"SmartSpend_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return send_file(
        output,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name=filename
    )


# --------------------------------------------------------------------------
# Error handlers
# --------------------------------------------------------------------------
@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found."}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "An internal server error occurred."}), 500


# --------------------------------------------------------------------------
# Entry point
# --------------------------------------------------------------------------
if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="127.0.0.1", port=5000)
else:
    init_db()
