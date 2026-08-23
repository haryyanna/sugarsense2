import {
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { firebaseAuth, firestore, isFirebaseConfigured } from './firebaseClient';

const USERS_COL = 'users';
const CHECKINS_COL = 'checkins';
const COMMUNITY_COL = 'community_posts';

const toIsoDate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const sameDay = (dateLike, dayKey) => {
  if (!dateLike) return false;
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  return toIsoDate(date) === dayKey;
};

const normalizeCreatedAt = (value) => {
  if (!value) return new Date().toISOString();
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
};

export const isFirebaseCloudEnabled = () => isFirebaseConfigured && Boolean(firestore);

export const firebaseSignInEmail = async ({ email, password }) => {
  if (!firebaseAuth) throw new Error('Firebase Auth belum aktif.');
  return signInWithEmailAndPassword(firebaseAuth, email, password);
};

export const firebaseSignOut = async () => {
  if (!firebaseAuth) return;
  await signOut(firebaseAuth);
};

export const ensureFirebaseUser = async (username) => {
  if (!firestore || !username) return null;

  const safeUsername = String(username).trim();
  if (!safeUsername) return null;

  const byName = query(collection(firestore, USERS_COL), where('username', '==', safeUsername), limit(1));
  const nameSnap = await getDocs(byName);
  if (!nameSnap.empty) {
    return { id: nameSnap.docs[0].id, ...nameSnap.docs[0].data() };
  }

  const authUid = firebaseAuth?.currentUser?.uid || null;
  const created = await addDoc(collection(firestore, USERS_COL), {
    username: safeUsername,
    auth_uid: authUid,
    created_at: serverTimestamp()
  });
  return { id: created.id, username: safeUsername, auth_uid: authUid };
};

export const getFirebaseUsers = async () => {
  if (!firestore) return [];
  const snap = await getDocs(collection(firestore, USERS_COL));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    created_at: normalizeCreatedAt(d.data()?.created_at)
  }));
};

export const getFirebaseCheckins = async () => {
  if (!firestore) return [];
  const snap = await getDocs(collection(firestore, CHECKINS_COL));
  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    created_at: normalizeCreatedAt(d.data()?.created_at)
  }));
};

export const hasFirebaseCheckinToday = async (username) => {
  if (!firestore || !username) return false;
  const todayKey = toIsoDate();
  const q = query(collection(firestore, CHECKINS_COL), where('username', '==', username));
  const snap = await getDocs(q);
  return snap.docs.some((d) => sameDay(d.data()?.created_at?.toDate?.() || d.data()?.created_at, todayKey));
};

export const insertFirebaseCheckin = async ({ username, mood, sadness, anxiety, stress, journal, createdAt }) => {
  if (!firestore) throw new Error('Firestore belum aktif.');
  if (!username) throw new Error('Username kosong.');

  const already = await hasFirebaseCheckinToday(username);
  if (already) {
    return { skipped: true, reason: 'already_checked_in_today' };
  }

  await ensureFirebaseUser(username);
  await addDoc(collection(firestore, CHECKINS_COL), {
    username,
    mood,
    sadness,
    anxiety,
    stress,
    journal: journal || '',
    created_at: createdAt ? new Date(createdAt) : serverTimestamp()
  });
  return { skipped: false };
};

export const fetchCommunityPostsFirebase = async () => {
  if (!firestore) return [];
  const q = query(collection(firestore, COMMUNITY_COL), orderBy('created_at', 'desc'), limit(1000));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    text: d.data()?.content || '',
    author: d.data()?.author_name || 'Tanpa Username',
    likes: Number(d.data()?.likes || 0),
    timestamp: new Date(normalizeCreatedAt(d.data()?.created_at)).getTime()
  }));
};

export const subscribeCommunityPostsFirebase = (onData, onError) => {
  if (!firestore) return () => {};
  const q = query(collection(firestore, COMMUNITY_COL), orderBy('created_at', 'desc'), limit(1000));
  return onSnapshot(
    q,
    (snap) => {
      const mapped = snap.docs.map((d) => ({
        id: d.id,
        text: d.data()?.content || '',
        author: d.data()?.author_name || 'Tanpa Username',
        likes: Number(d.data()?.likes || 0),
        timestamp: new Date(normalizeCreatedAt(d.data()?.created_at)).getTime()
      }));
      onData(mapped);
    },
    onError
  );
};

export const createCommunityPostFirebase = async ({ authorName, content }) => {
  if (!firestore) throw new Error('Firestore belum aktif.');
  const added = await addDoc(collection(firestore, COMMUNITY_COL), {
    content,
    author_name: authorName,
    likes: 0,
    created_at: serverTimestamp()
  });
  return added.id;
};

export const updateCommunityPostFirebase = async ({ postId, content }) => {
  if (!firestore) throw new Error('Firestore belum aktif.');
  await updateDoc(doc(firestore, COMMUNITY_COL, String(postId)), { content });
};

export const updateCommunityLikeFirebase = async ({ postId, likes }) => {
  if (!firestore) throw new Error('Firestore belum aktif.');
  await updateDoc(doc(firestore, COMMUNITY_COL, String(postId)), { likes });
};

export const deleteCommunityPostFirebase = async ({ postId }) => {
  if (!firestore) throw new Error('Firestore belum aktif.');
  await deleteDoc(doc(firestore, COMMUNITY_COL, String(postId)));
};

export const deleteFirebaseUserByUsername = async (username) => {
  if (!firestore) throw new Error('Firestore belum aktif.');
  const safe = String(username || '').trim();
  if (!safe) return;

  const userSnap = await getDocs(query(collection(firestore, USERS_COL), where('username', '==', safe)));
  for (const row of userSnap.docs) {
    await deleteDoc(doc(firestore, USERS_COL, row.id));
  }

  const checkinSnap = await getDocs(query(collection(firestore, CHECKINS_COL), where('username', '==', safe)));
  for (const row of checkinSnap.docs) {
    await deleteDoc(doc(firestore, CHECKINS_COL, row.id));
  }
};
