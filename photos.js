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
  const here = record && (thumb ? record.thumb || (record.kind === 'video' ? null : record.full) : record.full);
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

// ---------- The day's video (one per entry, up to a minute) ----------
// Phone videos are big (about 100 MB a minute), so the app plays the
// video once into a smaller copy: about 720p at ~2 Mbit/s (~15 MB a
// minute). That takes as long as the video, so you stay on the screen.
// Its still picture is saved like a photo's thumb, with the same id,
// so lists, the calendar and the morning memory can show it.
// After uploading, the phone keeps only the still picture; the video
// plays from the home server.

const VIDEO_MAX_SECONDS = 60;
const VIDEO_SIDE = 1280;

function waitFor(target, okEvent, failEvent = 'error', ms = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${okEvent}`)), ms);
    target.addEventListener(okEvent, event => { clearTimeout(timer); resolve(event); }, { once: true });
    target.addEventListener(failEvent, () => { clearTimeout(timer); reject(new Error(failEvent)); }, { once: true });
  });
}

// file → { full, thumb, seconds }. onProgress(0..1) while it works.
async function shrinkVideo(file, onProgress = () => {}) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.playsInline = true;
  video.preload = 'auto';
  // On the page (invisible): some phones don't load a video that isn't
  video.style.cssText = 'position:fixed;top:0;left:0;width:2px;height:2px;opacity:0;pointer-events:none';
  document.body.append(video);
  video.src = url;
  let audio = null;
  try {
    await waitFor(video, 'loadeddata');
    const seconds = Math.min(video.duration || VIDEO_MAX_SECONDS, VIDEO_MAX_SECONDS);
    const scale = Math.min(1, VIDEO_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale / 2) * 2;
    canvas.height = Math.round(video.videoHeight * scale / 2) * 2;
    const ctx = canvas.getContext('2d');

    // The still picture, from a moment in
    video.currentTime = Math.min(0.5, seconds / 2);
    await waitFor(video, 'seeked');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const still = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.85));
    const thumb = await shrinkPhoto(still, PHOTO_THUMB_SIDE);
    video.currentTime = 0;
    await waitFor(video, 'seeked');

    // Picture from the canvas, sound straight from the video (not to the speaker)
    const stream = canvas.captureStream(30);
    try {
      audio = new AudioContext();
      const source = audio.createMediaElementSource(video);
      const out = audio.createMediaStreamDestination();
      source.connect(out);
      out.stream.getAudioTracks().forEach(track => stream.addTrack(track));
      await audio.resume();
    } catch { /* no sound then */ }

    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      .find(type => MediaRecorder.isTypeSupported(type));
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_000_000, audioBitsPerSecond: 64_000 });
    const chunks = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    const stopped = waitFor(recorder, 'stop');

    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.pause();
      if (recorder.state !== 'inactive') recorder.stop();
    };
    const draw = () => {
      if (done) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      onProgress(Math.min(1, video.currentTime / seconds));
      if (video.currentTime >= seconds) return finish();   // only the first minute
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(draw);
      else requestAnimationFrame(draw);
    };
    video.addEventListener('ended', finish, { once: true });
    recorder.start(1000);
    try {
      await video.play();
    } catch {
      video.muted = true;      // the phone won't play it with sound: a silent copy then
      await video.play();
    }
    draw();
    await stopped;
    const full = new Blob(chunks, { type: 'video/webm' });
    if (!full.size) throw new Error('empty');
    return { full, thumb, seconds: Math.round(seconds) };
  } finally {
    video.removeAttribute('src');
    video.load();
    video.remove();
    URL.revokeObjectURL(url);
    audio?.close().catch(() => {});
  }
}

async function addJournalVideo(file, onProgress) {
  let made;
  try {
    made = await shrinkVideo(file, onProgress);
  } catch (error) {
    // Couldn't make it smaller on this phone: keep the original if it's small enough
    if (file.size > 60_000_000 || !['video/mp4', 'video/webm'].includes(file.type)) throw error;
    made = { full: file, thumb: null, seconds: 0 };
  }
  const { full, thumb, seconds } = made;
  const id = crypto.randomUUID();
  await putPhotoRecord({ id, kind: 'video', full, thumb, seconds, uploaded: false, at: Date.now() });
  uploadPendingPhotos();
  return id;
}

// Where the player gets the video: this device until it's uploaded, then the server
async function journalVideoSrc(id) {
  const record = await getPhotoRecord(id).catch(() => null);
  if (record?.full) return photoUrl(record.full);
  return `${SERVER}/video/${id}`;
}

// Fill every <video data-video-id="…"> inside root
function fillJournalVideos(root) {
  root.querySelectorAll('video[data-video-id]').forEach(async player => {
    const id = player.dataset.videoId;
    const [poster, src] = await Promise.all([journalPhotoBlob(id, true), journalVideoSrc(id)]);
    if (!player.isConnected) return;
    if (poster) player.poster = photoUrl(poster);
    player.src = src;
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
          const isVideo = record.kind === 'video';
          const parts = isVideo ? [['thumb', record.thumb]] : [['thumb', record.thumb], ['full', record.full]];
          for (const [size, blob] of parts) {
            if (!blob) continue;
            const response = await fetch(`${SERVER}/photo?id=${record.id}&size=${size}`, {
              method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob,
            });
            if (!response.ok) throw new Error(String(response.status));
          }
          if (isVideo && record.full) {
            const response = await fetch(`${SERVER}/video?id=${record.id}`, {
              method: 'POST', headers: { 'Content-Type': record.full.type === 'video/mp4' ? 'video/mp4' : 'video/webm' }, body: record.full,
            });
            if (!response.ok) throw new Error(String(response.status));
          }
          // A video stays on the server only, to keep the phone's space
          await putPhotoRecord({ ...record, uploaded: true, ...(isVideo ? { full: null } : {}) });
        } catch {
          return;   // no connection: the rest waits for the next sync
        }
      }
    })().finally(() => { uploading = null; });
  }
  return uploading;
}
