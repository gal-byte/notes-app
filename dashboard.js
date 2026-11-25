// ============================================================
// SERVER SCREEN (#/server, the shield at the top of home)
// The home server at a glance, from notify's GET /dashboard (dashboard.py):
//   - are the apps up (and the containers, TV hub, disk, memory)
//   - Claude on the server: last and next run of the קלוד to-do list,
//     changes waiting for your OK, and the list itself
//   - today's Claude API spend
//   - the last notifications and server alerts
// Buttons (run the to-do list now, restart an app, deploy a held change)
// only send a name; the server's host helper has the real commands.
// Tailnet only, like sync. Nothing is kept offline.
// ============================================================

const DASH_WORDS = {
  title: 'שרת',
  loading: 'טוען…',
  offline: 'השרת לא עונה (מחוץ ל-Tailscale?)',
  allGood: 'הכל תקין',
  problems: n => n === 1 ? 'בעיה אחת' : `${n} בעיות`,
  apps: 'אפליקציות',
  machine: 'המחשב',
  machineLine: h => `זיכרון ${h.memory?.used_gb}/${h.memory?.total_gb}GB · דיסק ${h.disk?.used_gb}/${h.disk?.total_gb}GB · דולק ${h.uptime_days} ימים`,
  stopped: 'לא רץ',
  claude: 'קלוד בשרת',
  lastRun: 'ריצה אחרונה',
  running: 'רץ עכשיו…',
  failed: code => `נכשלה (${code})`,
  noRun: 'עוד לא רץ',
  nextRun: 'הריצה הבאה',
  deployed: 'נפרס',
  waiting: 'מחכה לאישור שלך',
  waitingIn: repo => `שינוי של קלוד ב-${repo} מחכה לאישור`,
  whyServer: 'נוגע בקבצים שרצים בשרת עצמו',
  whyHost: 'מרכז הטלוויזיה רץ ישירות על השרת',
  approve: 'אישור',
  reject: 'דחייה',
  askApprove: repo => `לאשר ולפרוס את השינוי ב-${repo}?`,
  askReject: repo => `לדחות את השינוי ב-${repo}? קלוד יוותר עליו`,
  todo: 'רשימת קלוד',
  status: { open: 'פתוח', working: 'בעבודה', done: 'טופל' },
  costs: 'עלות Claude היום',
  total: 'סה״כ',
  activity: 'מה קרה',
  details: 'פרטים',
  nothing: 'שום דבר עדיין',
  actions: 'פעולות',
  confirm: label => `${label}?`,
  sent: 'נשלח לשרת',
  refresh: 'רענון',
};

