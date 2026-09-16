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
