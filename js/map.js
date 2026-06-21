// ══════════════════════════════════════════
// LETTERCUT — js/map.js
// Leaflet map, GPS tracking, letter markers,
// walk path drawing, proximity checks
// ══════════════════════════════════════════

let mapInstance, userPos = null, userMarker = null;
let walkLetters = [], walkPath = [], walkPolyline = null;
let mapMode = 'explore';
const markerMap = new Map(); // letter id → Leaflet marker
let gpsWatchId = null;
let locationEnabled = true;

const allLetters = () => [...LETTERS, ...userLetters];

// ── INIT ──────────────────────────────────
function initMap() {
  const navH = document.getElementById('bottom-nav').offsetHeight;
  document.getElementById('map').style.height = (window.innerHeight - navH) + 'px';

  mapInstance = L.map('map', { zoomControl: false, attributionControl: true })
    .setView(VIENNA, 15);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(mapInstance);

  LETTERS.forEach(l => addMarker(l, false));
  setTimeout(() => mapInstance.invalidateSize(), 200);
  startGPS();
}

// ── MARKERS ───────────────────────────────
function makeIcon(letter, isMine, isNearby) {
  const el = document.createElement('div');
  el.className = 'lc-pin' + (isMine ? ' mine' : ' other') + (isNearby ? ' nearby' : '');
  el.textContent = letter;
  return L.divIcon({ html: el, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
}

function addMarker(l, isUser) {
  const nearby = isNearby(l);
  const marker = L.marker([l.lat, l.lng], {
    icon: makeIcon(l.letter, l.mine || isUser, nearby),
  }).addTo(mapInstance);
  marker.on('click', () => openLetterModal(l, isUser));
  markerMap.set(l.id, marker);
  return marker;
}

function refreshMarkerStyles() {
  allLetters().forEach(l => {
    const m = markerMap.get(l.id);
    if (!m) return;
    const isUser = userLetters.includes(l);
    m.setIcon(makeIcon(l.letter, l.mine || isUser, isNearby(l)));
  });
}

// ── LOCATION SHARING TOGGLE ───────────────
function setLocationSharing(enabled) {
  locationEnabled = enabled;

  if (!enabled) {
    if (gpsWatchId !== null) {
      navigator.geolocation.clearWatch(gpsWatchId);
      gpsWatchId = null;
    }
    userPos = null;
    if (userMarker) {
      mapInstance.removeLayer(userMarker);
      userMarker = null;
    }
    refreshMarkerStyles();
    // Exit walk mode if active — it requires location
    if (mapMode === 'walk') setMode('explore');
  } else {
    startGPS();
  }
}

function toggleLocation(toggleEl) {
  const turningOn = !toggleEl.classList.contains('on');
  toggleEl.classList.toggle('on');
  setLocationSharing(turningOn);
  showToast(turningOn ? 'Location sharing on' : 'Location sharing off');
}

// ── GPS ───────────────────────────────────
function startGPS() {
  if (!navigator.geolocation) return;

  gpsWatchId = navigator.geolocation.watchPosition(
    pos => {
      userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };

      if (!userMarker) {
        const icon = L.divIcon({
          html: `<div style="width:14px;height:14px;background:#bf2c1e;border:3px solid white;border-radius:50%;box-shadow:0 0 0 4px rgba(191,44,30,.25)"></div>`,
          className: '', iconSize: [14, 14], iconAnchor: [7, 7],
        });
        userMarker = L.marker([userPos.lat, userPos.lng], { icon, zIndexOffset: 1000 })
          .addTo(mapInstance);
        mapInstance.setView([userPos.lat, userPos.lng], 15);
      } else {
        userMarker.setLatLng([userPos.lat, userPos.lng]);
      }

      updateLocField();
      refreshMarkerStyles();

      // Extend walk path
      if (mapMode === 'walk') {
        walkPath.push([userPos.lat, userPos.lng]);
        if (walkPolyline) {
          walkPolyline.setLatLngs(walkPath);
        } else {
          walkPolyline = L.polyline(walkPath, {
            color: '#bf2c1e', weight: 3, dashArray: '7 5', opacity: .8,
          }).addTo(mapInstance);
        }
      }
    },
    err => console.warn('GPS error:', err.message),
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
  );
}

// ── PROXIMITY ─────────────────────────────
function distanceTo(l) {
  if (!userPos) return Infinity;
  return mapInstance.distance([userPos.lat, userPos.lng], [l.lat, l.lng]);
}

function isNearby(l) {
  return distanceTo(l) <= COLLECT_RADIUS_M;
}

// ── CONTROLS ──────────────────────────────
function mapCenter() {
  mapInstance.setView(userPos ? [userPos.lat, userPos.lng] : VIENNA, 15, { animate: true });
}

function mapZoom(dir) {
  dir > 0 ? mapInstance.zoomIn() : mapInstance.zoomOut();
}

// ── WALK MODE ─────────────────────────────
function setMode(mode) {
  if (mode === 'walk' && !locationEnabled) {
    showToast('Enable location sharing in Profile → Settings to use Walk mode');
    return;
  }

  mapMode = mode;
  document.getElementById('btn-explore').classList.toggle('active', mode === 'explore');
  document.getElementById('btn-walk').classList.toggle('active', mode === 'walk');

  const bar = document.getElementById('walk-bar');
  if (mode === 'walk') {
    bar.classList.add('on');
    walkLetters = [];
    walkPath = userPos ? [[userPos.lat, userPos.lng]] : [];
    if (walkPolyline) { mapInstance.removeLayer(walkPolyline); walkPolyline = null; }
    renderChips();
    showToast('Walk mode on — get close to collect!');
  } else {
    bar.classList.remove('on');
  }
}

function renderChips() {
  const el = document.getElementById('walk-chips');
  const actions = document.getElementById('walk-actions');
  if (walkLetters.length === 0) {
    el.innerHTML = '<span class="wempty">tap nearby pins to collect…</span>';
    actions.style.display = 'none';
  } else {
    el.innerHTML = walkLetters.map(l => `<div class="wchip">${l}</div>`).join('');
    actions.style.display = 'flex';
  }
}

function undoLastLetter() {
  if (walkLetters.length === 0) return;
  walkLetters.pop();
  renderChips();
}

function finishWord() {
  if (walkLetters.length === 0) { showToast('Collect at least one letter first'); return; }
  showPostcard();
}
