// ============================================================
// HEALTH CONNECT
// Workouts, sleep, steps and resting heart rate from the phone's
// Health Connect (whatever Samsung Health, Strava's app or a watch
// wrote there). Only the phone app (APK 1.5+) can read it: it sends
// the last days to the home server (health.py in ~/notify) when it
// opens, and every few hours in the background. Every device then
// asks the server, per month, like strava.js.
// Workouts are shown with Strava's cards (strava.js); this file adds
// the day's line (sleep, steps, resting heart rate) and the settings.
// ============================================================

const HEALTH_WORDS = {
  title: 'פעילות',
  settingTitle: 'Health Connect',
  connect: 'חיבור ל-Health Connect',
  connectSub: 'אימונים, שינה וצעדים (מ-Samsung Health, Strava ועוד) ביומן ובלוח השנה',
  connected: (n, when) => `${n} אימונים${when ? ` · ${when}` : ''}`,
  refresh: 'לרענן עכשיו',
  disconnect: 'ניתוק מ-Health Connect',
  confirmDisconnect: 'לנתק? הנתונים יימחקו מהשרת (ב-Health Connect הם נשארים)',
  missing: 'Health Connect לא מותקן בטלפון. נפתח עמוד ההתקנה',
  update: 'Health Connect צריך עדכון. נפתח עמוד העדכון',
  denied: 'לא ניתנה הרשאה. אפשר לנסות שוב',
  done: (w, d) => `נטענו ${w} אימונים ו-${d} ימים`,
  sleep: 'שינה',
  steps: 'צעדים',
  resting: 'דופק במנוחה',
};

const HEALTH_EVERY_MS = 30 * 60 * 1000;   // the phone app sends again after half an hour

// ---------- Getting it (per month, from the server or the offline copy) ----------

const healthMonths = new Map();   // "2026-11" → {days, workouts}, this visit

