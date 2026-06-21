// ══════════════════════════════════════════
// LETTERCUT — js/modals.js
// Letter detail modal, postcard modal,
// proximity check, word dictionary check
// ══════════════════════════════════════════

let currentLetter = null;

// Reports cache (session)
// REPORTS is provided by mockdata.js; ensure it's available
window.REPORTS = window.REPORTS || (typeof REPORTS !== 'undefined' ? REPORTS : []);

// ── LETTER MODAL ──────────────────────────
function openLetterModal(l, isUser) {
  currentLetter = l;

  document.getElementById('ml-char').textContent  = l.letter;
  document.getElementById('ml-title').textContent = `Letter "${l.letter}"`;
  document.getElementById('ml-meta').textContent  = `By @${l.user} · Vienna`;
  document.getElementById('ml-desc').textContent  = l.desc || '';

  // Show time of upload if available (format HH:MM, DD.MM.YY)
  const tEl = document.getElementById('ml-time');
  if (tEl) {
    let ts = l.createdAt || l.created_at || l.created || null;
    let dateObj = null;
    if (ts && ts.seconds) { // Firestore Timestamp
      dateObj = new Date(ts.seconds * 1000);
    } else if (typeof ts === 'number') {
      dateObj = new Date(ts);
    } else if (typeof ts === 'string') {
      dateObj = new Date(ts);
    }
    if (!dateObj) dateObj = new Date();
    const hh = String(dateObj.getHours()).padStart(2,'0');
    const mm = String(dateObj.getMinutes()).padStart(2,'0');
    const dd = String(dateObj.getDate()).padStart(2,'0');
    const mo = String(dateObj.getMonth()+1).padStart(2,'0');
    const yy = String(dateObj.getFullYear()).slice(-2);
    tEl.textContent = `${hh}:${mm}, ${dd}.${mo}.${yy}` + (l.edited ? ' · edited.' : '');
  }

  // Photo
  const photoEl = document.getElementById('ml-photo');
  if (isUser && l.photoUrl) {
    photoEl.innerHTML = `<img src="${l.photoUrl}" alt="">`;
  } else if (!isUser && PRELOADED_PHOTOS[l.id]) {
    photoEl.innerHTML = `<img src="${PRELOADED_PHOTOS[l.id]}" alt="" onerror="this.parentElement.textContent='📷'">`;
  } else {
    photoEl.textContent = '📷';
  }

  updateCollectButton(l);
  // Show delete button for letters that belong to the current user
  const delBtn = document.getElementById('ml-delete-btn');
  if (delBtn) {
    if (l.userId && window.currentUserId && l.userId === window.currentUserId) {
      delBtn.style.display = '';
    } else if (l.mine) {
      delBtn.style.display = '';
    } else {
      delBtn.style.display = 'none';
    }
  }
  const editBtn = document.getElementById('ml-edit-btn');
  if (editBtn) {
    const owned = (l.userId && window.currentUserId && l.userId === window.currentUserId) || l.mine;
    editBtn.style.display = owned ? '' : 'none';
  }
  // Show report button for letters that do NOT belong to current user
  const repBtn = document.getElementById('ml-report-btn');
  if (repBtn) {
    const owned = (l.userId && window.currentUserId && l.userId === window.currentUserId) || l.mine;
    repBtn.style.display = owned ? 'none' : '';
  }

  document.getElementById('letter-modal').classList.add('open');
}

function updateCollectButton(l) {
  const btn  = document.getElementById('ml-collect');
  const warn = document.getElementById('prox-warn');
  const dist = distanceTo(l);
  const close = dist <= COLLECT_RADIUS_M;

  // Collect only available in walk mode
  if (mapMode !== 'walk') {
    btn.style.display = 'none';
    warn.classList.remove('show');
    return;
  }

  btn.style.display = '';
  if (close) {
    btn.disabled = false;
    btn.textContent = 'Collect →';
    warn.classList.remove('show');
  } else {
    btn.disabled = true;
    btn.textContent = 'Too far';
    warn.classList.add('show');
    document.getElementById('prox-dist-text').textContent = dist === Infinity
      ? 'GPS not available yet'
      : `You are ${Math.round(dist)} m away — need to be within ${COLLECT_RADIUS_M} m`;
  }
}

