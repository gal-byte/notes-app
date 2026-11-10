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
    ['movies',    ['סרט', 'סדרה', 'לראות', 'נטפליקס', 'netflix',
                   'המלצה', 'בהמלצת', 'המליץ', 'המליצה', 'ממליץ', 'ממליצה']],
    ['recipes',   ['מתכון', 'כוס', 'כוסות', 'כף', 'כפות', 'כפית', 'כפיות', 'גרם', 'לאפות', 'לבשל', 'עוגה', 'תנור']],
    ['songs',     ['שיר', 'פזמון', 'לחן', 'בית ראשון', 'טיוטה', 'טיוטא']],
  ],

  // Song status words. Only noticed at the start or end of the first line,
  // so "לב גמור שבור" stays a title. (Only טיוטה also means "this is a song",
  // see the songs keywords above.)
  songStatus: { 'רעיון': 'idea', 'טיוטה': 'draft', 'טיוטא': 'draft', 'גמור': 'done', 'מוכן': 'done' },

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

  // 12 במרץ · 12 מרץ
  // (no year here on purpose: in "12 במרץ 2030" the 2030 is a time, 20:30)
  m = text.match(new RegExp(`${before}(\\d{1,2})\\s+[בל]?(${MONTH_NAMES.join('|')}|מרס)${EDGE_AFTER}`));
  if (m) {
    const month = m[3] === 'מרס' ? 3 : MONTH_NAMES.indexOf(m[3]) + 1;
    const date = makeDate(+m[2], month, undefined, today);
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

  // A day of the week:
  //   "שישי הזה" / "שבת הזאת"   → this week's (today counts)
  //   "שישי הבא" / "שבת הבאה"   → next week's (a week after this week's)
  //   "ביום שישי" / "בשישי"     → the coming one (next week's if it's today)
  // ("בראשון" alone is left out: it also means "at first")
  const days = WEEKDAY_NAMES.join('|');
  m = text.match(new RegExp(
    `(^|\\s)(?:ב?(?:יום\\s+)?(${days}|שבת)\\s+(הזה|הזאת|הזו|הבא|הבאה)` +  // שישי הבא · יום שבת הזה
    `|ב?יום\\s+(${days}|שבת)` +                                         // ביום שישי
    `|ב(שני|שלישי|רביעי|חמישי|שישי|שבת))${EDGE_AFTER}`                 // בשני · בשישי · בשבת
  ));
  if (m) {
    const name = m[2] || m[4] || m[5];
    const which = m[3];  // הזה / הבא / nothing
    const weekday = name === 'שבת' ? 6 : WEEKDAY_NAMES.indexOf(name);
    const thisWeek = (weekday - today.getDay() + 7) % 7;  // 0 = today

    let ahead;
    if (which === 'הבא' || which === 'הבאה') ahead = thisWeek + 7;
    else if (which) ahead = thisWeek;   // הזה / הזאת
    else ahead = thisWeek || 7;         // plain: the coming one

    const date = new Date(today);
    date.setDate(date.getDate() + ahead);
    return { date, matched: m[0].slice(m[1].length) };
  }

  // A number of days or weeks from today:
  //   בעוד יום · בעוד יומיים · בעוד 3 ימים · בעוד שבוע · בעוד שבועיים · בעוד 3 שבועות · בשבוע הבא
  m = text.match(new RegExp(
    `(^|\\s)(?:בעוד\\s+(?:(יום|יומיים|שבוע|שבועיים)|(\\d{1,3})\\s+(ימים|שבועות))|(?:ב)?שבוע\\s+הבא)${EDGE_AFTER}`
  ));
  if (m) {
    const words = { 'יום': 1, 'יומיים': 2, 'שבוע': 7, 'שבועיים': 14 };
    let ahead = 7;  // "בשבוע הבא"
    if (m[2]) ahead = words[m[2]];
    if (m[3]) ahead = Number(m[3]) * (m[4] === 'שבועות' ? 7 : 1);
    const date = new Date(today);
    date.setDate(date.getDate() + ahead);
    return { date, matched: m[0].slice(m[1].length) };
  }

  return null;
}

// Words after a 4-digit number that mean it's NOT a time ("1500 שקל")
const NOT_A_TIME_AFTER = ['ש"ח', 'ש״ח', 'שח', 'שקל', 'שקלים', '₪', 'גרם', 'קילו', 'ק"ג', 'ק״ג',
                          'מ"ל', 'מ״ל', 'ליטר', 'מטר', 'שנה', 'שנים', 'דקות', 'שעות', 'קלוריות'];

