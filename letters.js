import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc, 
  setDoc, 
  increment, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { db } from './config.js';

const lettersCol = collection(db, 'letters');
const reportsCol = collection(db, 'reports');

export function subscribeToLetters(callback) {
  return onSnapshot(lettersCol, snapshot => {
    const letters = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    callback(letters);
  });
}

export function addLetter(data) {
  const { id, ...fields } = data;
  return addDoc(lettersCol, { ...fields, createdAt: serverTimestamp() });
}

// Исправленный deleteLetter в js/data/firebase/letters.js
export async function deleteLetter(id) {
  const { doc, deleteDoc, getDoc, updateDoc, increment } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  
  const d = doc(db, 'letters', id);
  const letterSnap = await getDoc(d);

  if (letterSnap.exists()) {
    const letterData = letterSnap.data();
    if (letterData.userId) {
      const userRef = doc(db, 'users', letterData.userId);
      const ptsToSubtract = window.getLetterScore(letterData.letter);
      // 2. Списываем очки
      await updateDoc(userRef, { pts: increment(-ptsToSubtract) }).catch(e => console.error(e));
    }
  }

  return deleteDoc(d);
}

export function addReport(report) {
  const { id, ...fields } = report;
  // Ensure resolved flag is present
  return addDoc(reportsCol, { ...fields, resolved: false, createdAt: serverTimestamp() });
}

export function subscribeToReports(callback) {
  return onSnapshot(reportsCol, snapshot => {
    const reports = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    callback(reports);
  });
}

export async function updateReport(id, data) {
  const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const d = doc(db, 'reports', id);
  return updateDoc(d, data);
}

export async function updateLetter(id, data) {
  const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const d = doc(db, 'letters', id);
  return updateDoc(d, data);
}

export async function updateUserStats(userId, handle, pts, word) {
  const { doc, setDoc, increment, arrayUnion } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const userRef = doc(db, 'users', userId);
  
  const updateData = {
    name: handle,
    pts: increment(pts),
    lastUpdated: serverTimestamp()
  };
  
  if (word) {
    updateData.words = arrayUnion(word);
  }
  
  return setDoc(userRef, updateData, { merge: true });
}

export async function fetchUserLetterCount(userId) {
  const { collection, query, where, getCountFromServer } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const q = query(collection(db, 'letters'), where("userId", "==", userId));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function fetchLeaderboard() {
  const { collection, query, orderBy, limit, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const q = query(collection(db, 'users'), orderBy('pts', 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function fetchUserStats(userId) {
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const d = await getDoc(doc(db, 'users', userId));
  return d.exists() ? d.data() : null;
}
