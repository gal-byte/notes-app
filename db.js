// ============================================================
// DATABASE
// Saves everything on the phone using IndexedDB — a database
// built into every browser. No server, no internet needed.
//
// It has three "stores" (think: three tables):
//   items   → every reminder, song, movie, recipe, note
//   groups  → groups you create yourself
//   deleted → a note of what you deleted and when, so that a
//             backup restored on another device (tablet) deletes
//             it there too, instead of bringing it back
//
// Every item looks like this:
//   { id, group, title, createdAt, updatedAt, ...other fields }
// "group" says where it belongs, e.g. 'songs' or 'movies'.
// ============================================================

const DB_NAME = 'notes-app';
const DB_VERSION = 2;  // raise this when the structure changes

let databasePromise = null;

// Open the database (only once — later calls reuse it)
function openDatabase() {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Runs only the first time, or when DB_VERSION goes up.
    // oldVersion says what this phone already has, so we only add
    // what's missing (and never touch the data already there).
    request.onupgradeneeded = event => {
      const db = request.result;
      if (event.oldVersion < 1) {
        const items = db.createObjectStore('items', { keyPath: 'id' });
        items.createIndex('group', 'group');  // lets us quickly find "all songs"
        db.createObjectStore('groups', { keyPath: 'id' });
      }
      if (event.oldVersion < 2) {
        db.createObjectStore('deleted', { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // If a newer version of the app opens in another tab, step aside
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });

  return databasePromise;
}

// Small helper: run one action on a store and wait until it's
// fully saved. All the functions below use it.
async function runInStore(storeName, mode, action) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    transaction.oncomplete = () => {
      // Something changed in your notes: let the home server know (see serverpush.js)
      if (storeName === 'items' && mode === 'readwrite' && typeof notesChanged === 'function') notesChanged();
      resolve(request.result);
    };
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

// ---------- Items ----------

// Save a new item. Example: addItem('movies', { title: 'Dune' })
async function addItem(group, fields) {
  const now = Date.now();
  const item = {
    ...fields,
    id: crypto.randomUUID(),  // a unique id like "3f2a…"
    group,
    createdAt: now,
    updatedAt: now,
  };
  await runInStore('items', 'readwrite', store => store.add(item));
  return item;
}

// Change some fields of an existing item.
// Example: updateItem(id, { rating: 5 })
async function updateItem(id, changes) {
  const item = await getItem(id);
  if (!item) return null;
  const updated = { ...item, ...changes, id, updatedAt: Date.now() };
  await runInStore('items', 'readwrite', store => store.put(updated));
  return updated;
}

// Delete an item, and write down that it was deleted (see "deleted" above)
async function deleteItem(id) {
  await runInStore('items', 'readwrite', store => store.delete(id));
  await rememberDeleted(id);
}

// Save an item exactly as given (used when restoring a backup)
async function putItem(item) {
  await runInStore('items', 'readwrite', store => store.put(item));
}

// Delete without writing it down (used when restoring a backup,
// which brings its own list of deletions)
async function removeItemRecord(id) {
  await runInStore('items', 'readwrite', store => store.delete(id));
}

async function getItem(id) {
  return runInStore('items', 'readonly', store => store.get(id));
}

async function getAllItems() {
  return runInStore('items', 'readonly', store => store.getAll());
}

// All items in one group, most recently changed first
async function getItemsInGroup(group) {
  const items = await runInStore('items', 'readonly',
    store => store.index('group').getAll(group));
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

// The newest items from all groups (for the home screen)
async function getRecentItems(limit) {
  const items = await getAllItems();
  return items.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
}

// How many items each group has, e.g. { songs: 3, movies: 7 }
async function countItemsPerGroup() {
  const counts = {};
  for (const item of await getAllItems()) {
    counts[item.group] = (counts[item.group] || 0) + 1;
  }
  return counts;
}

// ---------- Your own groups ----------
// Each one looks like: { id, name, emoji, shortcut, order, updatedAt }

async function getCustomGroups() {
  const groups = await runInStore('groups', 'readonly', store => store.getAll());
  return groups.sort((a, b) => a.order - b.order);
}

// Add a new group or save changes to one (same id = replace)
async function saveCustomGroup(group) {
  await runInStore('groups', 'readwrite', store => store.put(group));
}

async function deleteCustomGroup(id) {
  await runInStore('groups', 'readwrite', store => store.delete(id));
  await rememberDeleted(id);
}

async function removeGroupRecord(id) {
  await runInStore('groups', 'readwrite', store => store.delete(id));
}

// ---------- What was deleted ----------
// Each one looks like: { id, deletedAt }

async function rememberDeleted(id, deletedAt = Date.now()) {
  await runInStore('deleted', 'readwrite', store => store.put({ id, deletedAt }));
}

async function getDeletedRecords() {
  return runInStore('deleted', 'readonly', store => store.getAll());
}

// ---------- Keep the data safe ----------

// Ask the browser to never delete our data when the phone is
// low on space. Chrome usually agrees quietly for apps you use.
async function askForPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    return navigator.storage.persist();
  }
  return false;
}
