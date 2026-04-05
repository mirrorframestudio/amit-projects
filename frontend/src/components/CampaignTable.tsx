"use client";

import { useEffect, useState } from "react";

type Campaign = {
  id: string;
  name: string;
  status: string;
  objective: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function CampaignTable() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/meta/campaigns`)
      .then((res) => res.json())
      .then((data) => {
        // The backend responded, but reported an error (e.g. bad token, missing .env vars)
        if (data.ok === false) {
          let msg = data.message || "Meta returned an error.";
          if (data.meta_error?.message) {
            msg += ` — ${data.meta_error.message}`;
          }
          setError(msg);
          setLoading(false);
          return;
        }
        setCampaigns(data.campaigns);
        setLoading(false);
      })
      .catch(() => {
        // Only reaches here if the backend is truly unreachable
        setError("Could not reach the backend. Is it running?");
        setLoading(false);
      });
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
      <thead>
        <tr style={{ background: "#e8e8e8", textAlign: "left" }}>
          <th style={th}>Name</th>
          <th style={th}>Status</th>
          <th style={th}>Objective</th>
          <th style={th}>ID</th>
        </tr>
      </thead>
      <tbody>
        {campaigns.map((c) => (
          <tr key={c.id} style={{ borderBottom: "1px solid #eee" }}>
            <td style={td}>{c.name}</td>
            <td style={td}>
              <span style={{ color: c.status === "ACTIVE" ? "green" : "orange" }}>
                {c.status}
              </span>
            </td>
            <td style={td}>{c.objective}</td>
            <td style={{ ...td, color: "#999", fontSize: "0.85em" }}>{c.id}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const th: React.CSSProperties = { padding: "12px 16px", fontWeight: 600 };
const td: React.CSSProperties = { padding: "12px 16px" };
