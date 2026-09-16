import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useCollection } from "./useCollection";
import { useQuery } from "./useQuery";

export default function CustomerApp() {
  const { profile, logout } = useAuth();
  const [view, setView] = useState("shop");
  const [cart, setCart] = useState([]); // {productId, name, price, currency, merchantId, qty}

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) return prev.map((c) => (c.productId === product.id ? { ...c, qty: c.qty + 1 } : c));
      return [...prev, { productId: product.id, name: product.name, price: product.price, currency: product.currency || "SYP", merchantId: product.merchantId, qty: 1 }];
    });
  };
  const updateQty = (productId, qty) => {
    setCart((prev) => (qty <= 0 ? prev.filter((c) => c.productId !== productId) : prev.map((c) => (c.productId === productId ? { ...c, qty } : c))));
  };
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  return (
    <div style={{ fontFamily: "Cairo, sans-serif", direction: "rtl", minHeight: "100vh" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: "#fff", borderBottom: "1px solid #eee" }}>
        <div style={{ fontWeight: 800 }}>أهلاً {profile?.name}</div>
        <button onClick={logout} style={{ border: "1px solid #000", background: "transparent", borderRadius: 999, padding: "6px 14px" }}>
          خروج
        </button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 20px", background: "#fff" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setView("shop")} style={navBtn(view === "shop")}>
            المتجر
          </button>
          <button onClick={() => setView("orders")} style={navBtn(view === "orders")}>
            طلباتي
          </button>
        </div>
        <button onClick={() => setView("cart")} style={{ background: "#9B3FE8", color: "#fff", border: "none", borderRadius: 999, padding: "8px 18px", fontWeight: 700 }}>
          🛒 السلة ({cartCount})
        </button>
      </div>
      {view === "shop" && <Storefront onAdd={addToCart} />}
      {view === "cart" && (
        <CartView
          cart={cart}
          onUpdateQty={updateQty}
          onPlaced={() => {
            setCart([]);
            setView("orders");
          }}
          onBack={() => setView("shop")}
        />
      )}
      {view === "orders" && <MyOrders />}
    </div>
  );
}

function Storefront({ onAdd }) {
  const { data: products, loading } = useCollection("products");
  const { data: categories } = useCollection("categories", "name");
  const [categoryId, setCategoryId] = useState("all");

  const filtered = categoryId === "all" ? products : products.filter((p) => p.categoryId === categoryId);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16 }}>
        <button onClick={() => setCategoryId("all")} style={navBtn(categoryId === "all")}>
          الكل
        </button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setCategoryId(c.id)} style={navBtn(categoryId === c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      {loading ? (
        <div>جارِ التحميل…</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 14 }}>
          {filtered.map((p) => (
            <div key={p.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ height: 110, background: "#f4f4f4", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.image ? <img src={p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: "#999", fontSize: 12 }}>لا صورة</span>}
              </div>
              <div style={{ padding: 10 }}>
                <div style={{ fontWeight: 700 }}>{p.name}</div>
                <div style={{ color: "#888", fontSize: 12 }}>{p.merchantName}</div>
                <div style={{ color: "#9B3FE8", fontWeight: 700 }}>
                  {p.price} {p.currency}
                </div>
                <button onClick={() => onAdd(p)} style={{ marginTop: 6, width: "100%", background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "8px" }}>
                  أضف للسلة
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div style={{ color: "#888" }}>لا يوجد منتجات.</div>}
        </div>
      )}
    </div>
  );
}

function CartView({ cart, onUpdateQty, onPlaced, onBack }) {
  const { user, profile } = useAuth();
  const [address, setAddress] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);

  const place = async () => {
    setError("");
    if (cart.length === 0) {
      setError("السلة فارغة.");
      return;
    }
    if (!address.trim()) {
      setError("عبّي عنوان التوصيل.");
      return;
    }
    setBusy(true);
    try {
      const merchantIds = [...new Set(cart.map((c) => c.merchantId))];
      await addDoc(collection(db, "orders"), {
        customerId: user.uid,
        customerName: profile?.name || "",
        customerPhone: profile?.phone || "",
        items: cart,
        merchantIds,
        total,
        address: address.trim(),
        paymentNote: paymentNote.trim(),
        status: "awaiting_payment_review",
        deliveryRepId: null,
        createdAt: serverTimestamp(),
      });
      onPlaced();
    } catch (err) {
      setError("تعذّر إرسال الطلب: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>السلة</h2>
      {cart.map((c) => (
        <div key={c.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #eee", borderRadius: 10, padding: 12, marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 700 }}>{c.name}</div>
            <div style={{ color: "#888", fontSize: 13 }}>
              {c.price} {c.currency}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => onUpdateQty(c.productId, c.qty - 1)}>−</button>
            <span>{c.qty}</span>
            <button onClick={() => onUpdateQty(c.productId, c.qty + 1)}>+</button>
          </div>
        </div>
      ))}
      {cart.length === 0 && <div style={{ color: "#888" }}>السلة فارغة.</div>}
      {cart.length > 0 && (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 10, marginBottom: 16 }}>
            <span>الإجمالي</span>
            <span>{total}</span>
          </div>
          <input style={inputStyle} placeholder="عنوان التوصيل" value={address} onChange={(e) => setAddress(e.target.value)} />
          <input style={{ ...inputStyle, marginTop: 8 }} placeholder="ملاحظة دفع (اختياري)" value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} />
          {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button onClick={onBack} style={{ border: "1px solid #000", background: "transparent", borderRadius: 999, padding: "10px 20px" }}>
              رجوع
            </button>
            <button onClick={place} disabled={busy} style={{ background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "10px 20px" }}>
              {busy ? "جارِ الإرسال…" : "تأكيد الطلب"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function MyOrders() {
  const { user } = useAuth();
  const { data: orders, loading } = useQuery("orders", "customerId", "==", user?.uid);

  return (
    <div style={{ padding: 20 }}>
      <h2>طلباتي</h2>
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
              {o.items.map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span>
                    {it.name} × {it.qty}
                  </span>
                  <span>{it.price * it.qty}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, borderTop: "1px solid #eee", paddingTop: 6, marginTop: 6 }}>
                <span>الإجمالي</span>
                <span>{o.total}</span>
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

function navBtn(active) {
  return { padding: "8px 16px", borderRadius: 999, border: "1px solid #eee", background: active ? "#000" : "#fff", color: active ? "#fff" : "#000", flexShrink: 0 };
}
const inputStyle = { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", width: "100%" };
