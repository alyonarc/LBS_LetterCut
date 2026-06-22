import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth }        from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore }   from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            'AIzaSyD7wZeKgmtKFNfTaJ3Tzzto0MNR040M0V0',
  authDomain:        'lettercut-55944.firebaseapp.com',
  projectId:         'lettercut-55944',
  storageBucket:     'lettercut-55944.firebasestorage.app',
  messagingSenderId: '810678905670',
  appId:             '1:810678905670:web:d74572e1f206ed00ef5347',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
