import { useState } from "react";
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useQuery } from "./useQuery";
import { useCollection } from "./useCollection";

export default function MerchantDashboard() {
  const { profile, logout } = useAuth();
  const [tab, setTab] = useState("products");

  if (profile?.status === "suspended") {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Cairo, sans-serif", direction: "rtl", textAlign: "center", padding: 20 }}>
        <div>
          <h2>حسابك موقوف حالياً</h2>
          <p>تواصل مع الإدارة لمزيد من التفاصيل.</p>
          <button onClick={logout} style={{ background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "10px 20px" }}>
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "Cairo, sans-serif", direction: "rtl", minHeight: "100vh", background: "#F2F1EC" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#000", color: "#fff" }}>
        <div style={{ fontWeight: 800 }}>{profile?.name} — واجهة التاجر</div>
        <button onClick={logout} style={{ background: "transparent", border: "1px solid rgba(255,255,255,.3)", color: "#fff", borderRadius: 999, padding: "6px 16px" }}>
          تسجيل الخروج
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, padding: "14px 20px", background: "#fff", overflowX: "auto" }}>
        {[
          ["products", "منتجاتي"],
          ["orders", "طلباتي"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{ padding: "9px 18px", borderRadius: 999, border: "1px solid #eee", background: tab === id ? "#000" : "#F2F1EC", color: tab === id ? "#fff" : "#000", flexShrink: 0 }}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "products" && <MerchantProducts />}
      {tab === "orders" && <MerchantOrders />}
    </div>
  );
}

function MerchantProducts() {
  const { user, profile } = useAuth();
  const { data: products, loading } = useQuery("products", "merchantId", "==", user?.uid);
  const { data: categories } = useCollection("categories", "name");
  const [form, setForm] = useState({ name: "", price: "", stock: "", categoryId: "", image: "", description: "" });
  const [error, setError] = useState("");

  const add = async () => {
    setError("");
    if (!form.name.trim() || !form.price) return;
    try {
      await addDoc(collection(db, "products"), {
        name: form.name.trim(),
        price: Number(form.price),
        currency: profile?.currency || "SYP",
        stock: Number(form.stock) || 0,
        categoryId: form.categoryId,
        image: form.image.trim(),
        description: form.description.trim(),
        merchantId: user.uid,
        merchantName: profile?.name || "",
        createdAt: serverTimestamp(),
      });
      setForm({ name: "", price: "", stock: "", categoryId: "", image: "", description: "" });
    } catch (err) {
      setError("تعذّر الحفظ: " + err.message);
    }
  };

  const remove = async (id) => {
    await deleteDoc(doc(db, "products", id));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>إضافة منتج</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12, marginBottom: 14 }}>
        <input style={inputStyle} placeholder="اسم المنتج" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input type="number" style={inputStyle} placeholder="السعر" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        <input type="number" style={inputStyle} placeholder="الكمية" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
        <select style={inputStyle} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          <option value="">اختر فئة</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input style={inputStyle} placeholder="رابط صورة (اختياري)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
      </div>
      <textarea
        style={{ ...inputStyle, width: "100%", minHeight: 60, marginBottom: 12 }}
        placeholder="الوصف"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <br />
      <button onClick={add} style={btnStyle}>
        نشر المنتج
      </button>
      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}

      <h2 style={{ marginTop: 32 }}>منتجاتي ({products.length})</h2>
      {loading ? (
        <div>جارِ التحميل…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 14 }}>
          {products.map((p) => (
            <div key={p.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ height: 110, background: "#f4f4f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.image ? <img src={p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#999", fontSize: 12 }}>لا صورة</span>}
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: "#9B3FE8", fontWeight: 700 }}>
                  {p.price} {p.currency}
                </div>
                <button onClick={() => remove(p.id)} style={{ border: "none", background: "transparent", color: "red", fontSize: 13, padding: 0, marginTop: 6 }}>
                  حذف
                </button>
              </div>
            </div>
          ))}
          {products.length === 0 && <div style={{ color: "#888" }}>لا يوجد منتجات بعد.</div>}
        </div>
      )}
    </div>
  );
}

function MerchantOrders() {
  const { user } = useAuth();
  const { data: orders, loading } = useQuery("orders", "merchantIds", "array-contains", user?.uid);

  return (
    <div style={{ padding: 20 }}>
      <h2>طلبات فيها منتجاتي</h2>
      {loading ? (
        <div>جارِ التحميل…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[...orders].reverse().map((o) => (
            <div key={o.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>طلب #{o.id.slice(-5)}</strong>
                <StatusTag status={o.status} />
              </div>
              {o.items
                .filter((it) => it.merchantId === user.uid)
                .map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span>
                      {it.name} × {it.qty}
                    </span>
                    <span>
                      {it.price * it.qty} {it.currency}
                    </span>
                  </div>
                ))}
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

const inputStyle = { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd" };
const btnStyle = { background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "10px 22px" };
