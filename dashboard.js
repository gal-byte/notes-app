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

const dashDollars = n => `$${(n || 0).toFixed(n >= 0.1 ? 2 : 3)}`;
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
    ...(host.held || []).map(h => dashRow(`${escapeHtml(h.repo)} · ${DASH_WORDS.waiting}`,
        `${escapeHtml(h.message || '')}<br><small>${escapeHtml(h.why || '')}</small>`,
        `<button type="button" class="pill-button" data-dash-action="deploy:${escapeHtml(h.repo)}">לפרוס</button>`,
        { dot: 'busy' })),
    dashRow(DASH_WORDS.nextRun, '', dashNext(run.next) || '—'),
  ];

  const todoGroup = GROUPS.find(g => (g.name || '').trim() === 'קלוד');
  const todoRows = (d.todo || []).map(t => dashRow(escapeHtml(t.title),
    t.status === 'open' ? '' : escapeHtml(t.last || ''),
    DASH_WORDS.status[t.status], { dot: t.status === 'done' ? 'good' : t.status === 'working' ? 'busy' : 'open',
                                   href: t.id ? `#/item/${encodeURIComponent(t.id)}` : '' }));

  // Costs
  const costs = d.costs || [];
  const total = costs.reduce((sum, c) => sum + (c.today || 0), 0);
  const costRows = costs.map(c => dashRow(escapeHtml(c.name), '', dashDollars(c.today)))
    .concat(dashRow(`<b>${DASH_WORDS.total}</b>`, '', `<b>${dashDollars(total)}</b>`));

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
      <span>${DASH_WORDS.costs} · ${dashDollars(total)}</span>
    </div>`;

  const needsYou = appRows.filter((_, i) => !(d.health || [])[i]?.ok)
    .concat(machineRows.slice(1), claudeRows.filter(r => r.includes('data-dash-action')));

  const openTodo = (d.todo || []).filter(t => t.status !== 'done');
  const todoHtml = openTodo.length
    ? sectionLabel(todoGroup ? `<a href="#/group/${todoGroup.id}">${DASH_WORDS.todo}</a>` : DASH_WORDS.todo)
      + rowList(openTodo.map(t => dashRow(escapeHtml(t.title), '', DASH_WORDS.status[t.status],
          { dot: t.status === 'working' ? 'busy' : 'open', href: t.id ? `#/item/${encodeURIComponent(t.id)}` : '' })))
    : '';

  const fold = (title, inner) => `<details class="dash-fold"><summary>${title}</summary>${inner}</details>`;

  return card
    + (needsYou.length ? rowList(needsYou) : '')
    + todoHtml
    + fold(DASH_WORDS.details,
        sectionLabel(DASH_WORDS.claude) + rowList([claudeRows[0], ...claudeRows.slice(1).filter(r => !r.includes('data-dash-action'))])
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
    if (!confirm(DASH_WORDS.confirm(button.textContent.trim()))) return;
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
