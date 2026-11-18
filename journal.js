// ============================================================
// JOURNAL (יומן)
// One entry per day, in short fields: a 1-10 score for the day,
// the day's question, what happened, a good thing, a hard thing,
// tomorrow, up to 2 photos, people and places.
//
//   #/journal/today, #/journal/2026-11-18  → that day's entry
//                                            (a new one if there's none)
// The title is made by itself ("יום ג׳ 18.11"). Any past day can be
// filled in. Photos are files on the home server (photos.js).
//
// The home server sends the evening question at 21:30 (only when
// today has no entry) and "לפני שנה היום" in the morning
// (journal.py in ~/notify). Both can be turned off in settings.
//
// Also here: the quote of the day, from the group ציטוטים.
// ============================================================

const JOURNAL_WORDS = {
  today: 'היום',
  writeToday: 'לכתוב על היום',
  openToday: 'היום שלי',
  score: 'ציון ליום',
  question: 'שאלת היום',
  happened: 'מה היה היום',
  good: 'דבר טוב',
  hard: 'דבר קשה',
  tomorrow: 'מחר',
  people: 'אנשים',
  places: 'מקומות',
  addPeople: 'מי היה?',
  addPlaces: 'איפה היית?',
  addPhoto: 'תמונה',
  removePhoto: 'הסרת התמונה',
  makeReminder: 'להפוך לתזכורת למחר',
  reminderMade: 'נוספה תזכורת למחר',
  dateTaken: 'כבר יש יומן ליום הזה, הוא נפתח',
  quoteOfDay: 'ציטוט היום',
  empty: 'עוד אין כאן כלום',
  eveningTitle: 'שאלה בערב (21:30)',
  eveningSub: 'רק אם עוד לא כתבת היום',
  morningTitle: 'זיכרונות בבוקר',
  morningSub: '"לפני שנה היום" עם תמונה',
  journalSettings: 'יומן',
};

// Same list and order as journal.py on the server: the day picks the question.
const JOURNAL_QUESTIONS = [
  'מה הצחיק אותך היום?',
  'על מה אפשר להגיד תודה היום?',
  'מה למדת היום?',
  'עם מי היה הכי נעים לדבר היום?',
  'מה היה הרגע הכי שקט של היום?',
  'מה היה כדאי לעשות אחרת היום?',
  'מה עשית היום רק בשביל עצמך?',
  'מה הפתיע אותך היום?',
  'איזה ריח, טעם או צליל נשאר מהיום?',
  'מה היה קשה היום, ואיך התמודדת?',
  'במה התקדמת היום, אפילו קצת?',
  'מה מחכה לך מחר?',
  'מי עזר לך היום, או למי עזרת?',
  'מה היה הדבר הכי טעים שאכלת היום?',
  'באיזה רגע היום הכי נהנית?',
  'איזה שיר או מחשבה ליוו אותך היום?',
  'מה גרם לך לחייך היום?',
  'מה כדאי לזכור מהיום גם בעוד שנה?',
  'על מה חשבת הכי הרבה היום?',
  'במה הצלחת היום?',
  'מה היה שונה היום מאתמול?',
  'מה נתן לך אנרגיה היום, ומה לקח?',
  'איזו שיחה מהיום נשארה איתך?',
  'מה ראית היום שהיה יפה?',
  'מה נדחה היום, ולמה?',
  'במה היה כדאי להשקיע יותר זמן?',
  'איך היה מצב הרוח בבוקר, ואיך בערב?',
  'מה הדבר הכי קטן ששימח אותך היום?',
  'איזו עצה מהערב הזה תעזור מחר בבוקר?',
  'איזה רגע מהיום שווה תמונה?',
];

// Days since 1.1.1970 for a date like "2026-11-18" (same as the server)
function dayNumber(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86400000);
}

function questionFor(iso) {
  const n = JOURNAL_QUESTIONS.length;
  return JOURNAL_QUESTIONS[((dayNumber(iso) % n) + n) % n];
}

// "2026-11-18" → "יום ג׳ 18.11" (with the year when it's not this year)
function journalTitle(iso) {
  if (!iso) return '';
  const date = parseISODate(iso);
  const year = date.getFullYear() !== new Date().getFullYear() ? `.${String(date.getFullYear()).slice(2)}` : '';
  return `יום ${TEXT.weekdaysShort[date.getDay()]} ${date.getDate()}.${date.getMonth() + 1}${year}`;
}

// The score's "rarity" (the calendar frames will use the same colors)
function scoreTier(score) {
  if (!score) return '';
  if (score >= 10) return 'legendary';
  if (score >= 7) return 'epic';
  if (score >= 5) return 'rare';
  if (score >= 3) return 'uncommon';
  return 'common';
}

