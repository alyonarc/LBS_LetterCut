// ══════════════════════════════════════════
// LETTERCUT — js/leaderboard.js
// ══════════════════════════════════════════

function lbTab(el, key) {
  document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderLB(key);
}

async function renderLB(key) {
  console.log("🚀 New version of the leaderboard is launched!");
  
  const lbList = document.getElementById('lb-list');
  lbList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">Downloading rating...</div>';

  if (!window.firestoreGetLeaderboard) {
    console.error("❌ Funktion firestoreGetLeaderboard/ is not found");/ н/
    return;
  }

  try {
    const users = await window.firestoreGetLeaderboard();
    console.log("📥 Data from Firebase received:", users);
    
    if (users.length === 0) {
      lbList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--muted);">No data yet. Collect your first letter!</div>';
      return;
    }

    lbList.innerHTML = users.map((p, index) => {
      const rank = index + 1;
      const isMe = p.id === window.currentUserId;
      const name = p.name || 'Anonymous';
      const words = p.words || [];
      const pts = p.pts || 0;
      
      const recentWords = words.slice(-3).join(' · ');

      return `
        <div class="lb-row${isMe ? ' me' : ''}">
          <div class="lb-rank${rank <= 3 ? ' top' : ''}">
            ${rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : rank}
          </div>
          <div class="lb-av">${name[1] ? name[1].toUpperCase() : name[0].toUpperCase()}</div>
          <div class="lb-info">
            <div class="lb-name${isMe ? ' me' : ''}">${name}</div>
            <div class="lb-words">${recentWords || 'No words'}</div>
          </div>
          <div class="lb-pts">${pts}</div>
        </div>`;
    }).join('');
  } catch (error) {
    console.error("❌  Leader table download  error ", error);
    lbList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--red);">Failed to download data from the database</div>';
  }
}

