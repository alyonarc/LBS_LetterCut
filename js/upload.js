// ══════════════════════════════════════════
// LETTERCUT — js/upload.js
// Add Letter form: photo capture, letter
// picker, map-based location selection
// ══════════════════════════════════════════

let selLetter = null, uploadPhotoUrl = null, manualPos = null;
let photoScale = 1, photoTx = 0, photoTy = 0;

// ── LETTER PICKER ─────────────────────────
function buildPicker() {
  document.getElementById('letter-picker').innerHTML =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l =>
      `<button class="lp-btn" onclick="pickLetter(this,'${l}')">${l}</button>`
    ).join('');
}

function pickLetter(el, l) {
  document.querySelectorAll('.lp-btn').forEach(b => b.classList.remove('sel'));
  el.classList.add('sel');
  selLetter = l;
}

// ── PHOTO ─────────────────────────────────
function compressImage(file, maxWidth = 600, quality = 0.6) {
  return new Promise(resolve => {
    const blobUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = blobUrl;
  });
}

function setupPhotoZoom(img) {
  const zone = document.getElementById('photo-zone');
  zone.querySelectorAll('.upload-zoom-btn').forEach(b => b.remove());
  photoScale = 1; photoTx = 0; photoTy = 0;
  img.style.transform = '';
  img.style.cursor = 'grab';

  const btnOut = document.createElement('button');
  const btnIn  = document.createElement('button');
  btnOut.className = btnIn.className = 'upload-zoom-btn';
  btnOut.textContent = '−'; btnIn.textContent = '+';
  btnOut.type = btnIn.type = 'button';
  zone.appendChild(btnOut);
  zone.appendChild(btnIn);

  img.draggable = false;
  img.addEventListener('dragstart', e => e.preventDefault());

  const clamp = () => {
    photoScale = Math.max(1, Math.min(5, photoScale));
    const mx = (photoScale - 1) * img.offsetWidth  / 2;
    const my = (photoScale - 1) * img.offsetHeight / 2;
    photoTx = Math.max(-mx, Math.min(mx, photoTx));
    photoTy = Math.max(-my, Math.min(my, photoTy));
  };
  const apply = () => {
    img.style.transform = `translate(${photoTx}px,${photoTy}px) scale(${photoScale})`;
  };

  btnIn.addEventListener('click',  e => { e.stopPropagation(); photoScale = Math.min(5, photoScale * 1.5); clamp(); apply(); });
  btnOut.addEventListener('click', e => { e.stopPropagation(); photoScale = Math.max(1, photoScale / 1.5); if (photoScale <= 1) { photoTx = 0; photoTy = 0; } clamp(); apply(); });

  // Pinch-to-zoom + single-finger drag
  let t0 = [], initScale, initTx, initTy, initDist, initMidX, initMidY;
  img.addEventListener('touchstart', e => {
    t0 = [...e.touches];
    initScale = photoScale; initTx = photoTx; initTy = photoTy;
    if (t0.length === 2) {
      e.preventDefault();
      initDist = Math.hypot(t0[1].clientX - t0[0].clientX, t0[1].clientY - t0[0].clientY);
      initMidX = (t0[0].clientX + t0[1].clientX) / 2;
      initMidY = (t0[0].clientY + t0[1].clientY) / 2;
    } else {
      initMidX = t0[0].clientX; initMidY = t0[0].clientY;
    }
  }, { passive: false });

  img.addEventListener('touchmove', e => {
    const cur = [...e.touches];
    if (cur.length === 2) {
      e.preventDefault();
      const d = Math.hypot(cur[1].clientX - cur[0].clientX, cur[1].clientY - cur[0].clientY);
      photoScale = initScale * (d / initDist);
      photoTx = initTx + ((cur[0].clientX + cur[1].clientX) / 2 - initMidX);
      photoTy = initTy + ((cur[0].clientY + cur[1].clientY) / 2 - initMidY);
    } else if (cur.length === 1 && photoScale > 1) {
      e.preventDefault();
      photoTx = initTx + (cur[0].clientX - initMidX);
      photoTy = initTy + (cur[0].clientY - initMidY);
    }
    clamp(); apply();
  }, { passive: false });

  let lastTap = 0;
  img.addEventListener('touchend', () => {
    const now = Date.now();
    if (now - lastTap < 280) { photoScale = photoScale > 1 ? 1 : 2; photoTx = 0; photoTy = 0; apply(); }
    lastTap = now;
  });

  // Mouse wheel zoom
  img.addEventListener('wheel', e => {
    e.preventDefault();
    photoScale *= e.deltaY < 0 ? 1.15 : 0.87;
    clamp(); apply();
  }, { passive: false });

  // Mouse drag
  let dragging = false, dragX, dragY, dragTx, dragTy;
  img.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;
    e.preventDefault(); img.setPointerCapture(e.pointerId);
    dragging = true; dragX = e.clientX; dragY = e.clientY; dragTx = photoTx; dragTy = photoTy;
    img.style.cursor = 'grabbing';
  });
  img.addEventListener('pointermove', e => {
    if (!dragging || e.pointerType === 'touch') return;
    photoTx = dragTx + (e.clientX - dragX);
    photoTy = dragTy + (e.clientY - dragY);
    clamp(); apply();
  });
  img.addEventListener('pointerup', e => {
    if (e.pointerType === 'touch') return;
    dragging = false; img.style.cursor = 'grab';
    img.releasePointerCapture(e.pointerId);
  });
}

