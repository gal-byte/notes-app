// ============================================================
// NOTIFICATIONS FROM THE HOME SERVER
// The server sends reminders as this app's own notifications
// (Web Push): its name and icon, with "remind me in an hour".
// They arrive even when the app is closed and Tailscale is off.
//   • birthdays → the day before, at 10:00
//   • reminders with a time → 2 hours before
//   • reminders without a time → the evening before, at 20:00
//   • with a place → also "when to leave" (from the bus app)
// The server reads the reminders from the synced notes (sync.js).
// sw.js shows them when they arrive.
// ============================================================

function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';
}

function pushOn() {
  try { return localStorage.getItem('pushOn') === 'yes'; } catch { return false; }
}

// The server's key comes as base64url text; the browser wants bytes
function keyBytes(base64url) {
  const base64 = (base64url + '='.repeat((4 - base64url.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

async function postToServer(path, body) {
  const response = await fetch(`${SERVER}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

// Subscribe this device and tell the server. Throws a message to show.
async function turnOnPush() {
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error(TEXT.notifyBlocked);
  let key;
  try {
    key = (await (await fetch(`${SERVER}/push/key`)).json()).key;
  } catch {
    throw new Error(TEXT.syncNoServer);
  }
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) });
  }
  await postToServer('/push/subscribe', { subscription: subscription.toJSON(), device: deviceName() });
  try { localStorage.setItem('pushOn', 'yes'); } catch { /* not important */ }
}

async function turnOffPush() {
  try { localStorage.removeItem('pushOn'); } catch { /* not important */ }
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  postToServer('/push/unsubscribe', { endpoint: subscription.endpoint }).catch(() => {});
  await subscription.unsubscribe();
}

// "Android · Chrome", so the server's list says which device is which
function deviceName() {
  const ua = navigator.userAgent;
  const model = (ua.match(/Android [\d.]+; ([^;)]+)/) || [])[1];
  return model ? `Android · ${model}` : ua.includes('Windows') ? 'Windows' : 'Browser';
}

// When the app opens: make sure the server still has this device
// (quietly; it may have been lost or changed by the browser)
async function refreshPushSubscription() {
  if (!pushSupported() || !pushOn() || Notification.permission !== 'granted') return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) await postToServer('/push/subscribe', { subscription: subscription.toJSON(), device: deviceName() });
    else await turnOnPush();
  } catch { /* offline: next time */ }
}
refreshPushSubscription();

// ---------- The card on the settings screen ----------

function pushCard() {
  if (!pushSupported()) {
    return `<div class="card backup-card"><h2 class="card-title">${icon('bell')} ${TEXT.pushTitle}</h2>
            <p class="muted">${TEXT.notifyUnsupported}</p></div>`;
  }
  const on = pushOn() && Notification.permission === 'granted';
  const buttons = on
    ? `<button type="button" class="small-button wide" data-push="test">${TEXT.notifyTest}</button>
       <button type="button" class="link-button" data-push="off">${TEXT.notifyTurnOff}</button>`
    : `<button type="button" class="primary-button" data-push="on">${TEXT.pushTurnOn}</button>`;
  return `
    <div class="card backup-card">
      <h2 class="card-title">${icon('bell')} ${TEXT.pushTitle}</h2>
      <p class="muted">${TEXT.pushExplain}</p>
      ${on ? `<p class="backup-facts">${icon('check', 'inline')} ${TEXT.pushIsOn}</p>` : ''}
      ${buttons}
      <p class="backup-status" id="push-status"></p>
    </div>`;
}

function setupPushCard() {
  const status = document.getElementById('push-status');
  document.querySelectorAll('[data-push]').forEach(button => {
    button.addEventListener('click', async () => {
      const action = button.dataset.push;
      status.textContent = TEXT.driveWorking;
      try {
        if (action === 'on') { await turnOnPush(); showScreen(true); }
        if (action === 'off') { await turnOffPush(); showScreen(true); }
        if (action === 'test') {
          const result = await postToServer('/push/test', {});
          status.textContent = result.ok ? TEXT.notifyTestSent : TEXT.syncNoServer;
        }
      } catch (error) {
        status.textContent = error.message || TEXT.syncNoServer;
      }
    });
  });
}