// Shekels: "₪1.20", or agorot under a shekel ("2 אג׳", "0.4 אג׳")
function dashShekels(ils) {
  ils = ils || 0;
  if (ils >= 1) return `₪${ils.toFixed(2)}`;
  const agorot = ils * 100;
  return `${agorot.toFixed(agorot && agorot < 1 ? 1 : 0)} אג׳`;
}
const dashWhen = seconds => seconds ? timeAgo(seconds * 1000) : '';
const dashTime = iso => {
  const t = Date.parse(iso || '');
  return Number.isNaN(t) ? '' : timeAgo(t);
};
// systemd's "Thu 2026-11-26 08:09:18 UTC" → "מחר 10:09"
function dashNext(text) {
  const m = /(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) UTC/.exec(text || '');
  if (!m) return '';
  const date = new Date(`${m[1]}T${m[2]}Z`);
  return `${shortDay(date)} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function dashRow(title, sub, end, options = {}) {
  const tag = options.href ? `a href="${options.href}"` : 'div';
  return `
    <${tag} class="row dash-row${options.bad ? ' dash-bad' : ''}">
      ${options.dot ? `<i class="dash-dot ${options.dot}"></i>` : ''}
      <span class="row-main">
        <span class="row-title">${title}</span>
        ${sub ? `<span class="row-sub dash-wrap">${sub}</span>` : ''}
      </span>
      ${end ? `<span class="row-end">${end}</span>` : ''}
    </${options.href ? 'a' : 'div'}>`;
}

// A change Claude made that waits for you: its summary, what it touches, approve / reject
function dashHeldCard(h) {
  const repo = escapeHtml(h.repo);
  const all = h.files || [];
  const files = all.slice(0, 4).map(escapeHtml).join(', ') + (all.length > 4 ? '…' : '');
  return `
    <div class="dash-held">
      <b>${DASH_WORDS.waitingIn(repo)}</b>
      <p>${escapeHtml(h.summary || h.message || '')}</p>
      <small>${h.why === 'tv-hub' ? DASH_WORDS.whyHost : DASH_WORDS.whyServer}${files ? ` · ${files}` : ''}</small>
      <div class="dash-held-buttons">
        <button type="button" class="pill-button approve" data-dash-action="deploy:${repo}" data-ask="${escapeHtml(DASH_WORDS.askApprove(h.repo))}">${DASH_WORDS.approve}</button>
        <button type="button" class="pill-button" data-dash-action="reject:${repo}" data-ask="${escapeHtml(DASH_WORDS.askReject(h.repo))}">${DASH_WORDS.reject}</button>
      </div>
    </div>`;
}

function serverScreen() {
  return `<div id="dash">${sectionLabel(DASH_WORDS.loading)}</div>`;
}

function dashHtml(d) {
  const host = d.host || {};
  const problems = [];

  // Apps
  const appRows = (d.health || []).map(h => {
    if (!h.ok) problems.push(h.name);
    return dashRow(escapeHtml(h.name), h.ok ? '' : escapeHtml(h.note || ''), h.ok ? '✓' : '✗',
                   { dot: h.ok ? 'good' : 'bad', bad: !h.ok });
  });
  const stopped = (host.containers || []).filter(c => c.state !== 'running');
  stopped.forEach(c => problems.push(c.name));
  if (host.services?.tvhub && host.services.tvhub !== 'active') problems.push('tvhub');
  const machineRows = [dashRow(DASH_WORDS.machine, escapeHtml(DASH_WORDS.machineLine(host)), '', { dot: 'good' })]
    .concat(stopped.map(c => dashRow(escapeHtml(c.name), escapeHtml(c.status), DASH_WORDS.stopped, { dot: 'bad', bad: true })));

  // Claude on the server
  const run = host.claude || {};
  const runEnd = run.state === 'running' ? DASH_WORDS.running
    : run.exit ? DASH_WORDS.failed(run.exit) : dashTime(run.ended);
  if (run.exit) problems.push(DASH_WORDS.claude);
  const claudeRows = [
    dashRow(DASH_WORDS.lastRun, escapeHtml(run.result || (run.state ? '' : DASH_WORDS.noRun)), runEnd,
            { dot: run.exit ? 'bad' : run.state === 'running' ? 'busy' : 'good' }),
    ...(run.deployed || []).map(line => dashRow(DASH_WORDS.deployed, escapeHtml(line), '', { dot: 'good' })),
    dashRow(DASH_WORDS.nextRun, '', dashNext(run.next) || '—'),
  ];

  const todoGroup = GROUPS.find(g => (g.name || '').trim() === 'קלוד');

  // Costs
  const costs = d.costs || [];
  const total = costs.reduce((sum, c) => sum + (c.ils || 0), 0);
  const costRows = costs.map(c => dashRow(escapeHtml(c.name), '', dashShekels(c.ils)))
    .concat(dashRow(`<b>${DASH_WORDS.total}</b>`, '', `<b>${dashShekels(total)}</b>`));

  // Activity
  const activityRows = (d.activity || []).map(a => dashRow(escapeHtml(a.title || ''), escapeHtml(a.body || ''),
    dashWhen(a.at), { dot: a.source === 'alert' ? 'alert' : 'open' }));

  // Buttons
  const buttons = (d.actions || []).filter(a => !a.id.startsWith('deploy:')).map(a =>
    `<button type="button" class="pill-button" data-dash-action="${escapeHtml(a.id)}">${escapeHtml(a.label)}</button>`).join('');

  // Calm by default: one card, then only what needs you. Everything else is folded away.
  const claudeLine = run.state === 'running' ? DASH_WORDS.running
    : `${DASH_WORDS.nextRun} ${dashNext(run.next) || '—'}`;
  const card = `
    <div class="dash-card ${problems.length ? 'bad' : 'good'}">
      <b>${problems.length ? `${DASH_WORDS.problems(problems.length)}: ${escapeHtml(problems.join(', '))}` : DASH_WORDS.allGood}</b>
      <span>קלוד · ${claudeLine}</span>
      <span>${DASH_WORDS.costs} · ${dashShekels(total)}</span>
    </div>`;

  const needsYou = appRows.filter((_, i) => !(d.health || [])[i]?.ok).concat(machineRows.slice(1));
  const heldCards = (host.held || []).map(dashHeldCard).join('');

  // open and in progress, plus what the server Claude finished on its own (the server picks those)
  const openTodo = d.todo || [];
  const todoHtml = openTodo.length
    ? sectionLabel(todoGroup ? `<a href="#/group/${todoGroup.id}">${DASH_WORDS.todo}</a>` : DASH_WORDS.todo)
      + rowList(openTodo.map(t => dashRow(escapeHtml(t.title), t.status === 'done' ? escapeHtml(t.last || '') : '',
          DASH_WORDS.status[t.status], { dot: t.status === 'working' ? 'busy' : t.status === 'done' ? 'good' : 'open', href: t.id ? `#/item/${encodeURIComponent(t.id)}` : '' })))
    : '';

  const fold = (title, inner) => `<details class="dash-fold"><summary>${title}</summary>${inner}</details>`;

  return card
    + heldCards
    + (needsYou.length ? rowList(needsYou) : '')
    + todoHtml
    + fold(DASH_WORDS.details,
        sectionLabel(DASH_WORDS.claude) + rowList(claudeRows)
        + sectionLabel(DASH_WORDS.apps) + rowList(appRows.concat(machineRows[0]))
        + sectionLabel(DASH_WORDS.costs) + rowList(costRows)
        + sectionLabel(DASH_WORDS.activity)
        + rowList(activityRows.length ? activityRows.slice(0, 8) : [dashRow(DASH_WORDS.nothing, '', '')]))
    + fold(DASH_WORDS.actions, `<div class="dash-actions">${buttons}</div>`);
}