function scoreBadge(score) {
  return score ? `<span class="score-badge tier-${scoreTier(score)}">${score}</span>` : '';
}

const JOURNAL_TEXTS = ['happened', 'good', 'hard', 'tomorrow'];

function journalHasContent(entry) {
  return !!(entry.score || (entry.photos || []).length || (entry.people || []).length || (entry.places || []).length ||
    (entry.voices || []).length || [...JOURNAL_TEXTS, 'answer'].some(key => (entry[key] || '').trim()));
}

// For search and sharing (sections.js reads these)
const JOURNAL_FIELDS = [
  { key: 'date', type: 'date', label: 'תאריך', icon: 'calendar' },
  { key: 'score', type: 'score', label: JOURNAL_WORDS.score },
  { key: 'answer', type: 'textarea', label: JOURNAL_WORDS.question },
  { key: 'happened', type: 'textarea', label: JOURNAL_WORDS.happened },
  { key: 'good', type: 'textarea', label: JOURNAL_WORDS.good },
  { key: 'hard', type: 'textarea', label: JOURNAL_WORDS.hard },
  { key: 'tomorrow', type: 'textarea', label: JOURNAL_WORDS.tomorrow },
  { key: 'people', type: 'list', label: JOURNAL_WORDS.people },
  { key: 'places', type: 'list', label: JOURNAL_WORDS.places },
];

async function journalEntryFor(iso) {
  return (await getItemsInGroup('journal')).find(entry => entry.date === iso) || null;
}

// ---------- Quote of the day (group ציטוטים) ----------

async function quoteOfTheDay() {
  const quotes = (await getItemsInGroup('quotes')).filter(q => (q.title || '').trim())
    .sort((a, b) => a.createdAt - b.createdAt);
  if (!quotes.length) return null;
  return quotes[dayNumber(toISODate(new Date())) % quotes.length];
}

function quoteHtml(quote) {
  if (!quote) return '';
  return `
    <a class="quote-card" href="#/item/${quote.id}">
      <span class="label">${JOURNAL_WORDS.quoteOfDay}</span>
      <q dir="auto">${escapeHtml(quote.title)}</q>
      ${quote.author ? `<cite dir="auto">${escapeHtml(quote.author)}</cite>` : ''}
    </a>`;
}

// ---------- The list ----------

async function journalScreen(items) {
  const today = toISODate(new Date());
  const hasToday = items.some(entry => entry.date === today);
  const quote = quoteHtml(await quoteOfTheDay());

  const todayButton = `
    <a class="journal-today${hasToday ? ' done' : ''}" href="#/journal/today">
      ${icon(hasToday ? 'check' : 'pencil')}
      <span>${hasToday ? JOURNAL_WORDS.openToday : JOURNAL_WORDS.writeToday}</span>
      ${hasToday ? '' : `<small>${escapeHtml(questionFor(today))}</small>`}
    </a>`;

  const entries = items.filter(entry => entry.date).sort((a, b) => b.date.localeCompare(a.date));
  const rows = entries.map(entry => {
    const first = [...JOURNAL_TEXTS, 'answer'].map(key => (entry[key] || '').trim()).find(Boolean) || '';
    const photos = (entry.photos || []).slice(0, 2).map(id =>
      `<img class="thumb journal-thumb" data-photo-id="${escapeHtml(id)}" alt="">`).join('');
    return itemRow(entry, escapeHtml(first.split('\n')[0]), {
      titleHtml: escapeHtml(journalTitle(entry.date)),
      end: `${photos}${scoreBadge(entry.score)}`,
    });
  });

  return todayButton + quote + (rows.length ? rowList(rows) : `<p class="day-empty">${JOURNAL_WORDS.empty}</p>`);
}

// ---------- The entry screen ----------

