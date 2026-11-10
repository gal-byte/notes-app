// ============================================================
// BACKUP & RESTORE
//
// Backup: puts everything into one file, which drive.js saves to
// your Google Drive (always the same file, replaced each time).
//
// Restore = smart merge, so it works between phone and tablet:
//   • items you don't have yet        → added
//   • items changed on both devices   → the newer version wins
//   • items deleted on the other one  → deleted here too
//   • nothing else is touched
// ============================================================

const BACKUP_FORMAT = 1;

// ---------- Remember when the last backup was ----------
// (kept per device, only used for the "time to back up" reminder)

function lastBackupTime() {
  try { return Number(localStorage.getItem('lastBackup')) || 0; } catch { return 0; }
}

function rememberBackup() {
  try { localStorage.setItem('lastBackup', String(Date.now())); } catch { /* not important */ }
}

function daysSinceBackup() {
  const last = lastBackupTime();
  return last ? Math.floor((Date.now() - last) / 86400000) : null;
}

// ---------- Photos ↔ text ----------
// A backup file is text, so photos are turned into text ("data URL")
// and back again when restoring.

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  return (await fetch(dataUrl)).blob();
}

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ---------- Making a backup ----------

async function createBackupFile(withPhotos) {
  const items = [];
  for (const item of await getAllItems()) {
    const copy = { ...item };
    if (item.photo instanceof Blob) {
      if (withPhotos) copy.photo = await blobToDataUrl(item.photo);
      else delete copy.photo;  // "no photo field" = keep the photo you have when restoring
    }
    items.push(copy);
  }

  const backup = {
    app: 'notes-app',
    format: BACKUP_FORMAT,
    createdAt: Date.now(),
    withPhotos,
    groups: (await getCustomGroups()).map(withoutFlag),
    deleted: await getDeletedRecords(),
    items,
  };

  return new File([JSON.stringify(backup)], DRIVE_BACKUP_NAME, { type: 'application/json' });
}

// ---------- Restoring (smart merge) ----------

async function readBackupFile(file) {
  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    throw new Error(TEXT.notABackup);
  }
  if (!backup || backup.app !== 'notes-app' || !Array.isArray(backup.items)) {
    throw new Error(TEXT.notABackup);
  }
  return backup;
}

// Compare what's here with what's in the backup and decide what to do.
// This only makes a plan – nothing is saved yet.
//   local  = { items, groups, deleted } from this device
//   backup = the file's contents
function planMerge(local, backup) {
  const plan = {
    putItems: [], removeItems: [],
    putGroups: [], removeGroups: [],
    deleted: [],
    counts: { added: 0, updated: 0, removed: 0 },
  };

  const deletedHere = new Map(local.deleted.map(d => [d.id, d.deletedAt]));
  const deletedThere = new Map((backup.deleted || []).map(d => [d.id, d.deletedAt]));

  // The same rules for items and for groups
  function compare(mineList, theirsList, put, remove, count) {
    const mine = new Map(mineList.map(x => [x.id, x]));

    for (const theirs of theirsList) {
      const here = mine.get(theirs.id);
      if (!here) {
        // Don't bring back something deleted here after it was last changed there
        const deletedAt = deletedHere.get(theirs.id);
        if (deletedAt && deletedAt >= (theirs.updatedAt || 0)) continue;
        put.push(theirs);
        if (count) plan.counts.added++;
      } else if ((theirs.updatedAt || 0) > (here.updatedAt || 0)) {
        const newer = { ...theirs };
        // A text-only backup has no photo field: keep the photo from here
        if (!('photo' in theirs) && here.photo) newer.photo = here.photo;
        put.push(newer);
        if (count) plan.counts.updated++;
      }
    }

    // Deleted there, and not changed here since → delete here too
    for (const [id, deletedAt] of deletedThere) {
      const here = mine.get(id);
      if (here && deletedAt >= (here.updatedAt || 0)) {
        remove.push(id);
        if (count) plan.counts.removed++;
      }
    }
  }

  compare(local.items, backup.items, plan.putItems, plan.removeItems, true);
  compare(local.groups, backup.groups || [], plan.putGroups, plan.removeGroups, false);

  // Keep both lists of deletions (the later date when both have one)
  const allDeleted = new Map(deletedHere);
  for (const [id, deletedAt] of deletedThere) {
    if (!allDeleted.has(id) || deletedAt > allDeleted.get(id)) allDeleted.set(id, deletedAt);
  }
  plan.deleted = [...allDeleted].map(([id, deletedAt]) => ({ id, deletedAt }));

  plan.changes = plan.putItems.length + plan.removeItems.length + plan.putGroups.length + plan.removeGroups.length;
  return plan;
}

// Carry out the plan
async function applyMerge(plan) {
  for (const group of plan.putGroups) await saveCustomGroup(group);

  for (const item of plan.putItems) {
    const copy = { ...item };
    if (typeof copy.photo === 'string') copy.photo = await dataUrlToBlob(copy.photo);
    await putItem(copy);
  }

  for (const id of plan.removeItems) await removeItemRecord(id);

  // A group deleted on the other device: its items here move to לא ממוין
  for (const id of plan.removeGroups) {
    for (const item of await getItemsInGroup(id)) await updateItem(item.id, { group: 'inbox' });
    await removeGroupRecord(id);
  }

  for (const record of plan.deleted) await rememberDeleted(record.id, record.deletedAt);
  await loadGroups();
}

