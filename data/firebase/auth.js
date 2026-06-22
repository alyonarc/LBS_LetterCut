import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { auth } from './config.js';

const provider = new GoogleAuthProvider();

export const signInWithGoogle = ()   => signInWithPopup(auth, provider);
export const signOutUser      = ()   => signOut(auth);
export const onAuthChanged    = (cb) => onAuthStateChanged(auth, cb);