function journalEditorHtml(draft) {
  const question = draft.question || questionFor(draft.date || toISODate(new Date()));
  const area = (key, label, hint = '') => `
    <label class="text-block">
      <span class="label">${label}</span>
      <textarea data-key="${key}" dir="auto" rows="2" placeholder="${hint}">${escapeHtml(draft[key] || '')}</textarea>
    </label>`;

  return `
    <form class="editor journal-editor" id="editor">
      <h2 class="journal-title" id="journal-title">${escapeHtml(journalTitle(draft.date))}</h2>
      <div class="props">
        <label class="prop">${icon('calendar')}<span class="prop-name">תאריך</span>
          <input type="date" class="prop-input" data-key="date" value="${escapeHtml(draft.date || '')}" max="${toISODate(new Date())}"></label>
      </div>
      <div class="score-field" id="score-field">
        <span class="label">${JOURNAL_WORDS.score}</span>
        <div class="score-buttons">${scoreButtons(draft.score)}</div>
      </div>
      ${area('answer', escapeHtml(question))}
      ${area('happened', JOURNAL_WORDS.happened)}
      ${area('good', JOURNAL_WORDS.good)}
      ${area('hard', JOURNAL_WORDS.hard)}
      ${area('tomorrow', JOURNAL_WORDS.tomorrow)}
      <div id="tomorrow-reminder">${tomorrowButtonHtml(draft)}</div>
      <div class="journal-photos" id="journal-photos">${journalPhotosHtml(draft.photos || [])}</div>
      ${chipsFieldHtml('people', JOURNAL_WORDS.people, JOURNAL_WORDS.addPeople, draft.people || [])}
      ${chipsFieldHtml('places', JOURNAL_WORDS.places, JOURNAL_WORDS.addPlaces, draft.places || [])}
      ${voiceFieldHtml(draft.voices)}
      <div class="editor-actions">
        <button type="button" class="text-button" id="share-button">${icon('share', 'inline')} ${TEXT.share}</button>
        <button type="button" class="text-button danger" id="delete-button">${TEXT.deleteItem}</button>
      </div>
    </form>`;
}

function scoreButtons(score) {
  return Array.from({ length: 10 }, (_, i) => i + 1).map(n =>
    `<button type="button" data-score="${n}" class="${n === score ? `on tier-${scoreTier(n)}` : ''}" aria-label="${n}">${n}</button>`
  ).join('');
}

function tomorrowButtonHtml(draft) {
  if (draft.tomorrowReminderId) {
    return `<a class="quiet-line text-button" href="#/item/${escapeHtml(draft.tomorrowReminderId)}">${icon('check', 'inline')} ${JOURNAL_WORDS.reminderMade}</a>`;
  }
  if (!(draft.tomorrow || '').trim()) return '';
  return `<button type="button" class="quiet-line text-button" data-make-reminder>${icon('bell', 'inline')} ${JOURNAL_WORDS.makeReminder}</button>`;
}

function journalPhotosHtml(ids) {
  const photos = ids.map((id, index) => `
    <div class="journal-photo">
      <img data-photo-id="${escapeHtml(id)}" data-size="full" alt="">
      <button type="button" class="journal-photo-remove" data-remove-journal-photo="${index}" aria-label="${JOURNAL_WORDS.removePhoto}">${icon('x')}</button>
    </div>`).join('');
  const add = ids.length < 2 ? `
    <label class="journal-photo add">${icon('camera')}<span>${JOURNAL_WORDS.addPhoto}</span>
      <input type="file" accept="image/*" hidden data-journal-photo></label>` : '';
  return photos + add;
}

function chipsFieldHtml(key, label, hint, values) {
  return `
    <div class="chips-field" data-chips="${key}">
      <span class="label">${label}</span>
      <div class="chips-box">
        <span class="chips-selected">${values.map(v => chipHtml(v, true)).join('')}</span>
        <input type="text" class="chips-input" dir="auto" placeholder="${hint}" enterkeyhint="done">
      </div>
      <div class="chips-suggest"></div>
    </div>`;
}

function chipHtml(value, selected) {
  return selected
    ? `<button type="button" class="chip selected" data-chip-remove="${escapeHtml(value)}">${escapeHtml(value)} ×</button>`
    : `<button type="button" class="chip" data-chip-add="${escapeHtml(value)}">${escapeHtml(value)}</button>`;
}

// Names used before, most used first (for the suggestions under people / places)
async function usedBefore(key) {
  const counts = new Map();
  for (const entry of await getItemsInGroup('journal')) {
    for (const value of entry[key] || []) counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1]).map(([value]) => value);
}