// ---------- The backup screen ----------

async function backupScreen() {
  const items = await getAllItems();
  const photos = items.filter(item => item.photo instanceof Blob).length;
  const days = daysSinceBackup();
  const lastText = days === null ? TEXT.neverBackedUp
                 : days === 0 ? TEXT.backedUpToday
                 : TEXT.lastBackupDaysAgo(days);

  const persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;

  return `
    ${driveCard()}
    ${await notificationsCard()}
    <p class="backup-facts center">${TEXT.backupCounts(items.length, photos)} · ${lastText}</p>
    <p class="muted center">${persisted ? TEXT.storageProtected : TEXT.storageNotProtected}</p>
  `;
}

function setupBackupScreen() {
  setupDriveCard();
  setupNotificationsCard();
}

// ---------- Daily summary switch (see daily.js) ----------

function dailySummaryOn() {
  try { return localStorage.getItem('dailySummary') === 'on'; } catch { return false; }
}

function notificationsSupported() {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
}

// Ask Android to wake the app about once a day in the background.
// Returns true if it agreed. (Usually only for an installed app.)
async function turnOnBackgroundCheck() {
  const registration = await navigator.serviceWorker.ready;
  if (!('periodicSync' in registration)) return false;
  try {
    const permission = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (permission.state !== 'granted') return false;
    await registration.periodicSync.register('daily-summary', { minInterval: 12 * 60 * 60 * 1000 });
    return true;
  } catch {
    return false;
  }
}

async function notificationsCard() {
  if (!notificationsSupported()) {
    return `<div class="card backup-card"><h2 class="card-title">🔔 ${TEXT.notifyTitle}</h2>
            <p class="muted">${TEXT.notifyUnsupported}</p></div>`;
  }
  const on = dailySummaryOn() && Notification.permission === 'granted';
  const background = on && await turnOnBackgroundCheck();

  const buttons = on
    ? `<button type="button" class="small-button wide" data-notify="test">${TEXT.notifyTest}</button>
       <button type="button" class="link-button" data-notify="off">${TEXT.notifyTurnOff}</button>`
    : `<button type="button" class="primary-button" data-notify="on">${TEXT.notifyTurnOn}</button>`;

  return `
    <div class="card backup-card">
      <h2 class="card-title">🔔 ${TEXT.notifyTitle}</h2>
      <p class="muted">${TEXT.notifyExplain}</p>
      ${on ? `<p class="backup-facts">${background ? TEXT.notifyOn : TEXT.notifyOnOpenOnly}</p>` : ''}
      ${buttons}
      <p class="backup-status" id="notify-status"></p>
    </div>`;
}

function setupNotificationsCard() {
  const status = document.getElementById('notify-status');
  document.querySelectorAll('[data-notify]').forEach(button => {
    button.addEventListener('click', async () => {
      const action = button.dataset.notify;

      if (action === 'on') {
        const permission = await Notification.requestPermission();  // Android's "Allow notifications?"
        if (permission !== 'granted') {
          status.textContent = TEXT.notifyBlocked;
          return;
        }
        try { localStorage.setItem('dailySummary', 'on'); } catch { /* not important */ }
        showScreen();
      }

      if (action === 'off') {
        try { localStorage.removeItem('dailySummary'); } catch { /* not important */ }
        const registration = await navigator.serviceWorker.ready;
        if ('periodicSync' in registration) await registration.periodicSync.unregister('daily-summary');
        showScreen();
      }

      if (action === 'test') {
        const result = await showDailySummary(await navigator.serviceWorker.ready, { force: true });
        status.textContent = result === 'shown' ? TEXT.notifyTestSent : TEXT.notifyBlocked;
      }
    });
  });
}

// When the app opens: show today's summary if it wasn't shown yet
async function checkDailySummaryOnOpen() {
  if (!notificationsSupported() || !dailySummaryOn()) return;
  showDailySummary(await navigator.serviceWorker.ready);
}

// Used by "restore from Drive": show what will change → confirm → merge
async function restoreBackupFile(file, status) {
  try {
    const backup = await readBackupFile(file);
    const local = {
      items: await getAllItems(),
      groups: (await getCustomGroups()).map(withoutFlag),
      deleted: await getDeletedRecords(),
    };
    const plan = planMerge(local, backup);
    if (plan.changes === 0) {
      status.textContent = TEXT.restoreNothing;
      return;
    }
    if (!confirm(TEXT.restoreConfirm(plan.counts))) {
      status.textContent = '';
      return;
    }
    status.textContent = TEXT.restoreWorking;
    await applyMerge(plan);
    status.textContent = TEXT.restoreDone(plan.counts);
  } catch (error) {
    status.textContent = error.message || TEXT.notABackup;
  }
}

// ---------- Reminder on Home ----------
// Shows when you have a few items and haven't backed up for 14 days

function backupReminder(itemCount) {
  const days = daysSinceBackup();
  if (itemCount < 5 || (days !== null && days < 14)) return '';
  const text = days === null ? TEXT.neverBackedUp : TEXT.lastBackupDaysAgo(days);
  return `
    <a class="card backup-reminder" href="#/settings">
      <span class="emoji">💾</span>
      <span>${text}<br><strong>${TEXT.backupNow}</strong></span>
    </a>`;
}
