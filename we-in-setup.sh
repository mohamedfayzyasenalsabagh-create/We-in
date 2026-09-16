#!/bin/bash
set -e
echo "Creating We-in files..."
mkdir -p src

cat > src/useQuery.js << 'WEINEOF'
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";

// Like useCollection, but scoped with a Firestore `where` clause and live too.
export function useQuery(name, field, op, value) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (value === undefined || value === null) {
      setData([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, name), where(field, op, value));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(`Firestore query error on ${name}:`, err);
        setLoading(false);
      }
    );
    return unsub;
  }, [name, field, op, value]);

  return { data, loading };
}
WEINEOF

cat > src/MerchantProducts.jsx << 'WEINEOF'
import { useState } from "react";
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useQuery } from "./useQuery";
import { useCollection } from "./useCollection";

export default function MerchantProducts() {
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
    <div style={{ padding: 20, fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
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

const inputStyle = { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd" };
const btnStyle = { background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "10px 22px" };
WEINEOF

cat > src/MerchantOrders.jsx << 'WEINEOF'
import { useAuth } from "./AuthContext";
import { useQuery } from "./useQuery";

export default function MerchantOrders() {
  const { user } = useAuth();
  const { data: orders, loading } = useQuery("orders", "merchantIds", "array-contains", user?.uid);

  return (
    <div style={{ padding: 20, fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
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
WEINEOF

cat > src/MerchantDashboard.jsx << 'WEINEOF'
import { useState } from "react";
import { useAuth } from "./AuthContext";
import MerchantProducts from "./MerchantProducts";
import MerchantOrders from "./MerchantOrders";

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
WEINEOF

cat > src/Storefront.jsx << 'WEINEOF'
import { useState } from "react";
import { useCollection } from "./useCollection";

export default function Storefront({ onAdd }) {
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
function navBtn(active) {
  return { padding: "8px 16px", borderRadius: 999, border: "1px solid #eee", background: active ? "#000" : "#fff", color: active ? "#fff" : "#000", flexShrink: 0 };
}
WEINEOF

cat > src/CartView.jsx << 'WEINEOF'
import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

export default function CartView({ cart, onUpdateQty, onPlaced, onBack }) {
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
const inputStyle = { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", width: "100%" };
WEINEOF

cat > src/MyOrders.jsx << 'WEINEOF'
import { useAuth } from "./AuthContext";
import { useQuery } from "./useQuery";

export default function MyOrders() {
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
WEINEOF

cat > src/CustomerApp.jsx << 'WEINEOF'
import { useState } from "react";
import { useAuth } from "./AuthContext";
import Storefront from "./Storefront";
import CartView from "./CartView";
import MyOrders from "./MyOrders";

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

function navBtn(active) {
  return { padding: "8px 16px", borderRadius: 999, border: "1px solid #eee", background: active ? "#000" : "#fff", color: active ? "#fff" : "#000" };
}
WEINEOF

cat > src/DeliveryAdmin.jsx << 'WEINEOF'
import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useCollection } from "./useCollection";

const isValidPhone = (phone) => /^09\d{8}$/.test(phone.trim()) && !/^(\d)\1{9}$/.test(phone.trim());
function genPassword() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

export default function DeliveryAdmin() {
  const { createManagedAccount } = useAuth();
  const { data: allUsers, loading } = useCollection("users");
  const reps = allUsers.filter((u) => u.role === "delivery");
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [createdInfo, setCreatedInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setCreatedInfo(null);
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setCreatedInfo({ error: "عبّي كل الحقول." });
      return;
    }
    if (!isValidPhone(form.phone)) {
      setCreatedInfo({ error: "رقم الهاتف غير صحيح. لازم يبدأ بـ 09 ويتكوّن من 10 أرقام." });
      return;
    }
    setBusy(true);
    const password = genPassword();
    try {
      await createManagedAccount({ email: form.email.trim(), password, name: form.name.trim(), phone: form.phone.trim(), role: "delivery", extra: { status: "active" } });
      setCreatedInfo({ email: form.email.trim(), password });
      setForm({ name: "", phone: "", email: "" });
    } catch (err) {
      setCreatedInfo({ error: "صار خطأ: " + err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <h2>إضافة مندوب توصيل</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 12, marginBottom: 14 }}>
        <input style={inputStyle} placeholder="الاسم" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input style={inputStyle} placeholder="رقم الهاتف (09xxxxxxxx)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input style={inputStyle} placeholder="الإيميل" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <button onClick={create} disabled={busy} style={{ background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "10px 22px" }}>
        {busy ? "جارِ الإنشاء…" : "إنشاء حساب المندوب"}
      </button>
      {createdInfo && !createdInfo.error && (
        <div style={{ background: "#EBF5EF", border: "1px solid #22B573", borderRadius: 10, padding: 14, marginTop: 14 }}>
          الإيميل: <strong>{createdInfo.email}</strong> / كلمة المرور: <strong>{createdInfo.password}</strong>
        </div>
      )}
      {createdInfo?.error && <div style={{ color: "red", marginTop: 10 }}>{createdInfo.error}</div>}

      <h2 style={{ marginTop: 32 }}>المندوبون الحاليون</h2>
      {loading ? (
        <div>جارِ التحميل…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {reps.map((r) => (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 700 }}>{r.name}</div>
              <div style={{ color: "#888", fontSize: 13 }}>{r.phone}</div>
            </div>
          ))}
          {reps.length === 0 && <div style={{ color: "#888" }}>لا يوجد مندوبون بعد.</div>}
        </div>
      )}
    </div>
  );
}
const inputStyle = { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd" };
WEINEOF

cat > src/OrdersAdmin.jsx << 'WEINEOF'
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
WEINEOF

cat > src/DeliveryDashboard.jsx << 'WEINEOF'
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
WEINEOF

cat > src/AdminDashboard.jsx << 'WEINEOF'
import { useState } from "react";
import CategoriesAdmin from "./CategoriesAdmin";
import MerchantsAdmin from "./MerchantsAdmin";
import DeliveryAdmin from "./DeliveryAdmin";
import OrdersAdmin from "./OrdersAdmin";

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
          ["delivery", "المندوبون"],
          ["orders", "الطلبات"],
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
      {tab === "delivery" && <DeliveryAdmin />}
      {tab === "orders" && <OrdersAdmin />}
    </div>
  );
}
WEINEOF

cat > src/App.jsx << 'WEINEOF'
import { useState } from "react";
import { useAuth } from "./AuthContext";
import LoginScreen from "./LoginScreen";
import AdminDashboard from "./AdminDashboard";
import MerchantDashboard from "./MerchantDashboard";
import CustomerApp from "./CustomerApp";
import DeliveryDashboard from "./DeliveryDashboard";

export default function App() {
  const { user, profile, loading, logout, resendVerification, setMyPhone } = useAuth();

  if (loading) {
    return <FullscreenMessage title="We-in" subtitle="جارِ التحميل…" />;
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!user.emailVerified) {
    return (
      <FullscreenMessage title="أكّد إيميلك" subtitle={`بعتنالك رابط تفعيل حقيقي على ${user.email}. افتحه وبعدين اضغط تحديث.`}>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={() => window.location.reload()} style={btn}>
            تحديث الصفحة
          </button>
          <button onClick={resendVerification} style={btnGhost}>
            إعادة إرسال الرابط
          </button>
          <button onClick={logout} style={btnGhost}>
            تسجيل الخروج
          </button>
        </div>
      </FullscreenMessage>
    );
  }

  // Whatever the sign-in method (email, Google, Facebook), a real contact
  // phone number is mandatory before using the app — delivery depends on it.
  if (profile && !profile.phone) {
    return <RequirePhoneGate onSubmit={setMyPhone} onLogout={logout} />;
  }

  // From here on the real user is authenticated + verified + has a phone on
  // file. Route by role — every dashboard is wired to real Firestore now.
  if (profile?.role === "admin") {
    return <AdminDashboard onLogout={logout} />;
  }
  if (profile?.role === "merchant") {
    return <MerchantDashboard />;
  }
  if (profile?.role === "delivery") {
    return <DeliveryDashboard />;
  }
  if (profile?.role === "customer") {
    return <CustomerApp />;
  }

  return (
    <FullscreenMessage title={`أهلاً ${profile?.name || ""}`} subtitle={`دورك: ${profile?.role || "غير محدد"}`}>
      <button onClick={logout} style={btnGhost}>
        تسجيل الخروج
      </button>
    </FullscreenMessage>
  );
}

function RequirePhoneGate({ onSubmit, onLogout }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const isValidPhone = (p) => /^09\d{8}$/.test(p.trim()) && !/^(\d)\1{9}$/.test(p.trim());

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isValidPhone(phone)) {
      setError("رقم الهاتف غير صحيح. لازم يبدأ بـ 09 ويتكوّن من 10 أرقام (مثال: 0912345678).");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(phone.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <FullscreenMessage title="خطوة أخيرة" subtitle="لازم رقم هاتف حقيقي على حسابك، حتى لو دخلت عبر Google أو Facebook — التوصيل بحاجته.">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 320 }}>
        <input
          style={{ padding: "12px 14px", borderRadius: 9, border: "1px solid #ccc", textAlign: "center" }}
          placeholder="09xxxxxxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        {error && <div style={{ color: "#FF4D4D", fontSize: 13 }}>{error}</div>}
        <button type="submit" style={btn} disabled={busy}>
          {busy ? "جارِ الحفظ…" : "متابعة"}
        </button>
        <button type="button" style={btnGhost} onClick={onLogout}>
          تسجيل الخروج
        </button>
      </form>
    </FullscreenMessage>
  );
}

function FullscreenMessage({ title, subtitle, children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Cairo, sans-serif",
        direction: "rtl",
        textAlign: "center",
        padding: 20,
        gap: 8,
      }}
    >
      <h1>{title}</h1>
      <p style={{ color: "#666", maxWidth: 380 }}>{subtitle}</p>
      {children}
    </div>
  );
}

const btn = { background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "10px 20px", fontWeight: 700 };
const btnGhost = { background: "transparent", border: "1.5px solid #000", borderRadius: 999, padding: "10px 20px" };
WEINEOF

echo "Files created. Committing and pushing..."
git add .
git commit -m "Add products, storefront, cart, orders, delivery"
git push
echo "Done! Check the Actions tab on GitHub for deployment progress."