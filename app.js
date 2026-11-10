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
  addShortcuts: 'קיצורים:<br>ת: תזכורת · ש: שיר<br>ס: סרט · מ: מתכון',
  send: 'שליחה',
  undo: 'ביטול',
  savedIn: group => `נשמר ב־${groupTitle(group)}`,
  today: 'היום',
  tomorrow: 'מחר',
  everyYear: 'כל שנה',

  // Your own groups
  newGroup: 'קבוצה חדשה',
  editGroup: 'עריכת קבוצה',
  editGroupButton: '✏️ עריכת הקבוצה',
  groupName: 'שם',
  groupNameHint: 'למשל: מתנות, ספרים, רעיונות',
  groupEmoji: 'אימוג׳י',
  groupShortcut: 'קיצור להוספה מהירה (לא חובה)',
  groupShortcutHint: 'למשל: ר  ←  ואז כותבים "ר: ..."',
  groupOrder: 'מיקום ברשימה',
  moveEarlier: '→ הזזה קדימה',
  moveLater: 'הזזה אחורה ←',
  createGroup: 'יצירת הקבוצה',
  saveGroup: 'שמירה',
  deleteGroup: 'מחיקת הקבוצה',
  groupNameNeeded: 'צריך לתת לקבוצה שם',
  groupNameTaken: 'כבר יש קבוצה בשם הזה',
  shortcutTaken: 'הקיצור הזה כבר בשימוש',
  confirmDeleteGroup: (name, count) => count === 0
    ? `למחוק את הקבוצה "${name}"?`
    : `למחוק את הקבוצה "${name}"? ${count === 1 ? 'הפריט שבה יעבור' : `${count} הפריטים שבה יעברו`} ל"לא ממוין".`,

  // Calendar
  weekdaysShort: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'],
  prevMonth: 'החודש הקודם',
  nextMonth: 'החודש הבא',
  noRemindersThisDay: 'אין תזכורות ביום הזה',
  newReminderThisDay: 'תזכורת ביום הזה',

  emptyGroup: 'אין עדיין פריטים בקבוצה הזו',

  // Lists
  newItem: 'פריט חדש',
  untitled: 'ללא כותרת',
  all: 'הכל',
  upcomingTitle: 'בקרוב',
  pastTitle: 'עבר',
  recommendedBy: name => `המלצה של ${name}`,

  // Item screen
  saved: 'נשמר ✓',
  timeHint: 'למשל 1020 או 17:30',
  typeTitleToSave: 'יישמר אחרי שתכתבו כותרת',
  moveToGroup: 'קבוצה',
  deleteItem: 'מחיקה',
  confirmDelete: 'למחוק את הפריט? אי אפשר לבטל את זה.',
  addPhoto: '📷 הוספת תמונה',
  changePhoto: '📷 החלפת תמונה',
  removePhoto: 'הסרה',
  photoError: 'לא הצלחתי לפתוח את התמונה. אפשר לנסות תמונה אחרת.',

  // Functions, because the words change with the number
  itemCount: n => n === 0 ? 'ריק' : n === 1 ? 'פריט אחד' : `${n} פריטים`,
  inDays: n => `בעוד ${n} ימים`,
};

// ============================================================
// GROUPS
// The built-in sections. Groups you create yourself are added
// after them when the app starts (see loadGroups in groups.js).
// ============================================================
const BUILT_IN_GROUPS = [
  { id: 'reminders', name: 'תזכורות', emoji: '🎂' },
  { id: 'songs',     name: 'שירים',   emoji: '🎵' },
  { id: 'movies',    name: 'סרטים',   emoji: '🎬' },
  { id: 'recipes',   name: 'מתכונים', emoji: '🍲' },
  { id: 'inbox',     name: 'לא ממוין', emoji: '📥' },
];
let GROUPS = [...BUILT_IN_GROUPS];

// "🎁 מתנות" – safe to put inside HTML (your group names could contain anything)
function groupTitle(group) {
  return `${escapeHtml(group.emoji)} ${escapeHtml(group.name)}`;
}

// Find a group by its id. Unknown ids fall back to לא ממוין,
// so an item never gets lost.
function findGroup(id) {
  return GROUPS.find(group => group.id === id) || GROUPS.find(group => group.id === 'inbox');
}

function groupExists(id) {
  return GROUPS.some(group => group.id === id);
}

// ============================================================
// HELPERS FOR SHOWING ITEMS
// (the lists themselves are in sections.js)
// ============================================================