async function healthInMonth(year, month) {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  if (healthMonths.has(key)) return healthMonths.get(key);
  const last = new Date(year, month + 1, 0).getDate();
  try {
    const response = await fetch(`${SERVER}/health?from=${key}-01&to=${key}-${last}`,
      { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(response.status);
    const data = await response.json();
    const found = { days: data.days || [], workouts: data.workouts || [] };
    healthMonths.set(key, found);
    try { localStorage.setItem(`health-${key}`, JSON.stringify(found)); } catch { /* full: fine */ }
    return found;
  } catch {
    try { return JSON.parse(localStorage.getItem(`health-${key}`)) || { days: [], workouts: [] }; }
    catch { return { days: [], workouts: [] }; }
  }
}

async function healthDayOn(iso) {
  if (!iso) return null;
  const date = parseISODate(iso);
  return (await healthInMonth(date.getFullYear(), date.getMonth())).days.find(d => d.date === iso) || null;
}

// ---------- Showing it ----------

function sleepHours(minutes) {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

// 😴 7:25 שינה (23:40–07:05) · 👣 8,412 צעדים · ♥ 58 במנוחה
function healthDayHtml(day) {
  if (!day) return '';
  const parts = [];
  if (day.sleep) {
    parts.push(`<span>😴 ${sleepHours(day.sleep)} ${HEALTH_WORDS.sleep}` +
      (day.sleepFrom && day.sleepTo ? ` <small dir="ltr">${day.sleepFrom}–${day.sleepTo}</small>` : '') + '</span>');
  }
  if (day.steps) parts.push(`<span>👣 ${Number(day.steps).toLocaleString('he-IL')} ${HEALTH_WORDS.steps}</span>`);
  if (day.restingHr) parts.push(`<span>♥ ${day.restingHr} ${HEALTH_WORDS.resting}</span>`);
  return parts.length ? `<div class="health-day">${parts.join('')}</div>` : '';
}

// The journal day / calendar day: the day's line, then the workout cards
function dayActivityHtml(day, workouts) {
  const line = healthDayHtml(day);
  if (!line && !workouts.length) return '';
  return `${sectionLabel(HEALTH_WORDS.title)}${line}` +
    (workouts.length ? `<div class="workouts">${workouts.map(workoutCardHtml).join('')}</div>` : '');
}

// ---------- The phone app sends ----------

function healthPlugin() {
  const plugin = nativeApp();
  return plugin && typeof plugin.healthSync === 'function' ? plugin : null;
}

function forgetHealthCopies() {
  healthMonths.clear();
  workoutMonths.clear();
}

// When the app opens or comes back (at most every half hour), if connected
async function healthAutoSync() {
  const plugin = healthPlugin();
  if (!plugin) return;
  let last = 0;
  try { last = Number(localStorage.getItem('health-sent')) || 0; } catch { /* fine */ }
  if (Date.now() - last < HEALTH_EVERY_MS) return;
  try {
    const state = await plugin.healthStatus();
    if (!state.connected) return;
    try { localStorage.setItem('health-sent', String(Date.now())); } catch { /* fine */ }
    await plugin.healthSync({ server: SERVER, days: 7 });
    forgetHealthCopies();
  } catch { /* no internet now: next time */ }
}
healthAutoSync();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') healthAutoSync();
});

// ---------- Settings (journal section, phone app only) ----------

async function healthSettingsRows() {
  const plugin = healthPlugin();
  if (!plugin) return [];
  let state = null;
  try { state = await plugin.healthStatus(); } catch { return []; }
  if (!state.connected) {
    return [actionRow('health-connect', 'dumbbell', HEALTH_WORDS.connect, HEALTH_WORDS.connectSub)];
  }
  let count = '';
  try {
    const response = await fetch(`${SERVER}/health`, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      const server = await response.json();
      count = HEALTH_WORDS.connected(server.workouts, server.lastSync ? TEXT.syncLast(timeAgo(server.lastSync)) : '');
    }
  } catch { /* offline */ }
  return [
    actionRow('health-sync', 'dumbbell', `${HEALTH_WORDS.settingTitle} · ${HEALTH_WORDS.refresh}`, escapeHtml(count)),
    actionRow('health-disconnect', 'x', HEALTH_WORDS.disconnect),
  ];
}

async function healthAction(action, status) {
  const plugin = healthPlugin();
  if (!plugin || !action.startsWith('health-')) return false;
  if (action === 'health-connect') {
    status.textContent = TEXT.working;
    const result = await plugin.healthConnect({ server: SERVER });
    if (!result.ok) {
      status.textContent = HEALTH_WORDS[result.reason] || HEALTH_WORDS.denied;
      return true;
    }
    try { localStorage.setItem('health-sent', String(Date.now())); } catch { /* fine */ }
    forgetHealthCopies();
    if (result.error) {
      status.textContent = result.error;
      return true;
    }
    showToast(HEALTH_WORDS.done(result.synced?.workouts ?? 0, result.synced?.days ?? 0));
    showScreen(true);
    return true;
  }
  if (action === 'health-sync') {
    status.textContent = TEXT.working;
    const result = await plugin.healthSync({ server: SERVER, days: 30 });
    // What the phone app could read, for the server's log (docker logs … | grep diag)
    plugin.healthStatus().then(state => postToServer('/diag', { health: state, synced: result })).catch(() => {});
    try { localStorage.setItem('health-sent', String(Date.now())); } catch { /* fine */ }
    forgetHealthCopies();
    status.textContent = HEALTH_WORDS.done(result.workouts, result.days);
    return true;
  }
  if (action === 'health-disconnect') {
    if (!confirm(HEALTH_WORDS.confirmDisconnect)) return true;
    await plugin.healthDisconnect();
    await postToServer('/health/forget', {});
    forgetHealthCopies();
    try {
      Object.keys(localStorage).filter(key => key.startsWith('health-')).forEach(key => localStorage.removeItem(key));
    } catch { /* not important */ }
    showScreen(true);
    return true;
  }
  return false;
}