async function previewPhoto(e) {
  const f = e.target.files[0];
  if (!f) return;
  uploadPhotoUrl = await compressImage(f);
  const img = document.getElementById('preview-img');
  img.onload = () => { img.style.display = 'block'; setupPhotoZoom(img); };
  img.src = uploadPhotoUrl;
}

// ── LOCATION ──────────────────────────────
function updateLocField() {
  if (!userPos) return;
  const textEl = document.getElementById('loc-text');
  const dotEl = document.getElementById('loc-dot');
  if (textEl) {
    try {
      textEl.textContent = `${userPos.lat.toFixed(5)}, ${userPos.lng.toFixed(5)}`;
    } catch (e) { /* ignore DOM write errors */ }
  }
  if (dotEl) {
    try {
      dotEl.className = 'loc-dot found';
    } catch (e) { /* ignore DOM write errors */ }
  }
}

// Let user tap the map to place the pin manually
function openLocationPicker() {
  goTo('map');
  showToast('Tap anywhere on the map to place your pin');
  document.getElementById('loc-map-hint').style.display = 'block';
  // No longer relying on global FAB keep-open flag — single-button FAB will rotate via goTo()

  mapInstance.on('click', function (e) {
    manualPos = { lat: e.latlng.lat, lng: e.latlng.lng };

    // Temporary preview marker
    if (window._manualMarker) mapInstance.removeLayer(window._manualMarker);
    window._manualMarker = L.circleMarker([manualPos.lat, manualPos.lng], {
      radius: 10, color: '#bf2c1e', fillColor: '#bf2c1e', fillOpacity: .5, weight: 2,
    }).addTo(mapInstance);

    showToast('Location set! Go back to Add a Letter ↗');
    window._pendingLocText = `${manualPos.lat.toFixed(5)}, ${manualPos.lng.toFixed(5)} (manual)`;
  });
}