// The journal parts of the item screen. editor = { id, draft }, saveSoon from sections.js
function setupJournalEditor(form, editor, saveSoon) {
  const draft = editor.draft;

  // Score: tap a number; tap it again to clear
  form.querySelector('#score-field').addEventListener('click', event => {
    const button = event.target.closest('[data-score]');
    if (!button) return;
    const score = Number(button.dataset.score);
    draft.score = draft.score === score ? 0 : score;
    form.querySelector('.score-buttons').innerHTML = scoreButtons(draft.score);
    haptic(5);
    saveSoon();
  });

  // The date: one entry per day
  form.querySelector('input[data-key="date"]').addEventListener('change', async event => {
    const iso = event.target.value;
    if (!iso) return;
    const other = await journalEntryFor(iso);
    if (other && other.id !== editor.id) {
      showToast(JOURNAL_WORDS.dateTaken);
      location.replace(`#/item/${other.id}`);
      return;
    }
    form.querySelector('#journal-title').textContent = journalTitle(iso);
  });

  // "מחר" → a reminder for the next day
  form.addEventListener('input', event => {
    if (event.target.dataset.key === 'tomorrow' && !draft.tomorrowReminderId) {
      form.querySelector('#tomorrow-reminder').innerHTML = tomorrowButtonHtml(draft);
    }
  });
  form.querySelector('#tomorrow-reminder').addEventListener('click', async event => {
    if (!event.target.closest('[data-make-reminder]')) return;
    const lines = draft.tomorrow.trim().split('\n');
    const next = parseISODate(draft.date || toISODate(new Date()));
    next.setDate(next.getDate() + 1);
    const reminder = await addItem('reminders', {
      title: lines[0], text: lines.slice(1).join('\n'), date: toISODate(next), repeatYearly: false,
    });
    draft.tomorrowReminderId = reminder.id;
    form.querySelector('#tomorrow-reminder').innerHTML = tomorrowButtonHtml(draft);
    haptic();
    saveSoon();
  });

  // Photos (up to 2)
  const photosBox = form.querySelector('#journal-photos');
  function redrawPhotos() {
    photosBox.innerHTML = journalPhotosHtml(draft.photos || []);
    fillJournalPhotos(photosBox);
  }
  photosBox.addEventListener('change', async event => {
    const input = event.target.closest('[data-journal-photo]');
    if (!input || !input.files[0]) return;
    try {
      const id = await addJournalPhoto(input.files[0]);
      draft.photos = [...(draft.photos || []), id].slice(0, 2);
      redrawPhotos();
      saveSoon();
    } catch {
      alert(TEXT.photoError);
    }
  });
  photosBox.addEventListener('click', event => {
    const remove = event.target.closest('[data-remove-journal-photo]');
    if (!remove) return;
    event.preventDefault();
    if (!confirm(JOURNAL_WORDS.removePhoto + '?')) return;
    draft.photos = (draft.photos || []).filter((_, i) => i !== Number(remove.dataset.removeJournalPhoto));
    redrawPhotos();
    saveSoon();
  });

  // People and places: chips
  form.querySelectorAll('[data-chips]').forEach(async field => {
    const key = field.dataset.chips;
    const input = field.querySelector('.chips-input');
    const suggestBox = field.querySelector('.chips-suggest');
    const used = await usedBefore(key);

    function redraw() {
      const values = draft[key] || [];
      field.querySelector('.chips-selected').innerHTML = values.map(v => chipHtml(v, true)).join('');
      const typed = input.value.trim();
      const suggestions = used.filter(v => !values.includes(v) && (!typed || v.includes(typed))).slice(0, 8);
      suggestBox.innerHTML = suggestions.map(v => chipHtml(v, false)).join('');
    }
    function add(value) {
      value = value.trim().replace(/,$/, '').trim();
      if (!value || (draft[key] || []).includes(value)) return;
      draft[key] = [...(draft[key] || []), value];
      if (!used.includes(value)) used.unshift(value);
      input.value = '';
      redraw();
      saveSoon();
    }

    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); add(input.value); }
    });
    input.addEventListener('input', () => {
      if (input.value.includes(',')) add(input.value);
      else redraw();
    });
    input.addEventListener('blur', () => { if (input.value.trim()) add(input.value); });
    field.addEventListener('click', event => {
      const addButton = event.target.closest('[data-chip-add]');
      if (addButton) { add(addButton.dataset.chipAdd); return; }
      const removeButton = event.target.closest('[data-chip-remove]');
      if (removeButton) {
        draft[key] = (draft[key] || []).filter(v => v !== removeButton.dataset.chipRemove);
        redraw();
        saveSoon();
      }
    });
    redraw();
  });

  fillJournalPhotos(form);
}

// ---------- Settings: the evening question and the morning memories ----------

async function journalSettingsHtml() {
  let options = null;
  try {
    const response = await fetch(`${SERVER}/journal/settings`);
    if (response.ok) options = await response.json();
  } catch { /* offline */ }
  const disabled = !options;
  return sectionLabel(JOURNAL_WORDS.journalSettings) + rowList([
    settingRow({ id: 'set-evening', iconName: 'book', title: JOURNAL_WORDS.eveningTitle,
      sub: disabled ? TEXT.syncNoServer : JOURNAL_WORDS.eveningSub,
      end: switchHtml('journal-evening', options?.evening, disabled) }),
    settingRow({ id: 'set-morning', iconName: 'sparkle', title: JOURNAL_WORDS.morningTitle,
      sub: disabled ? '' : JOURNAL_WORDS.morningSub,
      end: switchHtml('journal-morning', options?.morning, disabled) }),
  ]);
}

async function changeJournalSetting(name, on) {
  const key = name === 'journal-evening' ? 'evening' : 'morning';
  const result = await postToServer('/journal/settings', { [key]: on });
  if (result[key] !== on) throw new Error(TEXT.syncNoServer);
}
