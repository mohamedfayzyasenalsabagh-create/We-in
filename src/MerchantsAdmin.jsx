import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";
import { useCollection } from "./useCollection";

const isValidPhone = (phone) => /^09\d{8}$/.test(phone.trim()) && !/^(\d)\1{9}$/.test(phone.trim());
function genPassword() {
  return String(Math.floor(10000000 + Math.random() * 90000000)); // 8 digits
}

export default function MerchantsAdmin() {
  const { createManagedAccount } = useAuth();
  // "users" collection holds everyone; we just filter by role here.
  const { data: allUsers, loading } = useCollection("users");
  const merchants = allUsers.filter((u) => u.role === "merchant");

  const [form, setForm] = useState({ name: "", phone: "", email: "", type: "commission", commissionRate: 10, currency: "SYP" });
  const [createdInfo, setCreatedInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setCreatedInfo(null);
    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setCreatedInfo({ error: "عبّي الاسم ورقم الهاتف والإيميل." });
      return;
    }
    if (!isValidPhone(form.phone)) {
      setCreatedInfo({ error: "رقم الهاتف غير صحيح. لازم يبدأ بـ 09 ويتكوّن من 10 أرقام." });
      return;
    }
    setBusy(true);
    const password = genPassword();
    try {
      await createManagedAccount({
        email: form.email.trim(),
        password,
        name: form.name.trim(),
        phone: form.phone.trim(),
        role: "merchant",
        extra: {
          type: form.type,
          commissionRate: Number(form.commissionRate),
          currency: form.currency,
          status: "approved",
        },
      });
      setCreatedInfo({ email: form.email.trim(), password });
      setForm({ name: "", phone: "", email: "", type: "commission", commissionRate: 10, currency: "SYP" });
    } catch (err) {
      setCreatedInfo({ error: firebaseErrorToArabic(err) });
    } finally {
      setBusy(false);
    }
  };

  const toggleStatus = async (merchant) => {
    await updateDoc(doc(db, "users", merchant.id), {
      status: merchant.status === "approved" ? "suspended" : "approved",
    });
  };

  return (
    <div style={{ padding: 20, fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <h2>إضافة تاجر جديد</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 12, marginBottom: 14 }}>
        <input style={inputStyle} placeholder="اسم التاجر" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input style={inputStyle} placeholder="رقم الهاتف (09xxxxxxxx)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input style={inputStyle} placeholder="الإيميل (لتسجيل الدخول)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <select style={inputStyle} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="commission">عمولة على البيع</option>
          <option value="subscription">اشتراك شهري</option>
        </select>
        {form.type === "commission" && (
          <input
            type="number"
            style={inputStyle}
            placeholder="نسبة العمولة %"
            value={form.commissionRate}
            onChange={(e) => setForm({ ...form, commissionRate: e.target.value })}
          />
        )}
        <select style={inputStyle} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
          <option value="SYP">ليرة سورية</option>
          <option value="USD">دولار أمريكي</option>
        </select>
      </div>
      <button onClick={create} disabled={busy} style={{ background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "10px 22px" }}>
        {busy ? "جارِ الإنشاء…" : "إنشاء حساب التاجر"}
      </button>

      {createdInfo && !createdInfo.error && (
        <div style={{ background: "#EBF5EF", border: "1px solid #22B573", borderRadius: 10, padding: 14, marginTop: 14 }}>
          تم إنشاء الحساب فعلياً على Firebase. الإيميل: <strong>{createdInfo.email}</strong> / كلمة المرور: <strong>{createdInfo.password}</strong>
          <br />
          سلّم هاي البيانات للتاجر مباشرة — ما رح تظهر مرة ثانية.
        </div>
      )}
      {createdInfo?.error && <div style={{ color: "red", marginTop: 10 }}>{createdInfo.error}</div>}

      <h2 style={{ marginTop: 32 }}>التجار الحاليون</h2>
      {loading ? (
        <div>جارِ التحميل…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {merchants.map((m) => (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{m.name}</div>
                <div style={{ color: "#888", fontSize: 13 }}>
                  {m.phone} — {m.type === "subscription" ? "اشتراك" : `عمولة ${m.commissionRate}%`} — {m.currency}
                </div>
              </div>
              <button onClick={() => toggleStatus(m)} style={{ border: "1.5px solid #000", background: "transparent", borderRadius: 999, padding: "8px 16px" }}>
                {m.status === "approved" ? "إيقاف" : "تفعيل"}
              </button>
            </div>
          ))}
          {merchants.length === 0 && <div style={{ color: "#888" }}>لا يوجد تجار بعد.</div>}
        </div>
      )}
    </div>
  );
}

function firebaseErrorToArabic(err) {
  const code = err?.code || "";
  if (code.includes("email-already-in-use")) return "هذا الإيميل مستخدم مسبقاً.";
  if (code.includes("invalid-email")) return "صيغة الإيميل غير صحيحة.";
  return "صار خطأ: " + (err?.message || "غير معروف");
}

const inputStyle = { padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd" };
