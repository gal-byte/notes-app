// ============================================================
// SECTIONS
//   1. FIELDS      – what each group's items contain
//   2. Lists       – how each group's list looks
//   3. Item screen – view and edit one item (saves by itself)
// ============================================================

const SONG_STATUS = { idea: 'רעיון', draft: 'טיוטה', done: 'גמור' };
const MOVIE_LISTS = { watchlist: 'לראות', watched: 'ראיתי' };
const SHOW_LISTS = { watchlist: 'לראות', watching: 'בצפייה', watched: 'סיימתי' };

const TITLE_FIELD = { key: 'title', type: 'title' };
const NOTES_FIELD = { key: 'text', type: 'textarea', label: 'הערות' };

// Field types: title · text · textarea · date · time · place · checkbox · choice · rating · photo
// Short fields show as small rows with an icon; long text (notes, lyrics) as open text below.
const FIELDS = {
  reminders: [
    TITLE_FIELD,
    { key: 'date', type: 'date', label: 'תאריך', icon: 'calendar' },
    { key: 'time', type: 'time', label: 'שעה', icon: 'clock', flex: { key: 'timeFlex', options: { exact: 'בדיוק', about: 'בערך' } } },
    { key: 'place', type: 'place', label: 'מקום' },
    { key: 'repeatYearly', type: 'checkbox', label: 'כל שנה', icon: 'repeat' },
    NOTES_FIELD,
  ],
  songs: [
    TITLE_FIELD,
    { key: 'status', type: 'choice', label: 'מצב', icon: 'pencil', options: SONG_STATUS },
    { key: 'lyrics', type: 'textarea', label: 'מילים', big: true },
  ],
  movies: [
    TITLE_FIELD,
    { key: 'list', type: 'choice', label: 'רשימה', icon: 'bookmark', options: MOVIE_LISTS },
    { key: 'rating', type: 'rating', label: 'דירוג', icon: 'star' },
    { key: 'recommendedBy', type: 'text', label: 'מי המליץ', icon: 'heart' },
    NOTES_FIELD,
  ],
  shows: [
    TITLE_FIELD,
    { key: 'list', type: 'choice', label: 'רשימה', icon: 'bookmark', options: SHOW_LISTS },
    { key: 'rating', type: 'rating', label: 'דירוג', icon: 'star' },
    { key: 'recommendedBy', type: 'text', label: 'מי המליץ', icon: 'heart' },
    NOTES_FIELD,
  ],
  recipes: [
    TITLE_FIELD,
    { key: 'photo', type: 'photo', label: 'תמונה' },
    { key: 'tags', type: 'text', label: 'תגיות', icon: 'bookmark', hint: 'עוגות, טבעוני' },
    { key: 'calories', type: 'text', label: 'קלוריות', icon: 'flame', hint: 'למנה, למשל 350', inputmode: 'decimal' },
    { key: 'servings', type: 'text', label: 'מנות', icon: 'users', hint: 'למשל 4', inputmode: 'numeric' },
    { key: 'ingredients', type: 'textarea', label: 'מצרכים', hint: 'מצרך בכל שורה' },
    { key: 'steps', type: 'textarea', label: 'הכנה', hint: 'שלב בכל שורה' },
  ],
  // One per person (gifts.js)
  gifts: [
    { key: 'title', type: 'title', placeholder: 'שם' },
    { key: 'birthday', type: 'date', label: 'יום הולדת', icon: 'cake' },
    { key: 'ideas', type: 'textarea', label: 'רעיונות למתנה', hint: 'רעיון בכל שורה' },
    { key: 'given', type: 'textarea', label: 'כבר נתתי', hint: 'מה ומתי' },
  ],
  // The journal draws its own screen (journal.js); these are for sharing
  journal: JOURNAL_FIELDS,
  // Quote of the day comes from here (shown on the journal screen)
  quotes: [
    { key: 'title', type: 'title', placeholder: 'הציטוט' },
    { key: 'author', type: 'text', label: 'מי אמר', icon: 'quote' },
  ],
  // לא ממוין
  default: [TITLE_FIELD, NOTES_FIELD],
};

// Groups you create yourself: a title, text, tags and an optional photo
const CUSTOM_GROUP_FIELDS = [
  TITLE_FIELD,
  { key: 'photo', type: 'photo', label: 'תמונה' },
  { key: 'tags', type: 'text', label: 'תגיות', icon: 'bookmark', hint: '' },
  NOTES_FIELD,
];

