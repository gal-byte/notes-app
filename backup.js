// ============================================================
// MERGING NOTES FROM ANOTHER DEVICE
// sync.js uses these rules when notes come from the server:
//   - items you don't have yet        -> added
//   - items changed on both devices   -> the newer version wins
//   - items deleted on the other one  -> deleted here too
//   - nothing else is touched
// Also here: photos <-> text (for sending), and the morning summary switch.
// ============================================================

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

// ---------- The merge ----------

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

// When the app opens: show today's summary if it wasn't shown yet
async function checkDailySummaryOnOpen() {
  if (!notificationsSupported() || !dailySummaryOn()) return;
  showDailySummary(await navigator.serviceWorker.ready);
}
