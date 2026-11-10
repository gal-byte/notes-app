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

  addPlaceholder: 'מה לשמור?',
  addHint: 'כותבים כל דבר, והאפליקציה מנחשת לאיזו קבוצה הוא שייך. אפשר ללחוץ על התווית כדי לשנות.',
  addShortcuts: 'קיצורים: ת: תזכורת · ש: שיר · ס: סרט · מ: מתכון',
  send: 'שליחה',
  undo: 'ביטול',
  savedIn: group => `נשמר ב־${group.emoji} ${group.name}`,
  today: 'היום',
  tomorrow: 'מחר',
  everyYear: 'כל שנה',

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

// "2026-03-12" → "היום" / "מחר" / "12/3" / "12/3/2027"
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysAway = Math.round((date - today) / 86400000);

  if (daysAway === 0) return TEXT.today;
  if (daysAway === 1) return TEXT.tomorrow;
  return year === today.getFullYear() ? `${day}/${month}` : `${day}/${month}/${year}`;
}

// Small label like "🎂 תזכורות · מחר · כל שנה"
function groupLabel(groupId, fields) {
  const group = findGroup(groupId);
  let label = `${group.emoji} ${group.name}`;
  if (fields.date) label += ` · ${formatDate(fields.date)}`;
  if (fields.repeatYearly) label += ` · ${TEXT.everyYear}`;
  return label;
}

// One chat bubble on the Add screen
function bubble(item) {
  return `
    <div class="bubble">
      <div dir="auto">${escapeHtml(item.title)}</div>
      <div class="bubble-label">${groupLabel(item.group, item)}</div>
    </div>
  `;
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

// The Add screen looks like a chat: what you saved appears as
// bubbles, and you type at the bottom.
async function addScreen() {
  const groupButtons = GROUPS.map(group =>
    `<button type="button" class="chip" data-group="${group.id}">${group.emoji} ${group.name}</button>`
  ).join('');

  return `
    <div class="chat" id="chat">${await chatBubbles()}</div>

    <form class="composer" id="composer">
      <div class="composer-inner">
        <div class="toast" id="toast" hidden></div>
        <button type="button" class="chip guess-chip" id="guess-chip" hidden></button>
        <div class="group-picker" id="group-picker" hidden>${groupButtons}</div>
        <div class="composer-row">
          <textarea id="quick-text" rows="1" dir="auto" placeholder="${TEXT.addPlaceholder}"></textarea>
          <button class="send-button" aria-label="${TEXT.send}">
            <svg viewBox="0 0 24 24"><path d="M19 12H5m6-6-6 6 6 6"/></svg>
          </button>
        </div>
      </div>
    </form>
  `;
}

async function chatBubbles() {
  const items = (await getRecentItems(30)).reverse();  // oldest at top, newest at bottom
  if (!items.length) {
    return `<p class="empty">${TEXT.addHint}<br><br>${TEXT.addShortcuts}</p>`;
  }
  return items.map(bubble).join('');
}

// Makes the Add screen work: live guessing, picking a group, sending, undo
function setupAddScreen() {
  const form = document.getElementById('composer');
  const textBox = document.getElementById('quick-text');
  const guessChip = document.getElementById('guess-chip');
  const picker = document.getElementById('group-picker');
  const toast = document.getElementById('toast');
  const chat = document.getElementById('chat');

  let chosenGroup = null;  // set when you tap a group yourself
  let toastTimer = null;

  // Update the guess label while typing
  function updateGuess() {
    // Grow the box with the text (up to a limit set in style.css)
    textBox.style.height = 'auto';
    textBox.style.height = textBox.scrollHeight + 'px';

    if (!textBox.value.trim()) {
      guessChip.hidden = true;
      picker.hidden = true;
      chosenGroup = null;
      return;
    }
    const { group, fields } = analyzeQuickAdd(textBox.value, chosenGroup);
    guessChip.textContent = groupLabel(group, fields) + ' ▾';
    guessChip.hidden = false;
  }

  function scrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
  }

  function showToast(html) {
    toast.innerHTML = html;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 5000);
  }

  textBox.addEventListener('input', updateGuess);

  // Tap the label → show all groups; tap a group → use it
  guessChip.addEventListener('click', () => { picker.hidden = !picker.hidden; });
  picker.addEventListener('click', event => {
    const button = event.target.closest('[data-group]');
    if (!button) return;
    chosenGroup = button.dataset.group;
    picker.hidden = true;
    updateGuess();
  });

  // Send
  form.addEventListener('submit', async event => {
    event.preventDefault();  // stop the browser from reloading the page
    if (!textBox.value.trim()) return;

    const { group, fields } = analyzeQuickAdd(textBox.value, chosenGroup);
    const item = await addItem(group, fields);

    textBox.value = '';
    updateGuess();
    chat.innerHTML = await chatBubbles();
    scrollToBottom();

    showToast(`<span>${TEXT.savedIn(findGroup(group))}</span>
               <button type="button" id="undo-button">${TEXT.undo}</button>`);
    document.getElementById('undo-button').addEventListener('click', async () => {
      await deleteItem(item.id);
      toast.hidden = true;
      chat.innerHTML = await chatBubbles();
    });
  });

  // Keep the keyboard open when tapping buttons in the box
  form.addEventListener('mousedown', event => {
    if (event.target.closest('button')) event.preventDefault();
  });

  // While typing, hide the bottom tabs to leave more room
  textBox.addEventListener('focus', () => document.body.classList.add('typing'));
  textBox.addEventListener('blur', () => document.body.classList.remove('typing'));

  scrollToBottom();
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
    html = await addScreen();
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
  document.body.dataset.page = tab;  // lets style.css style each screen
  document.body.classList.remove('typing');
  document.getElementById('back-button').hidden = !showBack;
  document.title = title === TEXT.appName ? title : `${title} · ${TEXT.appName}`;

  // Highlight the current tab
  document.querySelectorAll('.tabbar a').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tab);
  });

  window.scrollTo(0, 0);

  // Screens with buttons and typing need extra setup
  if (tab === 'add') setupAddScreen();
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
