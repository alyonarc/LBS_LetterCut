import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
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

export async function deleteLetter(id) {
  // Import deleteDoc lazily to avoid top-level import issues in older browsers
  const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
  const d = doc(db, 'letters', id);
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
