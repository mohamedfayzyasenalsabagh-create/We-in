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
