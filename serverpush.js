// ============================================================
// REMINDERS FROM THE HOME SERVER
// The home server sends a phone notification before each reminder:
//   • birthdays → the day before, at 10:00
//   • reminders with a time → 2 hours before
//   • reminders without a time → the evening before, at 20:00
//
// The phone gets them through the ntfy app, so they arrive even
// when this app is closed. This file only keeps the server's copy
// of your reminders up to date: after every change (and when the
// app opens) it sends the whole list.
//
// The server is reachable only over Tailscale. If Tailscale is off,
// sending just fails quietly and is tried again on the next change
// or the next time the app opens.
// ============================================================

const PUSH_SERVER = 'https://home-server.tail7870b4.ts.net:8443';
const PUSH_WAIT_MS = 2000;  // wait for a moment of quiet, then send once

function serverPushOn() {
  try { return localStorage.getItem('serverPush') === 'on'; } catch { return false; }
}

function lastServerSync() {
  try { return Number(localStorage.getItem('serverPushLast')) || 0; } catch { return 0; }
}

// Send all reminders. Returns true if the server got them.
async function sendRemindersToServer() {
  const reminders = (await getItemsInGroup('reminders')).map(item => ({
    id: item.id,
    title: item.title || '',
    date: item.date || '',
    time: item.time || '',
    repeatYearly: !!item.repeatYearly,
    birthday: isBirthday(item),   // same rule as Google Calendar (drive.js)
  }));
  try {
    const response = await fetch(`${PUSH_SERVER}/reminders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reminders }),
    });
    if (!response.ok) return false;
    try { localStorage.setItem('serverPushLast', String(Date.now())); } catch { /* not important */ }
    return true;
  } catch {
    return false;  // no Tailscale / server down
  }
}

// Called by db.js after every save or delete
let serverPushTimer = null;
function notesChanged() {
  if (!serverPushOn()) return;
  clearTimeout(serverPushTimer);
  serverPushTimer = setTimeout(sendRemindersToServer, PUSH_WAIT_MS);
}

// ---------- The card on the settings screen ----------

function serverPushCard() {
  const on = serverPushOn();
  const last = lastServerSync();
  const facts = !on ? ''
    : last ? TEXT.pushLastSync(new Date(last).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }))
    : TEXT.pushNeverSynced;
  const buttons = on
    ? `<button type="button" class="small-button wide" data-push="sync">${TEXT.pushSyncNow}</button>
       <button type="button" class="link-button" data-push="off">${TEXT.notifyTurnOff}</button>`
    : `<button type="button" class="primary-button" data-push="on">${TEXT.pushTurnOn}</button>`;
  return `
    <div class="card backup-card">
      <h2 class="card-title">⏰ ${TEXT.pushTitle}</h2>
      <p class="muted">${TEXT.pushExplain}</p>
      ${facts ? `<p class="backup-facts">${facts}</p>` : ''}
      ${buttons}
      <p class="backup-status" id="push-status"></p>
    </div>`;
}

function setupServerPushCard() {
  const status = document.getElementById('push-status');
  document.querySelectorAll('[data-push]').forEach(button => {
    button.addEventListener('click', async () => {
      const action = button.dataset.push;
      if (action === 'off') {
        try { localStorage.removeItem('serverPush'); } catch { /* not important */ }
        showScreen();
        return;
      }
      status.textContent = TEXT.driveWorking;
      if (await sendRemindersToServer()) {
        if (action === 'on') {
          try { localStorage.setItem('serverPush', 'on'); } catch { /* not important */ }
        }
        showScreen();
      } else {
        status.textContent = TEXT.pushNoServer;
      }
    });
  });
}

// When the app opens: make sure the server has the latest list
if (serverPushOn()) sendRemindersToServer();
