// ══════════════════════════════════════════
// LETTERCUT — js/main.js
// App boot, screen navigation, toast
// ══════════════════════════════════════════

// ── NAVIGATION ────────────────────────────
function goTo(id) {
  ['map', 'leaderboard', 'upload', 'profile'].forEach(s =>
    document.getElementById('screen-' + s).classList.remove('active')
  );
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(b => {
    if (b.getAttribute('onclick')?.includes("'" + id + "'")) b.classList.add('active');
  });

  if (id === 'map') {
    setTimeout(() => mapInstance.invalidateSize(), 60);
  }

  if (id === 'upload') {
    // If returning from map-location picker, apply the queued location text
    if (window._pendingLocText) {
      const locTextEl = document.getElementById('loc-text');
      const locDotEl = document.getElementById('loc-dot');
      if (locTextEl) locTextEl.textContent = window._pendingLocText;
      if (locDotEl) locDotEl.className = 'loc-dot found';
      window._pendingLocText = null;
    } else {
      updateLocField();
      if (!userPos && !manualPos) {
        const locTextEl2 = document.getElementById('loc-text');
        if (locTextEl2) locTextEl2.textContent = 'Waiting for GPS…';
      }
    }
  }
  // Update FAB appearance depending on active screen
  const fab = document.getElementById('fab-btn');
  if (fab) {
    if (id === 'upload') {
      fab.classList.add('fab-exit');
      fab.setAttribute('aria-label', 'Exit upload mode');
    } else {
      fab.classList.remove('fab-exit');
      // ensure open state removed
      fab.classList.remove('open');
      fab.setAttribute('aria-label', 'Add letter');
    }
  }
}

// Toggle upload mode: go to upload or back to map if already in upload
function toggleUpload() {
  const uploadScreen = document.getElementById('screen-upload');
  if (uploadScreen.classList.contains('active')) {
    // exit upload
    const fab = document.getElementById('fab-btn');
    if (fab) fab.classList.remove('fab-exit');
    setTimeout(() => goTo('map'), 220);
  } else {
    // enter upload
    goTo('upload');
  }
}

function cancelUpload() {
  // For single-button FAB we just go back to map
  setTimeout(() => goTo('map'), 220);
}

// ── TOAST ─────────────────────────────────
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// Boot is handled by js/app.js (Firebase entry point)

window.addEventListener('resize', () => {
  document.getElementById('map').style.height =
    (window.innerHeight - document.getElementById('bottom-nav').offsetHeight) + 'px';
  if (mapInstance) mapInstance.invalidateSize();
});

// Notifications toggle handler (profile settings)
function toggleNotifications(el) {
  el.classList.toggle('on');
  window.notificationsEnabled = el.classList.contains('on');
  if (window.notificationsEnabled) {
    // request OS permission if available
    // Notification permission requests disabled per request
    // if (typeof requestNotificationPermission === 'function') {
    //   requestNotificationPermission().then(granted => {
    //     showToast(granted ? 'Notifications on' : 'Notifications blocked');
    //   });
    // } else {
    //   showToast('Notifications on');
    // }
  } else {
    showToast('Notifications off');
  }
}