// Makes text safe to put inside HTML. Without this, typing
// something like "<b>" or a quote mark in a note would break the page.
function escapeHtml(text) {
  const safe = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text ?? '').replace(/[&<>"']/g, char => safe[char]);
}

// "2026-03-12" → "היום" / "מחר" / "יום שישי 13/11" / "12/3" / "12/3/2027"
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysAway = Math.round((date - today) / 86400000);

  if (daysAway === 0) return TEXT.today;
  if (daysAway === 1) return TEXT.tomorrow;

  const short = year === today.getFullYear() ? `${day}/${month}` : `${day}/${month}/${year}`;
  // Within the next two weeks, also say the weekday ("יום שישי 20/11"),
  // so it's clear which Friday was meant
  if (daysAway > 1 && daysAway < 14) {
    return `${date.toLocaleDateString('he-IL', { weekday: 'long' })} ${short}`;
  }
  return short;
}

// Small label like "🎂 תזכורות · מחר · כל שנה"
function groupLabel(groupId, fields) {
  const group = findGroup(groupId);
  let label = groupTitle(group);
  if (fields.date) label += ` · ${formatDate(fields.date)}`;
  if (fields.time) label += ` · ${fields.time}`;
  if (fields.repeatYearly) label += ` · ${TEXT.everyYear}`;
  return label;
}

// One chat bubble on the Add screen
function bubble(item) {
  return `
    <a class="bubble" href="#/item/${item.id}">
      <div dir="auto">${escapeHtml(item.title)}</div>
      <div class="bubble-label">${groupLabel(item.group, item)}</div>
    </a>
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
  const upcoming = await upcomingReminders(5);
  const recent = await getRecentItems(5);

  const upcomingHtml = upcoming.length
    ? listCard(upcoming.map(r => reminderRow(r, false)))
    : emptyCard('🗓️', TEXT.noUpcoming);

  const recentHtml = recent.length
    ? listCard(recent.map(item => itemRow(item, '', { emoji: findGroup(item.group).emoji })))
    : emptyCard('✨', TEXT.noRecent);

  return `
    <h2 class="section-title">${TEXT.upcoming}</h2>
    ${upcomingHtml}

    <h2 class="section-title">${TEXT.recent}</h2>
    ${recentHtml}
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
    `<button type="button" class="chip" data-group="${group.id}">${groupTitle(group)}</button>`
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
    guessChip.innerHTML = groupLabel(group, fields) + ' ▾';
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

    // Clear the box right away, so you can start typing the next one
    // while this one is still being saved
    textBox.value = '';
    updateGuess();

    const item = await addItem(group, fields);
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

  scrollToBottom();
}

async function groupsScreen() {
  const counts = await countItemsPerGroup();

  // Build one tile per group, then join them into one piece of HTML
  const tiles = GROUPS.map(group => `
    <a class="group-tile" href="#/group/${group.id}">
      <span class="emoji">${escapeHtml(group.emoji)}</span>
      ${escapeHtml(group.name)}
      <span class="count">${TEXT.itemCount(counts[group.id] || 0)}</span>
    </a>
  `).join('');

  // The last tile creates a new group
  const newTile = `
    <a class="group-tile new-group-tile" href="#/group-settings/new">
      <span class="emoji">＋</span>
      ${TEXT.newGroup}
    </a>`;

  return `<div class="groups-grid">${tiles}${newTile}</div>`;
}

// Filter chips (like "🍿 לראות / ✔️ ראיתי") show only the
// matching rows. Works on any screen that has them.
function setupFilters() {
  const chips = document.querySelectorAll('[data-filter]');
  if (!chips.length) return;

  function apply(value) {
    chips.forEach(chip => chip.classList.toggle('selected', chip.dataset.filter === value));
    document.querySelectorAll('[data-filter-values]').forEach(row => {
      row.hidden = value !== '' && !row.dataset.filterValues.split('|').includes(value);
    });
  }

  chips.forEach(chip => chip.addEventListener('click', () => apply(chip.dataset.filter)));
  const selected = document.querySelector('[data-filter].selected');
  apply(selected ? selected.dataset.filter : '');
}

// ============================================================
// NAVIGATION
// The address ends with a "hash" like #/home or #/group/songs.
// Whenever it changes, we draw the matching screen.
// This also makes the phone's back button work for free.
// ============================================================

