// ============================================================
// SECTIONS
//   1. FIELDS      – what each group's items contain
//   2. Lists       – how each group's list looks
//   3. Item screen – view and edit one item (saves by itself)
// ============================================================

const SONG_STATUS = { idea: '💡 רעיון', draft: '✏️ טיוטה', done: '✅ גמור' };
const MOVIE_LISTS = { watchlist: '🍿 לראות', watched: '✔️ ראיתי' };

const TITLE_FIELD = { key: 'title', type: 'text', label: 'כותרת' };
const NOTES_FIELD = { key: 'text', type: 'textarea', label: 'הערות' };

// Field types: text · textarea · date · time · checkbox · choice · rating · photo
const FIELDS = {
  reminders: [
    TITLE_FIELD,
    { key: 'date', type: 'date', label: 'תאריך' },
    { key: 'time', type: 'time', label: 'שעה (לא חובה)' },
    { key: 'repeatYearly', type: 'checkbox', label: 'חוזר כל שנה (ימי הולדת, ימי נישואין)' },
    NOTES_FIELD,
  ],
  songs: [
    TITLE_FIELD,
    { key: 'status', type: 'choice', label: 'סטטוס', options: SONG_STATUS },
    { key: 'lyrics', type: 'textarea', label: 'מילים', big: true },
  ],
  movies: [
    TITLE_FIELD,
    { key: 'list', type: 'choice', label: 'רשימה', options: MOVIE_LISTS },
    { key: 'recommendedBy', type: 'text', label: 'מי המליץ' },
    { key: 'rating', type: 'rating', label: 'הדירוג שלי' },
    NOTES_FIELD,
  ],
  recipes: [
    TITLE_FIELD,
    { key: 'photo', type: 'photo', label: 'תמונה' },
    { key: 'tags', type: 'text', label: 'תגיות', hint: 'מופרדות בפסיק, למשל: עוגות, טבעוני' },
    { key: 'ingredients', type: 'textarea', label: 'מצרכים', hint: 'מצרך בכל שורה' },
    { key: 'steps', type: 'textarea', label: 'אופן ההכנה', hint: 'שלב בכל שורה' },
  ],
  // לא ממוין
  default: [TITLE_FIELD, NOTES_FIELD],
};

// Groups you create yourself: a title, text, tags and an optional photo
const CUSTOM_GROUP_FIELDS = [
  TITLE_FIELD,
  NOTES_FIELD,
  { key: 'tags', type: 'text', label: 'תגיות', hint: 'מופרדות בפסיק' },
  { key: 'photo', type: 'photo', label: 'תמונה' },
];

// Starting values for a brand-new item (functions, so "today" is always fresh)
const NEW_ITEM_DEFAULTS = {
  reminders: () => ({ date: toISODate(new Date()), repeatYearly: false }),
  songs: () => ({ status: 'idea' }),
  movies: () => ({ list: 'watchlist' }),
};

function fieldsFor(groupId) {
  if (FIELDS[groupId]) return FIELDS[groupId];
  return groupId === 'inbox' ? FIELDS.default : CUSTOM_GROUP_FIELDS;
}

// ============================================================
// DATES FOR REMINDERS
// ============================================================

