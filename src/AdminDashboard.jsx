import { useState } from "react";
import CategoriesAdmin from "./CategoriesAdmin";
import MerchantsAdmin from "./MerchantsAdmin";

export default function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState("categories");

  return (
    <div style={{ fontFamily: "Cairo, sans-serif", direction: "rtl", minHeight: "100vh", background: "#F2F1EC" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#000", color: "#fff" }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>
          We<span style={{ color: "#9B3FE8" }}>-in</span> — لوحة الإدارة
        </div>
        <button onClick={onLogout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,.3)", color: "#fff", borderRadius: 999, padding: "6px 16px" }}>
          تسجيل الخروج
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "14px 20px", background: "#fff", overflowX: "auto" }}>
        {[
          ["categories", "الفئات"],
          ["merchants", "التجار"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              border: "1px solid #eee",
              background: tab === id ? "#000" : "#F2F1EC",
              color: tab === id ? "#fff" : "#000",
              flexShrink: 0,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "categories" && <CategoriesAdmin />}
      {tab === "merchants" && <MerchantsAdmin />}
    </div>
  );
}
