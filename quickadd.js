// ============================================================
// QUICK-ADD
// Reads what you typed and decides which group it belongs to.
// No AI — just simple rules you can read and change below.
//
// Order of decisions:
//   1. A shortcut at the start, like "ס: דיונה"  → that group
//   2. A date or reminder word ("מחר", "12/3", "יום הולדת") → reminders
//   3. Movie / recipe / song words                    → that group
//   4. Nothing matched                                → לא ממוין (inbox)
// ============================================================

const QUICK_ADD_RULES = {
  // "shortcut:" at the very start of the message
  shortcuts: {
    'ת': 'reminders', 'תזכורת': 'reminders',
    'ש': 'songs',     'שיר': 'songs',
    'ס': 'movies',    'סרט': 'movies',
    'מ': 'recipes',   'מתכון': 'recipes',
  },

  // Words that hint at a group. Checked in this order.
  // Hebrew prefixes (ה, ו, ב, ל, מ, ש, כ) are allowed automatically,
  // so 'סרט' also catches 'הסרט' and 'לסרט'.
  keywords: [
    ['reminders', ['יום הולדת', 'יומולדת', 'תזכורת', 'להזכיר', 'תזכיר', 'פגישה', 'תור', 'יום נישואין']],
    ['movies',    ['סרט', 'סדרה', 'לראות', 'נטפליקס', 'netflix']],
    ['recipes',   ['מתכון', 'כוס', 'כוסות', 'כף', 'כפות', 'כפית', 'כפיות', 'גרם', 'לאפות', 'לבשל', 'עוגה', 'תנור']],
    ['songs',     ['שיר', 'פזמון', 'לחן', 'בית ראשון']],
  ],

  // Reminders with these words repeat every year
  yearlyWords: ['יום הולדת', 'יומולדת', 'יום נישואין', 'יום השנה'],

  // Who recommended a movie. Two ways of saying it:
  //   "המלצה של דנה" / "בהמלצת דנה"  (name after)
  //   "דנה המליצה" / "יוסי ממליץ"     (name before)
  recommendedBy: [
    /(?:המלצה של|בהמלצת|המליץ|המליצה|ממליץ|ממליצה)\s+([^\s,.!?]+)/,
    /([^\s,.!?]+)\s+(?:המליץ|המליצה|ממליץ|ממליצה)(?=$|[\s,.!?])/,
  ],
};

const MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
                     'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const WEEKDAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי'];

// What counts as "the edge of a word": start/end, space or punctuation
const EDGE_BEFORE = '(?:^|[\\s,.!?:;()"\'\\-])';
const EDGE_AFTER = '(?=$|[\\s,.!?:;()"\'\\-])';

// Does the text contain this word (with optional Hebrew prefixes)?
function hasWord(text, word) {
  const pattern = word.split(' ').join('\\s+');
  return new RegExp(`${EDGE_BEFORE}[והבלמשכ]{0,2}${pattern}${EDGE_AFTER}`, 'i').test(text);
}

function hasAnyWord(text, words) {
  return words.some(word => hasWord(text, word));
}

// ---------- Dates ----------

// A Date → "2026-03-12" (using the phone's local time)
function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Build a real date. If no year was typed, use the next time this
// day comes around (so "5/1" typed in November means next January).
function makeDate(day, month, year, today) {
  const typedYear = year !== undefined;
  if (typedYear && year < 100) year += 2000;
  if (!typedYear) year = today.getFullYear();

  let date = new Date(year, month - 1, day);
  if (date.getDate() !== day || date.getMonth() !== month - 1) return null;  // e.g. 31/2

  if (!typedYear && date < today) {
    date = new Date(year + 1, month - 1, day);
    if (date.getDate() !== day) return null;
  }
  return date;
}