async function loadDashboard() {
  const box = document.getElementById('dash');
  if (!box) return;
  try {
    const response = await fetch(`${SERVER}/dashboard`, { signal: AbortSignal.timeout(25000) });
    const data = await response.json();
    if (!document.getElementById('dash')) return;   // left the screen meanwhile
    box.innerHTML = dashHtml(data);
  } catch {
    if (document.getElementById('dash')) box.innerHTML = `<p class="dash-summary bad">${DASH_WORDS.offline}</p>`;
  }
}

function setupServerScreen() {
  loadDashboard();
  document.getElementById('dash-refresh')?.addEventListener('click', () => { haptic(5); loadDashboard(); });
  document.getElementById('dash').addEventListener('click', async event => {
    const button = event.target.closest('[data-dash-action]');
    if (!button) return;
    event.preventDefault();
    if (!confirm(button.dataset.ask || DASH_WORDS.confirm(button.textContent.trim()))) return;
    button.disabled = true;
    haptic(8);
    try {
      const response = await fetch(`${SERVER}/dashboard/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: button.dataset.dashAction }), signal: AbortSignal.timeout(10000),
      });
      const reply = await response.json();
      showToast(escapeHtml(reply.ok ? DASH_WORDS.sent : reply.message || reply.error || '✗'));
    } catch {
      showToast(DASH_WORDS.offline);
    }
    setTimeout(loadDashboard, 4000);
  });
}

// ============================================================
// "CLAUDE NOW" BAR (top of home): what Claude is doing right now, from notify's light
// GET /dashboard/now (dashboard.py now()): the server Claude on a note, a change waiting
// for your OK, Claude in a chat changing notes, or idle with the last result.
// Polled every 45 s while home is open and the app is in front. Tap: #/server.
// Hidden when the server doesn't answer (outside Tailscale), unless the server Claude
// asked a question in a קלוד note: then it shows "קלוד שואל: ..." and a tap opens a small
// answer panel instead (below).
// ============================================================

const NOW_WORDS = {
  working: (title, since) => `קלוד עובד על ${title ? `"${title}"` : 'משימה מהרשימה'}${since ? ` · מ-${since}` : ''}`,
  waiting: repos => `שינוי של קלוד מחכה לאישור שלך${repos ? ` (${repos})` : ''}`,
  chat: (what, body) => `קלוד בשיחה · ${what}${body ? `: ${body}` : ''}`,
  idle: 'קלוד פנוי',
  failed: 'הריצה האחרונה נכשלה',
  question: 'שאלה מחכה לך ב-קלוד',
  last: line => `אחרון: ${line}`,
};
const NOW_POLL_MS = 45000;
let claudeNow = null;     // the last answer, so home redraws show it at once
let claudeNowTimer = null;

const hhmm = date => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

// A question from the server Claude, found in this device's own notes (works offline too):
// an open note in the group קלוד (no טופל / בעבודה tag) whose last non-empty line starts
// with "— Claude" ("— Claude (date): <question>", added by the to-do runner). Oldest first.
// Gal's answer goes under it as "— תשובה (date): ...", so it stops being a question.
const ASK_WORDS = {
  bar: question => `קלוד שואל: ${question}`,
  placeholder: 'התשובה שלך…',
  send: 'שליחה',
  sendRun: 'שליחה והרצה עכשיו',
  saved: 'נשמר; קלוד ימשיך בריצה הבאה',
  savedRun: 'נשמר; קלוד מתחיל עכשיו',
  empty: 'כתוב תשובה קודם',
};
let claudeQuestion = null;   // { id, title, question } or null

function findClaudeQuestion(items, groups) {
  const group = groups.find(g => (g.name || '').trim() === 'קלוד');
  if (!group) return null;
  const asking = items.filter(item => {
    if (item.group !== group.id) return false;
    const tags = parseTags(item.tags);
    if (tags.includes('טופל') || tags.includes('בעבודה')) return false;
    const last = (item.text || '').split('\n').map(line => line.trim()).filter(Boolean).pop() || '';
    return last.startsWith('— Claude');
  }).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  const item = asking[0];
  if (!item) return null;
  const last = item.text.split('\n').map(line => line.trim()).filter(Boolean).pop();
  const question = last.replace(/^— Claude(\s*\([^)]*\))?\s*:?\s*/, '') || last;
  return { id: item.id, title: item.title || '', question };
}

async function refreshClaudeQuestion() {
  try {
    claudeQuestion = findClaudeQuestion(await getAllItems(), GROUPS);
  } catch {
    claudeQuestion = null;
  }
}

// Bar priority: working > waiting (held change) > question > chat > idle
function claudeNowParts(now, question = claudeQuestion) {
  if (now?.ok && now.state === 'working') {
    const since = Date.parse(now.since || '');
    return { dot: 'busy', text: NOW_WORDS.working(now.title, Number.isNaN(since) ? '' : hhmm(new Date(since))) };
  }
  if (now?.ok && now.state === 'waiting') return { dot: 'busy', text: NOW_WORDS.waiting((now.held_repos || []).join(', ')) };
  if (question) return { dot: 'alert', text: ASK_WORDS.bar(question.question), ask: true };
  if (!now?.ok) return null;
  if (now.state === 'chat') {
    return { dot: 'busy', text: NOW_WORDS.chat((now.title || '').replace(/^קלוד /, ''), now.body || '') };
  }
  const last = now.last || {};
  const ended = Date.parse(last.ended || '');
  const fresh = !Number.isNaN(ended) && Date.now() - ended < 36 * 3600 * 1000;
  if (fresh && last.failed) return { dot: 'bad', text: `${NOW_WORDS.idle} · ${NOW_WORDS.failed}` };
  if (fresh && last.status === 'skipped') return { dot: 'alert', text: `${NOW_WORDS.idle} · ${NOW_WORDS.question}` };
  if (fresh && last.line) return { dot: 'good', text: `${NOW_WORDS.idle} · ${NOW_WORDS.last(last.line)}` };
  return { dot: 'good', text: NOW_WORDS.idle };
}

function claudeNowHtml(now) {
  const parts = claudeNowParts(now);
  return parts
    ? `<i class="dash-dot ${parts.dot}"></i><span>${escapeHtml(parts.text)}</span>`
    : '';
}

function drawClaudeNow() {
  const bar = document.getElementById('claude-now');
  if (!bar) return;
  const html = claudeNowHtml(claudeNow);
  bar.innerHTML = html;
  bar.hidden = !html;
  const asking = Boolean(claudeNowParts(claudeNow)?.ask);
  bar.classList.toggle('asking', asking);
  const panel = document.getElementById('claude-ask');
  // The question went away (answered on another device, or a run is now on it): close the panel
  if (panel && !panel.hidden && (!asking || panel.dataset.id !== claudeQuestion?.id)) panel.hidden = true;
}

// The small answer panel under the bar: the note, the question, a box and two buttons
function claudeAskHtml(question) {
  return `
    <a class="claude-ask-title" href="#/item/${encodeURIComponent(question.id)}" dir="auto">${escapeHtml(question.title || question.question)}</a>
    <p dir="auto">${escapeHtml(question.question)}</p>
    <textarea rows="3" dir="auto" placeholder="${escapeHtml(ASK_WORDS.placeholder)}"></textarea>
    <div class="claude-ask-buttons">
      <button type="button" class="pill-button approve" data-ask-send="">${escapeHtml(ASK_WORDS.send)}</button>
      <button type="button" class="pill-button" data-ask-send="run">${escapeHtml(ASK_WORDS.sendRun)}</button>
    </div>`;
}

async function sendClaudeAnswer(panel, runNow) {
  const box = panel.querySelector('textarea');
  const answer = box.value.trim().replace(/\s*\n\s*/g, ' ');
  if (!answer) { showToast(escapeHtml(ASK_WORDS.empty)); box.focus(); return; }
  const item = await getItem(panel.dataset.id);
  if (!item) return;
  panel.querySelectorAll('button').forEach(button => { button.disabled = true; });
  // updateItem syncs through notesChanged(); the runner reads the "— תשובה" line next time
  await updateItem(item.id, { text: `${(item.text || '').trimEnd()}\n\n— תשובה (${toISODate(new Date())}): ${answer}` });
  haptic(8);
  let message = ASK_WORDS.saved;
  if (runNow) {
    try {
      const response = await fetch(`${SERVER}/dashboard/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run-todo' }), signal: AbortSignal.timeout(10000),
      });
      const reply = await response.json();
      message = reply.ok ? ASK_WORDS.savedRun : `${ASK_WORDS.saved} · ${reply.message || reply.error || '✗'}`;
    } catch {
      message = `${ASK_WORDS.saved} · ${DASH_WORDS.offline}`;
    }
  }
  showToast(escapeHtml(message));
  panel.hidden = true;
  await refreshClaudeQuestion();
  drawClaudeNow();
  if (runNow) setTimeout(pollClaudeNow, 4000);
}

