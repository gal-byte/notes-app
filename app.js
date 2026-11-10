// ============================================================
// TEXT
// Every word the app shows lives here, in one place.
// To change wording (or add English one day), edit only this.
// ============================================================
const TEXT = {
  appName: 'הפתקים שלי',
  home: 'בית',
  search: 'חיפוש',
  add: 'הוספה',
  calendar: 'לוח שנה',
  groups: 'קבוצות',

  upcoming: 'תזכורות קרובות',
  recent: 'נוסף לאחרונה',
  noUpcoming: 'אין תזכורות קרובות',
  noRecent: 'עוד לא הוספת כלום',

  searchPlaceholder: 'חיפוש בכל הפתקים…',
  searchHint: 'אפשר להקליד כדי לחפש בכל הקבוצות',

  addComingSoon: 'כאן תופיע תיבת ההוספה המהירה',
  calendarComingSoon: 'כאן יופיע לוח השנה',
  emptyGroup: 'אין עדיין פריטים בקבוצה הזו',
};

// ============================================================
// GROUPS
// The built-in sections. Later, groups you create yourself
// will be added to this same list.
// ============================================================
const GROUPS = [
  { id: 'reminders', name: 'תזכורות', emoji: '🎂' },
  { id: 'songs',     name: 'שירים',   emoji: '🎵' },
  { id: 'movies',    name: 'סרטים',   emoji: '🎬' },
  { id: 'recipes',   name: 'מתכונים', emoji: '🍲' },
  { id: 'inbox',     name: 'לא ממוין', emoji: '📥' },
];

// ============================================================
// SCREENS
// Each function returns the HTML for one screen.
// ============================================================

function homeScreen() {
  return `
    <h2 class="section-title">${TEXT.upcoming}</h2>
    <div class="card empty">
      <span class="emoji">🗓️</span>${TEXT.noUpcoming}
    </div>

    <h2 class="section-title">${TEXT.recent}</h2>
    <div class="card empty">
      <span class="emoji">✨</span>${TEXT.noRecent}
    </div>
  `;
}

function searchScreen() {
  return `
    <input class="search-input" type="search" placeholder="${TEXT.searchPlaceholder}">
    <p class="empty">${TEXT.searchHint}</p>
  `;
}

function addScreen() {
  return `
    <div class="card empty">
      <span class="emoji">✏️</span>${TEXT.addComingSoon}
    </div>
  `;
}

function calendarScreen() {
  return `
    <div class="card empty">
      <span class="emoji">📅</span>${TEXT.calendarComingSoon}
    </div>
  `;
}

function groupsScreen() {
  // Build one tile per group, then join them into one piece of HTML
  const tiles = GROUPS.map(group => `
    <a class="group-tile" href="#/group/${group.id}">
      <span class="emoji">${group.emoji}</span>
      ${group.name}
    </a>
  `).join('');

  return `<div class="groups-grid">${tiles}</div>`;
}

function groupScreen(group) {
  return `
    <div class="card empty">
      <span class="emoji">${group.emoji}</span>${TEXT.emptyGroup}
    </div>
  `;
}

// ============================================================
// NAVIGATION
// The address ends with a "hash" like #/home or #/group/songs.
// Whenever it changes, we draw the matching screen.
// This also makes the phone's back button work for free.
// ============================================================

function showScreen() {
  // "#/group/songs" → ["group", "songs"]
  const [page, id] = location.hash.replace('#/', '').split('/');

  let title;
  let html;
  let tab = page;          // which bottom tab to highlight
  let showBack = false;

  if (page === 'search') {
    title = TEXT.search;
    html = searchScreen();
  } else if (page === 'add') {
    title = TEXT.add;
    html = addScreen();
  } else if (page === 'calendar') {
    title = TEXT.calendar;
    html = calendarScreen();
  } else if (page === 'groups') {
    title = TEXT.groups;
    html = groupsScreen();
  } else if (page === 'group' && GROUPS.find(g => g.id === id)) {
    const group = GROUPS.find(g => g.id === id);
    title = `${group.emoji} ${group.name}`;
    html = groupScreen(group);
    tab = 'groups';
    showBack = true;
  } else {
    // Anything unknown (or no hash at all) → home
    title = TEXT.appName;
    html = homeScreen();
    tab = 'home';
  }

  document.getElementById('screen-title').textContent = title;
  document.getElementById('screen').innerHTML = html;
  document.getElementById('back-button').hidden = !showBack;
  document.title = title === TEXT.appName ? title : `${title} · ${TEXT.appName}`;

  // Highlight the current tab
  document.querySelectorAll('.tabbar a').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tab);
  });

  window.scrollTo(0, 0);
}

// Fill in the tab bar labels from TEXT
document.querySelectorAll('[data-text]').forEach(element => {
  element.textContent = TEXT[element.dataset.text];
});

// Draw the right screen now, and every time the address changes
window.addEventListener('hashchange', showScreen);
showScreen();
