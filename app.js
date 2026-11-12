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
  searchHint: 'כותרות, מילים, מצרכים, הערות ותגיות',
  searchNoResults: query => `לא נמצא כלום עבור "${query}"`,
  searchCount: n => n === 1 ? 'תוצאה אחת' : `${n} תוצאות`,

  // Home
  seeAll: 'הכל ‹',
  installTitle: 'להתקין כאפליקציה?',
  installText: 'מסך מלא, ועובד גם בלי אינטרנט.',
  installButton: 'התקנה',
  installLater: 'לא עכשיו',
  welcomeTitle: 'ברוכים הבאים!',
  welcomeText: 'תזכורות קרובות ומה שנוסף לאחרונה יופיעו כאן.',
  welcomeButton: 'להוסיף משהו',
  justNow: 'עכשיו',
  minutesAgo: n => n === 1 ? 'לפני דקה' : `לפני ${n} דקות`,
  hoursAgo: n => n === 1 ? 'לפני שעה' : n === 2 ? 'לפני שעתיים' : `לפני ${n} שעות`,
  yesterday: 'אתמול',
  daysAgo: n => n === 2 ? 'לפני יומיים' : `לפני ${n} ימים`,

  addPlaceholder: 'מה לשמור?',
  addHint: 'כותבים, והאפליקציה מסדרת לבד.',
  addExamples: ['מחר ב-10 רופא שיניים', 'ש: שיר חדש', 'סרט: דיון', 'מתכון שקשוקה'],
  send: 'שליחה',
  undo: 'ביטול',
  nothingHere: 'אין כאן כלום כרגע',
  savedIn: group => `נשמר ב־${groupTitle(group)}`,
  today: 'היום',
  tomorrow: 'מחר',
  everyYear: 'כל שנה',

  // Your own groups
  newGroup: 'קבוצה חדשה',
  editGroup: 'עריכת קבוצה',
  editGroupButton: 'עריכת הקבוצה',
  groupName: 'שם',
  groupNameHint: 'למשל: מתנות, ספרים, רעיונות',
  groupIcon: 'סמל וצבע',
  groupShortcut: 'קיצור להוספה מהירה (לא חובה)',
  groupShortcutHint: 'למשל: ר (ואז כותבים ר: ופריט)',
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

  // Backup
  backupScreenTitle: 'הגדרות וגיבוי',
  backupLink: 'הגדרות וגיבוי',

  // Calendar button + daily summary
  addToCalendar: 'הוספה ל-Google Calendar',
  calendarUpdate: 'עדכון ביומן',
  calendarAlready: 'כבר ביומן. אחרי שינוי, "עדכון ביומן" מחליף את האירוע.',
  calendarAdding: 'מוסיף ליומן…',
  calendarAdded: 'נוסף ליומן',
  calendarAddAll: n => n === 1 ? 'הוספת תזכורת אחת שעוד לא ביומן' : `הוספת ${n} תזכורות שעוד לא ביומן`,
  calendarAddingCount: (i, n) => `מוסיף ליומן… ${i} מתוך ${n}`,
  calendarAddedAll: n => n === 1 ? 'תזכורת אחת נוספה ליומן' : `${n} תזכורות נוספו ליומן`,
  openInCalendar: 'פתיחה ביומן ‹',
  calendarNeedsTitle: 'צריך כותרת ותאריך לפני הוספה ליומן',
  calendarNoPermission: 'לא התקבלה הרשאה ליומן',
  calendarError: 'משהו השתבש מול היומן. אפשר לנסות שוב',
  toCalendarShort: 'ליומן',
  notifyTitle: 'סיכום בוקר',
  notifyExplain: 'כל בוקר, הודעה אחת עם התזכורות של היום.',
  notifyTurnOn: 'הפעלת הסיכום היומי',
  notifyTurnOff: 'כיבוי',
  notifyTest: 'שליחת הודעת ניסיון',
  notifyTestSent: 'נשלחה',
  notifyOn: 'פועל',
  notifyOnOpenOnly: 'פועל · יופיע כשפותחים את האפליקציה',
  notifyBlocked: 'ההתראות חסומות. אפשר לאשר אותן בהגדרות של Chrome ← הגדרות אתר ← התראות.',
  notifyUnsupported: 'הדפדפן הזה לא תומך בהתראות.',

  // Reminders as notifications (push.js)
  pushTitle: 'התראות',
  pushExplain: 'גם כשהאפליקציה סגורה: יום הולדת יום לפני, תזכורת עם שעה שעתיים לפני, ועם מקום גם מתי לצאת.',
  pushTurnOn: 'הפעלת התראות',
  pushIsOn: 'פועל במכשיר הזה',

  // Sync between devices (sync.js)
  syncTitle: 'סנכרון',
  syncExplain: 'הפתקים נשמרים גם בשרת בבית, וכל המכשירים רואים אותם.',
  syncLast: when => `מסונכרן · ${when}`,
  syncNever: 'עוד לא סונכרן',
  syncIsOff: 'כבוי במכשיר הזה',
  syncNow: 'סנכרון עכשיו',
  syncTurnOn: 'הפעלת סנכרון',
  syncTurnOff: 'כיבוי',
  syncNoServer: 'אין חיבור לשרת. צריך ש-Tailscale יהיה פועל.',

  // Where a reminder happens (places.js)
  placePlaceholder: 'למשל: אצל אמא, דיזנגוף סנטר, ויצמן 12 כפר סבא',
  placeHint: 'עם מקום ושעה, תגיע התראה מתי לצאת.',
  placeOn: 'תגיע התראה כ-10 דקות לפני שצריך לצאת.',
  placeNeedsTime: 'הוסף שעה כדי לקבל התראה מתי לצאת.',
  placeDirections: 'איך מגיעים',
  about: 'בערך',
  placeClear: 'הסר מקום',
  placeHomeOf: 'הבית של',
  placeNotFound: 'לא נמצא. נסה שם אחר או הוסף עיר.',
  placeNoServer: 'אין חיבור לשרת. צריך ש-Tailscale יהיה פועל.',

  // Google Drive
  driveExplain: 'גיבוי לקובץ אחד בדרייב שלך.',
  driveConnectedText: 'מחובר · כל גיבוי מחליף את הקובץ הקודם.',
  driveConnect: 'חיבור ל-Google Drive',
  driveBackup: 'גיבוי עכשיו',
  driveRestore: 'שחזור מהגיבוי',
  driveDisconnect: 'ניתוק',
  driveWorking: 'רגע…',
  driveSaved: 'נשמר בדרייב',
  driveNoBackup: 'עוד אין גיבוי בדרייב. אפשר ללחוץ "גיבוי ל-Drive" קודם.',
  driveNeedsInternet: 'צריך חיבור לאינטרנט כדי להשתמש בדרייב',
  driveNotReady: 'עוד רגע... אפשר ללחוץ שוב',
  driveCancelled: 'החיבור בוטל',
  googleWindowBlocked: 'החלון של Google לא נפתח. אפשר ללחוץ שוב',
  driveNoPermission: 'לא התקבלה הרשאה לדרייב',
  driveTryAgain: 'צריך לאשר שוב. אפשר ללחוץ שוב',
  driveError: 'משהו השתבש מול הדרייב. אפשר לנסות שוב',
  backupCounts: (items, photos) => `${items} פריטים${photos ? `, ${photos} תמונות` : ''}`,
  neverBackedUp: 'עוד לא גיבית',
  backedUpToday: 'גובה היום',
  lastBackupDaysAgo: n => n === 1 ? 'הגיבוי האחרון: אתמול' : `הגיבוי האחרון: לפני ${n} ימים`,
  backupNow: 'לגבות עכשיו',
  restoreWorking: 'משחזר…',
  restoreNothing: 'הכל כבר מעודכן',
  restoreConfirm: c => `בשחזור הזה:\nיתווספו: ${c.added}\nיתעדכנו: ${c.updated}\nיימחקו: ${c.removed}\n\nלהמשיך?`,
  restoreDone: c => `השחזור הושלם: נוספו ${c.added}, עודכנו ${c.updated}, נמחקו ${c.removed}`,
  notABackup: 'הקובץ הזה לא נראה כמו גיבוי של האפליקציה',
  storageProtected: 'הנתונים מוגנים במכשיר',
  storageNotProtected: 'כדאי להתקין את האפליקציה, כדי שהטלפון ישמור על הנתונים',

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
  saved: 'נשמר',
  timeHint: 'למשל 1020 או 17:30',
  typeTitleToSave: 'יישמר אחרי שתכתבו כותרת',
  moveToGroup: 'קבוצה',
  deleteItem: 'מחיקה',
  confirmDelete: 'למחוק את הפריט? אי אפשר לבטל את זה.',
  addPhoto: 'הוספת תמונה',
  changePhoto: 'החלפת תמונה',
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
  if (groupId === 'songs' && SONG_STATUS[fields.status]) label += ` · ${SONG_STATUS[fields.status]}`;
  if (fields.repeatYearly) label += ` · ${TEXT.everyYear}`;
  // Movies and shows: show the list when it isn't "to watch", plus stars
  const lists = groupId === 'shows' ? SHOW_LISTS : groupId === 'movies' ? MOVIE_LISTS : null;
  if (lists && fields.list && fields.list !== 'watchlist') label += ` · ${lists[fields.list]}`;
  if (lists && fields.rating) label += ` · ${'★'.repeat(fields.rating)}`;
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

