// ============================================================
// STRAVA
// Your workouts from Strava, read-only, shown on the journal day
// and on the calendar (with Health Connect's, health.js). The home server reads them from Strava every
// hour (strava.py in ~/notify); this file only asks the server.
// Kept per month, also offline (localStorage), so screens stay fast.
// Connect / disconnect in settings (journalSettingsHtml).
// ============================================================

const WORKOUT_WORDS = {
  title: 'אימונים',
  km: 'ק״מ',
  perKm: 'לק״מ',
  per100: 'ל־100 מ׳',
  kmh: 'קמ״ש',
  meters: 'מ׳',
  settingTitle: 'Strava',
  connect: 'חיבור ל-Strava',
  connectSub: 'האימונים יופיעו ביומן ובלוח השנה',
  connected: (name, n) => `מחובר${name ? ` (${name})` : ''} · ${n} אימונים`,
  refresh: 'לרענן עכשיו',
  disconnect: 'ניתוק מ-Strava',
  confirmDisconnect: 'לנתק? האימונים יימחקו מהשרת (ב-Strava הם נשארים)',
};

// Strava's sport types → Hebrew name and emoji (anything else is "אימון")
const WORKOUT_TYPES = {
  Run: ['ריצה', '🏃'], TrailRun: ['ריצת שטח', '🏃'], VirtualRun: ['ריצה על הליכון', '🏃'],
  Walk: ['הליכה', '🚶'], Hike: ['טיול רגלי', '🥾'],
  Ride: ['רכיבה', '🚴'], MountainBikeRide: ['רכיבת שטח', '🚵'], GravelRide: ['רכיבת גראבל', '🚴'],
  EBikeRide: ['רכיבה חשמלית', '🚴'], EMountainBikeRide: ['רכיבת שטח חשמלית', '🚵'], VirtualRide: ['רכיבה בבית', '🚴'],
  Swim: ['שחייה', '🏊'], Rowing: ['חתירה', '🚣'], Kayaking: ['קיאקים', '🛶'], Surfing: ['גלישה', '🏄'],
  WeightTraining: ['אימון כוח', '🏋️'], Crossfit: ['קרוספיט', '🏋️'], Workout: ['אימון', '💪'],
  Yoga: ['יוגה', '🧘'], Pilates: ['פילאטיס', '🧘'], Elliptical: ['אליפטיקל', '💪'], StairStepper: ['מדרגות', '💪'],
  Soccer: ['כדורגל', '⚽'], Basketball: ['כדורסל', '🏀'], Tennis: ['טניס', '🎾'], Padel: ['פאדל', '🎾'],
  RockClimbing: ['טיפוס', '🧗'], Skateboard: ['סקייטבורד', '🛹'], Golf: ['גולף', '⛳'],
  HIIT: ['אימון אינטרוולים', '🔥'], Boxing: ['אגרוף', '🥊'], Dance: ['ריקוד', '💃'],
};
const PACED = ['Run', 'TrailRun', 'VirtualRun', 'Walk', 'Hike'];
const RIDES = ['Ride', 'MountainBikeRide', 'GravelRide', 'EBikeRide', 'EMountainBikeRide', 'VirtualRide'];

function workoutKind(type) {
  return WORKOUT_TYPES[type] || ['אימון', '💪'];
}

// ---------- Getting them (per month, from the server or the offline copy) ----------

const workoutMonths = new Map();   // "2026-11" → [workouts], this visit

function storedMonth(key) {
  try { return JSON.parse(localStorage.getItem(`strava-${key}`)); } catch { return null; }
}