function collectLetter() {
  if (!currentLetter) return;

  // Final proximity guard
  if (mapMode === 'walk' && !isNearby(currentLetter)) {
    showToast(`Get within ${COLLECT_RADIUS_M} m first!`);
    return;
  }

  closeModal('letter-modal');

  if (mapMode === 'walk') {
    walkLetters.push(currentLetter.letter);
    renderChips();
    showToast(`"${currentLetter.letter}" collected!`);
  }
}

// ── REPORT FLOW ─────────────────────────
function openReportModal() {
  document.getElementById('report-modal').classList.add('open');
}

async function submitReport(code) {
  if (!currentLetter) return;
  const reasonText = {
    'A': 'The picture is inappropriate',
    'B': 'There is no letter in the picture',
    'C': 'There is an incorrect letter/place',
    'D': 'Copyright reasons',
  }[code] || 'Other';

  const report = {
    letterId: currentLetter.id,
    letter: currentLetter.letter,
    reasonCode: code,
    reasonText: reasonText,
    reporterId: window.currentUserId || null,
    letterOwnerId: currentLetter.userId || null,
    createdAt: Date.now(),
  };

  // Save locally
  window.REPORTS.push(report);

  // Send to Firestore if helper available
  if (window.firestoreAddReport) {
    try {
      await window.firestoreAddReport(report);
      showToast('Report submitted');
    } catch (e) {
      console.error('Report save failed:', e);
      showToast('Could not submit report — saved locally');
    }
  } else {
    showToast('Report saved locally');
  }

  // Report notification behavior disabled per request
  // if (report.letterOwnerId && window.currentUserId === report.letterOwnerId && window.notificationsEnabled) {
  //   showToast(`Your letter was reported for the following reason: ${reasonText}`);
  // }

  closeModal('report-modal');
}

// ── REVIEW FLOW FOR OWNERS ──────────────
function hasReportsForCurrentUser() {
  if (!window.currentUserId) return false;
  return window.REPORTS.some(r => r.letterOwnerId === window.currentUserId);
}

function getFirstReportForCurrentUser() {
  if (!window.currentUserId) return null;
  return window.REPORTS.find(r => r.letterOwnerId === window.currentUserId) || null;
}

// Open review modal for the first reported letter for this user
function openReportedReview() {
  const rep = getFirstReportForCurrentUser();
  if (!rep) return;
  const letter = allLetters().find(l => l.id === rep.letterId) || null;
  if (!letter) return;

  // set currentLetter context for reuse
  currentLetter = letter;

  document.getElementById('rr-title').textContent = `Your letter "${letter.letter}" was reported`;
  document.getElementById('rr-body').textContent  = `Reported reason: ${rep.reasonText}`;
  document.getElementById('reported-review-modal').classList.add('open');
}

