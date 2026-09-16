import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";

// Generic real-time collection hook: subscribes to a Firestore collection
// and keeps `data` in sync live — no manual refresh, no polling needed.
// This replaces the old prototype's "poll shared storage every few seconds"
// hack entirely; Firestore pushes changes to every connected client instantly.
export function useCollection(name, orderByField = null) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = collection(db, name);
    const q = orderByField ? query(ref, orderBy(orderByField)) : ref;
    const unsub = onSnapshot(
      q,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error(`Firestore listen error on ${name}:`, err);
        setLoading(false);
      }
    );
    return unsub;
  }, [name, orderByField]);

  return { data, loading };
}
