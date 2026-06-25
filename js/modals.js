// ══════════════════════════════════════════
// LETTERCUT — js/modals.js
// Letter detail modal, postcard modal,
// proximity check, word dictionary check
// ══════════════════════════════════════════

let currentLetter = null;
let postcardWalkPath = [];
let postcardMapInstance = null;

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
  const photoSrc = l.photoUrl || (typeof PRELOADED_PHOTOS !== 'undefined' && PRELOADED_PHOTOS[l.id]);
  photoEl.onclick = null;
  if (photoSrc) {
    const img = document.createElement('img');
    img.src = photoSrc;
    img.alt = '';
    img.onerror = () => { photoEl.innerHTML = ''; photoEl.textContent = '📷'; photoEl.style.cursor = ''; };

    photoEl.innerHTML = '';
    photoEl.appendChild(img);
    photoEl.style.cursor = 'grab';

    let scale = 1, tx = 0, ty = 0;
    let activeTouches = [], initScale, initTx, initTy, initDist, initMidX, initMidY;

    const clamp = () => {
      scale = Math.max(1, Math.min(5, scale));
      const mx = (scale - 1) * img.offsetWidth  / 2;
      const my = (scale - 1) * img.offsetHeight / 2;
      tx = Math.max(-mx, Math.min(mx, tx));
      ty = Math.max(-my, Math.min(my, ty));
    };
    const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`; };

    img.addEventListener('touchstart', e => {
      activeTouches = [...e.touches];
      initScale = scale; initTx = tx; initTy = ty;
      if (activeTouches.length === 2) {
        e.preventDefault();
        initDist = Math.hypot(activeTouches[1].clientX - activeTouches[0].clientX, activeTouches[1].clientY - activeTouches[0].clientY);
        initMidX = (activeTouches[0].clientX + activeTouches[1].clientX) / 2;
        initMidY = (activeTouches[0].clientY + activeTouches[1].clientY) / 2;
      } else {
        initMidX = activeTouches[0].clientX;
        initMidY = activeTouches[0].clientY;
      }
    }, { passive: false });

    img.addEventListener('touchmove', e => {
      const cur = [...e.touches];
      if (cur.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(cur[1].clientX - cur[0].clientX, cur[1].clientY - cur[0].clientY);
        scale = initScale * (dist / initDist);
        tx = initTx + ((cur[0].clientX + cur[1].clientX) / 2 - initMidX);
        ty = initTy + ((cur[0].clientY + cur[1].clientY) / 2 - initMidY);
      } else if (cur.length === 1 && scale > 1) {
        e.preventDefault();
        tx = initTx + (cur[0].clientX - initMidX);
        ty = initTy + (cur[0].clientY - initMidY);
      }
      clamp(); apply();
    }, { passive: false });

    let lastTap = 0;
    img.addEventListener('touchend', e => {
      activeTouches = [...e.touches];
      const now = Date.now();
      if (now - lastTap < 280) { scale = scale > 1 ? 1 : 2; tx = 0; ty = 0; apply(); }
      lastTap = now;
    });

    let dragging = false, dragX, dragY, dragTx, dragTy;
    img.addEventListener('pointerdown', e => {
      if (e.pointerType === 'touch') return;
      e.preventDefault();
      img.setPointerCapture(e.pointerId);
      dragging = true; dragX = e.clientX; dragY = e.clientY; dragTx = tx; dragTy = ty;
      img.style.cursor = 'grabbing';
    });
    img.addEventListener('pointermove', e => {
      if (!dragging || e.pointerType === 'touch') return;
      tx = dragTx + (e.clientX - dragX);
      ty = dragTy + (e.clientY - dragY);
      clamp(); apply();
    });
    img.addEventListener('pointerup', e => {
      if (e.pointerType === 'touch') return;
      dragging = false; img.style.cursor = 'grab';
      img.releasePointerCapture(e.pointerId);
    });
  } else {
    photoEl.innerHTML = '';
    photoEl.textContent = '📷';
    photoEl.style.cursor = '';
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
    img.src = uploadPhotoUrl;
    const onReady = () => { img.style.display = 'block'; setupPhotoZoom(img); };
    if (img.complete && img.naturalWidth) onReady();
    else img.onload = onReady;
  }
  document.getElementById('upload-desc').value = currentLetter.desc || '';
  manualPos = { lat: currentLetter.lat, lng: currentLetter.lng };
  window._pendingLocText = `${manualPos.lat.toFixed(5)}, ${manualPos.lng.toFixed(5)} (pin location)`;

  window._editingLetterId = currentLetter.id;

  closeModal('letter-modal');
  goTo('upload');
  const btn = document.getElementById('submit-btn');
  if (btn) btn.textContent = 'Save changes →';
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
  const btn = document.getElementById('del-confirm-btn');
  if (btn) { btn.disabled = false; btn.textContent = 'Delete'; }
  document.getElementById('delete-confirm-modal').classList.add('open');
}

async function deleteCurrentLetter() {
  if (!currentLetter) return;

  const id = currentLetter.id;
  const btn = document.getElementById('del-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Deleting…'; }

  console.log('[delete] letter userId:', currentLetter.userId, '| current uid:', window.currentUserId, '| match:', currentLetter.userId === window.currentUserId);

  if (window.firestoreDeleteLetter) {
    try {
      await window.firestoreDeleteLetter(id);
    } catch (e) {
      console.error('Delete failed:', e.code, e.message);
      if (btn) { btn.disabled = false; btn.textContent = 'Delete'; }
      showToast(e.code === 'permission-denied'
        ? 'Permission denied — check Firestore rules'
        : 'Could not delete — check your connection');
      return;
    }
  }

  // Delete succeeded (or no Firestore) — now remove from UI
  closeModal('delete-confirm-modal');
  closeModal('letter-modal');

  if (markerMap.has(id)) {
    const m = markerMap.get(id);
    if (m) mapInstance.removeLayer(m);
    markerMap.delete(id);
  }
  userLetters = userLetters.filter(u => u.id !== id);
  resolveReportsForLetter(id);
  currentLetter = null;
  showToast('Letter deleted');
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

  // Save path for postcard image before clearing
  postcardWalkPath = [...walkPath];

  // Render the live mini-map background in the modal
  setTimeout(() => renderPostcardMap(postcardWalkPath), 80);

  // Clean up walk state
  walkLetters = []; walkPath = [];
  if (walkPolyline) { mapInstance.removeLayer(walkPolyline); walkPolyline = null; }
  setMode('explore');

  // Dictionary check (dictionaryapi.dev — free, no key needed)
  await checkWord(word, wc);
}

function buildPostcardCanvas() {
  const word    = document.getElementById('pc-word').textContent    || '';
  const date    = document.getElementById('pc-date').textContent    || '';
  const letters = document.getElementById('pc-letters').textContent || '0';
  const dist    = document.getElementById('pc-dist').textContent    || '—';
  const pts     = document.getElementById('pc-pts').textContent     || '+0';
  const wcEl    = document.getElementById('word-check');
  const isValid = wcEl && wcEl.classList.contains('valid');
  const wcText  = wcEl ? (wcEl.querySelector('.wc-text') || wcEl).textContent.trim() : '';
  const hasRoute = postcardWalkPath.length >= 2;

  const W = 640, DPR = 2;
  const H = hasRoute ? 520 : 420;
  const canvas = document.createElement('canvas');
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext('2d');
  ctx.scale(DPR, DPR);

  // Background
  ctx.fillStyle = '#120c08';
  ctx.fillRect(0, 0, W, H);

  // Inner border
  ctx.strokeStyle = 'rgba(255,255,255,.12)';
  ctx.lineWidth = 1;
  roundRect(ctx, 18, 18, W - 36, H - 36, 12);
  ctx.stroke();

  // Red accent bar
  ctx.fillStyle = '#bf2c1e';
  ctx.fillRect(W / 2 - 28, 16, 56, 4);

  // Eyebrow
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.font = '11px DM Mono, monospace';
  ctx.letterSpacing = '1.5px';
  ctx.textAlign = 'center';
  ctx.fillText('WALK COMPLETE · VIENNA', W / 2, 58);

  // Word
  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 86px 'Playfair Display', Georgia, serif";
  ctx.textAlign = 'center';
  ctx.fillText(word, W / 2, 155);

  // Date
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.font = '13px DM Mono, monospace';
  ctx.letterSpacing = '0px';
  ctx.fillText(date, W / 2, 186);

  // Divider
  ctx.strokeStyle = 'rgba(255,255,255,.1)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(40, 208); ctx.lineTo(W - 40, 208); ctx.stroke();

  // Stats
  const stats = [
    { n: letters, l: 'LETTERS' },
    { n: dist,    l: 'DISTANCE' },
    { n: pts,     l: 'POINTS' },
  ];
  stats.forEach((s, i) => {
    const x = W / 4 + i * (W / 4);
    ctx.fillStyle = '#ffffff';
    ctx.font = "bold 30px 'DM Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(s.n, x, 254);
    ctx.fillStyle = 'rgba(255,255,255,.38)';
    ctx.font = '10px DM Mono, monospace';
    ctx.letterSpacing = '1px';
    ctx.fillText(s.l, x, 274);
  });

  // Route mini-map
  if (hasRoute) {
    const path = postcardWalkPath;
    const sX = 40, sY = 292, sW = W - 80, sH = 88, pad = 14;

    ctx.fillStyle = 'rgba(255,255,255,.04)';
    roundRect(ctx, sX, sY, sW, sH, 8);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.font = '9px DM Mono, monospace';
    ctx.letterSpacing = '1px';
    ctx.textAlign = 'left';
    ctx.fillText('ROUTE', sX + 10, sY + 13);

    const lats = path.map(p => p[0]);
    const lngs = path.map(p => p[1]);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const midLat = (minLat + maxLat) / 2;
    const cosLat = Math.cos(midLat * Math.PI / 180);
    const latRange = maxLat - minLat || 0.0002;
    const lngRangeCorr = (maxLng - minLng || 0.0002) * cosLat;
    const scale = Math.min((sW - pad * 2) / lngRangeCorr, (sH - pad * 2) / latRange);
    const rW = lngRangeCorr * scale, rH = latRange * scale;
    const oX = sX + pad + (sW - pad * 2 - rW) / 2;
    const oY = sY + pad + (sH - pad * 2 - rH) / 2;
    const toX = lng => oX + (lng - minLng) * cosLat * scale;
    const toY = lat => oY + rH - (lat - minLat) * scale;

    ctx.strokeStyle = '#bf2c1e';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(toX(path[0][1]), toY(path[0][0]));
    for (let i = 1; i < path.length; i++) ctx.lineTo(toX(path[i][1]), toY(path[i][0]));
    ctx.stroke();

    // Start dot (white)
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath();
    ctx.arc(toX(path[0][1]), toY(path[0][0]), 3.5, 0, Math.PI * 2);
    ctx.fill();

    // End dot (red, larger)
    ctx.fillStyle = '#bf2c1e';
    ctx.beginPath();
    ctx.arc(toX(path[path.length-1][1]), toY(path[path.length-1][0]), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Word check strip
  const wcY = hasRoute ? 394 : 296;
  if (wcText) {
    ctx.fillStyle = isValid ? 'rgba(50,160,80,.25)' : 'rgba(255,255,255,.06)';
    roundRect(ctx, 40, wcY, W - 80, 52, 8);
    ctx.fill();
    ctx.fillStyle = isValid ? '#6ddb94' : 'rgba(255,255,255,.55)';
    ctx.font = '12px DM Mono, monospace';
    ctx.letterSpacing = '0px';
    ctx.textAlign = 'center';
    const maxLen = 60;
    ctx.fillText(wcText.length > maxLen ? wcText.slice(0, maxLen) + '…' : wcText, W / 2, wcY + 31);
  }

  // Branding
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.font = '11px DM Mono, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('lettercut · find letters · spell the city', W / 2, H - 22);

  return canvas;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

async function sharePostcard() {
  await document.fonts.ready;
  const canvas = buildPostcardCanvas();
  const word = document.getElementById('pc-word').textContent || 'word';

  canvas.toBlob(async blob => {
    const file = new File([blob], 'lettercut-postcard.png', { type: 'image/png' });
    const text = `I just spelled "${word}" walking through Vienna! LetterCut`;
    const url  = 'https://alyonarc.github.io/LBS_LetterCut/';

    // Try sharing the image file (supported on mobile)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'LetterCut', text });
        return;
      } catch (e) {
        if (e.name === 'AbortError') return;
      }
    }

    // Fall back to sharing just text + URL
    if (navigator.share) {
      try { await navigator.share({ title: 'LetterCut', text, url }); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }

    // Last resort: download the image
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lettercut-postcard.png';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('Postcard saved!');
  }, 'image/png');
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

// ── POSTCARD MINI-MAP ────────────────────
function renderPostcardMap(routeCoords) {
  // Destroy any existing instance first
  destroyPostcardMap();

  const container = document.getElementById('postcard-map');
  if (!container) return;

  const VIENNA = [48.2082, 16.3738];
  const centre = routeCoords.length
    ? routeCoords[Math.floor(routeCoords.length / 2)]
    : VIENNA;

  postcardMapInstance = L.map('postcard-map', {
    center: centre,
    zoom: 15,
    zoomControl:      false,
    attributionControl: false,
    dragging:         false,
    scrollWheelZoom:  false,
    doubleClickZoom:  false,
    touchZoom:        false,
    keyboard:         false,
    boxZoom:          false,
  });

  // Same tiles as the main map
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19,
  }).addTo(postcardMapInstance);

  if (routeCoords.length > 1) {
    const line = L.polyline(routeCoords, {
      color: '#bf2c1e',
      weight: 4,
      opacity: 0.9,
      lineJoin: 'round',
      lineCap:  'round',
    }).addTo(postcardMapInstance);

    postcardMapInstance.fitBounds(line.getBounds(), { padding: [32, 32] });
  }
}

function destroyPostcardMap() {
  if (postcardMapInstance) {
    postcardMapInstance.remove();
    postcardMapInstance = null;
  }
}

// ── HELPERS ───────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  if (id === 'postcard-modal') destroyPostcardMap();
}

