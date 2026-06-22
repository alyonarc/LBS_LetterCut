import { signInWithGoogle, signOutUser, onAuthChanged } from '../data/firebase/auth.js';
import { subscribeToLetters, addLetter, deleteLetter, addReport, subscribeToReports } from '../data/firebase/letters.js';
import { updateReport } from '../data/firebase/letters.js';

// Start splash minimum-display timer immediately (runs in parallel with script loading)
const splashTimer = new Promise(r => setTimeout(r, 1200));

// ── Dynamic loader for legacy non-module scripts ───────────────
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s    = document.createElement('script');
    s.src      = src;
    s.onload   = resolve;
    s.onerror  = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

// Load in dependency order. The window 'load' event has already fired by
// the time these dynamic scripts run, so main.js's boot handler is inert.
await loadScript('data/mockdata.js');
await loadScript('js/map.js');
await loadScript('js/modals.js');
await loadScript('js/upload.js');
await loadScript('js/leaderboard.js');
await loadScript('js/profile.js');
await loadScript('js/main.js');

// ── Expose Firebase helpers to non-module scripts ──────────────
window.firestoreAddLetter    = addLetter;
window.firestoreDeleteLetter = deleteLetter;
window.firestoreAddReport    = addReport;
window.firestoreUpdateLetter = async (id, data) => {
  if (typeof updateLetter === 'function') return updateLetter(id, data);
  // Lazy import fallback
  const mod = await import('../data/firebase/letters.js');
  return mod.updateLetter(id, data);
};
window.firestoreUpdateReport = async (id, data) => {
  if (typeof updateReport === 'function') return updateReport(id, data);
  const mod = await import('../data/firebase/letters.js');
  return mod.updateReport(id, data);
};

// Notification helper using the Notification API
// Notification helpers disabled per request.
// window.requestNotificationPermission = async function () {
//   return false;
// };
// window.showOSNotification = function () { /* no-op */ };

// ── Sign-in button ─────────────────────────────────────────────

// Notifications feature disabled — keep flag false to prevent usage
window.notificationsEnabled = false;

document.getElementById('btn-google-signin').addEventListener('click', () => {
  signInWithGoogle().catch(err => {
    console.error('Sign-in error:', err);
    const msg = {
      'auth/unauthorized-domain':    'Domain not authorised — add it in Firebase Console',
      'auth/popup-blocked':          'Popup blocked — allow popups for this site',
      'auth/popup-closed-by-user':   'Sign-in cancelled',
      'auth/operation-not-allowed':  'Google sign-in not enabled in Firebase Console',
    }[err.code] || err.message || 'Sign-in failed';
    showToast(msg);
  });
});

// ── Sign-out (called from profile settings row) ────────────────
window.appSignOut = () => signOutUser().catch(console.error);

document.querySelector('.settings-list').insertAdjacentHTML('beforeend',
  `<div class="setting-row" onclick="appSignOut()">
     <span class="s-icon">↩</span>
     <span class="s-lbl" style="color:var(--red)">Sign out</span>
     <span class="s-arr">›</span>
   </div>`
);

// ── Auth state ─────────────────────────────────────────────────
let appBooted    = false;
let unsubLetters = null;
let firstAuth    = true;
let unsubReports = null;

onAuthChanged(async user => {
  // On first resolution: wait for minimum splash duration then dismiss
  if (firstAuth) {
    firstAuth = false;
    await splashTimer;
    dismissSplash();
  }

  if (user) {
    document.getElementById('login-screen').style.display = 'none';
    window.currentUserId     = user.uid;
    window.currentUserHandle = '@' + user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '_');

    applyUserToProfile(user);

    if (!appBooted) {
      appBooted = true;
      bootApp(user);
    }
    // Subscribe to reports (keeps window.REPORTS in sync)
    if (unsubReports) { unsubReports(); unsubReports = null; }
  unsubReports = subscribeToReports(reports => {
      // detect newly added report ids
      const prev = window._lastReportIds || [];
      const ids = reports.map(r => r.id);
      const added = reports.filter(r => !prev.includes(r.id));

      window.REPORTS = reports;
      window._lastReportIds = ids;

      // Report notifications disabled — owners will not receive OS notifications from this client.

      // If profile screen visible, re-render so warning appears
      if (document.getElementById('screen-profile').classList.contains('active')) {
        if (typeof renderProfile === 'function') renderProfile();
      }
    });
  } else {
    document.getElementById('login-screen').style.display = 'flex';
    window.currentUserId     = null;
    window.currentUserHandle = null;
    if (unsubLetters) { unsubLetters(); unsubLetters = null; }
    appBooted = false;
  }
});

// ── Boot ───────────────────────────────────────────────────────
function bootApp(user) {
  initMap();
  renderLB('weekly');
  buildPicker();
  renderProfile();

  unsubLetters = subscribeToLetters(letters => {
    letters.forEach(l => {
      const pin = { ...l, mine: l.userId === user.uid };
      if (!markerMap.has(pin.id)) addMarker(pin, pin.mine);
    });
  // Dynamic profile counting disabled — updateProfileCounts() call removed
  // if (typeof updateProfileCounts === 'function') updateProfileCounts();
    // If profile screen visible, re-render to reflect any warnings or row visibility
    if (document.getElementById('screen-profile').classList.contains('active')) {
      if (typeof renderProfile === 'function') renderProfile();
    }
  });
}

// ── Update CURRENT_USER + profile DOM with Firebase user ───────
function applyUserToProfile(user) {
  const name   = user.displayName || user.email;
  const handle = window.currentUserHandle;

  CURRENT_USER.name   = name;
  CURRENT_USER.handle = handle;
  CURRENT_USER.avatar = name[0].toUpperCase();

  // Re-render if profile screen has already been initialised
  const nameEl   = document.getElementById('profile-name');
  const handleEl = document.getElementById('profile-handle');
  const avEl     = document.getElementById('profile-av-letter');
  if (nameEl)   nameEl.textContent   = name;
  if (handleEl) handleEl.textContent = `${handle} · Vienna`;
  if (avEl)     avEl.textContent     = CURRENT_USER.avatar;
}

// ── Splash dismiss ─────────────────────────────────────────────
function dismissSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  el.classList.add('out');
  setTimeout(() => el.remove(), 450);
}