function parseISODate(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function todayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// When does this reminder happen next?
// Yearly ones (birthdays) move to this year, or next year if already passed.
function nextOccurrence(item) {
  if (!item.date) return null;
  const date = parseISODate(item.date);
  if (!item.repeatYearly) return date;

  const today = todayStart();
  const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  if (next < today) next.setFullYear(today.getFullYear() + 1);
  return next;
}

function daysUntil(date) {
  return Math.round((date - todayStart()) / 86400000);
}

// "היום · 17:30" · "מחר" · "בעוד 5 ימים · 15/11"
function whenLabel(date, time) {
  const days = daysUntil(date);
  let label;
  if (days === 0) label = TEXT.today;
  else if (days === 1) label = TEXT.tomorrow;
  else label = `${TEXT.inDays(days)} · ${date.getDate()}/${date.getMonth() + 1}`;
  return time ? `${label} · ${time}` : label;
}

// Soonest first: by day, then by time (reminders without a time come first that day)
function bySoonest(a, b) {
  return (a.next - b.next) || (a.item.time || '').localeCompare(b.item.time || '');
}

// The next few reminders, soonest first (used by Home)
async function upcomingReminders(limit) {
  const today = todayStart();
  return (await getItemsInGroup('reminders'))
    .map(item => ({ item, next: nextOccurrence(item) }))
    .filter(r => r.next && r.next >= today)
    .sort(bySoonest)
    .slice(0, limit);
}

// ============================================================
// PHOTOS
// Photos are saved as files ("Blobs") inside the database.
// To show one, the browser gives it a temporary address.
// ============================================================

let photoUrls = [];

function photoUrl(blob) {
  const url = URL.createObjectURL(blob);
  photoUrls.push(url);
  return url;
}

// Hand over the current temporary addresses (to free them later)
function takePhotoUrls() {
  const old = photoUrls;
  photoUrls = [];
  return old;
}

// Make a phone photo smaller (about 150 KB instead of 5 MB)
async function shrinkPhoto(file, maxSide = 1000) {
  const image = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
}

// ============================================================
// LISTS
// ============================================================

// One tappable row. "meta" is the small grey line (already safe HTML).
function itemRow(item, meta = '', options = {}) {
  let picture = '';
  if (options.photo) picture = `<img class="thumb" src="${photoUrl(options.photo)}" alt="">`;
  else if (options.emoji) picture = `<span class="emoji">${escapeHtml(options.emoji)}</span>`;

  const filter = options.filter !== undefined
    ? `data-filter-values="${escapeHtml(options.filter)}"` : '';

  return `
    <a class="item-row${options.dim ? ' dim' : ''}" href="#/item/${item.id}" ${filter}>
      ${picture}
      <span class="item-main">
        <span class="item-title" dir="auto">${escapeHtml(item.title) || TEXT.untitled}</span>
        ${meta ? `<span class="item-meta">${meta}</span>` : ''}
      </span>
    </a>
  `;
}

function listCard(rows) {
  return `<div class="card list">${rows.join('')}</div>`;
}

// A row of chips that filter the list below (see setupFilters in app.js)
function filterChips(options, selected) {
  const chips = Object.entries(options).map(([value, label]) =>
    `<button type="button" class="chip${value === selected ? ' selected' : ''}"
             data-filter="${escapeHtml(value)}">${escapeHtml(label)}</button>`
  ).join('');
  return `<div class="filter-chips">${chips}</div>`;
}

function stars(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

// "עוגות, טבעוני" → ['עוגות', 'טבעוני']
function parseTags(text) {
  return (text || '').split(',').map(tag => tag.trim()).filter(Boolean);
}

function reminderRow({ item, next }, isPast) {
  let meta = '';
  if (next) meta = isPast ? formatDate(item.date) : whenLabel(next, item.time);
  if (item.repeatYearly) meta = `🔁 ${meta}`;
  return itemRow(item, meta, { dim: isPast });
}

function remindersList(items) {
  const today = todayStart();
  const all = items.map(item => ({ item, next: nextOccurrence(item) }));
  const upcoming = all.filter(r => r.next && r.next >= today).sort(bySoonest);
  const past = all.filter(r => !r.next || r.next < today).sort((a, b) => (b.next || 0) - (a.next || 0));

  let html = '';
  if (upcoming.length) {
    html += `<h2 class="section-title">${TEXT.upcomingTitle}</h2>`;
    html += listCard(upcoming.map(r => reminderRow(r, false)));
  }
  if (past.length) {
    html += `<h2 class="section-title">${TEXT.pastTitle}</h2>`;
    html += listCard(past.map(r => reminderRow(r, true)));
  }
  return html;
}

function songsList(items) {
  return filterChips({ '': TEXT.all, ...SONG_STATUS }, '') +
    listCard(items.map(item =>
      itemRow(item, SONG_STATUS[item.status] || '', { filter: item.status || '' })));
}

function moviesList(items) {
  return filterChips(MOVIE_LISTS, 'watchlist') +
    listCard(items.map(item => {
      const meta = [
        item.recommendedBy ? TEXT.recommendedBy(escapeHtml(item.recommendedBy)) : '',
        item.rating ? stars(item.rating) : '',
      ].filter(Boolean).join(' · ');
      return itemRow(item, meta, { filter: item.list || 'watchlist' });
    }));
}

function recipesList(items) {
  // Every tag used in any recipe becomes a filter chip
  const allTags = [...new Set(items.flatMap(item => parseTags(item.tags)))];
  const chips = allTags.length
    ? filterChips(Object.fromEntries([['', TEXT.all], ...allTags.map(tag => [tag, tag])]), '')
    : '';

  return chips + listCard(items.map(item => {
    const tags = parseTags(item.tags);
    return itemRow(item, escapeHtml(tags.join(', ')), {
      photo: item.photo,
      emoji: item.photo ? null : '🍲',
      filter: tags.join('|'),
    });
  }));
}

// לא ממוין, and your own groups: first line of the text, photo, tag filters
function plainList(items) {
  const allTags = [...new Set(items.flatMap(item => parseTags(item.tags)))];
  const chips = allTags.length
    ? filterChips(Object.fromEntries([['', TEXT.all], ...allTags.map(tag => [tag, tag])]), '')
    : '';

  return chips + listCard(items.map(item =>
    itemRow(item, escapeHtml((item.text || '').split('\n')[0]), {
      photo: item.photo,
      filter: parseTags(item.tags).join('|'),
    })));
}

async function groupScreen(group) {
  const items = await getItemsInGroup(group.id);

  let buttons = `<a class="new-button" href="#/new/${group.id}">＋ ${TEXT.newItem}</a>`;
  if (group.custom) {
    buttons = `<div class="button-row">${buttons}
      <a class="new-button" href="#/group-settings/${group.id}">${TEXT.editGroupButton}</a></div>`;
  }
  if (!items.length) return buttons + emptyCard(escapeHtml(group.emoji), TEXT.emptyGroup);

  const lists = { reminders: remindersList, songs: songsList, movies: moviesList, recipes: recipesList };
  const makeList = lists[group.id] || plainList;
  return buttons + makeList(items);
}

// ============================================================
// ITEM SCREEN
// One form for viewing and editing. Every change is saved
// automatically a moment after you stop typing.
// ============================================================

let editor = null;        // { id, group, draft } for the item on screen
let flushEditor = null;   // app.js calls this before leaving, to save the last change

async function itemScreen(id) {
  const item = await getItem(id);
  if (!item) return null;
  editor = { id: item.id, group: item.group, draft: { ...item } };
  return editorHtml();
}

// startDate (optional) comes from the calendar, like "2026-11-20"
function newItemScreen(groupId, startDate) {
  const defaults = NEW_ITEM_DEFAULTS[groupId];
  editor = { id: null, group: groupId, draft: defaults ? defaults() : {} };
  if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) editor.draft.date = startDate;
  return editorHtml();
}

function fieldHtml(field, value) {
  const label = `<span class="field-label">${field.label}</span>`;
  const key = `data-key="${field.key}"`;
  const placeholder = field.hint ? `placeholder="${field.hint}"` : '';

  switch (field.type) {
    case 'text':
      return `<label class="field">${label}
        <input type="text" ${key} dir="auto" value="${escapeHtml(value)}" ${placeholder}></label>`;

    case 'textarea':
      return `<label class="field">${label}
        <textarea ${key} dir="auto" rows="${field.big ? 8 : 3}" ${placeholder}>${escapeHtml(value)}</textarea></label>`;

    case 'date':
      return `<label class="field">${label}
        <input type="date" ${key} value="${escapeHtml(value)}"></label>`;

    // A normal text box (not a clock), so you can type "1020" like in quick-add.
    // inputmode="decimal" shows a number keyboard that also has a dot.
    case 'time':
      return `<label class="field">${label}
        <input type="text" ${key} data-time inputmode="decimal" dir="ltr"
               value="${escapeHtml(value)}" placeholder="${TEXT.timeHint}"></label>`;

    case 'checkbox':
      return `<label class="field check">
        <input type="checkbox" ${key} ${value ? 'checked' : ''}> ${field.label}</label>`;

    case 'choice': {
      const buttons = Object.entries(field.options).map(([optionValue, text]) =>
        `<button type="button" data-value="${optionValue}" class="${optionValue === value ? 'selected' : ''}">${text}</button>`
      ).join('');
      return `<div class="field">${label}<div class="segmented" ${key}>${buttons}</div></div>`;
    }

    case 'rating': {
      const buttons = [1, 2, 3, 4, 5].map(n =>
        `<button type="button" data-value="${n}" class="${n <= (value || 0) ? 'on' : ''}" aria-label="${n}">★</button>`
      ).join('');
      return `<div class="field">${label}<div class="stars" ${key}>${buttons}</div></div>`;
    }

    case 'photo':
      return `<div class="field">${label}<div class="photo-field" ${key}>${photoFieldInner(value)}</div></div>`;
  }
  return '';
}

function photoFieldInner(blob) {
  return `
    ${blob ? `<img class="photo-preview" src="${photoUrl(blob)}" alt="">` : ''}
    <div class="photo-buttons">
      <label class="small-button">${blob ? TEXT.changePhoto : TEXT.addPhoto}
        <input type="file" accept="image/*" hidden></label>
      ${blob ? `<button type="button" class="small-button" data-remove-photo>${TEXT.removePhoto}</button>` : ''}
    </div>
  `;
}

function editorHtml() {
  const { group, draft } = editor;
  const fields = fieldsFor(group).map(field => fieldHtml(field, draft[field.key])).join('');
  const groupOptions = GROUPS.map(g =>
    `<option value="${g.id}" ${g.id === group ? 'selected' : ''}>${groupTitle(g)}</option>`
  ).join('');

  return `
    <form class="editor" id="editor">
      ${fields}
      <label class="field">
        <span class="field-label">${TEXT.moveToGroup}</span>
        <select id="group-select">${groupOptions}</select>
      </label>
      <div class="editor-footer">
        <span class="save-status" id="save-status">${editor.id ? '' : TEXT.typeTitleToSave}</span>
        <button type="button" class="danger-button" id="delete-button">${TEXT.deleteItem}</button>
      </div>
    </form>
  `;
}

// Textareas grow with their text instead of scrolling inside
function autoGrow(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

function setupItemScreen() {
  const form = document.getElementById('editor');
  const status = document.getElementById('save-status');
  let timer = null;
  let saving = Promise.resolve();  // saves happen one after another, never at the same time

  async function save() {
    const { draft } = editor;
    if (!editor.id) {
      if (!(draft.title || '').trim()) return;  // don't create an item without a title
      const created = await addItem(editor.group, draft);
      editor.id = created.id;
      history.replaceState(null, '', `#/item/${created.id}`);  // change the address quietly
    } else {
      await updateItem(editor.id, { ...draft, group: editor.group });
    }
    status.textContent = TEXT.saved;
  }

  function saveNow() {
    clearTimeout(timer);
    timer = null;
    saving = saving.then(save);
    return saving;
  }

  function saveSoon() {
    status.textContent = '';
    clearTimeout(timer);
    timer = setTimeout(saveNow, 400);
  }

  flushEditor = () => (timer ? saveNow() : saving);

  form.addEventListener('submit', event => event.preventDefault());

  // Typing in text boxes, dates and checkboxes
  form.addEventListener('input', event => {
    const element = event.target;
    const key = element.dataset.key;
    if (!key) return;

    // Time box: only save once it makes sense ("1020" → "10:20")
    if ('time' in element.dataset) {
      const time = normalizeTime(element.value);
      const empty = !element.value.trim();
      element.classList.toggle('invalid', !empty && !time);
      if (!empty && !time) return;  // still typing, or a mistake
      editor.draft[key] = empty ? '' : time;
      saveSoon();
      return;
    }

    editor.draft[key] = element.type === 'checkbox' ? element.checked : element.value;
    if (element.tagName === 'TEXTAREA') autoGrow(element);
    saveSoon();
  });

  // Buttons inside the form
  form.addEventListener('click', async event => {
    const option = event.target.closest('.segmented button');
    if (option) {
      const box = option.parentElement;
      editor.draft[box.dataset.key] = option.dataset.value;
      box.querySelectorAll('button').forEach(b => b.classList.toggle('selected', b === option));
      saveSoon();
      return;
    }

    const star = event.target.closest('.stars button');
    if (star) {
      const box = star.parentElement;
      let rating = Number(star.dataset.value);
      if (editor.draft[box.dataset.key] === rating) rating = 0;  // tap the same star again to clear
      editor.draft[box.dataset.key] = rating;
      box.querySelectorAll('button').forEach(b => b.classList.toggle('on', Number(b.dataset.value) <= rating));
      saveSoon();
      return;
    }

    if (event.target.closest('[data-remove-photo]')) {
      setPhoto(null);
      return;
    }

    if (event.target.closest('#delete-button')) {
      if (!editor.id) { history.back(); return; }  // never saved → just leave
      if (!confirm(TEXT.confirmDelete)) return;
      clearTimeout(timer);
      await saving;
      await deleteItem(editor.id);
      flushEditor = null;
      location.replace(`#/group/${editor.group}`);
    }
  });

  // When you leave the time box, show the tidy version ("1020" → "10:20")
  form.addEventListener('focusout', event => {
    const element = event.target;
    if (!('time' in (element.dataset || {}))) return;
    const time = normalizeTime(element.value);
    if (time) element.value = time;
  });

  // Choosing a photo
  form.addEventListener('change', async event => {
    if (event.target.type !== 'file' || !event.target.files[0]) return;
    try {
      setPhoto(await shrinkPhoto(event.target.files[0]));
    } catch {
      alert(TEXT.photoError);
    }
  });

  function setPhoto(blob) {
    editor.draft.photo = blob;
    form.querySelector('.photo-field').innerHTML = photoFieldInner(blob);
    saveSoon();
  }

  // Moving to another group: save, then redraw the form with that group's fields
  document.getElementById('group-select').addEventListener('change', async event => {
    editor.group = event.target.value;
    if (editor.id) await saveNow();
    else history.replaceState(null, '', `#/new/${editor.group}`);
    const group = findGroup(editor.group);
    document.getElementById('screen-title').textContent = `${group.emoji} ${group.name}`;
    document.getElementById('back-button').href = `#/group/${group.id}`;
    document.getElementById('screen').innerHTML = editorHtml();
    setupItemScreen();
  });

  form.querySelectorAll('textarea').forEach(autoGrow);
}