// Tap the bar: a question opens the answer panel; anything else goes on to #/server
function setupClaudeAsk() {
  const bar = document.getElementById('claude-now');
  const panel = document.getElementById('claude-ask');
  if (!bar || !panel || bar.dataset.askReady) return;
  bar.dataset.askReady = '1';
  bar.addEventListener('click', event => {
    if (!bar.classList.contains('asking') || !claudeQuestion) return;
    event.preventDefault();
    haptic(5);
    if (!panel.hidden && panel.dataset.id === claudeQuestion.id) { panel.hidden = true; return; }
    panel.dataset.id = claudeQuestion.id;
    panel.innerHTML = claudeAskHtml(claudeQuestion);
    panel.hidden = false;
  });
  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-ask-send]');
    if (button) sendClaudeAnswer(panel, button.dataset.askSend === 'run');
  });
}

async function pollClaudeNow() {
  if (!document.getElementById('claude-now') || document.hidden) return;
  await refreshClaudeQuestion();
  drawClaudeNow();   // the question shows even if the server is out of reach
  try {
    const response = await fetch(`${SERVER}/dashboard/now`, { signal: AbortSignal.timeout(8000) });
    claudeNow = response.ok ? await response.json() : null;
  } catch {
    claudeNow = null;
  }
  drawClaudeNow();
}

// Called by setupHome(): draw what we know, ask again now and every 45 s while home is shown
function startClaudeNow() {
  setupClaudeAsk();
  drawClaudeNow();
  pollClaudeNow();
  if (claudeNowTimer) return;
  claudeNowTimer = setInterval(() => {
    if (!document.getElementById('claude-now')) { clearInterval(claudeNowTimer); claudeNowTimer = null; return; }
    pollClaudeNow();
  }, NOW_POLL_MS);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) pollClaudeNow(); });
