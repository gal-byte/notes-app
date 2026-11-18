// ============================================================
// JOURNAL PHOTOS (files on the home server)
// Journal photos are not kept inside the note like other photos.
// The note only holds their ids; the photos themselves are files
// on the home server (see journal.py in ~/notify):
//   - a new photo is saved on this device first ("photos" store in
//     db.js), then uploaded with the next sync — so a photo taken
//     with no connection waits here and goes up later
//   - another device fetches a photo when it first shows it, and
//     keeps a copy
// Each photo comes in two sizes: full (~1600 px) and thumb (~400 px).
// ============================================================

const PHOTO_FULL_SIDE = 1600;
const PHOTO_THUMB_SIDE = 400;

async function getPhotoRecord(id) {
  return runInStore('photos', 'readonly', store => store.get(id));
}

async function putPhotoRecord(record) {
  return runInStore('photos', 'readwrite', store => store.put(record));
}

// A photo from the phone → saved here, waiting to upload. Returns its id.
async function addJournalPhoto(file) {
  const full = await shrinkPhoto(file, PHOTO_FULL_SIDE);
  const thumb = await shrinkPhoto(full, PHOTO_THUMB_SIDE);
  const id = crypto.randomUUID();
  await putPhotoRecord({ id, full, thumb, uploaded: false, at: Date.now() });
  uploadPendingPhotos();
  return id;
}

// The photo itself (thumb = the small one). Here first, then the server.
const photoFetches = new Map();
async function journalPhotoBlob(id, thumb = true) {
  const record = await getPhotoRecord(id).catch(() => null);
  const here = record && (thumb ? record.thumb || record.full : record.full);
  if (here) return here;

  const key = `${id}|${thumb}`;
  if (!photoFetches.has(key)) {
    photoFetches.set(key, (async () => {
      try {
        const response = await fetch(`${SERVER}/photo/${id}${thumb ? '?thumb' : ''}`);
        if (!response.ok) return null;
        const blob = await response.blob();
        const latest = (await getPhotoRecord(id)) || { id, uploaded: true, at: Date.now() };
        latest[thumb ? 'thumb' : 'full'] = blob;
        await putPhotoRecord(latest);
        return blob;
      } catch {
        return null;   // offline: try again next time
      } finally {
        photoFetches.delete(key);
      }
    })());
  }
  return photoFetches.get(key);
}

// Fill every <img data-photo-id="…"> inside root (lists, the entry screen)
function fillJournalPhotos(root) {
  root.querySelectorAll('img[data-photo-id]').forEach(async img => {
    const blob = await journalPhotoBlob(img.dataset.photoId, img.dataset.size !== 'full');
    if (blob && img.isConnected) {
      img.src = photoUrl(blob);
      img.classList.add('loaded');
    }
  });
}

// Upload what's waiting. Called by sync.js before every sync.
let uploading = null;
function uploadPendingPhotos() {
  if (!uploading) {
    uploading = (async () => {
      let waiting;
      try {
        waiting = (await runInStore('photos', 'readonly', store => store.getAll())).filter(r => !r.uploaded);
      } catch {
        return;   // an older db.js still open during an update: no photos store yet
      }
      for (const record of waiting) {
        try {
          for (const [size, blob] of [['thumb', record.thumb], ['full', record.full]]) {
            if (!blob) continue;
            const response = await fetch(`${SERVER}/photo?id=${record.id}&size=${size}`, {
              method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob,
            });
            if (!response.ok) throw new Error(String(response.status));
          }
          await putPhotoRecord({ ...record, uploaded: true });
        } catch {
          return;   // no connection: the rest waits for the next sync
        }
      }
    })().finally(() => { uploading = null; });
  }
  return uploading;
}