// Strava's and Health Connect's (health.js) together; a run that's in both shows once
async function workoutsInMonth(year, month) {
  const [strava, health] = await Promise.all([stravaInMonth(year, month), healthInMonth(year, month)]);
  const minutes = w => {
    const [h, m] = (w.time || '0:0').split(':').map(Number);
    return h * 60 + m;
  };
  const extra = health.workouts.filter(h =>
    !strava.some(s => s.date === h.date && Math.abs(minutes(s) - minutes(h)) <= 10));
  return [...strava, ...extra].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

async function stravaInMonth(year, month) {
  const key = `${year}-${String(month + 1).padStart(2, '0')}`;
  if (workoutMonths.has(key)) return workoutMonths.get(key);
  const last = new Date(year, month + 1, 0).getDate();
  try {
    const response = await fetch(`${SERVER}/strava/activities?from=${key}-01&to=${key}-${last}`,
      { signal: AbortSignal.timeout(4000) });
    if (!response.ok) throw new Error(response.status);
    const list = (await response.json()).activities || [];
    workoutMonths.set(key, list);
    try { localStorage.setItem(`strava-${key}`, JSON.stringify(list)); } catch { /* full: fine */ }
    return list;
  } catch {
    return storedMonth(key) || [];   // offline: what we saw last time
  }
}

async function workoutsOn(iso) {
  if (!iso) return [];
  const date = parseISODate(iso);
  return (await workoutsInMonth(date.getFullYear(), date.getMonth())).filter(w => w.date === iso);
}

// ---------- Showing them ----------

function workoutDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor(seconds % 3600 / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function workoutStats(w) {
  const stats = [];
  if (w.distance >= 50) {
    stats.push(w.type === 'Swim' ? `${w.distance.toLocaleString('he-IL')} ${WORKOUT_WORDS.meters}`
                                 : `${(w.distance / 1000).toFixed(w.distance >= 100000 ? 0 : 1)} ${WORKOUT_WORDS.km}`);
  }
  if (w.moving) stats.push(workoutDuration(w.moving));
  if (w.distance >= 50 && w.moving) {
    if (PACED.includes(w.type)) stats.push(`${workoutDuration(Math.round(w.moving / (w.distance / 1000)))} ${WORKOUT_WORDS.perKm}`);
    else if (RIDES.includes(w.type)) stats.push(`${(w.distance / w.moving * 3.6).toFixed(1)} ${WORKOUT_WORDS.kmh}`);
    else if (w.type === 'Swim') stats.push(`${workoutDuration(Math.round(w.moving / (w.distance / 100)))} ${WORKOUT_WORDS.per100}`);
  }
  if (w.elevation >= 10) stats.push(`↗ ${w.elevation} ${WORKOUT_WORDS.meters}`);
  if (w.heartrate) stats.push(`♥ ${w.heartrate}`);
  return stats;
}

// Strava's "encoded polyline" (Google's format) → [[lat, lon], ...]
function decodePolyline(text) {
  const points = [];
  let index = 0, lat = 0, lon = 0;
  while (index < text.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, byte;
      do {
        byte = text.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20 && index < text.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += delta; else lon += delta;
    }
    points.push([lat / 1e5, lon / 1e5]);
  }
  return points;
}

// The route's shape, no map underneath (nothing leaves the phone for map tiles)
function routeSvg(encoded) {
  const points = decodePolyline(encoded || '');
  if (points.length < 2) return '';
  const squeeze = Math.cos(points[0][0] * Math.PI / 180);
  const xy = points.map(([lat, lon]) => [lon * squeeze, -lat]);
  const xs = xy.map(p => p[0]), ys = xy.map(p => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const size = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY) || 1;
  const pad = 8, box = 100 - 2 * pad;
  const offX = (box - (Math.max(...xs) - minX) / size * box) / 2;
  const offY = (box - (Math.max(...ys) - minY) / size * box) / 2;
  const path = xy.map(([x, y], i) =>
    `${i ? 'L' : 'M'}${(pad + offX + (x - minX) / size * box).toFixed(1)} ${(pad + offY + (y - minY) / size * box).toFixed(1)}`).join('');
  const [sx, sy] = path.slice(1).split(/[L ]/).map(Number);
  return `<svg class="workout-route" viewBox="0 0 100 100" aria-hidden="true">
    <path d="${path}"/><circle cx="${sx}" cy="${sy}" r="4"/></svg>`;
}

function workoutCardHtml(w) {
  const [kind, emoji] = workoutKind(w.type);
  const route = routeSvg(w.route);
  // Strava's open on strava.com; Health Connect's ("hc-…") have nowhere to open
  const fromStrava = !String(w.id).startsWith('hc-');
  const tag = fromStrava ? 'a' : 'div';
  const link = fromStrava ? ` href="https://www.strava.com/activities/${encodeURIComponent(w.id)}" target="_blank" rel="noopener"` : '';
  return `
    <${tag} class="workout"${link}>
      ${route || `<span class="workout-emoji">${emoji}</span>`}
      <span class="workout-main">
        <span class="workout-kind">${route ? `${emoji} ` : ''}${kind}${w.time ? ` · ${w.time}` : ''}</span>
        ${w.name ? `<span class="workout-name" dir="auto">${escapeHtml(w.name)}</span>` : ''}
        <span class="workout-stats">${workoutStats(w).map(s => `<span>${s}</span>`).join('')}</span>
      </span>
    </${tag}>`;
}

function workoutsHtml(workouts) {
  if (!workouts.length) return '';
  return `${sectionLabel(WORKOUT_WORDS.title)}<div class="workouts">${workouts.map(workoutCardHtml).join('')}</div>`;
}

// ---------- Settings ----------

async function stravaSettingsRows() {
  let state = null;
  try {
    const response = await fetch(`${SERVER}/strava/status`, { signal: AbortSignal.timeout(5000) });
    if (response.ok) state = await response.json();
  } catch { /* offline */ }
  if (!state?.configured) return [];
  if (!state.connected) {
    return [actionRow('strava-connect', 'dumbbell', WORKOUT_WORDS.connect, WORKOUT_WORDS.connectSub)];
  }
  const sub = state.error || WORKOUT_WORDS.connected(state.name, state.count) +
    (state.lastSync ? ` · ${TEXT.syncLast(timeAgo(state.lastSync))}` : '');
  return [
    actionRow('strava-sync', 'dumbbell', `${WORKOUT_WORDS.settingTitle} · ${WORKOUT_WORDS.refresh}`, escapeHtml(sub)),
    actionRow('strava-disconnect', 'x', WORKOUT_WORDS.disconnect),
  ];
}

async function stravaAction(action, status) {
  if (action === 'strava-connect') {
    const url = `${SERVER}/strava/connect`;
    // The phone app opens other sites in the phone's browser; the plain web app opens a tab
    if (window.Capacitor) location.href = url; else window.open(url, '_blank', 'noopener');
    return true;
  }
  if (action === 'strava-sync') {
    status.textContent = TEXT.working;
    const state = await postToServer('/strava/sync', {});
    workoutMonths.clear();
    status.textContent = state.error || WORKOUT_WORDS.connected(state.name, state.count);
    return true;
  }
  if (action === 'strava-disconnect') {
    if (!confirm(WORKOUT_WORDS.confirmDisconnect)) return true;
    await postToServer('/strava/disconnect', {});
    workoutMonths.clear();
    try {
      Object.keys(localStorage).filter(key => key.startsWith('strava-')).forEach(key => localStorage.removeItem(key));
    } catch { /* not important */ }
    showScreen(true);
    return true;
  }
  return false;
}
