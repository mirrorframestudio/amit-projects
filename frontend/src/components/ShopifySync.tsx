"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type SyncStatus = {
  is_configured: boolean;
  store_url: string | null;
  last_sync: {
    status: string;
    started_at: string | null;
    finished_at: string | null;
    orders_synced: number;
    error_message: string | null;
  } | null;
  total_orders_in_db: number;
};

export default function ShopifySync() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchStatus = () => {
    fetch(`${API_URL}/shopify/status`)
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {});
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const triggerSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_URL}/shopify/sync`, { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setMessage(`Sync complete! ${data.orders_synced} orders synced.`);
      } else {
        setMessage(`Error: ${data.detail || "Unknown error"}`);
      }
      fetchStatus();
    } catch (e: any) {
      setMessage(`Connection error: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div>
          <strong>Shopify Sync</strong>
          {status && (
            <span
              style={{
                marginLeft: 8,
                color: status.is_configured ? "#2e7d32" : "#f57c00",
                fontSize: "0.9em",
              }}
            >
              {status.is_configured ? "Connected" : "Not configured"}
            </span>
          )}
          {status && (
            <span style={{ fontSize: "0.85em", color: "#666", marginLeft: 8 }}>
              ({status.total_orders_in_db} orders in DB)
            </span>
          )}
        </div>
        <button
          onClick={triggerSync}
          disabled={syncing || !status?.is_configured}
          style={buttonStyle}
        >
          {syncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>
      {status?.last_sync && (
        <div style={{ fontSize: "0.8em", color: "#666", marginTop: 4 }}>
          Last sync: {status.last_sync.finished_at || status.last_sync.started_at || "—"}{" "}
          ({status.last_sync.status})
        </div>
      )}
      {message && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 12px",
            borderRadius: 4,
            background: message.startsWith("Error") ? "#ffebee" : "#e8f5e9",
            color: message.startsWith("Error") ? "#c62828" : "#2e7d32",
            fontSize: "0.9em",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  background: "white",
  padding: "12px 20px",
  borderRadius: 8,
  marginBottom: 16,
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
};

const buttonStyle: React.CSSProperties = {
  padding: "6px 16px",
  background: "#1a1a2e",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: "0.9em",
};
