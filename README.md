# 💰 SmartSpend AI — Smart Expense Tracker with AI Analysis

A complete full-stack expense management web application built with **Flask, SQLite, Vanilla JavaScript, and Chart.js**. Designed as a polished and professional final-year college project.

---

## 1. Features

* First-run salary setup screen that becomes your starting balance
* Live dashboard with summary cards for salary, spending, balance, today, week, month, and transactions
* Add, edit, and delete expenses
* Expense fields include category, reason, payment method, date, time, and notes
* Expense History page with search, category, payment, and date filters
* Spending Analysis page with:

  * Category pie chart
  * Payment method pie chart
  * Daily spending bar chart
  * Spending trend line
  * Income vs expense chart
* AI Spending Analysis page with dynamic rule-based insights
* Analysis Report page with a professional printable summary
* One-click Excel export
* Excel report contains:

  * Expense Details
  * Summary
  * Category Analysis
  * Category pie chart
* Built-in calculator
* Light and dark mode
* Responsive sidebar and top navigation
* Mobile-friendly interface

---

## 2. Project Structure

```text
SmartExpenseTracker/
│
├── app.py
├── requirements.txt
├── README.md
│
├── database/
│   └── expenses.db
│
├── templates/
│   ├── index.html
│   ├── expenses.html
│   ├── analysis.html
│   ├── ai_analysis.html
│   ├── report.html
│   ├── _sidebar.html
│   ├── _topbar.html
│   └── _modals.html
│
├── static/
│   ├── css/
│   │   └── style.css
│   │
│   └── js/
│       ├── app-common.js
│       ├── calculator.js
│       ├── dashboard.js
│       ├── expenses.js
│       ├── analysis.js
│       ├── ai_analysis.js
│       └── report.js
│
└── exports/
    └── Generated Excel reports
```

---

## 3. Setup Instructions

### Step 1 — Clone or open the project

Open the `SmartExpenseTracker` folder in VS Code.

### Step 2 — Create a virtual environment

```bash
python -m venv venv
```

Activate the environment.

**Windows:**

```bash
venv\Scripts\activate
```

**macOS / Linux:**

```bash
source venv/bin/activate
```

### Step 3 — Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4 — Run the application

```bash
python app.py
```

The application will normally run at:

```text
http://127.0.0.1:5000
```

Open the address in your browser.

The SQLite database is created automatically when the application starts.

### Step 5 — First Run

On the first run, the application displays the **Welcome to Smart Expense Tracker** screen.

Enter your monthly salary and click **Get Started**.

The salary becomes the starting balance and you are taken to the dashboard.

---

## 4. Frontend and Backend Connection

Flask serves the HTML pages from the `templates` directory using `render_template()`.

Static CSS and JavaScript files are loaded from the `static` directory using Flask's `url_for()`.

The JavaScript frontend communicates with the Flask backend through JSON APIs.

Example expense flow:

```text
Add Expense Form
       ↓
JavaScript
       ↓
POST /api/expenses
       ↓
Flask Backend
       ↓
SQLite Database
       ↓
Dashboard Data
       ↓
Charts and Summary Cards
```

The same API-based approach is used for:

* Adding expenses
* Editing expenses
* Deleting expenses
* Filtering expenses
* Dashboard statistics
* Spending analysis
* AI analysis
* Reports
* Excel export

---

## 5. SQLite Database

The application uses SQLite for data storage.

The database contains tables for:

### `settings`

Stores salary information and application settings.

### `expenses`

Stores expense records including:

* Amount
* Category
* Reason
* Payment method
* Date
* Time
* Notes
* Created date

The database is automatically created if it does not exist.

---

## 6. Excel Report

The application provides an **Excel Report Download** feature.

The backend uses **Pandas** and **OpenPyXL** to generate the Excel file.

The report contains three sheets:

### Expense Details

Contains individual expense transactions.

### Summary

Contains:

* Salary
* Total spending
* Balance
* Average spending
* Highest spending category
* Transaction count

### Category Analysis

Contains:

* Category
* Total spending
* Percentage of total spending
* Category pie chart

The generated report is downloaded as an Excel file.

---

## 7. AI Spending Analysis

The **AI Spending Analysis** page uses a rule-based analysis engine to analyze the user's real expense data.

The analysis can identify:

* Highest spending category
* Lowest spending category
* Percentage of spending by category
* Most frequently used category
* Highest spending day
* Average daily spending
* Average weekly spending
* Most-used payment method
* Week-over-week spending trend
* Unusually large transactions
* Potential discretionary spending
* Categories consuming a large percentage of salary
* Budgeting suggestions

The analysis is generated dynamically from the data stored in the SQLite database.

Therefore, when expenses are added, edited, or deleted, the analysis can change based on the updated data.

---

## 8. Validation Rules

The application validates expense data before storing it.

* Amount must be greater than zero
* Category must be valid
* Payment method must be valid
* Spending reason is required
* Date is required
* Time is required
* Dates must use the `YYYY-MM-DD` format
* Database errors are handled and returned as user-friendly messages

---

## 9. Technology Stack

| Layer         | Technology                      |
| ------------- | ------------------------------- |
| Frontend      | HTML5, CSS3, Vanilla JavaScript |
| Charts        | Chart.js                        |
| Backend       | Python, Flask                   |
| Database      | SQLite                          |
| Data Analysis | Pandas                          |
| Excel Export  | OpenPyXL                        |
| Deployment    | Render                          |

No frontend frameworks such as React, Angular, or Vue are required.

---

## 10. Reset the Application

To completely reset the application and start with a new salary:

1. Stop the Flask server.
2. Delete the database file:

```text
database/expenses.db
```

3. Start the application again:

```bash
python app.py
```

The application will create a new database automatically.

---

## 11. GitHub

The project is maintained using Git and GitHub.

To push future changes:

```bash
git add .
git commit -m "Update project"
git push
```

---

## 12. Deployment

The application can be deployed using Render.

Recommended Render settings:

**Build Command**

```bash
pip install -r requirements.txt
```

**Start Command**

```bash
gunicorn app:app
```

Make sure `gunicorn` is included in `requirements.txt`.

---

## 13. Project Purpose

SmartSpend AI is designed to help users:

* Track daily expenses
* Understand spending patterns
* Analyze monthly spending
* Identify major spending categories
* Generate AI-based spending insights
* Download financial reports
* Improve personal budgeting decisions
