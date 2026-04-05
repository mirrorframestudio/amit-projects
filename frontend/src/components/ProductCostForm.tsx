"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ProductCost = {
  id: number;
  sku: string | null;
  shopify_product_id: number | null;
  product_name: string | null;
  cost_price: number;
  effective_date: string;
  end_date: string | null;
  notes: string | null;
};

export default function ProductCostForm() {
  const [costs, setCosts] = useState<ProductCost[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    product_name: "",
    cost_price: "",
    effective_date: new Date().toISOString().split("T")[0],
    end_date: "",
    notes: "",
  });

  const fetchCosts = () => {
    fetch(`${API_URL}/product-costs/`)
      .then((r) => r.json())
      .then(setCosts)
      .catch(() => {});
  };

  useEffect(() => {
    fetchCosts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = {
      sku: form.sku || null,
      product_name: form.product_name || null,
      cost_price: parseFloat(form.cost_price),
      effective_date: form.effective_date,
      end_date: form.end_date || null,
      notes: form.notes || null,
    };
    await fetch(`${API_URL}/product-costs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setForm({
      sku: "",
      product_name: "",
      cost_price: "",
      effective_date: new Date().toISOString().split("T")[0],
      end_date: "",
      notes: "",
    });
    setShowForm(false);
    fetchCosts();
  };

  const handleDelete = async (id: number) => {
    await fetch(`${API_URL}/product-costs/${id}`, { method: "DELETE" });
    fetchCosts();
  };

  return (
    <div style={sectionStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Product Costs (COGS)</h3>
        <button onClick={() => setShowForm(!showForm)} style={addBtnStyle}>
          {showForm ? "Cancel" : "+ Add Cost"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={formRow}>
            <input
              placeholder="SKU"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
              style={inputStyle}
            />
            <input
              placeholder="Product name"
              value={form.product_name}
              onChange={(e) => setForm({ ...form, product_name: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={formRow}>
            <input
              type="number"
              step="0.01"
              placeholder="Cost per unit"
              value={form.cost_price}
              onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="date"
              value={form.effective_date}
              onChange={(e) => setForm({ ...form, effective_date: e.target.value })}
              required
              style={inputStyle}
            />
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
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

      {costs.length > 0 ? (
        <table style={tableStyle}>
          <thead>
            <tr style={{ background: "#e8e8e8", textAlign: "left" }}>
              <th style={thStyle}>SKU</th>
              <th style={thStyle}>Product</th>
              <th style={thStyle}>Cost/Unit</th>
              <th style={thStyle}>From</th>
              <th style={thStyle}>Until</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {costs.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={tdStyle}>{c.sku || "—"}</td>
                <td style={tdStyle}>{c.product_name || "—"}</td>
                <td style={tdStyle}>
                  {c.cost_price.toLocaleString("en-US", { style: "currency", currency: "ILS" })}
                </td>
                <td style={tdStyle}>{c.effective_date}</td>
                <td style={tdStyle}>{c.end_date || "Current"}</td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleDelete(c.id)}
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
        <p style={{ color: "#666", fontSize: "0.9em" }}>No product costs yet. Add your first cost entry.</p>
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
