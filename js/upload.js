// ══════════════════════════════════════════
// LETTERCUT — js/upload.js
// Add Letter form: photo capture, letter
// picker, map-based location selection
// ══════════════════════════════════════════

let selLetter = null, uploadPhotoUrl = null, manualPos = null;

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
function previewPhoto(e) {
  const f = e.target.files[0];
  if (!f) return;
  uploadPhotoUrl = URL.createObjectURL(f);
  const img = document.getElementById('preview-img');
  img.src = uploadPhotoUrl;
  img.style.display = 'block';
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
      try {
        await window.firestoreUpdateLetter(window._editingLetterId, updateData);
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
  document.getElementById('preview-img').style.display = 'none';
  document.getElementById('upload-desc').value = '';
  document.getElementById('file-camera').value = '';
  document.getElementById('file-gallery').value = '';
  document.getElementById('loc-map-hint').style.display = 'none';
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
