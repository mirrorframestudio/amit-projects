"use client";

import { useState } from "react";
import ShopifySync from "@/components/ShopifySync";
import ExpenseForm from "@/components/ExpenseForm";
import ProductCostForm from "@/components/ProductCostForm";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type Resolution = "daily" | "weekly" | "monthly";

export default function PnLPage() {
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-02-28");
  const [resolution, setResolution] = useState<Resolution>("monthly");
  const [activeTab, setActiveTab] = useState<"pnl" | "expenses" | "costs">("pnl");
  const [downloading, setDownloading] = useState(false);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const res = await fetch(
        `${API_URL}/pnl/export?start_date=${startDate}&end_date=${endDate}&resolution=${resolution}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PnL_${startDate}_${endDate}_${resolution}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert("Failed to export P&L. Make sure the backend is running.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>Profit & Loss</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20 }}>
        {[
          { key: "pnl" as const, label: "P&L Export" },
          { key: "expenses" as const, label: "Manual Expenses" },
          { key: "costs" as const, label: "Product Costs" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "10px 24px",
              background: activeTab === tab.key ? "#1a1a2e" : "#e8e8e8",
              color: activeTab === tab.key ? "white" : "#333",
              border: "none",
              cursor: "pointer",
              fontWeight: activeTab === tab.key ? 700 : 400,
              fontSize: "0.95em",
              borderRadius:
                tab.key === "pnl"
                  ? "6px 0 0 6px"
                  : tab.key === "costs"
                  ? "0 6px 6px 0"
                  : 0,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "pnl" && (
        <>
          {/* Controls */}
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={labelStyle}>From:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={dateInputStyle}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label style={labelStyle}>To:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={dateInputStyle}
              />
            </div>
            <div style={{ display: "flex", gap: 0 }}>
              {(["daily", "weekly", "monthly"] as Resolution[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setResolution(r)}
                  style={{
                    padding: "6px 14px",
                    background: resolution === r ? "#1a1a2e" : "#e8e8e8",
                    color: resolution === r ? "white" : "#333",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.85em",
                    borderRadius:
                      r === "daily"
                        ? "4px 0 0 4px"
                        : r === "monthly"
                        ? "0 4px 4px 0"
                        : 0,
                  }}
                >
                  {r === "daily" ? "Daily" : r === "weekly" ? "Weekly" : "Monthly"}
                </button>
              ))}
            </div>
          </div>

          <ShopifySync />

          {/* Export Button */}
          <div
            style={{
              background: "white",
              padding: "32px 20px",
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              textAlign: "center",
            }}
          >
            <p style={{ color: "#555", marginBottom: 16 }}>
              Select date range and resolution, then export your P&L report to Excel.
            </p>
            <button
              onClick={handleExport}
              disabled={downloading}
              style={{
                padding: "12px 32px",
                background: downloading ? "#999" : "#1a1a2e",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: downloading ? "not-allowed" : "pointer",
                fontSize: "1em",
                fontWeight: 600,
              }}
            >
              {downloading ? "Downloading..." : "Download P&L Excel"}
            </button>
          </div>
        </>
      )}

      {activeTab === "expenses" && <ExpenseForm />}
      {activeTab === "costs" && <ProductCostForm />}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: "0.9em",
  fontWeight: 600,
  color: "#444",
};

const dateInputStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #ddd",
  borderRadius: 4,
  fontSize: "0.9em",
};
