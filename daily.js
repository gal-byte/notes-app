// ============================================================
// DAILY SUMMARY
// Once a day, one notification with today's reminders:
//   "📅 היום · 2 תזכורות"
//   "יום הולדת לאמא"
//   "17:30 · פגישה עם דנה"
//
// Used by two places:
//   • sw.js – Android wakes it about once a day in the background
//   • app.js – also checked when you open the app, just in case
// So this file has no screen code, and its few words are here
// (the background helper can't see TEXT in app.js).
// ============================================================

const SUMMARY_WORDS = {
  title: count => count > 1 ? `היום · ${count} תזכורות` : 'היום',
  nothingToday: 'אין תזכורות היום',
};

// Only between these hours (Android may wake us in the middle of the night)
const SUMMARY_FROM_HOUR = 7;
const SUMMARY_UNTIL_HOUR = 21;

// Read the reminders straight from the database
function readReminders() {
  return new Promise(resolve => {
    const request = indexedDB.open('notes-app');
    // No database yet (app never opened): don't create an empty one here
    request.onupgradeneeded = () => request.transaction.abort();
    request.onerror = () => resolve([]);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('items')) { db.close(); resolve([]); return; }
      const get = db.transaction('items').objectStore('items').index('group').getAll('reminders');
      get.onsuccess = () => { db.close(); resolve(get.result); };
      get.onerror = () => { db.close(); resolve([]); };
    };
  });
}

// Reminders happening on this day (birthdays every year), by time
function remindersForDay(reminders, day) {
  return reminders
    .filter(item => {
      if (!item.date) return false;
      const [year, month, date] = item.date.split('-').map(Number);
      const sameDay = month === day.getMonth() + 1 && date === day.getDate();
      if (item.repeatYearly) return sameDay && year <= day.getFullYear();
      return sameDay && year === day.getFullYear();
    })
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

// ---------- "Already shown today?" ----------
// Kept in the browser's cache storage, which both the app and the
// background helper can read.

function dayKey(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

async function lastSummaryDay() {
  const saved = await (await caches.open('notes-app-state')).match('last-daily-summary');
  return saved ? saved.text() : '';
}

async function rememberSummaryDay(key) {
  await (await caches.open('notes-app-state')).put('last-daily-summary', new Response(key));
}

// ---------- Show it ----------
// options.force = show it now anyway (the "send a test" button)
async function showDailySummary(registration, options = {}) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return 'no-permission';

  const now = new Date();
  if (!options.force) {
    if (now.getHours() < SUMMARY_FROM_HOUR || now.getHours() >= SUMMARY_UNTIL_HOUR) return 'not-now';
    if (await lastSummaryDay() === dayKey(now)) return 'already-shown';
  }

  const today = remindersForDay(await readReminders(), now);
  if (!today.length && !options.force) {
    await rememberSummaryDay(dayKey(now));  // nothing today: no notification
    return 'nothing-today';
  }

  const body = today.length
    ? today.map(item => item.time ? `${item.time} · ${item.title}` : item.title).join('\n')
    : SUMMARY_WORDS.nothingToday;

  await registration.showNotification(SUMMARY_WORDS.title(today.length), {
    body,
    icon: 'icons/icon-192.png',
    badge: 'icons/badge-96.png',
    tag: 'daily-summary',   // a newer summary replaces an older one
    lang: 'he',
    dir: 'rtl',
    data: { url: './#/home' },
  });

  if (!options.force) await rememberSummaryDay(dayKey(now));
  return 'shown';
}
