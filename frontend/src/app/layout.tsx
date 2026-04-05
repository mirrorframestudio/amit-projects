import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ads Dashboard",
  description: "Simple ads campaign dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", margin: 0, backgroundColor: "#f5f5f5" }}>
        <header
          style={{
            background: "#1a1a2e",
            color: "white",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "20px" }}>Ads Dashboard</h1>
          <nav style={{ display: "flex", gap: 16 }}>
            <a href="/" style={{ color: "white", textDecoration: "none", fontSize: "0.95em" }}>
              Campaigns
            </a>
            <a href="/pnl" style={{ color: "white", textDecoration: "none", fontSize: "0.95em" }}>
              P&L
            </a>
          </nav>
        </header>
        <main style={{ padding: "24px" }}>{children}</main>
      </body>
    </html>
  );
}