// A quiet card for an empty list: an icon in a soft circle and one line
function emptyCard(iconName, message) {
  return `<div class="card empty"><span class="empty-icon">${icon(iconName)}</span>${message}</div>`;
}

// ============================================================
// SCREENS
// Each function returns the HTML for one screen.
// "async" means it may wait for the database first.
// ============================================================

// "לפני 5 דקות" · "אתמול" · "לפני 3 ימים" · "12/10"
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
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

// A section title with a "הכל" link on the other side
function sectionHead(title, link) {
  return `
    <div class="section-head">
      <h2 class="section-title">${title}</h2>
      ${link ? `<a class="see-all" href="${link}">${TEXT.seeAll}</a>` : ''}
    </div>`;
}

async function homeScreen() {
  const upcoming = await upcomingReminders(5);
  const recent = await getRecentItems(6);
  const itemCount = (await getAllItems()).length;

  // Today's date, like "יום שלישי, 10 בנובמבר"
  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

  // Looks like a search box; tapping it opens the Search tab
  const searchLink = `
    <a class="search-input search-link" href="#/search">
      ${icon('search')}
      ${TEXT.searchPlaceholder}
    </a>`;

  // Brand-new app with nothing in it: a friendly welcome instead of empty boxes
  if (!upcoming.length && !recent.length) {
    return `
      <p class="home-date">${today}</p>
      ${searchLink}
      ${installCard()}
      <div class="card empty welcome">
        <span class="empty-icon accent">${icon('sparkle')}</span>
        <strong>${TEXT.welcomeTitle}</strong>${TEXT.welcomeText}
        <a class="primary-button welcome-button" href="#/add">${icon('plus')} ${TEXT.welcomeButton}</a>
      </div>`;
  }

  const upcomingHtml = upcoming.length
    ? listCard(upcoming.map(r => reminderRow(r, false)))
    : emptyCard('calendar', TEXT.noUpcoming);

  const recentHtml = recent.length
    ? listCard(recent.map(item => {
        const group = findGroup(item.group);
        const meta = `${escapeHtml(group.name)} · ${timeAgo(item.createdAt)}`;
        return itemRow(item, meta, { badge: group });
      }))
    : emptyCard('sparkle', TEXT.noRecent);

  return `
    <p class="home-date">${today}</p>
    ${searchLink}
    ${installCard()}
    ${backupReminder(itemCount)}

    ${sectionHead(TEXT.upcoming, '#/group/reminders')}
    ${upcomingHtml}

    ${sectionHead(TEXT.recent, '#/add')}
    ${recentHtml}
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
    // Nothing yet: a short line and a few examples you can tap to try
    const examples = TEXT.addExamples.map(text =>
      `<button type="button" class="chip example-chip" data-example="${escapeHtml(text)}">${escapeHtml(text)}</button>`).join('');
    return `<div class="add-empty">
      <span class="empty-icon accent">${icon('sparkle')}</span>
      <p>${TEXT.addHint}</p>
      <div class="example-chips">${examples}</div>
    </div>`;
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

  // Tapping an example puts it in the box (you still press send)
  chat.addEventListener('click', event => {
    const example = event.target.closest('[data-example]');
    if (!example) return;
    textBox.value = example.dataset.example;
    updateGuess();
    textBox.focus();
  });

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
    haptic();
    chat.innerHTML = await chatBubbles();
    chat.lastElementChild?.classList.add('just-added');
    scrollToBottom();

    // Reminders also get "📅 ליומן" (add straight to Google Calendar)
    const calendarButton = group === 'reminders'
      ? `<button type="button" id="toast-calendar">${TEXT.toCalendarShort}</button>`
      : '';
    showToast(`<span>${TEXT.savedIn(findGroup(group))}</span>
               <span class="toast-actions">${calendarButton}
               <button type="button" id="undo-button">${TEXT.undo}</button></span>`);
    document.getElementById('undo-button').addEventListener('click', async () => {
      await deleteItem(item.id);
      toast.hidden = true;
      chat.innerHTML = await chatBubbles();
    });
    if (calendarButton) {
      document.getElementById('toast-calendar').addEventListener('click', async () => {
        clearTimeout(toastTimer);  // keep the message open while adding
        try {
          await sendReminderToCalendar(item, text => { toast.innerHTML = `<span>${text}</span>`; });
          showToast(`<span>${TEXT.calendarAdded}</span>`);
        } catch (error) {
          showToast(`<span>${escapeHtml(error.message || TEXT.calendarError)}</span>`);
        }
      });
    }
  });

  // Keep the keyboard open when tapping buttons in the box
  form.addEventListener('mousedown', event => {
    if (event.target.closest('button')) event.preventDefault();
  });

  // Load Google's sign-in now, so "📅 ליומן" can open its window from the tap
  prepareGoogle().catch(() => { /* offline: shown on tap */ });

  scrollToBottom();
}

async function groupsScreen() {
  const counts = await countItemsPerGroup();

  // Build one tile per group, then join them into one piece of HTML
  const tiles = GROUPS.map(group => `
    <a class="group-tile t-${group.tint || 'slate'}" href="#/group/${group.id}">
      ${groupBadge(group)}
      <span class="tile-name">${escapeHtml(group.name)}</span>
      <span class="count">${TEXT.itemCount(counts[group.id] || 0)}</span>
    </a>
  `).join('');

  // The last tile creates a new group
  const newTile = `
    <a class="group-tile new-group-tile" href="#/group-settings/new">
      <span class="badge">${icon('plus')}</span>
      <span class="tile-name">${TEXT.newGroup}</span>
    </a>`;

  return `
    <div class="groups-grid">${tiles}${newTile}</div>
    <a class="settings-link" href="#/settings">${icon('sliders')}<span>${TEXT.backupLink}</span>${icon('chevron', 'chev')}</a>`;
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
    // Nothing left to show: hide the empty card, say so instead
    document.querySelectorAll('.card.list').forEach(card => {
      const empty = !card.querySelector('.item-row:not([hidden])');
      card.hidden = empty;
      let note = card.nextElementSibling?.classList.contains('filter-empty') ? card.nextElementSibling : null;
      if (empty && !note) card.insertAdjacentHTML('afterend', `<p class="filter-empty">${TEXT.nothingHere}</p>`);
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

// Decide which screen an address means. Returns:
//   title – text in the top bar
//   html  – the screen's content
//   tab   – which bottom tab to highlight
//   back  – where the back arrow goes (no back arrow if missing)
//   setup – extra code to run after the screen is shown
async function buildScreen(page, id, extra) {
  if (page === 'search') {
    return { title: TEXT.search, html: searchScreen(), tab: 'search', setup: setupSearch };
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
    return { title: group.name, html: await groupScreen(group),
             tab: 'groups', back: '#/groups' };
  }
  if (page === 'new' && groupExists(id)) {
    // "#/new/reminders/2026-11-20" → a new reminder already set to that day
    const group = findGroup(id);
    return { title: group.name, html: newItemScreen(id, extra),
             tab: 'groups', back: `#/group/${id}`, setup: setupItemScreen };
  }
  if (page === 'settings') {
    return { title: TEXT.backupScreenTitle, html: await backupScreen(),
             tab: 'groups', back: '#/groups', setup: setupBackupScreen };
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
      return { title: group.name, html,
               tab: 'groups', back: `#/group/${group.id}`, setup: setupItemScreen };
    }
  }
  // Anything unknown (or no hash at all) → home
  return { title: TEXT.appName, html: await homeScreen(), tab: 'home' };
}

