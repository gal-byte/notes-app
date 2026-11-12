// ============================================================
// SYNC BETWEEN DEVICES
// Your notes live on each device (db.js) AND on the home server.
// Every device syncs with the server:
//   1. sends what changed here since the last sync
//   2. gets back what changed on other devices, and merges it
//      with the same rules as restoring a backup (backup.js):
//      the newer change wins, deletions spread to all devices.
//
// So the app keeps working with no connection (it just syncs
// later), and the phone and the tablet see the same notes.
//
// When: when the app opens, a moment after every change, when you
// come back to the app, and every minute while it's open.
// The server is reachable only over Tailscale.
// ============================================================

// (localStorage 'testServer' points a test copy of the app at a test server)
const SERVER = (() => {
  try { return localStorage.getItem('testServer') || 'https://home-server.tail7870b4.ts.net:8443'; }
  catch { return 'https://home-server.tail7870b4.ts.net:8443'; }
})();
const SYNC_WAIT_MS = 1500;     // after a change, wait for a moment of quiet
const SYNC_EVERY_MS = 60000;   // while the app is open

function syncSetting(name, fallback = 0) {
  try { return Number(localStorage.getItem(name)) || fallback; } catch { return fallback; }
}
function setSyncSetting(name, value) {
  try { localStorage.setItem(name, String(value)); } catch { /* not important */ }
}

function syncOn() {
  try { return localStorage.getItem('syncOff') !== 'yes'; } catch { return true; }
}

// Send everything again next time (after restoring a backup)
function resendEverything() {
  setSyncSetting('syncMark', 0);
}

// What changed here since the last sync ("mark" = when it started)
async function localChangesSince(mark) {
  const changes = [];
  for (const item of await getAllItems()) {
    if ((item.updatedAt || 0) <= mark) continue;
    const data = { ...item };
    if (item.photo instanceof Blob) data.photo = await blobToDataUrl(item.photo);
    changes.push({ kind: 'item', id: item.id, updatedAt: item.updatedAt, data });
  }
  for (const group of await getCustomGroups()) {
    if ((group.updatedAt || 0) <= mark) continue;
    changes.push({ kind: 'group', id: group.id, updatedAt: group.updatedAt || 0, data: withoutFlag(group) });
  }
  for (const record of await getDeletedRecords()) {
    if (record.deletedAt <= mark) continue;
    // Your own groups have ids starting with "g-"
    changes.push({ kind: record.id.startsWith('g-') ? 'group' : 'item', id: record.id,
                   updatedAt: record.deletedAt, deleted: true });
  }
  return changes;
}

let syncRunning = null;
let syncAgain = false;
let applyingRemote = false;   // our own merge shouldn't start another sync

// Returns 'ok', 'off' or 'offline'
function syncNow() {
  if (!syncOn()) return Promise.resolve('off');
  if (syncRunning) { syncAgain = true; return syncRunning; }
  syncRunning = runSync().finally(() => {
    syncRunning = null;
    if (syncAgain) { syncAgain = false; syncNow(); }
  });
  return syncRunning;
}

async function runSync() {
  const startedAt = Date.now() - 1;
  try {
    const changes = await localChangesSince(syncSetting('syncMark'));
    const response = await fetch(`${SERVER}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ since: syncSetting('syncSeq'), changes }),
    });
    if (!response.ok) throw new Error(String(response.status));
    const result = await response.json();

    // Merge what came back, like a restore (backup.js)
    const theirs = { items: [], groups: [], deleted: [] };
    for (const change of result.changes) {
      if (change.deleted) theirs.deleted.push({ id: change.id, deletedAt: change.updatedAt });
      else if (change.kind === 'item') theirs.items.push(change.data);
      else if (change.kind === 'group') theirs.groups.push(change.data);
    }
    const local = {
      items: await getAllItems(),
      groups: (await getCustomGroups()).map(withoutFlag),
      deleted: await getDeletedRecords(),
    };
    const plan = planMerge(local, theirs);
    if (plan.changes) {
      applyingRemote = true;
      try { await applyMerge(plan); } finally { applyingRemote = false; }
    }

    setSyncSetting('syncMark', startedAt);
    setSyncSetting('syncSeq', result.seq);
    setSyncSetting('syncLast', Date.now());
    if (plan.changes) redrawAfterSync();
    return 'ok';
  } catch {
    return 'offline';  // no Tailscale / server down: try again later
  }
}

// Show what came from the other device, unless you're in the middle of editing
function redrawAfterSync() {
  const page = location.hash.replace('#/', '').split('/')[0];
  if (['item', 'new', 'group-settings', 'add'].includes(page)) return;
  showScreen(true);
}

// Called by db.js after every save or delete
let syncTimer = null;
function notesChanged() {
  if (applyingRemote) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, SYNC_WAIT_MS);
}

// When the app opens, comes back to the front, or gets a connection
syncNow();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') syncNow();
});
window.addEventListener('online', () => syncNow());
setInterval(() => { if (document.visibilityState === 'visible') syncNow(); }, SYNC_EVERY_MS);

// ---------- The card on the settings screen ----------

function syncCard() {
  const last = syncSetting('syncLast');
  const status = !syncOn() ? TEXT.syncIsOff
    : last ? TEXT.syncLast(timeAgo(last))
    : TEXT.syncNever;
  const buttons = syncOn()
    ? `<button type="button" class="small-button wide" data-sync="now">${icon('sync')} ${TEXT.syncNow}</button>
       <button type="button" class="link-button" data-sync="off">${TEXT.syncTurnOff}</button>`
    : `<button type="button" class="primary-button" data-sync="on">${TEXT.syncTurnOn}</button>`;
  return `
    <div class="card backup-card">
      <h2 class="card-title">${icon('sync')} ${TEXT.syncTitle}</h2>
      <p class="muted">${TEXT.syncExplain}</p>
      <p class="backup-facts">${status}</p>
      ${buttons}
      <p class="backup-status" id="sync-status"></p>
    </div>`;
}

function setupSyncCard() {
  const status = document.getElementById('sync-status');
  document.querySelectorAll('[data-sync]').forEach(button => {
    button.addEventListener('click', async () => {
      const action = button.dataset.sync;
      if (action === 'off') {
        try { localStorage.setItem('syncOff', 'yes'); } catch { /* not important */ }
        showScreen(true);
        return;
      }
      if (action === 'on') {
        try { localStorage.removeItem('syncOff'); } catch { /* not important */ }
      }
      status.textContent = TEXT.driveWorking;
      const result = await syncNow();
      if (result === 'ok') showScreen(true);
      else status.textContent = TEXT.syncNoServer;
    });
  });
}