// Starting values for a brand-new item (functions, so "today" is always fresh)
const NEW_ITEM_DEFAULTS = {
  reminders: () => ({ date: toISODate(new Date()), repeatYearly: false }),
  songs: () => ({ status: 'idea' }),
  movies: () => ({ list: 'watchlist' }),
  shows: () => ({ list: 'watchlist' }),
  journal: () => ({ date: toISODate(new Date()), photos: [], people: [], places: [] }),
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

// Is this reminder still ahead? Today's reminders with a time leave
// the "upcoming" lists once the time has passed (the calendar keeps them).
function stillAhead({ item, next }, now = new Date()) {
  if (!next) return false;
  const today = todayStart();
  if (next > today) return true;
  if (next < today || !item.time) return next >= today;
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  return item.time > nowTime;
}

// The next few reminders, soonest first (used by Home)
async function upcomingReminders(limit) {
  return (await getItemsInGroup('reminders'))
    .map(item => ({ item, next: nextOccurrence(item) }))
    .filter(r => stillAhead(r))
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
// Plain rows on the page, thin lines between them. A row has a
// title, sometimes a small second line, and something short on
// the far side (when, a count, a rating).
// ============================================================

// One tappable row. sub and end are already safe HTML.
function itemRow(item, sub = '', options = {}) {
  let lead = '';
  if (options.photo) lead = `<img class="thumb" src="${photoUrl(options.photo)}" alt="">`;

  const filter = options.filter !== undefined
    ? `data-filter-values="${escapeHtml(options.filter)}"` : '';

  return `
    <a class="row${options.dim ? ' dim' : ''}" href="#/item/${item.id}" data-id="${item.id}" ${filter}>
      ${lead}
      <span class="row-main">
        <span class="row-title" dir="auto">${options.titleHtml || escapeHtml(item.title) || TEXT.untitled}${options.after || ''}</span>
        ${sub ? `<span class="row-sub">${sub}</span>` : ''}
      </span>
      ${options.end ? `<span class="row-end">${options.end}</span>` : ''}
    </a>
  `;
}

function rowList(rows) {
  return `<div class="rows">${rows.join('')}</div>`;
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
  return '★'.repeat(rating);
}

// "עוגות, טבעוני" → ['עוגות', 'טבעוני']
function parseTags(text) {
  return (text || '').split(',').map(tag => tag.trim()).filter(Boolean);
}

// The far side of a reminder row: "היום 17:30" · "מחר" · "שני" · "16.11"
function whenShort(next, item) {
  if (!next) return '';
  const time = item.time ? (item.timeFlex === 'about' ? `~${item.time}` : item.time) : '';
  return [shortDay(next), time].filter(Boolean).join(' ');
}

function reminderRow({ item, next }, isPast) {
  const after = item.place ? ` ${icon('pin', 'inline faint')}` : '';
  const end = isPast ? (item.date ? formatDate(item.date) : '') : whenShort(next, item);
  return itemRow(item, '', { dim: isPast, end, after });
}

function remindersList(items) {
  const all = items.map(item => ({ item, next: nextOccurrence(item) }));
  const upcoming = all.filter(r => stillAhead(r)).sort(bySoonest);
  const past = all.filter(r => !stillAhead(r)).sort((a, b) => (b.next || 0) - (a.next || 0));

  let html = '';
  if (upcoming.length) html += rowList(upcoming.map(r => reminderRow(r, false)));
  if (past.length) html += sectionLabel(TEXT.pastTitle) + rowList(past.map(r => reminderRow(r, true)));
  return html;
}

function songsList(items) {
  return filterChips({ '': TEXT.all, ...SONG_STATUS }, '') +
    rowList(items.map(item =>
      itemRow(item, '', { end: SONG_STATUS[item.status] || '', filter: item.status || '' })));
}

// Movies and shows look the same, only the lists differ
function moviesList(items, lists = MOVIE_LISTS) {
  return filterChips(lists, 'watchlist') +
    rowList(items.map(item => itemRow(item,
      item.recommendedBy ? TEXT.recommendedBy(escapeHtml(item.recommendedBy)) : '',
      { end: item.rating ? `<span class="stars-small">${stars(item.rating)}</span>` : '', filter: item.list || 'watchlist' })));
}

// Recipes and your own groups: photo, first line or tags, tag filters
function plainList(items) {
  const allTags = [...new Set(items.flatMap(item => parseTags(item.tags)))];
  const chips = allTags.length > 1
    ? filterChips(Object.fromEntries([['', TEXT.all], ...allTags.map(tag => [tag, tag])]), '')
    : '';
  return chips + rowList(items.map(item => {
    const tags = parseTags(item.tags);
    const sub = escapeHtml((item.text || '').split('\n')[0] || tags.join(', '));
    const end = item.calories ? `<span class="calories">${escapeHtml(TEXT.calories(String(item.calories).trim()))}</span>` : '';
    return itemRow(item, sub, { photo: item.photo, filter: tags.join('|'), end });
  }));
}

async function groupScreen(group) {
  const items = await getItemsInGroup(group.id);
  if (group.id === 'journal') return journalScreen(items);
  if (!items.length) {
    return `<div class="empty">${groupBadge(group, 'large')}<span>${TEXT.nothingHere}</span></div>`;
  }
  const lists = {
    reminders: remindersList, songs: songsList,
    movies: items => moviesList(items, MOVIE_LISTS),
    shows: items => moviesList(items, SHOW_LISTS),
    gifts: giftsList,
  };
  return (lists[group.id] || plainList)(items);
}

// ============================================================
// ITEM SCREEN
// Looks like a page, not a form: the title in big letters, a few
// small rows (date, time, place…) and open space for the text.
// Every change is saved automatically a moment after you stop.
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
  const key = `data-key="${field.key}"`;
  const name = `<span class="prop-name">${field.label}</span>`;

  switch (field.type) {
    case 'title':
      return `<textarea class="title-input" ${key} dir="auto" rows="1" placeholder="${field.placeholder || TEXT.titlePlaceholder}">${escapeHtml(value)}</textarea>`;

    case 'text':
      return `<label class="prop">${icon(field.icon)}${name}
        <input type="text" class="prop-input" ${key} dir="auto" value="${escapeHtml(value)}" placeholder="${field.hint || ''}"${field.inputmode ? ` inputmode="${field.inputmode}"` : ''}></label>`;

    case 'textarea':
      return `<label class="text-block">
        <span class="label">${field.label}</span>
        <textarea ${key} dir="auto" rows="${field.big ? 10 : 3}" class="${field.big ? 'big' : ''}" placeholder="${field.hint || ''}">${escapeHtml(value)}</textarea></label>`;

    case 'date':
      return `<label class="prop">${icon(field.icon)}${name}
        <input type="date" class="prop-input" ${key} value="${escapeHtml(value)}"></label>`;

    // A normal text box (not a clock), so you can type "1020" like in quick-add.
    // inputmode="decimal" shows a number keyboard that also has a dot.
    // With "בדיוק / בערך" at the end, shown once there is a time
    case 'time': {
      const flex = field.flex ? segmentedHtml(field.flex.key, field.flex.options, editor.draft[field.flex.key],
        `data-only="time"${value ? '' : ' hidden'}`) : '';
      return `<div class="prop">${icon(field.icon)}${name}
        <input type="text" class="prop-input" ${key} data-time inputmode="decimal" dir="ltr"
               value="${escapeHtml(value)}" placeholder="${TEXT.timeHint}">${flex}</div>`;
    }

    // Where: chosen from the bus app's places (places.js)
    case 'place':
      return placeFieldHtml(field, value);

    case 'checkbox':
      return `<label class="prop">${icon(field.icon)}${name}
        <input type="checkbox" class="switch" role="switch" ${key} ${value ? 'checked' : ''}></label>`;

    case 'choice':
      return `<div class="prop">${icon(field.icon)}${name}${segmentedHtml(field.key, field.options, value)}</div>`;

    case 'rating': {
      const buttons = [1, 2, 3, 4, 5].map(n =>
        `<button type="button" data-value="${n}" class="${n <= (value || 0) ? 'on' : ''}" aria-label="${n}">★</button>`
      ).join('');
      return `<div class="prop">${icon(field.icon)}${name}<div class="stars" ${key}>${buttons}</div></div>`;
    }

    case 'photo':
      return `<div class="photo-field" ${key}>${photoFieldInner(value)}</div>`;
  }
  return '';
}

// Small buttons side by side; nothing chosen yet = the first one
function segmentedHtml(key, options, value, extra = '') {
  const current = value in options ? value : Object.keys(options)[0];
  const buttons = Object.entries(options).map(([optionValue, text]) =>
    `<button type="button" data-value="${optionValue}" class="${optionValue === current ? 'selected' : ''}">${text}</button>`
  ).join('');
  return `<div class="segmented" data-key="${key}" ${extra}>${buttons}</div>`;
}

function photoFieldInner(blob) {
  if (!blob) {
    return `<label class="prop prop-link">${icon('camera')}<span class="prop-name">${TEXT.addPhoto}</span>
      <input type="file" accept="image/*" hidden></label>`;
  }
  return `
    <img class="photo-preview" src="${photoUrl(blob)}" alt="">
    <div class="photo-buttons">
      <label class="text-button">${TEXT.changePhoto}<input type="file" accept="image/*" hidden></label>
      <button type="button" class="text-button" data-remove-photo>${TEXT.removePhoto}</button>
    </div>`;
}

function editorHtml() {
  const { group, draft } = editor;
  if (group === 'journal') return journalEditorHtml(draft);
  const fields = fieldsFor(group);
  const title = fields.filter(f => f.type === 'title').map(f => fieldHtml(f, draft[f.key])).join('');
  const props = fields.filter(f => !['title', 'textarea', 'photo'].includes(f.type)).map(f => fieldHtml(f, draft[f.key])).join('');
  const photo = fields.filter(f => f.type === 'photo').map(f => fieldHtml(f, draft[f.key])).join('');
  // Recipes: the "for how many?" strip goes right under the ingredients
  const texts = fields.filter(f => f.type === 'textarea').map(f =>
    fieldHtml(f, draft[f.key]) + (group === 'recipes' && f.key === 'ingredients' ? '<div id="scaler"></div>' : '')).join('');

  const groupOptions = GROUPS.map(g =>
    `<option value="${g.id}" ${g.id === group ? 'selected' : ''}>${groupTitle(g)}</option>`
  ).join('');


  return `
    <form class="editor" id="editor">
      ${title}
      <div class="props">
        ${props}
        <label class="prop">${groupBadge(findGroup(group), 'tiny')}<span class="prop-name">${TEXT.moveToGroup}</span>
          <select class="prop-input" id="group-select">${groupOptions}</select></label>
      </div>
      ${photo}
      ${voiceFieldHtml(draft.voices)}
      ${texts}
      <div class="editor-actions">
        <button type="button" class="text-button" id="share-button">${icon('share', 'inline')} ${TEXT.share}</button>
        <button type="button" class="text-button danger" id="delete-button">${TEXT.deleteItem}</button>
      </div>
    </form>
  `;
}

// ============================================================
// SHARING
// Sends a note as neat text (and its photo, when there is one)
// through the phone's share sheet: WhatsApp, mail, anything.
// Nothing becomes public; it's like copying and pasting.
// ============================================================

function shareText(group, item) {
  const lines = [];
  if (item.title) lines.push(item.title);
  for (const field of fieldsFor(group)) {
    const value = item[field.key];
    if (field.type === 'title' || field.type === 'photo' || value === undefined || value === '' || value === null || value === false) continue;
    if (field.type === 'textarea') {
      if (String(value).trim()) lines.push('', `${field.label}:`, String(value).trim());
    } else if (field.type === 'choice') {
      if (field.options[value]) lines.push(`${field.label}: ${field.options[value]}`);
    } else if (field.type === 'rating') {
      if (value) lines.push(`${field.label}: ${stars(value)}`);
    } else if (field.type === 'score') {
      if (value) lines.push(`${field.label}: ${value}/10`);
    } else if (Array.isArray(value)) {
      if (value.length && typeof value[0] === 'string') lines.push(`${field.label}: ${value.join(', ')}`);
    } else if (field.type === 'checkbox') {
      lines.push(field.label);
    } else if (field.type === 'date') {
      const [y, m, d] = String(value).split('-');
      if (d) lines.push(`${field.label}: ${Number(d)}.${Number(m)}.${y}`);
    } else if (field.type === 'place') {
      if (value.name) lines.push(`${field.label}: ${value.name}`);
    } else if (typeof value === 'string' || typeof value === 'number') {
      lines.push(`${field.label}: ${value}`);
    }
  }
  return lines.join('\n').trim();
}

async function shareItem(group, item) {
  const text = shareText(group, item);
  const data = { text };
  const blobs = item.photo instanceof Blob ? [item.photo] : [];
  // Journal photos live on the server; this device has a copy once they were shown
  for (const id of item.photos || []) {
    const blob = await journalPhotoBlob(id, false);
    if (blob) blobs.push(blob);
  }
  const files = blobs.map((blob, i) => new File([blob], `photo${i + 1}.jpg`, { type: blob.type || 'image/jpeg' }));
  if (files.length && navigator.canShare && navigator.canShare({ files })) data.files = files;
  if (navigator.share) {
    try {
      await navigator.share(data);
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;  // closed the share sheet
      if (data.files) {  // some apps take only text
        try { await navigator.share({ text }); return; } catch (e) { if (e.name === 'AbortError') return; }
      }
    }
  }
  // No share sheet (a computer): copy the text instead
  try {
    await navigator.clipboard.writeText(text);
    showToast(TEXT.copied);
  } catch {
    prompt('', text);
  }
}

// Textareas grow with their text instead of scrolling inside.
// Measuring means shrinking the box for a moment, which makes the page
// shorter and the browser scroll up — then it jumps back. To stop that
// "jumping text", the page keeps its height while we measure.
function autoGrow(textarea) {
  const scrollY = window.scrollY;
  const page = document.documentElement;
  page.style.minHeight = page.scrollHeight + 'px';
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
  page.style.minHeight = '';
  if (window.scrollY !== scrollY) window.scrollTo(0, scrollY);
}

function setupItemScreen() {
  const form = document.getElementById('editor');
  let timer = null;
  let saving = Promise.resolve();  // saves happen one after another, never at the same time

  async function save() {
    const { draft } = editor;
    // Journal: the title is the day; an entry with nothing in it isn't saved
    if (editor.group === 'journal') {
      draft.title = journalTitle(draft.date);
      if (draft.answer && !draft.question) draft.question = questionFor(draft.date);
      if (!editor.id && !journalHasContent(draft)) return;
    }
    if (!editor.id) {
      // A recording with no title yet gets one ("הקלטה 18.11"), so it isn't lost
      if (!(draft.title || '').trim() && draft.voices?.length) {
        const now = new Date();
        draft.title = `${VOICE_WORDS.record} ${now.getDate()}.${now.getMonth() + 1}`;
        const titleBox = form.querySelector('.title-input');
        if (titleBox && !titleBox.value.trim()) titleBox.value = draft.title;
      }
      if (!(draft.title || '').trim()) return;  // don't create an item without a title
      const created = await addItem(editor.group, draft);
      editor.id = created.id;
      // Change the address quietly (unless this save happened while leaving)
      if (location.hash.startsWith('#/new/')) history.replaceState(null, '', `#/item/${created.id}`);
    } else {
      await updateItem(editor.id, { ...draft, group: editor.group });
    }

    // A gift item with a birthday keeps a yearly reminder (gifts.js)
    if (editor.group === 'gifts') {
      const reminderId = await syncGiftReminder(editor.id, draft);
      if (reminderId !== (draft.reminderId || '')) {
        draft.reminderId = reminderId;
        await updateItem(editor.id, { reminderId });
      }
    }
  }

  function saveNow() {
    clearTimeout(timer);
    timer = null;
    saving = saving.then(save);
    return saving;
  }

  function saveSoon() {
    clearTimeout(timer);
    timer = setTimeout(saveNow, 400);
  }

  // Recordings: saved into the note when one finishes
  const finishVoice = setupVoiceField(form, () => editor.draft.voices || [], voices => {
    editor.draft.voices = voices;
    saveSoon();
  });

  // leaving = going to another screen (then a recording still going is
  // stopped and kept). Switching apps keeps a recording going.
  flushEditor = async (leaving = false) => {
    if (leaving) await finishVoice();
    return timer ? saveNow() : saving;
  };

  form.addEventListener('submit', event => event.preventDefault());

  // A row that only makes sense with another field (בדיוק/בערך needs a time)
  function updateDependentRows() {
    form.querySelectorAll('[data-only]').forEach(element => {
      element.hidden = !editor.draft[element.dataset.only];
    });
  }

  // Typing in text boxes, dates and switches
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
      updateDependentRows();
      saveSoon();
      return;
    }

    editor.draft[key] = element.type === 'checkbox' ? element.checked : element.value;
    if (element.tagName === 'TEXTAREA') autoGrow(element);
    if (key === 'servings' || key === 'ingredients') scaler.update(key === 'servings');
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

    if (event.target.closest('#share-button')) {
      shareItem(editor.group, editor.draft);
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

  // Choosing a photo (journal photos are handled in journal.js)
  form.addEventListener('change', async event => {
    if (event.target.type !== 'file' || !event.target.files[0] || event.target.matches('[data-journal-photo], [data-journal-video]')) return;
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
  document.getElementById('group-select')?.addEventListener('change', async event => {
    editor.group = event.target.value;
    if (editor.id) await saveNow();
    else history.replaceState(null, '', `#/new/${editor.group}`);
    document.getElementById('back-button').href = `#/group/${editor.group}`;
    document.getElementById('screen').innerHTML = editorHtml();
    setupItemScreen();
  });

  form.querySelectorAll('textarea').forEach(autoGrow);
  setupPlaceField(form, saveSoon);
  const scaler = setupScaler(form, () => editor.draft);
  if (editor.group === 'journal') setupJournalEditor(form, editor, saveSoon);

  // A brand-new item: start typing the title right away
  if (!editor.id) form.querySelector('.title-input')?.focus();
}