// Counts screen changes. If you tap quickly, an older screen
// that's still loading must not replace the newer one.
let latestScreen = 0;

// quiet = redraw the same screen in place (after a sync from another
// device): no animation and no jump to the top.
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
  const screenBox = document.getElementById('screen');
  const scrollY = window.scrollY;
  screenBox.innerHTML = screen.html;
  // Restart the "slide in" animation on a new screen only
  screenBox.style.animation = 'none';
  if (!quiet) { void screenBox.offsetWidth; screenBox.style.animation = ''; }
  screenBox.classList.toggle('quiet', quiet);
  document.body.dataset.page = screen.tab;  // lets style.css style each screen
  document.title = screen.title === TEXT.appName ? screen.title : `${screen.title} · ${TEXT.appName}`;

  const backButton = document.getElementById('back-button');
  backButton.hidden = !screen.back;
  if (screen.back) backButton.href = screen.back;

  // Highlight the current tab
  document.querySelectorAll('.tabbar a').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === screen.tab);
  });

  window.scrollTo(0, quiet ? scrollY : 0);
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

// Today's reminders summary, if it's on and wasn't shown yet today (see daily.js)
checkDailySummaryOnOpen();

// ============================================================
// INSTALLABLE APP
// ============================================================

// Turn on the offline helper (sw.js)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