// Find a date in the text. Returns { date, matched } or null.
// "matched" is the exact text found, so it can be removed from the title.
function findDate(text, now) {
  const today = startOfDay(now);
  const before = '(^|\\s)(?:[בל][-־]?)?';  // optional "ב-" / "ל-" in front
  let m;

  // 12/3 · 12.3 · 12/3/27 · 12/3/2027  (day first, Israeli style)
  m = text.match(new RegExp(`${before}(\\d{1,2})[/.](\\d{1,2})(?:[/.](\\d{4}|\\d{2}))?${EDGE_AFTER}`));
  if (m) {
    const date = makeDate(+m[2], +m[3], m[4] ? +m[4] : undefined, today);
    // "2.5" could also be a number (2.5 cups), so a dot with no year is "unsure"
    const unsure = m[0].includes('.') && !m[4];
    if (date) return { date, matched: m[0].slice(m[1].length), unsure };
  }

  // 12 במרץ · 12 מרץ 2027
  m = text.match(new RegExp(`${before}(\\d{1,2})\\s+[בל]?(${MONTH_NAMES.join('|')}|מרס)(?:\\s+(\\d{4}))?${EDGE_AFTER}`));
  if (m) {
    const month = m[3] === 'מרס' ? 3 : MONTH_NAMES.indexOf(m[3]) + 1;
    const date = makeDate(+m[2], month, m[4] ? +m[4] : undefined, today);
    if (date) return { date, matched: m[0].slice(m[1].length) };
  }

  // היום · מחר · מחרתיים
  m = text.match(new RegExp(`(^|\\s)(?:ל)?(היום|מחרתיים|מחר)${EDGE_AFTER}`));
  if (m) {
    const days = { 'היום': 0, 'מחר': 1, 'מחרתיים': 2 }[m[2]];
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return { date, matched: m[0].slice(m[1].length) };
  }

  // ביום שלישי · בשבת  → the next one (a week ahead if it's today)
  m = text.match(new RegExp(`(^|\\s)(?:ב?יום\\s+(${WEEKDAY_NAMES.join('|')})|בשבת)${EDGE_AFTER}`));
  if (m) {
    const weekday = m[2] ? WEEKDAY_NAMES.indexOf(m[2]) : 6;
    const date = new Date(today);
    const ahead = (weekday - today.getDay() + 7) % 7 || 7;
    date.setDate(date.getDate() + ahead);
    return { date, matched: m[0].slice(m[1].length) };
  }

  return null;
}

// ---------- Main function ----------

// Remove a piece of text from the title and tidy the leftovers
function removeFromTitle(title, piece) {
  return title.replace(piece, ' ').replace(/\s+/g, ' ').replace(/^[\s,:\-–]+|[\s,:\-–]+$/g, '');
}

// text        = what you typed
// chosenGroup = a group you picked by tapping the chip (or null)
// now         = current time (can be changed for testing)
//
// Returns { group, fields } — ready to save with addItem(group, fields)
function analyzeQuickAdd(text, chosenGroup = null, now = new Date()) {
  const lines = text.trim().split('\n');
  let title = lines[0].trim();
  const rest = lines.slice(1).join('\n').trim();  // more lines = lyrics / notes

  // 1. Shortcut like "ס:" at the start
  let shortcutGroup = null;
  const shortcut = title.match(/^(\S+?)\s*:\s*/);
  if (shortcut && QUICK_ADD_RULES.shortcuts[shortcut[1]]) {
    shortcutGroup = QUICK_ADD_RULES.shortcuts[shortcut[1]];
    title = title.slice(shortcut[0].length);
  }

  // 2 + 3. Guess from dates and words
  let wordGroup = null;
  for (const [group, words] of QUICK_ADD_RULES.keywords) {
    if (hasAnyWord(text, words)) { wordGroup = group; break; }
  }

  let foundDate = findDate(title, now);
  // "2.5 כוסות קמח" → the words say recipe, so "2.5" isn't a date
  if (foundDate && foundDate.unsure && wordGroup && wordGroup !== 'reminders') {
    foundDate = null;
  }

  const guessed = foundDate ? 'reminders' : (wordGroup || 'inbox');

  const group = chosenGroup || shortcutGroup || guessed;
  const fields = {};

  if (group === 'reminders') {
    if (foundDate) {
      fields.date = toISODate(foundDate.date);
      title = removeFromTitle(title, foundDate.matched);
    } else {
      fields.date = toISODate(startOfDay(now));  // no date typed → today
    }
    fields.repeatYearly = hasAnyWord(text, QUICK_ADD_RULES.yearlyWords);
    if (rest) fields.text = rest;
  } else if (group === 'songs') {
    fields.status = 'idea';
    if (rest) fields.lyrics = rest;
  } else if (group === 'movies') {
    fields.list = 'watchlist';
    for (const pattern of QUICK_ADD_RULES.recommendedBy) {
      const rec = title.match(pattern);
      if (rec) {
        fields.recommendedBy = rec[1];
        title = removeFromTitle(title, rec[0]);
        break;
      }
    }
    if (rest) fields.text = rest;
  } else {
    if (rest) fields.text = rest;
  }

  // If cleaning removed everything (e.g. you only typed "מחר"), keep the original
  fields.title = title || lines[0].trim();

  return { group, fields };
}
