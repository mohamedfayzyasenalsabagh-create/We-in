import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useCollection } from "./useCollection";

export default function OrdersAdmin() {
  const { data: orders, loading } = useCollection("orders");
  const { data: allUsers } = useCollection("users");
  const reps = allUsers.filter((u) => u.role === "delivery" && u.status === "active");

  const confirmPayment = (id) => updateDoc(doc(db, "orders", id), { status: "processing" });
  const assignRep = (id, repId) => updateDoc(doc(db, "orders", id), { deliveryRepId: repId });
  const sendForDelivery = (id) => updateDoc(doc(db, "orders", id), { status: "out_for_delivery" });
  const cancel = (id) => updateDoc(doc(db, "orders", id), { status: "cancelled" });

  return (
    <div style={{ padding: 20, fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <h2>الطلبات</h2>
      {loading ? (
        <div>جارِ التحميل…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...orders].reverse().map((o) => (
            <div key={o.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>
                  طلب #{o.id.slice(-5)} — {o.customerName}
                </strong>
                <StatusTag status={o.status} />
              </div>
              {o.items.map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span>
                    {it.name} × {it.qty}
                  </span>
                  <span>{it.price * it.qty}</span>
                </div>
              ))}
              <div style={{ fontWeight: 700, marginTop: 6 }}>الإجمالي: {o.total}</div>
              {o.paymentNote && <div style={{ fontSize: 13, color: "#888" }}>ملاحظة: {o.paymentNote}</div>}
              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                {o.status === "awaiting_payment_review" && (
                  <>
                    <button onClick={() => confirmPayment(o.id)} style={btnPrimary}>
                      تأكيد الدفع
                    </button>
                    <button onClick={() => cancel(o.id)} style={btnDanger}>
                      إلغاء
                    </button>
                  </>
                )}
                {o.status === "processing" && (
                  <>
                    <select value={o.deliveryRepId || ""} onChange={(e) => assignRep(o.id, e.target.value)} style={inputStyle}>
                      <option value="">اختر مندوب</option>
                      {reps.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <button onClick={() => sendForDelivery(o.id)} disabled={!o.deliveryRepId} style={btnPrimary}>
                      إرسال للتوصيل
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {orders.length === 0 && <div style={{ color: "#888" }}>لا يوجد طلبات بعد.</div>}
        </div>
      )}
    </div>
  );
}
function StatusTag({ status }) {
  const map = {
    awaiting_payment_review: ["بانتظار الدفع", "#B58A2A"],
    processing: ["قيد التجهيز", "#2A6FB5"],
    out_for_delivery: ["قيد التوصيل", "#7A4CB5"],
    delivered: ["تم التسليم", "#1F7A4C"],
    cancelled: ["ملغى", "#B23A3A"],
  };
  const [label, color] = map[status] || [status, "#888"];
  return <span style={{ color, border: `1px solid ${color}`, borderRadius: 999, padding: "2px 10px", fontSize: 12 }}>{label}</span>;
}
const inputStyle = { padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" };
const btnPrimary = { background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "8px 16px" };
const btnDanger = { background: "#fff", color: "red", border: "1px solid red", borderRadius: 999, padding: "8px 16px" };