// Chrome tells us when the app can be installed. We keep that
// "permission" and show our own install card on Home.
let installPrompt = null;

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches;
}

function installDismissed() {
  try { return localStorage.getItem('installDismissed') === 'yes'; } catch { return false; }
}

function installCard() {
  if (!installPrompt || isInstalled() || installDismissed()) return '';
  return `
    <div class="card install-card">
      <span class="empty-icon accent">${icon('download')}</span>
      <div class="install-text"><strong>${TEXT.installTitle}</strong><br>${TEXT.installText}</div>
      <div class="install-buttons">
        <button type="button" class="primary-button" data-install>${TEXT.installButton}</button>
        <button type="button" class="small-button" data-install-later>${TEXT.installLater}</button>
      </div>
    </div>`;
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();  // don't show Chrome's own bar, we have the card
  installPrompt = event;
  if (document.body.dataset.page === 'home') showScreen();
});

window.addEventListener('appinstalled', () => {
  installPrompt = null;
  if (document.body.dataset.page === 'home') showScreen();
});

document.addEventListener('click', async event => {
  if (event.target.closest('[data-install]') && installPrompt) {
    installPrompt.prompt();             // Chrome's "Install app?" window
    await installPrompt.userChoice;
    installPrompt = null;
    showScreen();
  }
  if (event.target.closest('[data-install-later]')) {
    try { localStorage.setItem('installDismissed', 'yes'); } catch { /* not important */ }
    showScreen();
  }
});

// Save unsaved typing if you switch apps or close this one
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && flushEditor) flushEditor();
});

// Ask the phone to keep our data safe (see db.js)
askForPersistentStorage();

// ============================================================
// MESSAGES
// showToast('נמחק', { action: 'ביטול', onAction }) shows a short
// message above the tab bar for a few seconds.
// ============================================================
let appToastTimer = null;

function showToast(text, options = {}) {
  const toast = document.getElementById('app-toast');
  toast.innerHTML = `<span>${escapeHtml(text)}</span>` +
    (options.action ? `<span class="toast-actions"><button type="button">${escapeHtml(options.action)}</button></span>` : '');
  toast.hidden = false;
  toast.style.animation = 'none'; void toast.offsetWidth; toast.style.animation = '';
  const button = toast.querySelector('button');
  if (button) button.addEventListener('click', () => { toast.hidden = true; options.onAction(); }, { once: true });
  clearTimeout(appToastTimer);
  appToastTimer = setTimeout(() => { toast.hidden = true; }, options.ms || 5000);
}
