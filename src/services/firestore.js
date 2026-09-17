import {
  collection, addDoc, updateDoc, deleteDoc, getDocs, writeBatch,
  doc, query, where, orderBy, onSnapshot, serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export function subscribeToChats(userId, callback) {
  const q = query(
    collection(db, "chats"),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export async function createChat(userId, title = "New Chat") {
  const ref = await addDoc(collection(db, "chats"), {
    userId, title,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function renameChat(chatId, title) {
  await updateDoc(doc(db, "chats", chatId), {
    title, updatedAt: serverTimestamp(),
  });
}

// Firestore never cascade-deletes subcollections automatically — a
// chat's messages (including any embedded images) would otherwise
// silently remain in Firestore forever after the chat itself was
// "deleted". Chunked at 450 (Firestore batches cap at 500 ops) so an
// unusually long chat history doesn't silently fail to fully delete.
export async function deleteChat(chatId) {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const snap = await getDocs(messagesRef);
  const docs = snap.docs;

  const CHUNK = 450;
  for (let i = 0; i < docs.length; i += CHUNK) {
    const batch = writeBatch(db);
    docs.slice(i, i + CHUNK).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await deleteDoc(doc(db, "chats", chatId));
}

export function subscribeToMessages(chatId, callback) {
  const q = query(
    collection(db, "chats", chatId, "messages"),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

// `images` accepts an array (new multi-image sends) while `image`
// (singular) is kept for backward compatibility with anything still
// calling this the old way. Both fields are written so existing
// message-rendering code that only checks `msg.image` still works
// for single-image messages.
export async function addMessage(chatId, role, text, images = null) {
  const imageArray = Array.isArray(images) ? images : images ? [images] : [];
  const ref = await addDoc(collection(db, "chats", chatId, "messages"), {
    role, text,
    image: imageArray[0] || null,
    images: imageArray.length ? imageArray : null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateMessage(chatId, messageId, text) {
  await updateDoc(doc(db, "chats", chatId, "messages", messageId), { text });
}

export async function updateChatTitle(chatId, title) {
  await updateDoc(doc(db, "chats", chatId), {
    title, updatedAt: serverTimestamp(),
  });
}