// ══════════════════════════════════════════
// LETTERCUT — js/profile.js
// ══════════════════════════════════════════

function renderProfile() {
  // Avatar & info (driven by CURRENT_USER in mockdata.js)
  document.getElementById('profile-av-letter').textContent = CURRENT_USER.avatar;
  document.getElementById('profile-name').textContent      = CURRENT_USER.name;
  document.getElementById('profile-handle').textContent    = `${CURRENT_USER.handle} · ${CURRENT_USER.city}`;
  document.getElementById('profile-rank-badge').textContent = `★ Rank #${CURRENT_USER.rank} this week`;

  document.getElementById('stat-pts').textContent     = CURRENT_USER.pts;
  // Revert to static CURRENT_USER value for letters (dynamic counting disabled)
  document.getElementById('stat-letters').textContent = CURRENT_USER.letters;
  document.getElementById('stat-walks').textContent   = CURRENT_USER.walks;

  // Words collected
  document.getElementById('words-wrap').innerHTML =
    CURRENT_USER.words.map(w => `<div class="word-chip">${w}</div>`).join('');

  // Journey history
  document.getElementById('journey-list').innerHTML =
    CURRENT_USER.journeys.map(j => `
      <div class="journey-item">
        <div class="journey-icon">🗺️</div>
        <div class="journey-info">
          <div class="journey-word">${j.word}</div>
          <div class="journey-meta">${j.date} · ${j.dist}</div>
        </div>
        <div class="journey-pts">+${j.pts}</div>
      </div>`).join('');

  // Show reported-letter warning if there are reports for this user's letters
  const container = document.getElementById('profile-av-letter').parentElement.parentElement;
  const existingWarn = document.getElementById('profile-report-warning');
  if (typeof hasReportsForCurrentUser === 'function' && hasReportsForCurrentUser()) {
    if (!existingWarn) {
      const warn = document.createElement('div');
      warn.id = 'profile-report-warning';
      warn.className = 'profile-warning';
      warn.textContent = 'Review the reported letter';
      warn.onclick = () => { if (typeof openReportedReview === 'function') openReportedReview(); };
      container.insertBefore(warn, container.firstChild);
    }
  } else if (existingWarn) {
    existingWarn.remove();
  }

  // Show Reports row (owner view) if they have any reports
  const reportsRow = document.getElementById('profile-reports-row');
  if (typeof window.REPORTS !== 'undefined' && window.REPORTS.some(r => r.letterOwnerId === window.currentUserId && !r.resolved)) {
    if (reportsRow) reportsRow.style.display = '';
  } else if (reportsRow) {
    reportsRow.style.display = 'none';
  }
}

/*
// Dynamic profile letter counting disabled — commented out per request.
function updateProfileCounts() {
  const el = document.getElementById('stat-letters');
  if (!el) return;
  // allLetters() returns combined list of seeded + user letters (defined in map.js)
  let count = 0;
  try {
    const all = typeof allLetters === 'function' ? allLetters() : ([]);
    count = all.filter(l => {
      const ownedById = l.userId && window.currentUserId && l.userId === window.currentUserId;
      const mineFlag = l.mine === true;
      const ownedByHandle = l.user && window.currentUserHandle && l.user === window.currentUserHandle;
      return ownedById || mineFlag || ownedByHandle;
    }).length;
  } catch (e) {
    // Fallback: try userLetters length if available
    if (typeof userLetters !== 'undefined' && Array.isArray(userLetters)) count = userLetters.length;
  }
  el.textContent = String(count);
}
*/
