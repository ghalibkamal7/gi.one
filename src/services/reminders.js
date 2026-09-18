import { db } from "../firebase";
import {
  collection, addDoc, deleteDoc, doc, query, where,
  onSnapshot, updateDoc, serverTimestamp,
} from "firebase/firestore";

export async function addReminder(userId, { text, dueAt }) {
  await addDoc(collection(db, "reminders"), {
    userId, text, dueAt, fired: false, createdAt: serverTimestamp(),
  });
}

export function subscribeToReminders(userId, callback) {
  const q = query(collection(db, "reminders"), where("userId", "==", userId));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    list.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
    callback(list);
  });
}

export async function deleteReminder(id) {
  await deleteDoc(doc(db, "reminders", id));
}

export async function markFired(id) {
  await updateDoc(doc(db, "reminders", id), { fired: true });
}