// ============================================================
// TEXT
// Every word the app shows lives here, in one place.
// To change wording (or add English one day), edit only this.
// ============================================================
const TEXT = {
  appName: 'הפתקים שלי',
  search: 'חיפוש',
  calendar: 'לוח שנה',
  settings: 'הגדרות',
  back: 'חזרה',

  upcoming: 'בקרוב',
  groups: 'קבוצות',

  searchPlaceholder: 'חיפוש',
  searchNoResults: query => `לא נמצא כלום עבור "${query}"`,

  justNow: 'עכשיו',
  minutesAgo: n => n === 1 ? 'לפני דקה' : `לפני ${n} דק׳`,
  hoursAgo: n => n === 1 ? 'לפני שעה' : n === 2 ? 'לפני שעתיים' : `לפני ${n} שעות`,
  yesterday: 'אתמול',
  daysAgo: n => n === 2 ? 'לפני יומיים' : `לפני ${n} ימים`,

  addPlaceholder: 'משהו חדש…',
  addPlaceholderIn: name => `חדש ב${name}…`,
  send: 'שמירה',
  undo: 'ביטול',
  nothingHere: 'ריק',
  savedIn: group => `נשמר ב${groupTitle(group)}`,
  today: 'היום',
  tomorrow: 'מחר',
  everyYear: 'כל שנה',

  // Your own groups
  newGroup: 'קבוצה חדשה',
  editGroup: 'עריכת קבוצה',
  editGroupButton: 'עריכה',
  groupName: 'שם',
  groupNameHint: 'למשל: מתנות, ספרים',
  groupIcon: 'סמל וצבע',
  groupShortcut: 'קיצור',
  groupShortcutHint: 'למשל ר, ואז כותבים "ר: …"',
  groupOrder: 'מיקום',
  moveEarlier: 'למעלה',
  moveLater: 'למטה',
  createGroup: 'יצירה',
  saveGroup: 'שמירה',
  deleteGroup: 'מחיקת הקבוצה',
  groupNameNeeded: 'צריך שם',
  groupNameTaken: 'כבר יש קבוצה בשם הזה',
  shortcutTaken: 'הקיצור תפוס',
  confirmDeleteGroup: (name, count) => count === 0
    ? `למחוק את "${name}"?`
    : `למחוק את "${name}"? ${count === 1 ? 'הפריט שבה יעבור' : `${count} הפריטים שבה יעברו`} ל"לא ממוין".`,

  // Settings
  backupScreenTitle: 'הגדרות',
  backup: 'גיבוי',

  // Google Calendar
  addToCalendar: 'הוספה',
  calendarUpdate: 'עדכון',
  calendarInIt: 'ביומן',
  googleCalendar: 'Google Calendar',
  calendarAdding: 'מוסיף…',
  calendarAdded: 'נוסף ליומן',
  calendarAddAll: n => n === 1 ? 'תזכורת אחת עוד לא ביומן · הוספה' : `${n} תזכורות עוד לא ביומן · הוספה`,
  calendarAddingCount: (i, n) => `מוסיף… ${i}/${n}`,
  calendarAddedAll: n => n === 1 ? 'נוספה ליומן' : `${n} נוספו ליומן`,
  calendarNeedsTitle: 'צריך כותרת ותאריך',
  calendarNoPermission: 'לא התקבלה הרשאה ליומן',
  calendarError: 'משהו השתבש מול היומן',

  // Morning summary + notifications
  notifyTitle: 'סיכום בוקר',
  notifyTest: 'הודעת ניסיון',
  notifyTestSent: 'נשלחה',
  notifyBlocked: 'ההתראות חסומות בהגדרות של Chrome',
  notifyUnsupported: 'לא נתמך בדפדפן הזה',
  pushTitle: 'התראות',

  // Sync between devices (sync.js)
  syncTitle: 'סנכרון',
  syncLast: when => `מסונכרן ${when}`,
  syncNever: 'עוד לא סונכרן',
  syncNoServer: 'אין חיבור לשרת (Tailscale?)',

  // Where a reminder happens (places.js)
  placePlaceholder: 'מקום',
  placeOn: 'התראה כשצריך לצאת',
  placeNeedsTime: 'עם שעה תגיע התראה מתי לצאת',
  placeHint: '',
  placeDirections: 'איך מגיעים',
  about: 'בערך',
  placeClear: 'הסרה',
  placeHomeOf: 'הבית של',
  placeNotFound: 'לא נמצא',
  placeNoServer: 'אין חיבור לשרת',

  // Google Drive
  driveConnect: 'חיבור ל-Google Drive',
  driveBackup: 'גיבוי עכשיו',
  driveRestore: 'שחזור מהגיבוי',
  driveDisconnect: 'ניתוק מ-Drive',
  driveWorking: 'רגע…',
  driveSaved: 'נשמר בדרייב',
  driveNoBackup: 'עוד אין גיבוי בדרייב',
  driveNeedsInternet: 'צריך אינטרנט',
  driveNotReady: 'עוד רגע, אפשר ללחוץ שוב',
  driveCancelled: 'בוטל',
  googleWindowBlocked: 'החלון של Google לא נפתח, אפשר ללחוץ שוב',
  driveNoPermission: 'לא התקבלה הרשאה',
  driveTryAgain: 'צריך לאשר שוב',
  driveError: 'משהו השתבש מול הדרייב',
  backupCounts: (items, photos) => `${items} פריטים${photos ? ` · ${photos} תמונות` : ''}`,
  neverBackedUp: 'עוד לא גובה',
  backedUpToday: 'גובה היום',
  lastBackupDaysAgo: n => n === 1 ? 'גובה אתמול' : `גובה לפני ${n} ימים`,
  restoreWorking: 'משחזר…',
  restoreNothing: 'הכל כבר מעודכן',
  restoreConfirm: c => `בשחזור הזה:\nיתווספו: ${c.added}\nיתעדכנו: ${c.updated}\nיימחקו: ${c.removed}\n\nלהמשיך?`,
  restoreDone: c => `נוספו ${c.added}, עודכנו ${c.updated}, נמחקו ${c.removed}`,
  notABackup: 'זה לא קובץ גיבוי של האפליקציה',

  // Calendar
  weekdaysShort: ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'],
  prevMonth: 'החודש הקודם',
  nextMonth: 'החודש הבא',
  noRemindersThisDay: 'אין כלום ביום הזה',
  newReminderThisDay: 'תזכורת ביום הזה',

  // Lists
  untitled: 'ללא כותרת',
  all: 'הכל',
  pastTitle: 'עבר',
  recommendedBy: name => `המלצה של ${name}`,

  // Item screen
  titlePlaceholder: 'כותרת',
  timeHint: '—',
  moveToGroup: 'קבוצה',
  deleteItem: 'מחיקה',
  confirmDelete: 'למחוק? אי אפשר לבטל.',
  addPhoto: 'תמונה',
  changePhoto: 'החלפה',
  removePhoto: 'הסרה',
  photoError: 'לא הצלחתי לפתוח את התמונה',
};

