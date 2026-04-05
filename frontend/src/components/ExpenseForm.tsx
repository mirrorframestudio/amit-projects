"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Expense = {
  id: number;
  name: string;
  category: string;
  amount: number;
  frequency: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
};

const CATEGORIES = [
  { value: "ad_spend", label: "Ad Spend" },
  { value: "rent", label: "Rent" },
  { value: "salary", label: "Salary" },
  { value: "subscription", label: "Subscription" },
  { value: "other", label: "Other" },
];

const FREQUENCIES = [
  { value: "one_time", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

export default function ExpenseForm() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "ad_spend",
    amount: "",
    frequency: "monthly",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    notes: "",
  });

  const fetchExpenses = () => {
    fetch(`${API_URL}/manual-expenses/`)
      .then((r) => r.json())
      .then(setExpenses)
      .catch(() => {});
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      ...form,
      amount: parseFloat(form.amount),
      end_date: form.end_date || null,
      notes: form.notes || null,
    };
    await fetch(`${API_URL}/manual-expenses/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setForm({
      name: "",
      category: "ad_spend",
      amount: "",
      frequency: "monthly",
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      notes: "",
    });
    setShowForm(false);
    fetchExpenses();
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_URL}/manual-expenses/${id}`, { method: "DELETE" });
    fetchExpenses();
  };

  const categoryLabel = (val: string) =>
    CATEGORIES.find((c) => c.value === val)?.label || val;
  const freqLabel = (val: string) =>
    FREQUENCIES.find((f) => f.value === val)?.label || val;

  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Manual Expenses</h3>
        <button onClick={() => setShowForm(!showForm)} style={addBtnStyle}>
          {showForm ? "Cancel" : "+ Add Expense"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={formRow}>
            <input
              placeholder="Expense name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              style={inputStyle}
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              style={inputStyle}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div style={formRow}>
            <input
              type="number"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              style={inputStyle}
            />
            <select
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              style={inputStyle}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>
          <div style={formRow}>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              placeholder="End date (optional)"
              style={inputStyle}
            />
          </div>
          <input
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            style={{ ...inputStyle, width: "100%" }}
          />
          <button type="submit" style={{ ...addBtnStyle, marginTop: 8 }}>Save</button>
        </form>
      )}

      {expenses.length > 0 ? (
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "#e8e8e8", textAlign: "left" }}>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Frequency</th>
              <th style={thStyle}>Start Date</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => (
              <tr key={exp.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={tdStyle}>{exp.name}</td>
                <td style={tdStyle}>{categoryLabel(exp.category)}</td>
                <td style={tdStyle}>
                  {exp.amount.toLocaleString("en-US", { style: "currency", currency: "ILS" })}
                </td>
                <td style={tdStyle}>{freqLabel(exp.frequency)}</td>
                <td style={tdStyle}>{exp.start_date}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: "#666", fontSize: "0.9em" }}>No expenses yet. Add your first expense.</p>
      )}
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  background: "white",
  padding: "16px 20px",
  borderRadius: 8,
  marginBottom: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const addBtnStyle: React.CSSProperties = {
  padding: "6px 16px",
  background: "#1a1a2e",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: "0.9em",
};

const formStyle: React.CSSProperties = {
  background: "#f9f9f9",
  padding: 16,
  borderRadius: 6,
  marginBottom: 12,
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const formRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  border: "1px solid #ddd",
  borderRadius: 4,
  fontSize: "0.9em",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = { padding: "8px 12px", fontWeight: 600 };
const tdStyle: React.CSSProperties = { padding: "8px 12px" };
