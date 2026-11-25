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
