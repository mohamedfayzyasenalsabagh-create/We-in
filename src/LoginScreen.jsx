import { useState } from "react";
import { useAuth } from "./AuthContext";

export default function LoginScreen() {
  const { signup, login, loginWithGoogle, loginWithFacebook } = useAuth();
  const [mode, setMode] = useState("login"); // login | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  const isValidPassword = (pw) => pw.trim().length >= 8;

  const handleSocial = async (providerFn) => {
    setError("");
    setBusy(true);
    try {
      await providerFn();
    } catch (err) {
      setError(firebaseErrorToArabic(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError("عبّي كل الحقول.");
      return;
    }
    if (!isValidPassword(password)) {
      setError("كلمة المرور لازم تكون 8 أحرف/أرقام على الأقل.");
      return;
    }
    setBusy(true);
    try {
      await signup({ email: email.trim(), password, name: name.trim() });
      setSignedUp(true);
    } catch (err) {
      setError(firebaseErrorToArabic(err));
    } finally {
      setBusy(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login({ email: email.trim(), password });
    } catch (err) {
      setError(firebaseErrorToArabic(err));
    } finally {
      setBusy(false);
    }
  };

  if (signedUp) {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <h2>تم إنشاء حسابك 🎉</h2>
          <p>
            بعتنالك رسالة تفعيل حقيقية عبإيميلك (<strong>{email}</strong>). افتح بريدك واضغط رابط التفعيل، وبعدين
            ارجع سجل دخول من هون.
          </p>
          <button style={styles.btnPrimary} onClick={() => setSignedUp(false)}>
            رجوع لتسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <h1 style={{ textAlign: "center" }}>We-in</h1>
        <div style={styles.tabs}>
          <button style={mode === "login" ? styles.tabActive : styles.tab} onClick={() => setMode("login")}>
            تسجيل الدخول
          </button>
          <button style={mode === "signup" ? styles.tabActive : styles.tab} onClick={() => setMode("signup")}>
            حساب جديد (عملاء)
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18 }}>
          <button type="button" style={styles.btnSocial} onClick={() => handleSocial(loginWithGoogle)} disabled={busy}>
            المتابعة عبر Google
          </button>
          <button type="button" style={styles.btnSocial} onClick={() => handleSocial(loginWithFacebook)} disabled={busy}>
            المتابعة عبر Facebook
          </button>
        </div>
        <div style={styles.divider}>أو</div>

        <form onSubmit={mode === "login" ? handleLogin : handleSignup} style={styles.form}>
          {mode === "signup" && (
            <label style={styles.label}>
              الاسم الكامل
              <input style={styles.input} value={name} onChange={(e) => setName(e.target.value)} />
            </label>
          )}
          <label style={styles.label}>
            البريد الإلكتروني
            <input type="email" style={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label style={styles.label}>
            كلمة المرور {mode === "signup" && "(8 أحرف/أرقام على الأقل)"}
            <input type="password" style={styles.input} value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <div style={styles.error}>{error}</div>}
          <button type="submit" style={styles.btnPrimary} disabled={busy}>
            {busy ? "جارِ التنفيذ…" : mode === "login" ? "دخول" : "إنشاء الحساب"}
          </button>
        </form>
      </div>
    </div>
  );
}

function firebaseErrorToArabic(err) {
  const code = err?.code || "";
  if (code.includes("email-already-in-use")) return "هذا الإيميل مسجّل مسبقاً.";
  if (code.includes("invalid-email")) return "صيغة الإيميل غير صحيحة.";
  if (code.includes("weak-password")) return "كلمة المرور ضعيفة جداً.";
  if (code.includes("user-not-found") || code.includes("wrong-password") || code.includes("invalid-credential"))
    return "الإيميل أو كلمة المرور غير صحيحة.";
  if (code.includes("too-many-requests")) return "محاولات كتير، جرب بعد شوي.";
  return "صار خطأ، حاول مرة ثانية.";
}

const styles = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0A0A0B", fontFamily: "Cairo, sans-serif", direction: "rtl", padding: 20 },
  card: { background: "#fff", borderRadius: 18, padding: 30, width: "100%", maxWidth: 420 },
  tabs: { display: "flex", gap: 6, marginBottom: 20, background: "#F0EEE8", borderRadius: 11, padding: 4 },
  tab: { flex: 1, padding: 10, borderRadius: 8, border: "none", background: "transparent" },
  tabActive: { flex: 1, padding: 10, borderRadius: 8, border: "none", background: "#000", color: "#fff" },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13 },
  input: { padding: "11px 14px", borderRadius: 9, border: "1px solid #E7E7EA" },
  btnPrimary: { background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "12px", fontWeight: 700 },
  btnSocial: { background: "#fff", color: "#000", border: "1.5px solid #000", borderRadius: 999, padding: "12px", fontWeight: 700 },
  divider: { textAlign: "center", color: "#999", fontSize: 12, marginBottom: 14 },
  error: { color: "#FF4D4D", fontSize: 13 },
};
