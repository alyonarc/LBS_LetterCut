// ══════════════════════════════════════════
// LETTERCUT — js/profile.js
// ══════════════════════════════════════════

function renderProfile() {
  // Avatar & info (driven by CURRENT_USER in mockdata.js)
  document.getElementById('profile-av-letter').textContent = CURRENT_USER.avatar;
  document.getElementById('profile-name').textContent      = CURRENT_USER.name;
  document.getElementById('profile-handle').textContent    = `${CURRENT_USER.handle} · ${CURRENT_USER.city}`;
  document.getElementById('profile-rank-badge').textContent = `★ Rank #${CURRENT_USER.rank} this week`;

  document.getElementById('stat-pts').textContent = "0";
  document.getElementById('stat-letters').textContent = "0";
  document.getElementById('stat-walks').textContent = "0";

  if (window.currentUserId && window.firestoreGetUserStats) {
    window.firestoreGetUserStats(window.currentUserId).then(myData => {
      if (myData) {
        document.getElementById('stat-pts').textContent = myData.pts || 0;
        
        const words = myData.words || [];
        if (words.length > 0) {
          const cleanWords = words.filter(w => !w.startsWith('UPLOAD_'));
          document.getElementById('words-wrap').innerHTML = cleanWords.map(w => `<div class="word-chip">${w}</div>`).join('');
          document.getElementById('stat-walks').textContent = cleanWords.length;
        } else {
          document.getElementById('words-wrap').innerHTML = '<div style="color:var(--muted);font-size:13px;">No collected words yet</div>';
        }
      }
    }).catch(e => console.error("Profile loading error:", e));
  }

  if (window.currentUserId && window.firestoreGetUserLetterCount) {
    window.firestoreGetUserLetterCount(window.currentUserId).then(count => {
        document.getElementById('stat-letters').textContent = count;
    }).catch(e => console.error("Letter count error:", e));
  }

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

  // Render reported letters section (inline cards, owner view)
  const reportsSection = document.getElementById('profile-reports-section');
  const reportsListEl  = document.getElementById('reported-letters-list');
  const myReports = (window.REPORTS || []).filter(
    r => r.letterOwnerId === window.currentUserId && !r.resolved && !r.ownerDismissed
  );
  if (reportsSection && reportsListEl) {
    reportsSection.style.display = '';
    if (myReports.length > 0) {
      reportsListEl.innerHTML = myReports.map(r => `
        <div class="reported-letter-card">
          <div class="reported-letter-badge">
            ${r.letter}
            <span class="report-dot">!</span>
          </div>
          <div class="reported-letter-info">
            <div class="reported-letter-char">Letter "${r.letter}"</div>
            <div class="reported-letter-reason">${r.reasonText}</div>
          </div>
          <div class="reported-letter-actions">
            <button class="pri" onclick="goToLetterOnMap('${r.letterId}')">See on map</button>
            <button onclick="openReportedReview('${r.letterId}')">Review</button>
          </div>
        </div>`).join('');
    } else {
      reportsListEl.innerHTML = '<div class="no-reports">No reported letters</div>';
    }
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
