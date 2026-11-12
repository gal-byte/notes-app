// ============================================================
// SETTINGS
// Plain rows with switches: sync, notifications, the morning
// summary, and the Google Drive backup. A short status line
// appears under a row only when there's something to say.
// (The work itself is in sync.js, push.js, backup.js, drive.js.)
// ============================================================

function settingRow({ id, iconName, title, sub = '', end = '' }) {
  return `
    <div class="row setting" id="${id}">
      <span class="badge small plain">${icon(iconName)}</span>
      <span class="row-main"><span class="row-title">${title}</span>
        <span class="row-sub" data-status>${sub}</span></span>
      ${end}
    </div>`;
}

function switchHtml(name, on, disabled = false) {
  return `<input type="checkbox" class="switch" role="switch" data-switch="${name}" ${on ? 'checked' : ''} ${disabled ? 'disabled' : ''}>`;
}

function actionRow(name, iconName, title, sub = '') {
  return `
    <button type="button" class="row setting" data-action="${name}">
      <span class="badge small plain">${icon(iconName)}</span>
      <span class="row-main"><span class="row-title">${title}</span>
        <span class="row-sub" data-status>${sub}</span></span>
    </button>`;
}

async function settingsScreen() {
  const items = await getAllItems();
  const photos = items.filter(item => item.photo instanceof Blob).length;
  const last = syncSetting('syncLast');

  const pushAvailable = pushSupported();
  const pushIsOn = pushAvailable && pushOn() && Notification.permission === 'granted';
  const summaryIsOn = notificationsSupported() && dailySummaryOn() && Notification.permission === 'granted';

  const days = daysSinceBackup();
  const backupText = days === null ? TEXT.neverBackedUp : days === 0 ? TEXT.backedUpToday : TEXT.lastBackupDaysAgo(days);

  const general = [
    settingRow({ id: 'set-sync', iconName: 'sync', title: TEXT.syncTitle,
      sub: syncOn() ? (last ? TEXT.syncLast(timeAgo(last)) : TEXT.syncNever) : '',
      end: switchHtml('sync', syncOn()) }),
    settingRow({ id: 'set-push', iconName: 'bell', title: TEXT.pushTitle,
      sub: pushAvailable ? '' : TEXT.notifyUnsupported, end: switchHtml('push', pushIsOn, !pushAvailable) }),
    settingRow({ id: 'set-summary', iconName: 'sparkle', title: TEXT.notifyTitle,
      sub: notificationsSupported() ? '' : TEXT.notifyUnsupported, end: switchHtml('summary', summaryIsOn, !notificationsSupported()) }),
  ];
  if (pushIsOn) general.push(actionRow('push-test', 'phone', TEXT.notifyTest));

  const drive = driveConnected()
    ? [actionRow('backup', 'cloud', TEXT.driveBackup, backupText),
       actionRow('restore', 'download', TEXT.driveRestore),
       actionRow('disconnect', 'x', TEXT.driveDisconnect)]
    : [actionRow('connect', 'cloud', TEXT.driveConnect, backupText)];

  return `
    ${rowList(general)}
    ${sectionLabel(TEXT.backup)}
    ${rowList(drive)}
    <p class="footnote">${TEXT.backupCounts(items.length, photos)}</p>
  `;
}

function setupSettings() {
  const statusOf = element => element.closest('.setting').querySelector('[data-status]');
  prepareDrive().catch(() => { /* shown when tapped */ });

  document.querySelectorAll('[data-switch]').forEach(box => {
    box.addEventListener('change', async () => {
      const status = statusOf(box);
      const on = box.checked;
      try {
        if (box.dataset.switch === 'sync') {
          try { on ? localStorage.removeItem('syncOff') : localStorage.setItem('syncOff', 'yes'); } catch { /* not important */ }
          if (on) {
            status.textContent = TEXT.driveWorking;
            status.textContent = (await syncNow()) === 'ok' ? TEXT.syncLast(TEXT.justNow) : TEXT.syncNoServer;
          } else {
            status.textContent = '';
          }
        }
        if (box.dataset.switch === 'push') {
          status.textContent = on ? TEXT.driveWorking : '';
          if (on) await turnOnPush(); else await turnOffPush();
          status.textContent = '';
        }
        if (box.dataset.switch === 'summary') {
          if (on) {
            if (await Notification.requestPermission() !== 'granted') throw new Error(TEXT.notifyBlocked);
            try { localStorage.setItem('dailySummary', 'on'); } catch { /* not important */ }
            turnOnBackgroundCheck();
          } else {
            try { localStorage.removeItem('dailySummary'); } catch { /* not important */ }
            const registration = await navigator.serviceWorker.ready;
            if ('periodicSync' in registration) await registration.periodicSync.unregister('daily-summary');
          }
        }
        haptic();
        if (box.dataset.switch === 'push') showScreen(true);
      } catch (error) {
        box.checked = !on;
        status.textContent = error.message || TEXT.syncNoServer;
      }
    });
  });

  document.querySelectorAll('[data-action]').forEach(button => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      const status = statusOf(button);
      try {
        if (action === 'push-test') {
          status.textContent = TEXT.driveWorking;
          const result = await postToServer('/push/test', {});
          status.textContent = result.ok ? TEXT.notifyTestSent : TEXT.syncNoServer;
          return;
        }
        if (action === 'disconnect') {
          disconnectDrive();
          showScreen(true);
          return;
        }
        // Ask Google first, straight from the tap
        const tokenReady = getDriveToken();
        status.textContent = TEXT.driveWorking;
        await tokenReady;
        if (action === 'connect') {
          setDriveConnected(true);
          showScreen(true);
        } else if (action === 'backup') {
          const file = await createBackupFile(true);
          await saveToDrive(file);
          rememberBackup();
          status.textContent = `${TEXT.driveSaved} · ${formatSize(file.size)}`;
        } else if (action === 'restore') {
          await restoreBackupFile(await loadFromDrive(), status);
        }
      } catch (error) {
        status.textContent = error.message || TEXT.driveError;
      }
    });
  });
}