// Find a time. Returns { time: "09:15", matched, unsure } or null.
//   "17:30" · "ב-17:30" · "בשעה 9" · "בשעה 9:15" · "1020" (= 10:20)
function findTime(text) {
  const before = '(^|\\s)(?:ב[-־]?|בשעה\\s+|שעה\\s+)?';
  let unsure = false;

  let m = text.match(new RegExp(`${before}(\\d{1,2}):(\\d{2})${EDGE_AFTER}`))
       || text.match(new RegExp(`(^|\\s)(?:בשעה|שעה)\\s+(\\d{1,2})()${EDGE_AFTER}`));

  if (!m) {
    // Four digits with no colon, like "1020". Could also be a price or
    // an amount ("1500 שקל", "1000 גרם"), so check the next word.
    m = text.match(new RegExp(`${before}(\\d{2})(\\d{2})${EDGE_AFTER}`));
    if (m) {
      const nextWord = text.slice(m.index + m[0].length).trim().split(/\s+/)[0] || '';
      if (NOT_A_TIME_AFTER.includes(nextWord)) return null;
      unsure = true;
    }
  }
  if (!m) return null;

  const hours = Number(m[2]);
  const minutes = Number(m[3] || 0);
  if (hours > 23 || minutes > 59) return null;
  const time = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  return { time, matched: m[0].slice(m[1].length), unsure };
}

// For the time box on the edit screen: turn what you typed into "HH:MM".
//   "1020" → "10:20" · "930" → "09:30" · "17:30" / "17.30" → "17:30"
//   "9" / "בשעה 9" → "09:00" · anything else → null
function normalizeTime(typed) {
  const text = typed.trim().replace(/^(?:בשעה|שעה|ב[-־]?)\s*/, '');
  const m = text.match(/^(\d{1,2})[:.](\d{2})$/)   // 17:30 · 17.30
         || text.match(/^(\d{1,2})(\d{2})$/)       // 1730 · 930
         || text.match(/^(\d{1,2})()$/);           // 9
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2] || 0);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// "ס" → movies · "מתנות" → your "מתנות" group · anything else → null
function groupForShortcut(word) {
  if (QUICK_ADD_RULES.shortcuts[word]) return QUICK_ADD_RULES.shortcuts[word];
  // GROUPS (from app.js) includes your own groups with their shortcuts
  if (typeof GROUPS !== 'undefined') {
    const group = GROUPS.find(g => (g.shortcut && g.shortcut === word) || g.name === word);
    if (group) return group.id;
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

  // 1. Shortcut like "ס:" at the start – or a group's full name, like "מתנות:"
  let shortcutGroup = null;
  const shortcut = title.match(/^([^:\n]{1,30}?)\s*:\s*/);
  if (shortcut) {
    shortcutGroup = groupForShortcut(shortcut[1].trim());
    if (shortcutGroup) title = title.slice(shortcut[0].length);
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

  // A time ("17:30") also means it's a reminder
  // (look for it after taking the date out, so "12 במרץ 2027" isn't 20:27)
  let foundTime = findTime(foundDate ? title.replace(foundDate.matched, ' ') : title);
  // "1000 קמח" in a recipe → the words say recipe, so "1000" isn't 10:00
  if (foundTime && foundTime.unsure && wordGroup && wordGroup !== 'reminders') {
    foundTime = null;
  }
  const guessed = (foundDate || foundTime) ? 'reminders' : (wordGroup || 'inbox');

  const group = chosenGroup || shortcutGroup || guessed;
  const fields = {};

  if (group === 'reminders') {
    if (foundTime) {
      fields.time = foundTime.time;
      title = removeFromTitle(title, foundTime.matched);
    }
    if (foundDate) {
      fields.date = toISODate(foundDate.date);
      title = removeFromTitle(title, foundDate.matched);
    } else {
      // No date typed → today. But if only a time was typed and
      // it already passed today ("8:00" at noon), it means tomorrow.
      const day = startOfDay(now);
      const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (foundTime && foundTime.time <= nowTime) day.setDate(day.getDate() + 1);
      fields.date = toISODate(day);
    }
    fields.repeatYearly = hasAnyWord(text, QUICK_ADD_RULES.yearlyWords);
    if (rest) fields.text = rest;
  } else if (group === 'songs') {
    fields.status = 'idea';
    const words = Object.keys(QUICK_ADD_RULES.songStatus).join('|');
    const atStart = title.match(new RegExp(`^(${words})\\s*[-–:,]?\\s+(\\S)`));
    const atEnd = title.match(new RegExp(`\\s+[-–:,]?\\s*(${words})$`));
    if (atEnd) {
      // "הים הכחול - טיוטה"
      fields.status = QUICK_ADD_RULES.songStatus[atEnd[1]];
      title = removeFromTitle(title, atEnd[0]);
    } else if (atStart) {
      fields.status = QUICK_ADD_RULES.songStatus[atStart[1]];
      // "רעיון לשיר על הים" reads as a sentence, so keep it whole.
      // Otherwise remove the word: "טיוטה: הים הכחול" → "הים הכחול"
      if (!(atStart[1] === 'רעיון' && atStart[2] === 'ל')) {
        title = title.slice(atStart[0].length - 1);
      }
    }
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
  } else if (group === 'recipes') {
    if (rest) fields.ingredients = rest;  // lines after the name = ingredients
  } else {
    if (rest) fields.text = rest;
  }

  // If cleaning removed everything (e.g. you only typed "מחר"), keep the original
  fields.title = title || lines[0].trim();

  return { group, fields };
}
