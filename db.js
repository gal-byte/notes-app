// ============================================================
// DATABASE
// Saves everything on the phone using IndexedDB — a database
// built into every browser. No server, no internet needed.
//
// It has two "stores" (think: two tables):
//   items  → every reminder, song, movie, recipe, note
//   groups → groups you create yourself (used in Step 6)
//
// Every item looks like this:
//   { id, group, title, createdAt, updatedAt, ...other fields }
// "group" says where it belongs, e.g. 'songs' or 'movies'.
// ============================================================

const DB_NAME = 'notes-app';
const DB_VERSION = 1;  // raise this when the structure changes

let databasePromise = null;

// Open the database (only once — later calls reuse it)
function openDatabase() {
  if (databasePromise) return databasePromise;

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Runs only the first time (or when DB_VERSION goes up):
    // this is where the stores are created
    request.onupgradeneeded = () => {
      const db = request.result;
      const items = db.createObjectStore('items', { keyPath: 'id' });
      items.createIndex('group', 'group');  // lets us quickly find "all songs"
      db.createObjectStore('groups', { keyPath: 'id' });
    };

    request.onsuccess = () => resolve(request.result);
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
    transaction.oncomplete = () => resolve(request.result);
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

async function deleteItem(id) {
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

// ---------- Keep the data safe ----------

// Ask the browser to never delete our data when the phone is
// low on space. Chrome usually agrees quietly for apps you use.
async function askForPersistentStorage() {
  if (navigator.storage && navigator.storage.persist) {
    return navigator.storage.persist();
  }
  return false;
}