// ============================================================
// GROUPS
// The built-in sections. Groups you create yourself are added
// after them when the app starts (see loadGroups in groups.js).
// ============================================================
const BUILT_IN_GROUPS = [
  { id: 'reminders', name: 'תזכורות',  icon: 'bell',     tint: 'amber' },
  { id: 'songs',     name: 'שירים',    icon: 'music',    tint: 'violet' },
  { id: 'movies',    name: 'סרטים',    icon: 'film',     tint: 'rose' },
  { id: 'shows',     name: 'סדרות',    icon: 'tv',       tint: 'sky' },
  { id: 'recipes',   name: 'מתכונים',  icon: 'utensils', tint: 'green' },
  { id: 'inbox',     name: 'לא ממוין', icon: 'inbox',    tint: 'slate' },
];
let GROUPS = [...BUILT_IN_GROUPS];

// A group's name, safe to put inside HTML (your group names could contain anything)
function groupTitle(group) {
  return escapeHtml(group.name);
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
// HELPERS
// ============================================================

// Makes text safe to put inside HTML. Without this, typing
// something like "<b>" or a quote mark in a note would break the page.
function escapeHtml(text) {
  const safe = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(text ?? '').replace(/[&<>"']/g, char => safe[char]);
}

// "2026-03-12" → "היום" / "מחר" / "שישי 13.11" / "12.3" / "12.3.27"
function formatDate(isoDate) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return shortDay(new Date(year, month - 1, day));
}

function shortDay(date) {
  const today = todayStart();
  const daysAway = Math.round((date - today) / 86400000);
  if (daysAway === 0) return TEXT.today;
  if (daysAway === 1) return TEXT.tomorrow;
  const dm = `${date.getDate()}.${date.getMonth() + 1}`;
  if (date.getFullYear() !== today.getFullYear()) return `${dm}.${String(date.getFullYear()).slice(2)}`;
  // Within the coming week the weekday says it better ("שישי")
  if (daysAway > 1 && daysAway < 7) return date.toLocaleDateString('he-IL', { weekday: 'long' }).replace('יום ', '');
  return dm;
}

// What the guess chip shows while you type: "תזכורות · מחר · 10:00"
function groupLabel(groupId, fields) {
  const group = findGroup(groupId);
  let label = groupTitle(group);
  if (fields.date) label += ` · ${formatDate(fields.date)}`;
  if (fields.time) label += ` · ${fields.time}`;
  if (groupId === 'songs' && SONG_STATUS[fields.status]) label += ` · ${SONG_STATUS[fields.status]}`;
  if (fields.repeatYearly) label += ` · ${TEXT.everyYear}`;
  const lists = groupId === 'shows' ? SHOW_LISTS : groupId === 'movies' ? MOVIE_LISTS : null;
  if (lists && fields.list && fields.list !== 'watchlist') label += ` · ${lists[fields.list]}`;
  if (lists && fields.rating) label += ` · ${'★'.repeat(fields.rating)}`;
  return label;
}

// "לפני 5 דק׳" · "אתמול" · "לפני 3 ימים" · "12.10"
function timeAgo(timestamp) {
  const minutes = Math.floor((Date.now() - timestamp) / 60000);
  if (minutes < 1) return TEXT.justNow;
  if (minutes < 60) return TEXT.minutesAgo(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return TEXT.hoursAgo(hours);
  const days = Math.round((todayStart() - new Date(timestamp).setHours(0, 0, 0, 0)) / 86400000);
  if (days <= 1) return TEXT.yesterday;
  if (days < 7) return TEXT.daysAgo(days);
  const date = new Date(timestamp);
  return `${date.getDate()}.${date.getMonth() + 1}`;
}

// A small grey heading above a list
function sectionLabel(text) {
  return `<h2 class="label">${text}</h2>`;
}

// ============================================================
// HOME
// What's coming up, then your groups. Nothing else.
// ============================================================

async function homeScreen() {
  const upcoming = await upcomingReminders(6);
  const counts = await countItemsPerGroup();

  const upcomingHtml = upcoming.length
    ? sectionLabel(TEXT.upcoming) + rowList(upcoming.map(r => reminderRow(r, false)))
    : '';

  const groupRows = GROUPS.map(group => `
    <a class="row" href="#/group/${group.id}">
      ${groupBadge(group, 'small')}
      <span class="row-main"><span class="row-title">${escapeHtml(group.name)}</span></span>
      <span class="row-end">${counts[group.id] || ''}</span>
    </a>`);
  groupRows.push(`
    <a class="row row-quiet" href="#/group-settings/new">
      <span class="badge small plain">${icon('plus')}</span>
      <span class="row-main"><span class="row-title">${TEXT.newGroup}</span></span>
    </a>`);

  return upcomingHtml + sectionLabel(TEXT.groups) + rowList(groupRows);
}

// ============================================================
// QUICK ADD
// The box at the bottom of Home and of each group. Type anything;
// the app guesses the group, date and time (quickadd.js). In a
// group, what you type goes into that group.
// ============================================================

function setupAddBar(fixedGroup) {
  const bar = document.getElementById('addbar');
  const textBox = document.getElementById('quick-text');
  const guessChip = document.getElementById('guess-chip');
  const picker = document.getElementById('group-picker');

  bar.hidden = false;
  document.body.classList.add('with-addbar');
  textBox.value = '';
  textBox.placeholder = fixedGroup ? TEXT.addPlaceholderIn(findGroup(fixedGroup).name) : TEXT.addPlaceholder;
  picker.innerHTML = GROUPS.map(group =>
    `<button type="button" class="chip" data-group="${group.id}">${groupTitle(group)}</button>`).join('');
  let chosenGroup = fixedGroup || null;

  function updateGuess() {
    textBox.style.height = 'auto';
    textBox.style.height = textBox.scrollHeight + 'px';
    bar.classList.toggle('has-text', !!textBox.value.trim());
    if (!textBox.value.trim()) {
      guessChip.hidden = true;
      picker.hidden = true;
      chosenGroup = fixedGroup || null;
      return;
    }
    const { group, fields } = analyzeQuickAdd(textBox.value, chosenGroup);
    guessChip.innerHTML = `${groupLabel(group, fields)} ${icon('chevron', 'inline down')}`;
    guessChip.hidden = false;
  }

  textBox.oninput = updateGuess;
  guessChip.onclick = () => { picker.hidden = !picker.hidden; };
  picker.onclick = event => {
    const button = event.target.closest('[data-group]');
    if (!button) return;
    chosenGroup = button.dataset.group;
    picker.hidden = true;
    updateGuess();
    textBox.focus();
  };
  // Enter saves (Shift+Enter = new line, for lyrics and lists)
  textBox.onkeydown = event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); bar.requestSubmit(); }
  };
  // Keep the keyboard open when tapping buttons in the bar
  bar.onmousedown = event => { if (event.target.closest('button')) event.preventDefault(); };

  bar.onsubmit = async event => {
    event.preventDefault();
    if (!textBox.value.trim()) return;
    const { group, fields } = analyzeQuickAdd(textBox.value, chosenGroup);
    textBox.value = '';
    chosenGroup = fixedGroup || null;
    updateGuess();

    const item = await addItem(group, fields);
    haptic();
    showScreen(true);
    showToast(TEXT.savedIn(findGroup(group)), {
      action: TEXT.undo,
      onAction: async () => { await deleteItem(item.id); showScreen(true); },
    });
  };
  updateGuess();
}

