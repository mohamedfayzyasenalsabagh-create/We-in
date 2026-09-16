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
