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

  // A function, because the word changes with the number
  itemCount: n => n === 0 ? 'ריק' : n === 1 ? 'פריט אחד' : `${n} פריטים`,
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

function findGroup(id) {
  return GROUPS.find(group => group.id === id);
}

// ============================================================
// HELPERS FOR SHOWING ITEMS
// ============================================================

// Makes text safe to put inside HTML. Without this, typing
// something like "<b>" in a note would break the page.
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

// One line in a list. dir="auto" lets English titles show
// correctly inside the Hebrew layout.
function itemRow(item, showGroupEmoji) {
  const group = findGroup(item.group);
  const emoji = showGroupEmoji ? `<span class="emoji">${group ? group.emoji : '📝'}</span>` : '';
  return `
    <div class="item-row">
      ${emoji}
      <span class="item-title" dir="auto">${escapeHtml(item.title)}</span>
    </div>
  `;
}

function itemList(items, showGroupEmoji) {
  return `<div class="card list">${items.map(item => itemRow(item, showGroupEmoji)).join('')}</div>`;
}

function emptyCard(emoji, message) {
  return `<div class="card empty"><span class="emoji">${emoji}</span>${message}</div>`;
}

// ============================================================
// SCREENS
// Each function returns the HTML for one screen.
// "async" means it may wait for the database first.
// ============================================================

async function homeScreen() {
  const recent = await getRecentItems(5);

  return `
    <h2 class="section-title">${TEXT.upcoming}</h2>
    ${emptyCard('🗓️', TEXT.noUpcoming)}

    <h2 class="section-title">${TEXT.recent}</h2>
    ${recent.length ? itemList(recent, true) : emptyCard('✨', TEXT.noRecent)}
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

async function groupsScreen() {
  const counts = await countItemsPerGroup();

  // Build one tile per group, then join them into one piece of HTML
  const tiles = GROUPS.map(group => `
    <a class="group-tile" href="#/group/${group.id}">
      <span class="emoji">${group.emoji}</span>
      ${group.name}
      <span class="count">${TEXT.itemCount(counts[group.id] || 0)}</span>
    </a>
  `).join('');

  return `<div class="groups-grid">${tiles}</div>`;
}

async function groupScreen(group) {
  const items = await getItemsInGroup(group.id);
  return items.length ? itemList(items, false) : emptyCard(group.emoji, TEXT.emptyGroup);
}

// ============================================================
// NAVIGATION
// The address ends with a "hash" like #/home or #/group/songs.
// Whenever it changes, we draw the matching screen.
// This also makes the phone's back button work for free.
// ============================================================

// Counts screen changes. If you tap quickly, an older screen
// that's still loading must not replace the newer one.
let latestScreen = 0;

async function showScreen() {
  const thisScreen = ++latestScreen;

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
    html = await groupsScreen();
  } else if (page === 'group' && findGroup(id)) {
    const group = findGroup(id);
    title = `${group.emoji} ${group.name}`;
    html = await groupScreen(group);
    tab = 'groups';
    showBack = true;
  } else {
    // Anything unknown (or no hash at all) → home
    title = TEXT.appName;
    html = await homeScreen();
    tab = 'home';
  }

  if (thisScreen !== latestScreen) return;  // a newer screen took over

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

// Ask the phone to keep our data safe (see db.js)
askForPersistentStorage();
