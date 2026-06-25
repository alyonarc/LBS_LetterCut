// ══════════════════════════════════════════
// LETTERCUT — js/profile.js
// ══════════════════════════════════════════

function renderProfile() {
  document.getElementById('profile-av-letter').textContent = CURRENT_USER.avatar || '?';
  document.getElementById('profile-name').textContent      = CURRENT_USER.name || 'Anonymous';
  document.getElementById('profile-handle').textContent    = `${CURRENT_USER.handle || '@player'} · Vienna`;

  // Сначала ставим нули
  document.getElementById('stat-pts').textContent = "0";
  document.getElementById('stat-letters').textContent = "0";
  document.getElementById('stat-walks').textContent = "0";

  // Подгружаем реальные очки и прогулки
  if (window.currentUserId && window.firestoreGetUserStats) {
    window.firestoreGetUserStats(window.currentUserId).then(myData => {
      if (myData) {
        document.getElementById('stat-pts').textContent = myData.pts || 0;
        
        const words = myData.words || [];
        if (words.length > 0) {
          // Исключаем системный мусор (на всякий случай, чтобы удалить твои старые баги из базы)
          const cleanWords = words.filter(w => !w.startsWith('UPLOAD_'));
          
          document.getElementById('words-wrap').innerHTML = cleanWords.map(w => `<div class="word-chip">${w}</div>`).join('');
          document.getElementById('stat-walks').textContent = cleanWords.length;
        } else {
          document.getElementById('words-wrap').innerHTML = '<div style="color:var(--muted);font-size:13px;">Пока нет собранных слов</div>';
        }
      }
    }).catch(e => console.error("Ошибка загрузки профиля:", e));
  }

  // Подгружаем реальное количество добавленных букв
  if (window.currentUserId && window.firestoreGetUserLetterCount) {
    window.firestoreGetUserLetterCount(window.currentUserId).then(count => {
        document.getElementById('stat-letters').textContent = count;
    }).catch(e => console.error("Ошибка подсчета букв:", e));
  }

  // История и жалобы остаются как есть...
  document.getElementById('journey-list').innerHTML = CURRENT_USER.journeys.map(j => `
      <div class="journey-item">
        <div class="journey-icon">🗺️</div>
        <div class="journey-info">
          <div class="journey-word">${j.word}</div>
          <div class="journey-meta">${j.date} · ${j.dist}</div>
        </div>
        <div class="journey-pts">+${j.pts}</div>
      </div>`).join('');

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
}