// ── SUBMIT ────────────────────────────────
async function submitLetter() {
  if (!selLetter) {
    showToast('Pick a letter first');
    return;
  }
  const pos = manualPos || userPos;
  if (!pos) {
    showToast('Location not set — use GPS or tap the map');
    return;
  }

  // Re-render the visible portion of the photo if the user zoomed/panned
  if (uploadPhotoUrl && (photoScale !== 1 || photoTx !== 0 || photoTy !== 0)) {
    const pImg = document.getElementById('preview-img');
    const zone = document.getElementById('photo-zone');
    const zW = zone.offsetWidth, zH = zone.offsetHeight;
    const iW = pImg.naturalWidth,  iH = pImg.naturalHeight;
    const canvas = document.createElement('canvas');
    canvas.width = zW; canvas.height = zH;
    const ctx = canvas.getContext('2d');
    const cs = Math.max(zW / iW, zH / iH);
    ctx.translate(zW / 2 + photoTx, zH / 2 + photoTy);
    ctx.scale(photoScale, photoScale);
    ctx.translate(-zW / 2, -zH / 2);
    ctx.drawImage(pImg, (zW - iW * cs) / 2, (zH - iH * cs) / 2, iW * cs, iH * cs);
    uploadPhotoUrl = canvas.toDataURL('image/jpeg', 0.7);
  }

  const desc = document.getElementById('upload-desc').value.trim()
    || `${selLetter} found in Vienna`;

  // If editing an existing letter, update instead of creating a new one
  if (window._editingLetterId) {
    const updateData = {
      letter: selLetter,
      lat: pos.lat + (Math.random() - .5) * .0002,
      lng: pos.lng + (Math.random() - .5) * .0002,
      desc: desc,
      photoUrl: uploadPhotoUrl || null,
      edited: true,
      editedAt: Date.now(),
    };

    // Firestore update
    if (window.firestoreUpdateLetter) {
      const eid = window._editingLetterId;
      try {
        await window.firestoreUpdateLetter(eid, updateData);
        // Remove old marker and immediately re-add with updated data.
        // Don't rely on the snapshot — it may fire before we delete from markerMap.
        if (markerMap.has(eid)) {
          mapInstance.removeLayer(markerMap.get(eid));
          markerMap.delete(eid);
        }
        addMarker({ id: eid, ...updateData, userId: window.currentUserId, user: window.currentUserHandle || 'anonymous', mine: true }, true);
      } catch (e) {
        console.error('Firestore update failed:', e);
        showToast('Could not update — check your connection');
        return;
      }
    } else {
      // Local fallback: update userLetters and marker if present
      userLetters = userLetters.map(u => u.id === window._editingLetterId ? { ...u, ...updateData } : u);
      const m = markerMap.get(window._editingLetterId);
      if (m) {
        // rebuild the letter object to update icon
        const updated = userLetters.find(u => u.id === window._editingLetterId);
        if (updated) {
          m.setLatLng([updated.lat, updated.lng]);
          // update icon by removing and readding
          mapInstance.removeLayer(m);
          addMarker(updated, true);
        }
      }
    }

    showToast('Changes saved');
    window._editingLetterId = null;
  } else {
    const newLetter = {
      id:       Date.now(),
      letter:   selLetter,
      lat:      pos.lat + (Math.random() - .5) * .0002,
      lng:      pos.lng + (Math.random() - .5) * .0002,
      user:     window.currentUserHandle || 'anonymous',
      userId:   window.currentUserId     || null,
      mine:     true,
      desc:     desc,
      photoUrl: uploadPhotoUrl || null,
    };

    if (window.firestoreAddLetter) {
      try {
        await window.firestoreAddLetter(newLetter);
        // Marker is added by the Firestore onSnapshot listener in app.js
      } catch (e) {
        console.error('Firestore write failed:', e);
        showToast('Could not save — check your connection');
        return;
      }
    } else {
      // Offline fallback: add locally only
      userLetters.push(newLetter);
      addMarker(newLetter, true);
    }
    // Profile counting feature disabled — updateProfileCounts() call removed
    // if (typeof updateProfileCounts === 'function') updateProfileCounts();
  }

  // Clean up manual location marker
  if (window._manualMarker) {
    mapInstance.removeLayer(window._manualMarker);
    window._manualMarker = null;
  }

  showToast(`"${selLetter}" pinned to the map! ✓`);

  // If the user was editing in response to a report, and the reason was A or D,
  // inform them that changes are saved and will be reviewed by a moderator.
  if (window._reportEditing && window._reportEditing.reason) {
    const r = window._reportEditing.reason;
    if (r === 'A' || r === 'D') {
      showToast('Your changes have been saved and will be reviewed by a moderator');
      // Optionally create a review report record
      const reviewReport = {
        letterId: window._reportEditing.letterId,
        reasonCode: r,
        reasonText: r === 'A' ? 'Picture inappropriate (edited)' : 'Copyright (edited)',
        reporterId: window.currentUserId || null,
        letterOwnerId: window.currentUserId || null,
        createdAt: Date.now(),
        reviewPending: true,
      };
      window.REPORTS = window.REPORTS || [];
      window.REPORTS.push(reviewReport);
      if (window.firestoreAddReport) {
        try { await window.firestoreAddReport(reviewReport); } catch (e) { /* ignore */ }
      }
    }
    window._reportEditing = null;
  }
  resetUploadForm();
  setTimeout(() => goTo('map'), 1200);
}

function resetUploadForm() {
  document.querySelectorAll('.lp-btn').forEach(b => b.classList.remove('sel'));
  selLetter = null;
  uploadPhotoUrl = null;
  manualPos = null;
  photoScale = 1; photoTx = 0; photoTy = 0;
  const pImg = document.getElementById('preview-img');
  pImg.style.display = 'none';
  pImg.style.transform = '';
  pImg.style.cursor = '';
  pImg.onload = null;
  document.getElementById('photo-zone').querySelectorAll('.upload-zoom-btn').forEach(b => b.remove());
  document.getElementById('upload-desc').value = '';
  document.getElementById('file-camera').value = '';
  document.getElementById('file-gallery').value = '';
  document.getElementById('loc-map-hint').style.display = 'none';
  const btn = document.getElementById('submit-btn');
  if (btn) btn.textContent = 'Pin it to the map →';
}