function openReportsList() {
  const listEl = document.getElementById('reports-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  const reps = (window.REPORTS || []).filter(r => r.letterOwnerId === window.currentUserId && !r.resolved);
  if (reps.length === 0) {
    listEl.innerHTML = '<div style="color:var(--muted)">No reports</div>';
  } else {
    reps.forEach(r => {
      const div = document.createElement('div');
      div.className = 'report-item';
      div.innerHTML = `
        <div class="ri-info">Letter "${r.letter}" — ${r.reasonText}</div>
        <div class="ri-actions">
          <button class="mbtn" onclick="(function(){ currentLetter = allLetters().find(l=>l.id===${JSON.stringify(r.letterId)}); openReportedReview(); closeModal('reports-list-modal'); })()">Review</button>
        </div>`;
      listEl.appendChild(div);
    });
  }
  document.getElementById('reports-list-modal').classList.add('open');
}

function reportedDelete() {
  // Confirm then delete using existing flow
  closeModal('reported-review-modal');
  confirmDeleteCurrent();
  if (currentLetter && currentLetter.id) resolveReportsForLetter(currentLetter.id);
}

function editCurrentLetter() {
  if (!currentLetter) return;
  // Prefill upload form with currentLetter data and set editing id
  selLetter = currentLetter.letter;
  buildPicker();
  document.querySelectorAll('.lp-btn').forEach(b => { if (b.textContent === selLetter) b.classList.add('sel'); });
  if (currentLetter.photoUrl) {
    uploadPhotoUrl = currentLetter.photoUrl;
    const img = document.getElementById('preview-img');
    img.src = uploadPhotoUrl; img.style.display = 'block';
  }
  document.getElementById('upload-desc').value = currentLetter.desc || '';
  manualPos = { lat: currentLetter.lat, lng: currentLetter.lng };
  window._pendingLocText = `${manualPos.lat.toFixed(5)}, ${manualPos.lng.toFixed(5)} (manual)`;

  // editing id used by submit handler
  window._editingLetterId = currentLetter.id;

  closeModal('letter-modal');
  goTo('upload');
}

function reportedChangeInfo() {
  // Prefill upload form with currentLetter data and go to upload
  if (!currentLetter) return;
  // Prefill fields
  selLetter = currentLetter.letter;
  // select letter button in picker (rebuildPicker done on boot)
  buildPicker();
  document.querySelectorAll('.lp-btn').forEach(b => { if (b.textContent === selLetter) b.classList.add('sel'); });
  // preview image if available
  if (currentLetter.photoUrl) {
    uploadPhotoUrl = currentLetter.photoUrl;
    const img = document.getElementById('preview-img');
    img.src = uploadPhotoUrl; img.style.display = 'block';
  }
  // description
  document.getElementById('upload-desc').value = currentLetter.desc || '';
  // location
  manualPos = { lat: currentLetter.lat, lng: currentLetter.lng };
  window._pendingLocText = `${manualPos.lat.toFixed(5)}, ${manualPos.lng.toFixed(5)} (manual)`;

  // mark that we are editing a reported letter
  window._reportEditing = { letterId: currentLetter.id, reason: getFirstReportForCurrentUser()?.reasonCode };
  // Resolve existing reports for this letter (they will be re-submitted as review if needed)
  resolveReportsForLetter(currentLetter.id);

  closeModal('reported-review-modal');
  goTo('upload');

  // If reason is A or D, show moderator message after they save (handled elsewhere in submit flow)
}

function reportedDismiss() {
  // Mark the first matching report as resolved (persistently if possible)
  const rep = getFirstReportForCurrentUser();
  if (!rep) return;
  if (rep.id && window.firestoreUpdateReport) {
    window.firestoreUpdateReport(rep.id, { resolved: true }).then(() => {
      showToast('Report dismissed');
    }).catch(() => {
      // fallback to local removal
      window.REPORTS = window.REPORTS.filter(r => r.id !== rep.id);
      showToast('Report dismissed (local)');
    });
  } else {
    window.REPORTS = window.REPORTS.filter(r => r !== rep);
    showToast('Report dismissed');
  }
  closeModal('reported-review-modal');
}

// Resolve all reports for a given letter id (mark resolved:true)
function resolveReportsForLetter(letterId) {
  const reps = (window.REPORTS || []).filter(r => r.letterId === letterId);
  reps.forEach(r => {
    if (r.id && window.firestoreUpdateReport) {
      window.firestoreUpdateReport(r.id, { resolved: true }).catch(() => {});
    } else {
      window.REPORTS = window.REPORTS.filter(rr => rr !== r);
    }
  });
}

// ── DELETE FLOW ─────────────────────────
function confirmDeleteCurrent() {
  if (!currentLetter) return;
  const title = document.getElementById('del-confirm-title');
  const body  = document.getElementById('del-confirm-body');
  title.textContent = `Delete letter "${currentLetter.letter}"?`;
  body.textContent = `Are you sure you want to delete letter "${currentLetter.letter}" forever?`;
  document.getElementById('delete-confirm-modal').classList.add('open');
}

async function deleteCurrentLetter() {
  if (!currentLetter) return;

  // Optimistically close confirm and letter modal
  closeModal('delete-confirm-modal');
  closeModal('letter-modal');

  const id = currentLetter.id;

  // Remove marker from map
  if (markerMap.has(id)) {
    const m = markerMap.get(id);
    if (m) mapInstance.removeLayer(m);
    markerMap.delete(id);
  }

  // Remove from userLetters (session) if present
  userLetters = userLetters.filter(u => u.id !== id);

  // If Firestore delete helper is available, call it
  if (window.firestoreDeleteLetter) {
    try {
      await window.firestoreDeleteLetter(id);
      showToast('Letter deleted');
    } catch (e) {
      console.error('Delete failed:', e);
      showToast('Could not delete letter — try again');
    }
  } else {
    // Fallback: local removal only
    showToast('Letter removed locally');
  }

  // Clear currentLetter
  // Resolve any reports associated with this letter
  resolveReportsForLetter(id);
  // Profile counting feature disabled — updateProfileCounts() call removed
  // if (typeof updateProfileCounts === 'function') updateProfileCounts();
  currentLetter = null;
}

// ── POSTCARD MODAL ────────────────────────
async function showPostcard() {
  const word = walkLetters.join('');

  document.getElementById('pc-word').textContent = word;
  document.getElementById('pc-date').textContent =
    `Vienna · ${new Date().toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}`;
  document.getElementById('pc-letters').textContent = walkLetters.length;
  document.getElementById('pc-pts').textContent = '+' + (walkLetters.length * 10);

  // Calculate walk distance from GPS path
  let dist = '—';
  if (walkPath.length > 1) {
    let d = 0;
    for (let i = 1; i < walkPath.length; i++) {
      d += mapInstance.distance(walkPath[i - 1], walkPath[i]);
    }
    dist = d > 1000 ? (d / 1000).toFixed(1) + 'km' : Math.round(d) + 'm';
  }
  document.getElementById('pc-dist').textContent = dist;

  // Reset word-check UI to loading
  const wc = document.getElementById('word-check');
  wc.className = 'word-check checking';
  wc.innerHTML = `<span class="wc-icon">⏳</span><div><div class="wc-text">Checking dictionary…</div></div>`;

  document.getElementById('postcard-modal').classList.add('open');

  // Clean up walk state
  walkLetters = []; walkPath = [];
  if (walkPolyline) { mapInstance.removeLayer(walkPolyline); walkPolyline = null; }
  setMode('explore');

  // Dictionary check (dictionaryapi.dev — free, no key needed)
  await checkWord(word, wc);
}

async function checkWord(word, el) {
  try {
    const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word.toLowerCase()}`);
    if (res.ok) {
      const data = await res.json();
      let def = '';
      try { def = data[0].meanings[0].definitions[0].definition; } catch (e) {}
      if (def.length > 90) def = def.slice(0, 87) + '…';
      el.className = 'word-check valid';
      el.innerHTML = `
        <span class="wc-icon">✓</span>
        <div>
          <div class="wc-text"><strong>${word}</strong> is a real word! +bonus pts</div>
          ${def ? `<div class="wc-def">${def}</div>` : ''}
        </div>`;
    } else {
      el.className = 'word-check invalid';
      el.innerHTML = `
        <span class="wc-icon">✗</span>
        <div>
          <div class="wc-text"><strong>${word}</strong> — not found in dictionary</div>
          <div class="wc-def">Try collecting different letters next walk</div>
        </div>`;
    }
  } catch (e) {
    el.className = 'word-check checking';
    el.innerHTML = `<span class="wc-icon">—</span><div><div class="wc-text">Dictionary unavailable offline</div></div>`;
  }
}

// ── HELPERS ───────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}
