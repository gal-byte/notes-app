// ============================================================
// GOOGLE DRIVE
// Saves the backup to ONE file in your Google Drive and replaces
// it every time, instead of making a new copy.
//
// How the permission works:
//   • You sign in with Google once and tap "Allow".
//   • The app may only see files it created itself ("drive.file"),
//     nothing else in your Drive.
//   • Google's permission lasts about an hour. After that, the next
//     tap shows a quick Google window again (one tap).
//
// The Client ID below is not a password: it's public on purpose,
// and Google only accepts it from https://gal-byte.github.io
// ============================================================

const GOOGLE_CLIENT_ID = '890625758034-11qu7ingkpuo4keb6kdu2q164ti50029.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_BACKUP_NAME = 'notes-app-backup.json';

let tokenClient = null;   // Google's sign-in helper
let accessToken = null;   // the "permission ticket" for the next hour
let tokenExpiresAt = 0;
let waitingForToken = null;

// Remembered on this device: did you connect Drive before?
function driveConnected() {
  try { return localStorage.getItem('driveConnected') === 'yes'; } catch { return false; }
}

function setDriveConnected(connected) {
  try {
    if (connected) localStorage.setItem('driveConnected', 'yes');
    else localStorage.removeItem('driveConnected');
  } catch { /* not important */ }
}

// Google's sign-in code is loaded only when needed (needs internet)
let googleScriptPromise = null;
function loadGoogleSignIn() {
  if (window.google && google.accounts && google.accounts.oauth2) return Promise.resolve();
  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        googleScriptPromise = null;  // try again next time
        reject(new Error(TEXT.driveNeedsInternet));
      };
      document.head.append(script);
    });
  }
  return googleScriptPromise;
}

// Get ready ahead of time (when the backup screen opens), because
// the Google window must open straight from a tap – browsers block
// windows that open later.
async function prepareDrive() {
  await loadGoogleSignIn();
  if (tokenClient) return;
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: response => {
      const waiting = waitingForToken;
      waitingForToken = null;
      if (!waiting) return;
      if (response.error || !google.accounts.oauth2.hasGrantedAllScopes(response, DRIVE_SCOPE)) {
        waiting.reject(new Error(TEXT.driveNoPermission));
        return;
      }
      accessToken = response.access_token;
      tokenExpiresAt = Date.now() + (Number(response.expires_in) - 60) * 1000;
      waiting.resolve(accessToken);
    },
    error_callback: error => {
      const waiting = waitingForToken;
      waitingForToken = null;
      if (waiting) waiting.reject(new Error(error.type === 'popup_closed' ? TEXT.driveCancelled : TEXT.driveNoPermission));
    },
  });
}

// Call this first thing when a Drive button is tapped
function getDriveToken() {
  if (accessToken && Date.now() < tokenExpiresAt) return Promise.resolve(accessToken);
  if (!tokenClient) return Promise.reject(new Error(TEXT.driveNotReady));
  return new Promise((resolve, reject) => {
    waitingForToken = { resolve, reject };
    // First time: show the full "Allow" screen. Later: as quick as possible.
    tokenClient.requestAccessToken({ prompt: driveConnected() ? '' : 'consent' });
  });
}

// Talk to Drive with the permission ticket
async function driveFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken}` },
  });
  if (response.status === 401) {
    accessToken = null;  // ticket expired: the next tap gets a new one
    throw new Error(TEXT.driveTryAgain);
  }
  if (!response.ok) throw new Error(TEXT.driveError);
  return response;
}

// Find our backup file (the app can only see files it created)
async function findDriveBackup() {
  const query = encodeURIComponent(`name = '${DRIVE_BACKUP_NAME}' and trashed = false`);
  const response = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=1&fields=files(id,modifiedTime)`);
  const data = await response.json();
  return data.files[0] || null;
}

// Save: replace the file if it exists, otherwise create it
async function saveToDrive(file) {
  const existing = await findDriveBackup();
  if (existing) {
    await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${existing.id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: file,
    });
  } else {
    const form = new FormData();
    form.append('metadata', new Blob(
      [JSON.stringify({ name: DRIVE_BACKUP_NAME, mimeType: 'application/json' })],
      { type: 'application/json' }));
    form.append('file', new Blob([file], { type: 'application/json' }));
    await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      body: form,
    });
  }
}

// Download the backup file from Drive
async function loadFromDrive() {
  const existing = await findDriveBackup();
  if (!existing) throw new Error(TEXT.driveNoBackup);
  const response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${existing.id}?alt=media`);
  return new File([await response.text()], DRIVE_BACKUP_NAME, { type: 'application/json' });
}

function disconnectDrive() {
  if (accessToken && window.google) google.accounts.oauth2.revoke(accessToken, () => {});
  accessToken = null;
  setDriveConnected(false);
}

// ---------- The Drive card on the backup screen ----------

function driveCard() {
  const buttons = driveConnected()
    ? `<button type="button" class="primary-button" data-drive="backup">${TEXT.driveBackup}</button>
       <button type="button" class="small-button wide" data-drive="restore">${TEXT.driveRestore}</button>
       <button type="button" class="link-button" data-drive="disconnect">${TEXT.driveDisconnect}</button>`
    : `<button type="button" class="primary-button" data-drive="connect">${TEXT.driveConnect}</button>`;

  return `
    <div class="card backup-card">
      <h2 class="card-title">☁️ Google Drive</h2>
      <p class="muted">${driveConnected() ? TEXT.driveConnectedText : TEXT.driveExplain}</p>
      ${buttons}
      <p class="backup-status" id="drive-status"></p>
    </div>`;
}

function setupDriveCard() {
  const status = document.getElementById('drive-status');
  prepareDrive().catch(error => { status.textContent = error.message; });

  document.querySelectorAll('[data-drive]').forEach(button => {
    button.addEventListener('click', async () => {
      const action = button.dataset.drive;
      try {
        if (action === 'disconnect') {
          disconnectDrive();
          showScreen();
          return;
        }

        // Ask Google first, straight from the tap
        const tokenReady = getDriveToken();
        status.textContent = TEXT.driveWorking;
        await tokenReady;

        if (action === 'connect') {
          setDriveConnected(true);
          showScreen();
        } else if (action === 'backup') {
          const file = await createBackupFile(true);
          await saveToDrive(file);
          rememberBackup();
          status.textContent = `${TEXT.driveSaved} (${formatSize(file.size)})`;
        } else if (action === 'restore') {
          await restoreBackupFile(await loadFromDrive(), status);
        }
      } catch (error) {
        status.textContent = error.message || TEXT.driveError;
      }
    });
  });
}
