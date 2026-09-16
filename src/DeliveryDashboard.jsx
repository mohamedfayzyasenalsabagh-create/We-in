import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useQuery } from "./useQuery";

export default function DeliveryDashboard() {
  const { user, profile, logout } = useAuth();
  const { data: orders, loading } = useQuery("orders", "deliveryRepId", "==", user?.uid);
  const myOrders = orders.filter((o) => o.status === "out_for_delivery" || o.status === "delivered");

  const markDelivered = (id) => updateDoc(doc(db, "orders", id), { status: "delivered" });

  return (
    <div style={{ fontFamily: "Cairo, sans-serif", direction: "rtl", minHeight: "100vh", background: "#F2F1EC" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#000", color: "#fff" }}>
        <div style={{ fontWeight: 800 }}>{profile?.name} — واجهة المندوب</div>
        <button onClick={logout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,.3)", color: "#fff", borderRadius: 999, padding: "6px 16px" }}>
          تسجيل الخروج
        </button>
      </div>
      <div style={{ padding: 20 }}>
        <h2>طلباتي</h2>
        {loading ? (
          <div>جارِ التحميل…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {myOrders.map((o) => (
              <div key={o.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
                <div style={{ fontWeight: 700 }}>طلب #{o.id.slice(-5)}</div>
                <div style={{ color: "#888", fontSize: 13 }}>
                  {o.customerName} — {o.customerPhone}
                </div>
                <div style={{ color: "#888", fontSize: 13 }}>العنوان: {o.address}</div>
                <div style={{ fontWeight: 700, marginTop: 6 }}>الإجمالي: {o.total}</div>
                {o.status === "out_for_delivery" && (
                  <button onClick={() => markDelivered(o.id)} style={{ marginTop: 10, background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "8px 18px" }}>
                    تم التسليم
                  </button>
                )}
                {o.status === "delivered" && <span style={{ color: "#1F7A4C" }}>تم التسليم ✓</span>}
              </div>
            ))}
            {myOrders.length === 0 && <div style={{ color: "#888" }}>لا يوجد طلبات مسندة إليك.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
