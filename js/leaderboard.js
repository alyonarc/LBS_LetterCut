// ══════════════════════════════════════════
// LETTERCUT — js/leaderboard.js
// ══════════════════════════════════════════

function lbTab(el, key) {
  document.querySelectorAll('.lb-tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderLB(key);
}

function renderLB(key) {
  document.getElementById('lb-list').innerHTML = LB[key].map(p => `
    <div class="lb-row${p.me ? ' me' : ''}">
      <div class="lb-rank${p.rank <= 3 ? ' top' : ''}">
        ${p.rank <= 3 ? ['🥇','🥈','🥉'][p.rank - 1] : p.rank}
      </div>
      <div class="lb-av">${p.name[0]}</div>
      <div class="lb-info">
        <div class="lb-name${p.me ? ' me' : ''}">${p.name}</div>
        <div class="lb-words">${p.words.join(' · ')}</div>
      </div>
      <div class="lb-pts">${p.pts}</div>
    </div>`).join('');
}