function hideAddBar() {
  document.getElementById('addbar').hidden = true;
  document.body.classList.remove('with-addbar');
}

// Filter chips (like "לראות / ראיתי") show only the matching rows
function setupFilters() {
  const chips = document.querySelectorAll('[data-filter]');
  if (!chips.length) return;

  function apply(value) {
    chips.forEach(chip => chip.classList.toggle('selected', chip.dataset.filter === value));
    document.querySelectorAll('[data-filter-values]').forEach(row => {
      row.hidden = value !== '' && !row.dataset.filterValues.split('|').includes(value);
    });
    // Nothing left to show: say so quietly
    document.querySelectorAll('.rows').forEach(list => {
      const empty = !list.querySelector('.row:not([hidden])');
      list.hidden = empty;
      const note = list.nextElementSibling?.classList.contains('filter-empty') ? list.nextElementSibling : null;
      if (empty && !note) list.insertAdjacentHTML('afterend', `<p class="filter-empty">${TEXT.nothingHere}</p>`);
      if (!empty && note) note.remove();
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

function headerLink(href, iconName, label) {
  return `<a class="icon-button" href="${href}" aria-label="${label}">${icon(iconName)}</a>`;
}

// Decide which screen an address means. Returns:
//   title   – text in the top bar (empty = none)
//   html    – the screen's content
//   back    – where the back arrow goes (no back arrow if missing)
//   actions – icon buttons in the top bar
//   addTo   – show the quick-add bar ('' = guess the group, or a group id)
//   setup   – extra code to run after the screen is shown
async function buildScreen(page, id, extra) {
  if (page === 'search') {
    return { title: '', html: searchScreen(), back: '#/home', setup: setupSearch };
  }
  if (page === 'calendar') {
    return { title: '', html: await calendarScreen(), back: '#/home', setup: setupCalendar };
  }
  if (page === 'group' && groupExists(id)) {
    const group = findGroup(id);
    return { title: group.name, html: await groupScreen(group), back: '#/home', addTo: group.id,
             actions: group.custom ? headerLink(`#/group-settings/${group.id}`, 'pencil', TEXT.editGroupButton) : '' };
  }
  if (page === 'new' && groupExists(id)) {
    // "#/new/reminders/2026-11-20" → a new reminder already set to that day
    return { title: '', html: newItemScreen(id, extra), back: `#/group/${id}`, setup: setupItemScreen };
  }
  if (page === 'settings') {
    return { title: TEXT.backupScreenTitle, html: await settingsScreen(), back: '#/home', setup: setupSettings };
  }
  if (page === 'group-settings') {
    const html = groupSettingsScreen(id);
    if (html) {
      return { title: id === 'new' ? TEXT.newGroup : TEXT.editGroup, html,
               back: id === 'new' ? '#/home' : `#/group/${id}`, setup: setupGroupSettings };
    }
  }
  if (page === 'item') {
    const html = await itemScreen(id);
    if (html) return { title: '', html, back: `#/group/${editor.group}`, setup: setupItemScreen };
  }
  // Anything unknown (or no hash at all) → home. "#/add" focuses the box.
  return {
    title: TEXT.appName, html: await homeScreen(), addTo: '', home: true,
    actions: headerLink('#/search', 'search', TEXT.search) + headerLink('#/calendar', 'calendar', TEXT.calendar)
           + headerLink('#/settings', 'sliders', TEXT.settings),
    setup: page === 'add' ? () => document.getElementById('quick-text').focus() : null,
  };
}

// Counts screen changes. If you tap quickly, an older screen
// that's still loading must not replace the newer one.
let latestScreen = 0;

// quiet = redraw the same screen in place (after adding, or a sync
// from another device): no animation and no jump to the top.
async function showScreen(quiet = false) {
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
  document.getElementById('topbar-actions').innerHTML = screen.actions || '';
  document.querySelector('.topbar').classList.toggle('home', !!screen.home);
  const screenBox = document.getElementById('screen');
  const scrollY = window.scrollY;
  screenBox.innerHTML = screen.html;
  screenBox.style.animation = 'none';
  if (!quiet) { void screenBox.offsetWidth; screenBox.style.animation = ''; }
  document.body.dataset.page = page || 'home';
  document.title = screen.title && screen.title !== TEXT.appName ? `${screen.title} · ${TEXT.appName}` : TEXT.appName;

  const backButton = document.getElementById('back-button');
  backButton.hidden = !screen.back;
  if (screen.back) backButton.href = screen.back;

  if (screen.addTo !== undefined) {
    if (!quiet) setupAddBar(screen.addTo);
  } else {
    hideAddBar();
  }

  window.scrollTo(0, quiet ? scrollY : 0);
  oldPhotoUrls.forEach(url => URL.revokeObjectURL(url));

  setupFilters();
  if (screen.setup) screen.setup();
}

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
loadGroups().then(() => showScreen());

// Today's reminders summary, if it's on and wasn't shown yet today (see daily.js)
checkDailySummaryOnOpen();

// ============================================================
// MESSAGES
// showToast('נשמר', { action: 'ביטול', onAction }) shows a short
// message at the bottom for a few seconds.
// ============================================================
let appToastTimer = null;

function showToast(text, options = {}) {
  const toast = document.getElementById('app-toast');
  toast.innerHTML = `<span>${text}</span>` +
    (options.action ? `<button type="button">${escapeHtml(options.action)}</button>` : '');
  toast.hidden = false;
  toast.style.animation = 'none'; void toast.offsetWidth; toast.style.animation = '';
  const button = toast.querySelector('button');
  if (button) button.addEventListener('click', () => { toast.hidden = true; options.onAction(); }, { once: true });
  clearTimeout(appToastTimer);
  appToastTimer = setTimeout(() => { toast.hidden = true; }, options.ms || 4000);
}

// ============================================================
// INSTALLABLE APP
// ============================================================

// Turn on the offline helper (sw.js)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

// Save unsaved typing if you switch apps or close this one
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && flushEditor) flushEditor();
});

// Ask the phone to keep our data safe (see db.js)
askForPersistentStorage();