// Decide which screen an address means. Returns:
//   title – text in the top bar
//   html  – the screen's content
//   tab   – which bottom tab to highlight
//   back  – where the back arrow goes (no back arrow if missing)
//   setup – extra code to run after the screen is shown
async function buildScreen(page, id, extra) {
  if (page === 'search') {
    return { title: TEXT.search, html: searchScreen(), tab: 'search' };
  }
  if (page === 'add') {
    return { title: TEXT.add, html: await addScreen(), tab: 'add', setup: setupAddScreen };
  }
  if (page === 'calendar') {
    return { title: TEXT.calendar, html: await calendarScreen(), tab: 'calendar', setup: setupCalendar };
  }
  if (page === 'groups') {
    return { title: TEXT.groups, html: await groupsScreen(), tab: 'groups' };
  }
  if (page === 'group' && groupExists(id)) {
    const group = findGroup(id);
    return { title: `${group.emoji} ${group.name}`, html: await groupScreen(group),
             tab: 'groups', back: '#/groups' };
  }
  if (page === 'new' && groupExists(id)) {
    // "#/new/reminders/2026-11-20" → a new reminder already set to that day
    const group = findGroup(id);
    return { title: `${group.emoji} ${group.name}`, html: newItemScreen(id, extra),
             tab: 'groups', back: `#/group/${id}`, setup: setupItemScreen };
  }
  if (page === 'group-settings') {
    // "#/group-settings/new" creates a group, "#/group-settings/g-12ab34cd" edits one
    const html = groupSettingsScreen(id);
    if (html) {
      return { title: id === 'new' ? TEXT.newGroup : TEXT.editGroup, html,
               tab: 'groups', back: id === 'new' ? '#/groups' : `#/group/${id}`,
               setup: setupGroupSettings };
    }
  }
  if (page === 'item') {
    const html = await itemScreen(id);
    if (html) {
      const group = findGroup(editor.group);
      return { title: `${group.emoji} ${group.name}`, html,
               tab: 'groups', back: `#/group/${group.id}`, setup: setupItemScreen };
    }
  }
  // Anything unknown (or no hash at all) → home
  return { title: TEXT.appName, html: await homeScreen(), tab: 'home' };
}

// Counts screen changes. If you tap quickly, an older screen
// that's still loading must not replace the newer one.
let latestScreen = 0;

async function showScreen() {
  const thisScreen = ++latestScreen;

  // Save any unsaved typing on the item screen we're leaving
  if (flushEditor) {
    const flush = flushEditor;
    flushEditor = null;
    await flush();
  }

  const oldPhotoUrls = takePhotoUrls();

  // "#/group/songs" → ["group", "songs"]
  const [page, id, extra] = location.hash.replace('#/', '').split('/');
  const screen = await buildScreen(page, id, extra);

  if (thisScreen !== latestScreen) return;  // a newer screen took over

  document.getElementById('screen-title').textContent = screen.title;
  document.getElementById('screen').innerHTML = screen.html;
  document.body.dataset.page = screen.tab;  // lets style.css style each screen
  document.title = screen.title === TEXT.appName ? screen.title : `${screen.title} · ${TEXT.appName}`;

  const backButton = document.getElementById('back-button');
  backButton.hidden = !screen.back;
  if (screen.back) backButton.href = screen.back;

  // Highlight the current tab
  document.querySelectorAll('.tabbar a').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === screen.tab);
  });

  window.scrollTo(0, 0);
  oldPhotoUrls.forEach(url => URL.revokeObjectURL(url));  // free photos of the old screen

  setupFilters();
  if (screen.setup) screen.setup();
}

// Fill in the tab bar labels from TEXT
document.querySelectorAll('[data-text]').forEach(element => {
  element.textContent = TEXT[element.dataset.text];
});

// The back arrow: go back like the phone's back button, but if
// the app was opened straight on this screen, go to the arrow's address.
let movedInsideApp = false;
document.getElementById('back-button').addEventListener('click', event => {
  if (movedInsideApp) {
    event.preventDefault();
    history.back();
  }
});

// Draw the right screen now, and every time the address changes
window.addEventListener('hashchange', () => {
  movedInsideApp = true;
  showScreen();
});

// Load your own groups first, then draw the first screen
loadGroups().then(showScreen);

// Save unsaved typing if you switch apps or close this one
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && flushEditor) flushEditor();
});

// Ask the phone to keep our data safe (see db.js)
askForPersistentStorage();
