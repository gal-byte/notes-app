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
// Movies and shows: the day you saw it (set by itself when it's marked seen or gets stars; shown in that day's journal)
const WATCHED_ON_FIELD = { key: 'watchedOn', type: 'date', label: 'מתי ראיתי', icon: 'calendar' };

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
    WATCHED_ON_FIELD,
    { key: 'recommendedBy', type: 'text', label: 'מי המליץ', icon: 'heart' },
    NOTES_FIELD,
  ],
  shows: [
    TITLE_FIELD,
    { key: 'list', type: 'choice', label: 'רשימה', icon: 'bookmark', options: SHOW_LISTS },
    { key: 'rating', type: 'rating', label: 'דירוג', icon: 'star' },
    WATCHED_ON_FIELD,
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
  // Shared reels and Shorts (the server reads them, Claude sums them up; see REELS below)
  reels: [
    TITLE_FIELD,
    { key: 'tags', type: 'text', label: 'תגיות', icon: 'bookmark', hint: '' },
    NOTES_FIELD,
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
  let lead = options.lead || '';
  if (options.photo) lead = `<img class="thumb" src="${photoUrl(options.photo)}" alt="">`;
  else if (options.poster) lead = posterImg(options.poster);

  const filter = options.filter !== undefined
    ? `data-filter-values="${escapeHtml(options.filter)}"` : '';

  return `
    <a class="row${options.dim ? ' dim' : ''}" href="#/item/${item.id}" data-id="${item.id}" ${filter}>
      ${lead}
      <span class="row-main">
        <span class="row-title" dir="auto">${item.pinned && !options.noPin ? icon('pushpin', 'inline pinned') : ''}${options.titleHtml || escapeHtml(item.title) || TEXT.untitled}${options.after || ''}</span>
        ${rowDateKey && item[rowDateKey]
          ? `<span class="row-sub with-date"><span class="sub-text">${sub}</span><span class="row-date">${timeAgo(item[rowDateKey])}</span></span>`
          : sub ? `<span class="row-sub">${sub}</span>` : ''}
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

// POSTERS
// The TV hub finds each movie and show once on its movie site; the server passes the posters on
// ({ note id: { poster, year } }). Kept on the phone, so the list shows them at once and offline.
let posters = (() => {
  try { return JSON.parse(localStorage.getItem('posters')) || {}; } catch { return {}; }
})();
let postersAt = 0;

function posterImg(url) {
  return `<img class="thumb poster" src="${escapeHtml(url)}" alt="" loading="lazy">`;
}

function posterBig({ poster }) {
  return `<div class="poster-side"><img class="poster-big" src="${escapeHtml(poster)}" alt=""></div>`;
}

// ---------- The movie page ----------
// The TV hub also gets each title's details from TMDB (summary, runtime, genres, cast, trailer, where it
// streams in Israel); the server passes them on at /movie/<note id>. Kept on the phone per movie, so the
// page draws at once (and offline), then updates.
const TV_HUB = 'https://home-server.tail7870b4.ts.net:8801';
const MOVIE_WORDS = {
  onTv: 'לנגן בטלוויזיה', trailer: 'טריילר', streaming: 'לצפייה ב', cast: 'שחקנים',
  director: 'בימוי', creator: 'יצירה', minutes: 'דק׳', seasons: n => n === 1 ? 'עונה אחת' : `${n} עונות`,
  opening: 'נפתח בטלוויזיה', tvError: 'הטלוויזיה לא ענתה', credit: 'המידע מ-TMDB',
};

function movieCached(id) {
  try { return JSON.parse(localStorage.getItem('movie:' + id)); } catch { return null; }
}

function runtimeText(minutes) {
  const m = Number(minutes);
  if (!m) return '';
  return m < 60 ? `${m} ${MOVIE_WORDS.minutes}` : `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} ש׳`;
}

// year · 1:59 ש׳ · דרמה, מותחן · TMDB 7.4
function movieMetaHtml(movie, found) {
  const bits = [movie?.year || found?.year,
    movie?.seasons ? MOVIE_WORDS.seasons(movie.seasons) : runtimeText(movie?.runtime),
    (movie?.genres || []).join(', '),
    movie?.score ? `TMDB ${movie.score}` : ''].filter(Boolean);
  return bits.map(b => `<span>${escapeHtml(String(b))}</span>`).join('');
}

function movieBackdropHtml(movie) {
  return movie?.backdrop ? `<img class="movie-backdrop" src="${escapeHtml(movie.backdrop)}" alt="">` : '';
}

// The top of a movie or show page: backdrop, the poster beside the title, and the short facts
function posterHead(id, titleHtml) {
  refreshPosters();
  const found = posters[id];
  const movie = id ? movieCached(id) : null;
  if (id) setTimeout(() => loadMovie(id));
  return `<div class="movie-head${movie?.backdrop ? ' has-backdrop' : ''}" id="movie-head">
      <div class="movie-backdrop-box" id="movie-backdrop">${movieBackdropHtml(movie)}</div>
      <div class="poster-head">${found?.poster ? posterBig(found) : ''}<div class="poster-title">${titleHtml}
        <div class="movie-meta" id="movie-meta">${movieMetaHtml(movie, found)}</div></div></div>
    </div>`;
}

// Under the list / stars rows: play on the TV, trailer, where it streams, summary, cast
function movieMoreHtml(id, movie) {
  if (!id) return '';
  const m = movie || {};
  const actions = `<div class="movie-actions">
      <button type="button" class="pill-button" data-play-tv>${icon('tv', 'inline')} ${MOVIE_WORDS.onTv}</button>
      ${m.trailer ? `<a class="pill-button" href="https://www.youtube.com/watch?v=${encodeURIComponent(m.trailer)}" target="_blank" rel="noopener">${icon('play', 'inline')} ${MOVIE_WORDS.trailer}</a>` : ''}
    </div>`;
  const providers = m.providers?.length ? `<a class="movie-providers" href="${escapeHtml(m.providersLink || m.tmdbUrl || '#')}" target="_blank" rel="noopener">
      <span>${MOVIE_WORDS.streaming}</span>${m.providers.map(p => `<img src="${escapeHtml(p.logo)}" alt="${escapeHtml(p.name)}" title="${escapeHtml(p.name)}">`).join('')}</a>` : '';
  const people = m.directors?.length
    ? `<div class="movie-crew">${m.seasons ? MOVIE_WORDS.creator : MOVIE_WORDS.director}: ${escapeHtml(m.directors.join(', '))}</div>` : '';
  const overview = m.overview ? `<p class="movie-overview" dir="auto">${m.tagline ? `<em>${escapeHtml(m.tagline)}</em> ` : ''}${escapeHtml(m.overview)}</p>` : '';
  const cast = m.cast?.length ? `<span class="label movie-label">${MOVIE_WORDS.cast}</span><div class="cast-row">${m.cast.map(c => `
      <div class="cast">${c.photo ? `<img src="${escapeHtml(c.photo)}" alt="" loading="lazy">` : `<span class="cast-blank">${escapeHtml((c.name || '?')[0])}</span>`}
        <span class="cast-name" dir="auto">${escapeHtml(c.name)}</span><span class="cast-role" dir="auto">${escapeHtml(c.role)}</span></div>`).join('')}</div>` : '';
  const credit = m.tmdbUrl ? `<a class="movie-credit" href="${escapeHtml(m.tmdbUrl)}" target="_blank" rel="noopener">${MOVIE_WORDS.credit}</a>` : '';
  return actions + providers + overview + people + cast + credit;
}

// Ask the server for this movie's details; redraw the parts of the page that changed
async function loadMovie(id) {
  let movie;
  try {
    const response = await fetch(`${SERVER}/movie/${encodeURIComponent(id)}`, { signal: AbortSignal.timeout(6000) });
    movie = (await response.json()).movie;
  } catch { return; }   // offline: the kept copy stays
  if (!movie) return;
  try { localStorage.setItem('movie:' + id, JSON.stringify(movie)); } catch { /* full: fine */ }
  if (editor?.id !== id) return;
  const head = document.getElementById('movie-head');
  if (!head) return;
  if (movie.backdrop && !head.querySelector('.movie-backdrop')) {
    document.getElementById('movie-backdrop').innerHTML = movieBackdropHtml(movie);
    head.classList.add('has-backdrop');
  }
  document.getElementById('movie-meta').innerHTML = movieMetaHtml(movie, posters[id]);
  document.getElementById('movie-more').innerHTML = movieMoreHtml(id, movie);
}

// The page takes a soft tint from the poster's colors. Read from a small copy loaded with
// crossOrigin (the poster on screen may be cached without it, and then the canvas can't read it).
function tintFromPoster(form) {
  const shown = form.querySelector('.poster-big');
  if (!shown) return;
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.src = shown.src.replace('/w342/', '/w92/');
  const paint = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 12;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0, 12, 12);
      const data = context.getImageData(0, 0, 12, 12).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        const light = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (light < 25 || light > 235) continue;   // skip black bars and white text
        r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
      }
      if (n) form.style.setProperty('--tint', `${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)}`);
    } catch { /* no colors: plain page */ }
  };
  image.addEventListener('load', paint, { once: true });
}

// "לנגן בטלוויזיה": the TV hub opens the movie on its movie site
async function playOnTv(id) {
  try {
    const response = await fetch(`${TV_HUB}/api/watchlist/${encodeURIComponent(id)}`,
      { method: 'POST', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(response.status);
    showToast(MOVIE_WORDS.opening);
  } catch {
    showToast(MOVIE_WORDS.tvError);
  }
}

// Just seen it (moved to the "seen" list, or given stars): today is kept, for the journal's סרטים.
// Movies seen before this page opened keep no date unless you pick one.
function isSeen(draft) {
  return draft.list === 'watched' || !!draft.rating;
}

function markWatchDate(draft, form, seenBefore = true) {
  const seen = isSeen(draft);
  if (seen && !seenBefore && !draft.watchedOn) draft.watchedOn = toISODate(new Date());
  const input = form?.querySelector('[data-key="watchedOn"]');
  if (input) {
    if (input.value !== (draft.watchedOn || '')) input.value = draft.watchedOn || '';
    input.closest('.prop').hidden = !seen && !draft.watchedOn;
  }
}

// Ask the server for new posters (at most once a minute) and add them to the rows on screen
async function refreshPosters() {
  if (Date.now() - postersAt < 60_000) return;
  postersAt = Date.now();
  try {
    const response = await fetch(`${SERVER}/posters`, { signal: AbortSignal.timeout(5000) });
    const found = (await response.json()).posters;
    if (!found || typeof found !== 'object') return;
    posters = found;
    try { localStorage.setItem('posters', JSON.stringify(found)); } catch { /* full: fine */ }
    document.querySelectorAll('.rows .row[data-id]').forEach(row => {
      const url = found[row.dataset.id]?.poster;
      if (url && !row.querySelector('.thumb')) row.insertAdjacentHTML('afterbegin', posterImg(url));
    });
    // A movie page open now (just added, say): its poster as soon as the TV hub finds it
    const head = document.getElementById('movie-head');
    const posterRow = head?.querySelector('.poster-head');
    if (posterRow && editor && !head.querySelector('.poster-big') && found[editor.id]?.poster) {
      posterRow.insertAdjacentHTML('afterbegin', posterBig(found[editor.id]));
      tintFromPoster(document.getElementById('editor'));
    }
  } catch { /* offline: the kept ones are fine */ }
}

// Movies and shows look the same, only the lists differ
function moviesList(items, lists = MOVIE_LISTS) {
  refreshPosters();
  return filterChips(lists, 'watchlist') +
    rowList(items.map(item => itemRow(item,
      item.recommendedBy ? TEXT.recommendedBy(escapeHtml(item.recommendedBy)) : '',
      { end: item.rating ? `<span class="stars-small">${stars(item.rating)}</span>` : '', filter: item.list || 'watchlist',
        poster: posters[item.id]?.poster })));
}

// ---------- REELS ----------
// Quick add puts a shared reel link here ({ url, reelStatus: 'new' }). The server (reels.py in notify)
// downloads it, writes down the speech and saves the cover (reelStatus 'ready'); Claude writes the
// summary through the notes connector when asked ('done'). 'failed' + reelError if it couldn't be read.
const REEL_TYPES = {
  recipe: 'מתכון', place: 'מקום', tip: 'טיפ', product: 'מוצר', funny: 'מצחיק', music: 'מוזיקה', news: 'חדשות', other: 'אחר',
};
const REEL_WORDS = {
  new: 'בתור לקריאה', working: 'נקרא עכשיו', ready: 'מחכה לסיכום', failed: 'נכשל',
  open: 'לפתוח את הסרטון', retry: 'לנסות שוב', summary: 'סיכום', transcript: 'תמלול',
  caption: 'כיתוב', by: 'מאת', recipe: 'למתכון', retrying: 'ינסה שוב בדקה הקרובה',
};

function coverImg(id, size = 'thumb', cls = 'thumb') {
  return `<img class="${cls}" data-photo-id="${escapeHtml(id)}" data-size="${size}" alt="">`;
}

function withCover(row, item) {
  return item.cover ? row.replace('<span class="row-main">', `${coverImg(item.cover)}<span class="row-main">`) : row;
}

function reelsList(items) {
  return rowList(items.map(item => {
    const status = item.reelStatus || 'done';
    const end = status === 'done' ? '' : `<span class="reel-status s-${escapeHtml(status)}">${REEL_WORDS[status] || ''}</span>`;
    const sub = [REEL_TYPES[item.reelType], item.by].filter(Boolean).map(escapeHtml).join(' · ');
    return withCover(itemRow(item, sub, { end }), item);
  }));
}

// The reel page, under the title: cover, open the link, status, summary, place, transcript
function reelHtml(draft) {
  const status = draft.reelStatus || 'done';
  const url = /^https?:\/\//.test(draft.url || '') ? draft.url : '';
  const statusLine = status === 'done' ? '' : `<div class="reel-state s-${escapeHtml(status)}">${REEL_WORDS[status] || ''}${
    status === 'failed' && draft.reelError ? ` · ${escapeHtml(draft.reelError)}` : ''}${
    status === 'failed' ? ` <button type="button" class="pill-button" data-reel-retry>${icon('repeat', 'inline')} ${REEL_WORDS.retry}</button>` : ''}</div>`;
  const facts = [REEL_TYPES[draft.reelType], draft.by && `${REEL_WORDS.by} ${draft.by}`].filter(Boolean)
    .map(f => `<span>${escapeHtml(f)}</span>`).join('');
  const summary = draft.summary ? `<span class="label">${REEL_WORDS.summary}</span><div class="reel-summary" dir="auto">${
    escapeHtml(draft.summary)}</div>` : '';
  const place = draft.placeName ? `<div class="reel-place" dir="auto">${icon('pin', 'inline')} ${escapeHtml(draft.placeName)}</div>` : '';
  const recipe = draft.recipeId ? `<a class="pill-button" href="#/item/${escapeHtml(draft.recipeId)}">${icon('utensils', 'inline')} ${REEL_WORDS.recipe}</a>` : '';
  const more = (label, text) => text ? `<details class="reel-more"><summary>${label}</summary><div dir="auto">${escapeHtml(text)}</div></details>` : '';
  return `<div class="reel-box">
      ${draft.cover ? coverImg(draft.cover, 'full', 'reel-cover') : ''}
      ${facts ? `<div class="movie-meta reel-facts">${facts}</div>` : ''}
      <div class="movie-actions">${url ? `<a class="pill-button reel-open" href="${escapeHtml(url)}" target="_blank" rel="noopener">${icon('play', 'inline')} ${REEL_WORDS.open}</a>` : ''}${recipe}</div>
      ${statusLine}${summary}${place}
      ${more(REEL_WORDS.transcript, draft.transcript)}${more(REEL_WORDS.caption, draft.caption)}
    </div>`;
}

// A recipe Claude made from a reel stays a draft (טיוטה) until it's checked
const DRAFT_BADGE = '<span class="draft-badge">טיוטה</span>';

// A recipe from a link ({ url, recipeStatus: 'new', draft: true }, see quickadd.js): the server
// (recipelinks.py in notify) reads the site or video and fills it in ('ready'); Claude tidies it up
// through the connector (fill_recipe) and clears the draft ('done'). 'failed' + recipeError otherwise.
const RECIPE_LINK_WORDS = {
  new: 'בתור לקריאה', working: 'נקרא עכשיו', ready: 'מחכה לסידור של קלוד', failed: 'נכשל',
  source: 'למקור', fromSource: 'מהמקור', retry: 'לנסות שוב', retrying: 'ינסה שוב בדקה הקרובה',
};

function recipeStatusPill(item) {
  const status = item.recipeStatus;
  return ['new', 'working', 'failed'].includes(status)
    ? `<span class="reel-status s-${status}">${RECIPE_LINK_WORDS[status]}</span>` : '';
}

// Under the recipe's title: the picture from the site (when you haven't added a photo), the source link,
// how far the server got, and the text it found there
function recipeLinkHtml(draft) {
  const url = /^https?:\/\//.test(draft.url || '') ? draft.url : '';
  const status = draft.recipeStatus;
  const host = url ? url.replace(/^https?:\/\/(?:www\.)?([^/]+).*$/, '$1') : '';
  const statusLine = ['new', 'working', 'ready', 'failed'].includes(status)
    ? `<div class="reel-state s-${status}">${RECIPE_LINK_WORDS[status]}${
      status === 'failed' && draft.recipeError ? ` · ${escapeHtml(draft.recipeError)}` : ''}${
      status === 'failed' ? ` <button type="button" class="pill-button" data-recipe-retry>${icon('repeat', 'inline')} ${RECIPE_LINK_WORDS.retry}</button>` : ''}</div>`
    : '';
  const source = draft.sourceText ? `<details class="reel-more"><summary>${RECIPE_LINK_WORDS.fromSource}</summary><div dir="auto">${
    escapeHtml(draft.sourceText)}</div></details>` : '';
  return `<div class="reel-box">
      ${draft.cover && !draft.photo ? coverImg(draft.cover, 'full', 'reel-cover') : ''}
      ${url ? `<div class="movie-actions"><a class="pill-button reel-open" href="${escapeHtml(url)}" target="_blank" rel="noopener">${
        icon('link', 'inline')} ${RECIPE_LINK_WORDS.source} · <span dir="ltr">${escapeHtml(host)}</span></a></div>` : ''}
      ${statusLine}${source}
    </div>`;
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
    const end = recipeStatusPill(item) ||
      (item.calories ? `<span class="calories">${escapeHtml(TEXT.calories(String(item.calories).trim()))}</span>` : '');
    const row = itemRow(item, sub, { photo: item.photo, filter: tags.join('|'), end, after: item.draft ? ' ' + DRAFT_BADGE : '' });
    return item.photo ? row : withCover(row, item);
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
    gifts: giftsList, reels: reelsList,
  };
  const draw = lists[group.id] || plainList;
  // Reminders and gifts go by their own dates; the rest can be sorted, pinned first
  if (group.id === 'reminders' || group.id === 'gifts') return draw(items);
  const how = sortFor(group.id);
  rowDateKey = how === 'created' ? 'createdAt' : 'updatedAt';
  try {
    return (items.length > 1 ? sortButtonHtml(group.id, how) : '') + draw(sortItems(items, how));
  } finally {
    rowDateKey = null;
  }
}

// ---------- Dates, sorting and pins ----------
// Each row in a group shows a small grey date (edited, or created when sorted by that).
// The sort is kept per group on this device. Pinned notes stay on top and are
// also collected on the home screen (pinnedHtml in app.js).

let rowDateKey = null;   // which date itemRow shows, while a group list is drawn

function sortFor(groupId) {
  try {
    const how = localStorage.getItem(`sort-${groupId}`);
    return how in TEXT.sorts ? how : 'edited';
  } catch { return 'edited'; }
}

function sortItems(items, how) {
  const by = how === 'created' ? (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
    : how === 'abc' ? (a, b) => (a.title || '').localeCompare(b.title || '', 'he')
    : (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0);
  return [...items].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || by(a, b));
}

function sortButtonHtml(groupId, how) {
  return `<div class="list-tools"><button type="button" class="sort-button" data-sort-group="${escapeHtml(groupId)}">${
    icon('sort', 'inline')} ${TEXT.sorts[how]}</button></div>`;
}

// Tap the sort button: the next way of sorting
document.addEventListener('click', event => {
  const button = event.target.closest('[data-sort-group]');
  if (!button) return;
  const group = button.dataset.sortGroup;
  const ways = Object.keys(TEXT.sorts);
  const next = ways[(ways.indexOf(sortFor(group)) + 1) % ways.length];
  try { localStorage.setItem(`sort-${group}`, next); } catch { /* fine: this visit only */ }
  haptic(5);
  showScreen(true);
});

// "12.11.26 14:05"
function fullDate(timestamp) {
  const d = new Date(timestamp);
  return `${d.getDate()}.${d.getMonth() + 1}.${String(d.getFullYear()).slice(2)} ${
    String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Under the note: "נוצר 12.11.26 14:05 · נערך לפני 5 דק׳"
function noteDatesHtml(draft) {
  if (!draft.createdAt) return '';
  const edited = draft.updatedAt && draft.updatedAt - draft.createdAt > 60000
    ? ` · ${TEXT.edited} ${timeAgo(draft.updatedAt)}` : '';
  return `<p class="note-dates">${TEXT.created} <span dir="ltr">${fullDate(draft.createdAt)}</span>${edited}</p>`;
}

// The pin in the top bar of a note
function pinButtonHtml() {
  const on = !!editor?.draft.pinned;
  const label = on ? TEXT.unpin : TEXT.pin;
  return `<button type="button" class="icon-button pin-button${on ? ' on' : ''}" id="pin-button" aria-pressed="${on}"
    aria-label="${label}" title="${label}">${icon('pushpin')}</button>`;
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
      ${group === 'movies' || group === 'shows' ? posterHead(editor.id, title) : title}
      ${draft.draft ? `<div class="draft-line">${DRAFT_BADGE}</div>` : ''}
      ${group === 'reels' ? reelHtml(draft) : ''}
      ${group === 'recipes' && (draft.url || draft.cover) ? recipeLinkHtml(draft) : ''}
      <div class="props">
        ${props}
        <label class="prop">${groupBadge(findGroup(group), 'tiny')}<span class="prop-name">${TEXT.moveToGroup}</span>
          <select class="prop-input" id="group-select">${groupOptions}</select></label>
      </div>
      ${group === 'movies' || group === 'shows' ? `<div class="movie-more" id="movie-more">${movieMoreHtml(editor.id, editor.id ? movieCached(editor.id) : null)}</div>` : ''}
      ${photo}
      ${voiceFieldHtml(draft.voices)}
      ${texts}
      <div class="editor-actions">
        <button type="button" class="text-button" id="share-button">${icon('share', 'inline')} ${TEXT.share}</button>
        <button type="button" class="text-button danger" id="delete-button">${TEXT.deleteItem}</button>
      </div>
      ${noteDatesHtml(draft)}
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
  // Typing on the last line: keep that line in view (above the keyboard), or it slips under it
  if (document.activeElement === textarea && !textarea.value.slice(textarea.selectionEnd).includes('\n')) {
    const view = window.visualViewport;
    const visibleBottom = view ? view.offsetTop + view.height : window.innerHeight;
    const overflow = textarea.getBoundingClientRect().bottom + 24 - visibleBottom;
    if (overflow > 0) window.scrollBy(0, overflow);
  }
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
    if (editor.group === 'movies' || editor.group === 'shows') markWatchDate(draft, form, editor.seenBefore);
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

  // The pin in the top bar
  document.getElementById('pin-button')?.addEventListener('click', event => {
    const button = event.currentTarget;
    editor.draft.pinned = !editor.draft.pinned;
    const label = editor.draft.pinned ? TEXT.unpin : TEXT.pin;
    button.classList.toggle('on', editor.draft.pinned);
    button.setAttribute('aria-pressed', editor.draft.pinned);
    button.setAttribute('aria-label', label);
    button.title = label;
    showToast(editor.draft.pinned ? TEXT.pinnedTitle : TEXT.unpin);
    haptic(5);
    saveNow();
  });

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

    if (event.target.closest('[data-reel-retry]')) {
      editor.draft.reelStatus = 'new';
      editor.draft.reelError = '';
      event.target.closest('.reel-state').textContent = REEL_WORDS.retrying;
      saveNow();
      return;
    }

    if (event.target.closest('[data-recipe-retry]')) {
      editor.draft.recipeStatus = 'new';
      editor.draft.recipeError = '';
      event.target.closest('.reel-state').textContent = RECIPE_LINK_WORDS.retrying;
      saveNow();
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
  if (editor.group === 'movies' || editor.group === 'shows') {
    editor.seenBefore = !!editor.id && isSeen(editor.draft);
    markWatchDate(editor.draft, form);   // the "מתי ראיתי" row only once it's seen
    tintFromPoster(form);
    form.addEventListener('click', event => {
      const button = event.target.closest('[data-play-tv]');
      if (button && editor.id) playOnTv(editor.id);
    });
  }

  // A brand-new item: start typing the title right away
  if (!editor.id) form.querySelector('.title-input')?.focus();
}