// Geocode a textual address/place using Nominatim and set manualPos + preview marker
async function geocodeLocation() {
  const qEl = document.getElementById('loc-search-input');
  if (!qEl) return;
  const q = qEl.value.trim();
  if (!q) { showToast('Type an address or place to find'); return; }

  showToast('Searching…');
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error('Geocode failed');
    const data = await res.json();
    if (!data || data.length === 0) { showToast('No results found'); return; }
    const r = data[0];
    manualPos = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };

    // Remove previous manual marker
    if (window._manualMarker) mapInstance.removeLayer(window._manualMarker);
    window._manualMarker = L.circleMarker([manualPos.lat, manualPos.lng], {
      radius: 10, color: '#bf2c1e', fillColor: '#bf2c1e', fillOpacity: .5, weight: 2,
    }).addTo(mapInstance);

    // Center map on result and set pending location text
    mapInstance.setView([manualPos.lat, manualPos.lng], Math.max(mapInstance.getZoom(), 15));
    window._pendingLocText = `${manualPos.lat.toFixed(5)}, ${manualPos.lng.toFixed(5)} (search)`;
    document.getElementById('loc-text').textContent = window._pendingLocText;
    document.getElementById('loc-dot').className = 'loc-dot found';
    showToast('Location set — check map and submit');
  } catch (e) {
    console.error('Geocode error', e);
    showToast('Could not find that place');
  }
}

// ── Autocomplete suggestions for the location input (limited to Vienna)
function debounce(fn, wait) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

async function fetchLocationSuggestions(q) {
  if (!q || q.length < 2) return [];
  // Vienna bounding box (lon_left, lat_top, lon_right, lat_bottom)
  const viewbox = '16.0,48.4,16.6,48.0';
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=at&viewbox=${viewbox}&bounded=1&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Suggestion fetch error', e);
    return [];
  }
}

function showLocationSuggestions(items) {
  const box = document.getElementById('loc-search-suggestions');
  if (!box) return;
  box.innerHTML = '';
  if (!items || items.length === 0) { box.style.display = 'none'; return; }
  items.forEach(it => {
    const div = document.createElement('div');
    div.className = 'loc-suggestion';
    div.style.padding = '6px';
    div.style.cursor = 'pointer';
    div.style.borderRadius = '4px';
    div.textContent = it.display_name;
    div.onclick = () => selectSuggestion(it);
    div.onmouseover = () => div.style.background = 'rgba(0,0,0,0.04)';
    div.onmouseout = () => div.style.background = 'transparent';
    box.appendChild(div);
  });
  box.style.display = 'block';
}

function hideLocationSuggestions() {
  const box = document.getElementById('loc-search-suggestions');
  if (box) box.style.display = 'none';
}

function selectSuggestion(item) {
  if (!item) return;
  const lat = parseFloat(item.lat);
  const lon = parseFloat(item.lon);
  manualPos = { lat: lat, lng: lon };
  // Remove previous manual marker
  if (window._manualMarker) mapInstance.removeLayer(window._manualMarker);
  window._manualMarker = L.circleMarker([lat, lon], {
    radius: 10, color: '#bf2c1e', fillColor: '#bf2c1e', fillOpacity: .5, weight: 2,
  }).addTo(mapInstance);
  mapInstance.setView([lat, lon], Math.max(mapInstance.getZoom(), 15));
  window._pendingLocText = `${lat.toFixed(5)}, ${lon.toFixed(5)} (search)`;
  const qEl = document.getElementById('loc-search-input');
  if (qEl) qEl.value = item.display_name;
  const t = document.getElementById('loc-text'); if (t) t.textContent = window._pendingLocText;
  const dot = document.getElementById('loc-dot'); if (dot) dot.className = 'loc-dot found';
  hideLocationSuggestions();
}

// Wire input events (debounced)
const _locInput = document.getElementById && document.getElementById('loc-search-input');
if (_locInput) {
  const deb = debounce(async function () {
    const q = _locInput.value.trim();
    if (!q || q.length < 2) { hideLocationSuggestions(); return; }
    const items = await fetchLocationSuggestions(q);
    showLocationSuggestions(items);
  }, 300);
  _locInput.addEventListener('input', deb);
  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    const box = document.getElementById('loc-search-suggestions');
    if (!box) return;
    if (e.target === _locInput || box.contains(e.target)) return;
    hideLocationSuggestions();
  });
}
