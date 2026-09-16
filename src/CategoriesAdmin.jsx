import { useState } from "react";
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useCollection } from "./useCollection";

export default function CategoriesAdmin() {
  const { data: categories, loading } = useCollection("categories", "name");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const add = async () => {
    setError("");
    if (!name.trim()) return;
    try {
      await addDoc(collection(db, "categories"), { name: name.trim(), createdAt: serverTimestamp() });
      setName("");
    } catch (err) {
      setError("تعذّر الحفظ: " + err.message);
    }
  };

  const remove = async (id) => {
    try {
      await deleteDoc(doc(db, "categories", id));
    } catch (err) {
      setError("تعذّر الحذف: " + err.message);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: "Cairo, sans-serif", direction: "rtl" }}>
      <h2>الفئات</h2>
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", flex: 1 }}
          placeholder="اسم فئة جديدة"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <button onClick={add} style={{ background: "#000", color: "#fff", border: "none", borderRadius: 999, padding: "10px 20px" }}>
          إضافة فئة
        </button>
      </div>
      {error && <div style={{ color: "red", marginBottom: 12 }}>{error}</div>}
      {loading ? (
        <div>جارِ التحميل…</div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {categories.map((c) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, background: "#F0EEE8", borderRadius: 999, padding: "6px 14px" }}>
              {c.name}
              <button onClick={() => remove(c.id)} style={{ border: "none", background: "transparent", color: "red", cursor: "pointer", fontSize: 16 }}>
                ×
              </button>
            </div>
          ))}
          {categories.length === 0 && <div style={{ color: "#888" }}>لا يوجد فئات بعد.</div>}
        </div>
      )}
    </div>
  );
}
