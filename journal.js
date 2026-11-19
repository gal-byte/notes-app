// ============================================================
// JOURNAL (יומן)
// One entry per day, in short fields: a 1-10 score for the day,
// the day's question, what happened, a good thing, a hard thing,
// tomorrow, up to 10 photos and a video, people and places.
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

// Shown at the bottom of settings, to tell which version a phone runs
const APP_VERSION = '19.11 · 10';

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
  tooManyPhotos: 'אפשר עד 10 תמונות ליום, נשמרו הראשונות',
  addVideo: 'סרטון',
  removeVideo: 'הסרת הסרטון',
  makingVideo: 'מכין את הסרטון',
  stayHere: 'נא להישאר במסך הזה',
  videoError: 'לא הצלחתי להכין את הסרטון',
  videoCut: 'נשמרה רק הדקה הראשונה',
  videoOnItsWay: 'הסרטון בדרך לשרת…',
  videoFailed: 'השרת לא הצליח לקרוא את הסרטון',
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
  return !!(entry.score || entry.video || (entry.photos || []).length || (entry.people || []).length || (entry.places || []).length ||
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

// ---------- The journal screen: list, calendar, graph, best days, people ----------
// Remembered while the app is open, so you come back to the same view

const JOURNAL_VIEWS = {
  list: 'רשימה', calendar: 'לוח', graph: 'גרף', best: 'הימים הטובים', people: 'אנשים ומקומות', quotes: 'ציטוטים',
};
const JOURNAL_LOOK = {
  noScores: 'עוד אין מספיק ימים עם ציון',
  weekOf: 'שבוע של',
  days: n => (n === 1 ? 'יום אחד' : `${n} ימים`),
  noBest: 'כאן יופיעו הימים שקיבלו 9 או 10',
  noPeople: 'כאן יופיעו האנשים והמקומות מהיומן',
  graphTitle: 'ממוצע שבועי',
  newQuote: 'ציטוט חדש',
  noQuotes: 'כאן יופיעו הציטוטים. אחד מהם מופיע כל יום בראש היומן',
};
let journalView = 'list';
let journalMonth = null;      // first day of the month on the calendar
let journalTag = null;        // { key: 'people' | 'places', value }

// The picture for a day: photo 1, or else the video's still picture
function journalCover(entry) {
  return (entry.photos || [])[0] || entry.video || '';
}

function datedEntries(items) {
  return items.filter(entry => entry.date).sort((a, b) => b.date.localeCompare(a.date));
}

function journalRows(entries, framed = false) {
  return rowList(entries.map(entry => {
    const first = [...JOURNAL_TEXTS, 'answer'].map(key => (entry[key] || '').trim()).find(Boolean) || '';
    const pictures = [...(entry.photos || []), ...(entry.video ? [entry.video] : [])].slice(0, framed ? 1 : 2);
    const thumbs = pictures.map(id => framed
      ? `<span class="frame tier-${scoreTier(entry.score)}"><img class="journal-thumb" data-photo-id="${escapeHtml(id)}" alt=""></span>`
      : `<img class="thumb journal-thumb" data-photo-id="${escapeHtml(id)}" alt="">`).join('');
    return itemRow(entry, escapeHtml(first.split('\n')[0]), {
      titleHtml: escapeHtml(journalTitle(entry.date)),
      end: `${thumbs}${scoreBadge(entry.score)}`,
    });
  }));
}

async function journalScreen(items) {
  return `<div id="journal-screen">${await journalViewHtml(items)}</div>`;
}

async function journalViewHtml(items) {
  const today = toISODate(new Date());
  const hasToday = items.some(entry => entry.date === today);
  const todayButton = `
    <a class="journal-today${hasToday ? ' done' : ''}" href="#/journal/today">
      ${icon(hasToday ? 'check' : 'pencil')}
      <span>${hasToday ? JOURNAL_WORDS.openToday : JOURNAL_WORDS.writeToday}</span>
      ${hasToday ? '' : `<small>${escapeHtml(questionFor(today))}</small>`}
    </a>`;
  const tabs = `<div class="filter-chips journal-tabs">${Object.entries(JOURNAL_VIEWS).map(([view, label]) =>
    `<button type="button" class="chip${view === journalView ? ' selected' : ''}" data-journal-view="${view}">${label}</button>`
  ).join('')}</div>`;

  const entries = datedEntries(items);
  let body;
  if (journalView === 'calendar') body = journalCalendarHtml(entries);
  else if (journalView === 'graph') body = journalGraphHtml(entries);
  else if (journalView === 'best') {
    const best = entries.filter(entry => entry.score >= 9);
    body = best.length ? journalRows(best, true) : `<p class="day-empty">${JOURNAL_LOOK.noBest}</p>`;
  } else if (journalView === 'people') body = journalPeopleHtml(entries);
  else if (journalView === 'quotes') body = await journalQuotesHtml();
  else {
    body = quoteHtml(await quoteOfTheDay()) +
      (entries.length ? journalRows(entries) : `<p class="day-empty">${JOURNAL_WORDS.empty}</p>`);
  }
  return todayButton + tabs + body;
}

// The group ציטוטים, inside the journal: newest first, today's quote marked
async function journalQuotesHtml() {
  const quotes = (await getItemsInGroup('quotes')).filter(q => (q.title || '').trim())
    .sort((a, b) => b.createdAt - a.createdAt);
  const today = await quoteOfTheDay();
  const add = `
    <a class="journal-today" href="#/new/quotes">${icon('plus')}<span>${JOURNAL_LOOK.newQuote}</span></a>`;
  if (!quotes.length) return add + `<p class="day-empty">${JOURNAL_LOOK.noQuotes}</p>`;
  return add + rowList(quotes.map(quote => itemRow(quote,
    [quote.author ? escapeHtml(quote.author) : '', quote.id === today?.id ? JOURNAL_WORDS.quoteOfDay : '']
      .filter(Boolean).join(' · '))));
}

// The calendar: every day with an entry shows its picture in a frame
// colored by the day's score; with no picture, the cell is the score
// color with the number. Empty days stay plain.
function journalCalendarHtml(entries) {
  if (!journalMonth) {
    const now = todayStart();
    journalMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const byDate = new Map(entries.map(entry => [entry.date, entry]));
  const year = journalMonth.getFullYear();
  const month = journalMonth.getMonth();
  const todayIso = toISODate(todayStart());
  const isThisMonth = toISODate(journalMonth).slice(0, 7) === todayIso.slice(0, 7);
  const title = journalMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

  let cells = '<span class="cal-blank"></span>'.repeat(journalMonth.getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toISODate(new Date(year, month, day));
    const entry = byDate.get(iso);
    const isToday = iso === todayIso ? ' today' : '';
    if (iso > todayIso) {
      cells += `<span class="jcal-day future">${day}</span>`;
    } else if (!entry) {
      cells += `<a class="jcal-day${isToday}" href="#/journal/${iso}">${day}</a>`;
    } else {
      const tier = entry.score ? ` tier-${scoreTier(entry.score)}` : '';
      const cover = journalCover(entry);
      cells += cover
        ? `<a class="jcal-day framed${tier}${isToday}" href="#/item/${entry.id}">
             <img data-photo-id="${escapeHtml(cover)}" alt=""><span class="jcal-num">${day}</span></a>`
        : `<a class="jcal-day filled${tier}${isToday}" href="#/item/${entry.id}">${entry.score || day}</a>`;
    }
  }
  const weekdays = TEXT.weekdaysShort.map(name => `<span>${name}</span>`).join('');
  return `
    <div class="cal-header">
      <h2 class="cal-title">${title}</h2>
      ${isThisMonth ? '' : `<button type="button" class="text-button" data-journal-month="0">${TEXT.today}</button>`}
      <button type="button" class="icon-button" data-journal-month="-1" aria-label="${TEXT.prevMonth}">
        <svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>
      </button>
      <button type="button" class="icon-button" data-journal-month="1" aria-label="${TEXT.nextMonth}"${isThisMonth ? ' disabled' : ''}>
        <svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg>
      </button>
    </div>
    <div class="cal-grid-card">
      <div class="cal-weekdays">${weekdays}</div>
      <div class="cal-grid jcal-grid" id="jcal-grid">${cells}</div>
    </div>`;
}

// Weekly average score (weeks start on Sunday), the last year at most
function weeklyScores(entries) {
  const weeks = new Map();
  for (const entry of entries) {
    if (!entry.score) continue;
    const day = parseISODate(entry.date);
    day.setDate(day.getDate() - day.getDay());
    const key = toISODate(day);
    const week = weeks.get(key) || { start: key, sum: 0, count: 0 };
    week.sum += entry.score;
    week.count += 1;
    weeks.set(key, week);
  }
  if (!weeks.size) return [];
  // Every week from the first one to this one, empty ones too (they break the line)
  const first = parseISODate([...weeks.keys()].sort()[0]);
  const now = todayStart();
  now.setDate(now.getDate() - now.getDay());
  const all = [];
  for (const d = new Date(first); d <= now; d.setDate(d.getDate() + 7)) {
    const week = weeks.get(toISODate(d));
    all.push(week ? { ...week, average: week.sum / week.count } : { start: toISODate(d), count: 0 });
  }
  return all.slice(-52);
}

function journalGraphHtml(entries) {
  const weeks = weeklyScores(entries);
  const scored = weeks.filter(week => week.count);
  if (!scored.length) return `<p class="day-empty">${JOURNAL_LOOK.noScores}</p>`;

  const W = 340, H = 190, left = 26, right = 10, top = 14, bottom = 26;
  const step = weeks.length > 1 ? (W - left - right) / (weeks.length - 1) : 0;
  // Right to left like the rest of the app: this week is on the left
  const x = i => (weeks.length > 1 ? W - right - i * step : (W + left - right) / 2);
  const y = v => top + (10 - v) * (H - top - bottom) / 9;

  const grid = [1, 4, 7, 10].map(v => `
    <line class="g-grid" x1="${left}" x2="${W - right}" y1="${y(v)}" y2="${y(v)}"/>
    <text class="g-axis" x="${left - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');

  // The line, broken where a week has no scores
  let path = '';
  let drawing = false;
  weeks.forEach((week, i) => {
    if (!week.count) { drawing = false; return; }
    path += `${drawing ? 'L' : 'M'}${x(i).toFixed(1)},${y(week.average).toFixed(1)}`;
    drawing = true;
  });

  // Month names under the first week of each month
  let lastMonth = '';
  const months = weeks.map((week, i) => {
    const month = week.start.slice(0, 7);
    if (month === lastMonth) return '';
    lastMonth = month;
    if (i === 0 && weeks.length > 1 && parseISODate(week.start).getDate() > 21) return '';
    const name = parseISODate(week.start).toLocaleDateString('he-IL', { month: 'short' });
    return `<text class="g-axis" x="${x(i)}" y="${H - 6}" text-anchor="middle">${name}</text>`;
  }).join('');

  const dots = weeks.map((week, i) => {
    if (!week.count) return '';
    const cx = x(i);
    const cy = y(week.average);
    const half = Math.max(step / 2, 8);
    return `
      <g class="g-week" data-week="${i}">
        <rect class="g-hit" x="${cx - half}" y="${top - 10}" width="${half * 2}" height="${H - top - bottom + 20}"/>
        <circle class="g-dot tier-${scoreTier(Math.round(week.average))}" cx="${cx}" cy="${cy}" r="4.5"/>
      </g>`;
  }).join('');

  const last = scored[scored.length - 1];
  const tips = weeks.map((week, i) => week.count ? {
    i, x: x(i), y: y(week.average),
    text: `${JOURNAL_LOOK.weekOf} ${parseISODate(week.start).getDate()}.${parseISODate(week.start).getMonth() + 1}: ${week.average.toFixed(1)} · ${JOURNAL_LOOK.days(week.count)}`,
  } : null).filter(Boolean);

  return `
    ${sectionLabel(JOURNAL_LOOK.graphTitle)}
    <div class="journal-graph" id="journal-graph" data-tips="${escapeHtml(JSON.stringify(tips))}">
      <p class="graph-tip" id="graph-tip">${escapeHtml(tips[tips.length - 1].text)}</p>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${JOURNAL_LOOK.graphTitle}">
        ${grid}
        ${months}
        <path class="g-line" d="${path}"/>
        <line class="g-cross" id="graph-cross" x1="0" x2="0" y1="${top}" y2="${H - bottom}" visibility="hidden"/>
        ${dots}
      </svg>
    </div>
    ${scored.length > 1 ? '' : `<p class="day-empty">${JOURNAL_LOOK.days(last.count)}</p>`}`;
}

// People and places: tap one to see every day with them
function journalPeopleHtml(entries) {
  const counts = { people: new Map(), places: new Map() };
  for (const entry of entries) {
    for (const key of ['people', 'places']) {
      for (const value of entry[key] || []) counts[key].set(value, (counts[key].get(value) || 0) + 1);
    }
  }
  if (!counts.people.size && !counts.places.size) return `<p class="day-empty">${JOURNAL_LOOK.noPeople}</p>`;
  if (journalTag && !counts[journalTag.key].has(journalTag.value)) journalTag = null;

  const section = key => {
    if (!counts[key].size) return '';
    const chips = [...counts[key]].sort((a, b) => b[1] - a[1]).map(([value, count]) => {
      const on = journalTag?.key === key && journalTag.value === value;
      return `<button type="button" class="chip${on ? ' selected' : ''}" data-journal-tag="${key}" data-value="${escapeHtml(value)}">${escapeHtml(value)} <small>${count}</small></button>`;
    }).join('');
    return sectionLabel(JOURNAL_WORDS[key]) + `<div class="filter-chips wrap">${chips}</div>`;
  };

  const days = journalTag
    ? sectionLabel(escapeHtml(journalTag.value)) +
      journalRows(entries.filter(entry => (entry[journalTag.key] || []).includes(journalTag.value)))
    : '';
  return section('people') + section('places') + days;
}

function setupJournalScreen() {
  const box = document.getElementById('journal-screen');
  if (!box) return;
  async function redraw() {
    box.innerHTML = await journalViewHtml(await getItemsInGroup('journal'));
    fillJournalPhotos(box);
  }

  box.addEventListener('click', event => {
    const view = event.target.closest('[data-journal-view]');
    if (view) { journalView = view.dataset.journalView; redraw(); return; }

    const move = event.target.closest('[data-journal-month]');
    if (move) {
      const step = Number(move.dataset.journalMonth);
      const now = todayStart();
      journalMonth = step ? new Date(journalMonth.getFullYear(), journalMonth.getMonth() + step, 1)
                          : new Date(now.getFullYear(), now.getMonth(), 1);
      redraw();
      return;
    }

    const tag = event.target.closest('[data-journal-tag]');
    if (tag) {
      const same = journalTag?.key === tag.dataset.journalTag && journalTag.value === tag.dataset.value;
      journalTag = same ? null : { key: tag.dataset.journalTag, value: tag.dataset.value };
      redraw();
    }
  });

  // The graph: touch or point at a week to read it
  box.addEventListener('pointerover', showWeek);
  box.addEventListener('pointerdown', showWeek);
  function showWeek(event) {
    const week = event.target.closest('[data-week]');
    const graph = document.getElementById('journal-graph');
    if (!week || !graph) return;
    const tip = JSON.parse(graph.dataset.tips).find(t => t.i === Number(week.dataset.week));
    if (!tip) return;
    document.getElementById('graph-tip').textContent = tip.text;
    const cross = document.getElementById('graph-cross');
    cross.setAttribute('x1', tip.x);
    cross.setAttribute('x2', tip.x);
    cross.setAttribute('visibility', 'visible');
    graph.querySelectorAll('.g-dot.on').forEach(dot => dot.classList.remove('on'));
    week.querySelector('.g-dot').classList.add('on');
  }

  // Swipe sideways on the calendar to change month (next month is to the left)
  let startX = null;
  box.addEventListener('touchstart', event => {
    startX = event.target.closest('#jcal-grid') ? event.touches[0].clientX : null;
  }, { passive: true });
  box.addEventListener('touchend', event => {
    if (startX === null) return;
    const dx = event.changedTouches[0].clientX - startX;
    startX = null;
    if (Math.abs(dx) < 60) return;
    const now = todayStart();
    const next = new Date(journalMonth.getFullYear(), journalMonth.getMonth() + (dx > 0 ? 1 : -1), 1);
    if (next > now) return;
    journalMonth = next;
    redraw();
  });
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
      <div class="journal-photos tier-frame ${draft.score ? `tier-${scoreTier(draft.score)}` : ''}" id="journal-photos">${journalPhotosHtml(draft)}</div>
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

// Up to 10 photos and one video. making = 0..1 while a video is being made smaller.
const JOURNAL_MAX_PHOTOS = 10;
function journalPhotosHtml(draft, making = null) {
  const ids = draft.photos || [];
  const photos = ids.map((id, index) => `
    <div class="journal-photo">
      <img data-photo-id="${escapeHtml(id)}" data-size="full" alt="">
      <button type="button" class="journal-photo-remove" data-remove-journal-photo="${index}" aria-label="${JOURNAL_WORDS.removePhoto}">${icon('x')}</button>
    </div>`).join('');
  const addPhoto = ids.length < JOURNAL_MAX_PHOTOS ? `
    <label class="journal-photo add">${icon('camera')}<span>${JOURNAL_WORDS.addPhoto}</span>
      <input type="file" accept="image/*" multiple hidden data-journal-photo></label>` : '';
  let video = '';
  if (making !== null) {
    video = `
      <div class="journal-photo add making">
        <span>${JOURNAL_WORDS.makingVideo}${making >= 0 ? ` ${Math.round(making * 100)}%` : '…'}</span>
        <small>${JOURNAL_WORDS.stayHere}</small>
      </div>`;
  } else if (draft.video) {
    video = `
      <div class="journal-video">
        <video data-video-id="${escapeHtml(draft.video)}" controls playsinline preload="metadata"></video>
        <button type="button" class="journal-photo-remove" data-remove-journal-video aria-label="${JOURNAL_WORDS.removeVideo}">${icon('x')}</button>
      </div>`;
  } else {
    video = `
      <label class="journal-photo add" data-add-video>${icon('video')}<span>${JOURNAL_WORDS.addVideo}</span>
        <input type="file" accept="video/*" hidden data-journal-video></label>`;
  }
  return photos + addPhoto + video;
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
    form.querySelector('#journal-photos').className =
      `journal-photos tier-frame ${draft.score ? `tier-${scoreTier(draft.score)}` : ''}`;
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

  // Photos (up to 10) and the video
  const photosBox = form.querySelector('#journal-photos');
  let making = null;
  function redrawPhotos() {
    photosBox.innerHTML = journalPhotosHtml(draft, making);
    fillJournalPhotos(photosBox);
    fillJournalVideos(photosBox);
  }
  photosBox.addEventListener('change', async event => {
    const videoInput = event.target.closest('[data-journal-video]');
    if (videoInput?.files[0]) {
      const file = videoInput.files[0];
      making = 0;
      redrawPhotos();
      let lastShown = 0;
      try {
        const id = await addJournalVideo(file, part => {
          if (part - lastShown < 0.02) return;
          lastShown = part;
          const label = photosBox.querySelector('.making span');
          if (label) label.textContent = `${JOURNAL_WORDS.makingVideo} ${Math.round(part * 100)}%`;
        });
        draft.video = id;
        making = null;
        redrawPhotos();
        saveSoon();
        const record = await getPhotoRecord(id).catch(() => null);
        if (record && record.seconds >= VIDEO_MAX_SECONDS) showToast(JOURNAL_WORDS.videoCut);
      } catch (error) {
        making = null;
        redrawPhotos();
        alert(`${JOURNAL_WORDS.videoError}
(${error?.name || ''} ${error?.message || error})`);
      }
      return;
    }
    const input = event.target.closest('[data-journal-photo]');
    if (!input || !input.files[0]) return;
    // You can pick several at once
    const room = JOURNAL_MAX_PHOTOS - (draft.photos || []).length;
    const files = [...input.files].slice(0, room);
    let failed = null;
    for (const file of files) {
      try {
        const id = await addJournalPhoto(file);
        draft.photos = [...(draft.photos || []), id].slice(0, JOURNAL_MAX_PHOTOS);
        redrawPhotos();
        saveSoon();
      } catch (error) {
        failed = error;
      }
    }
    if (failed) alert(`${TEXT.photoError}
(${failed?.name || ''} ${failed?.message || failed})`);
    else if (input.files.length > room) showToast(JOURNAL_WORDS.tooManyPhotos);
  });
  photosBox.addEventListener('click', async event => {
    // Inside the phone app (APK): Android's own gallery, uploaded in the background
    if (nativeApp() && event.target.closest('[data-add-video]')) {
      event.preventDefault();
      if (making !== null) return;
      making = -1;
      redrawPhotos();
      try {
        const picked = await pickJournalVideoNative();
        making = null;
        if (picked) {
          draft.video = picked.id;
          saveSoon();
          if (picked.seconds > VIDEO_MAX_SECONDS) showToast(JOURNAL_WORDS.videoCut);
        }
        redrawPhotos();
      } catch (error) {
        making = null;
        redrawPhotos();
        alert(`${JOURNAL_WORDS.videoError}
(${error?.message || error})`);
      }
      return;
    }
    if (event.target.closest('[data-remove-journal-video]')) {
      event.preventDefault();
      if (!confirm(JOURNAL_WORDS.removeVideo + '?')) return;
      draft.video = '';
      redrawPhotos();
      saveSoon();
      return;
    }
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
  fillJournalVideos(form);
}

// ---------- Settings: the evening question and the morning memories ----------

async function journalSettingsHtml() {
  let options = null;
  try {
    const response = await fetch(`${SERVER}/journal/settings`, { signal: AbortSignal.timeout(5000) });
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
