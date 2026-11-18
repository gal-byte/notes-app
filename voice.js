// ============================================================
// VOICE MEMOS
// Any note can hold short recordings (up to 3 minutes each).
// They are saved inside the note like its photo, so they sync to
// your other devices and go into backups.
//
// Each one is { blob, seconds, at } in the note's "voices" list.
// Recorded small (24 kbit/s, Opus): about 180 KB a minute.
// ============================================================

const VOICE_MAX_SECONDS = 180;
const VOICE_WORDS = {
  record: 'הקלטה',
  stop: 'עצירה',
  play: 'ניגון',
  pause: 'הפסקה',
  remove: 'מחיקת ההקלטה',
  confirmRemove: 'למחוק את ההקלטה?',
  noMic: 'אין גישה למיקרופון',
  unsupported: 'הקלטה לא נתמכת בדפדפן הזה',
};

// 75 → "1:15"
function voiceClock(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function voiceFieldHtml(voices) {
  return `<div class="voice-field" id="voice-field">${voiceInnerHtml(voices || [])}</div>`;
}

function voiceInnerHtml(voices, recordingSeconds = null) {
  const rows = voices.map((voice, index) => `
    <div class="voice-row" data-voice="${index}">
      <button type="button" class="voice-play" aria-label="${VOICE_WORDS.play}">${icon('play')}</button>
      <span class="voice-bar"><i></i></span>
      <span class="voice-time">${voiceClock(voice.seconds)}</span>
      <button type="button" class="voice-remove" aria-label="${VOICE_WORDS.remove}">${icon('x')}</button>
    </div>`).join('');

  const control = recordingSeconds === null
    ? `<button type="button" class="prop prop-link voice-record">${icon('mic')}<span class="prop-name">${VOICE_WORDS.record}</span></button>`
    : `<div class="prop voice-recording">
         <span class="rec-dot"></span>
         <span class="voice-time">${voiceClock(recordingSeconds)} / ${voiceClock(VOICE_MAX_SECONDS)}</span>
         <button type="button" class="voice-stop">${icon('stop')} ${VOICE_WORDS.stop}</button>
       </div>`;
  return rows + control;
}

// Hooks up the voice part of the item screen.
//   getVoices() / setVoices(list) read and change the note's list
// Returns finish(): stops a recording that's still going and waits
// until it's saved into the note (used before leaving the screen).
function setupVoiceField(form, getVoices, setVoices) {
  const box = form.querySelector('#voice-field');
  if (!box) return async () => {};

  let recorder = null;
  let stream = null;
  let chunks = [];
  let startedAt = 0;
  let tick = null;
  let done = null;          // resolves when the last recording is saved
  let player = null;        // { audio, index }

  function redraw() {
    box.innerHTML = voiceInnerHtml(getVoices(), recorder ? (Date.now() - startedAt) / 1000 : null);
  }

  function stopPlayer() {
    if (!player) return;
    player.audio.pause();
    player = null;
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      alert(VOICE_WORDS.unsupported);
      return;
    }
    stopPlayer();
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      alert(VOICE_WORDS.noMic);
      return;
    }
    const type = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(t => MediaRecorder.isTypeSupported(t));
    recorder = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 24000 });
    chunks = [];
    startedAt = Date.now();
    done = new Promise(resolve => {
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = () => {
        const seconds = Math.min(VOICE_MAX_SECONDS, (Date.now() - startedAt) / 1000);
        stream.getTracks().forEach(track => track.stop());
        clearInterval(tick);
        recorder = null;
        if (chunks.length && seconds >= 0.5) {
          const blob = new Blob(chunks, { type: chunks[0].type || type || 'audio/webm' });
          setVoices([...getVoices(), { blob, seconds: Math.round(seconds * 10) / 10, at: Date.now() }]);
        }
        redraw();
        resolve();
      };
    });
    recorder.start(1000);
    haptic(10);
    tick = setInterval(() => {
      if (!recorder) return;
      if ((Date.now() - startedAt) / 1000 >= VOICE_MAX_SECONDS) { recorder.stop(); return; }
      const time = box.querySelector('.voice-recording .voice-time');
      if (time) time.textContent = `${voiceClock((Date.now() - startedAt) / 1000)} / ${voiceClock(VOICE_MAX_SECONDS)}`;
    }, 250);
    redraw();
  }

  function stop() {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    haptic(10);
  }

  function togglePlay(index) {
    const row = box.querySelector(`[data-voice="${index}"]`);
    const voice = getVoices()[index];
    if (!row || !voice) return;

    if (player && player.index === index) {
      if (player.audio.paused) player.audio.play(); else player.audio.pause();
      return;
    }
    stopPlayer();
    box.querySelectorAll('.voice-play').forEach(b => { b.innerHTML = icon('play'); });
    box.querySelectorAll('.voice-bar i').forEach(bar => { bar.style.width = '0'; });

    const audio = new Audio(photoUrl(voice.blob));
    player = { audio, index };
    const button = row.querySelector('.voice-play');
    const bar = row.querySelector('.voice-bar i');
    const time = row.querySelector('.voice-time');
    audio.onplay = () => { button.innerHTML = icon('pause'); button.setAttribute('aria-label', VOICE_WORDS.pause); };
    audio.onpause = () => { button.innerHTML = icon('play'); button.setAttribute('aria-label', VOICE_WORDS.play); };
    audio.ontimeupdate = () => {
      bar.style.width = `${Math.min(100, (audio.currentTime / (voice.seconds || 1)) * 100)}%`;
      time.textContent = voiceClock(audio.currentTime);
    };
    audio.onended = () => {
      bar.style.width = '0';
      time.textContent = voiceClock(voice.seconds);
      if (player && player.audio === audio) player = null;
    };
    audio.play().catch(() => {});
  }

  // Tap on the bar: jump there
  function seek(index, event) {
    if (!player || player.index !== index) return;
    const bar = event.target.closest('.voice-bar');
    const rect = bar.getBoundingClientRect();
    // Right-to-left: the start is on the right
    const part = (rect.right - event.clientX) / rect.width;
    player.audio.currentTime = Math.max(0, Math.min(1, part)) * (getVoices()[index].seconds || 0);
  }

  box.addEventListener('click', event => {
    if (event.target.closest('.voice-record')) { start(); return; }
    if (event.target.closest('.voice-stop')) { stop(); return; }
    const row = event.target.closest('[data-voice]');
    if (!row) return;
    const index = Number(row.dataset.voice);
    if (event.target.closest('.voice-play')) { togglePlay(index); return; }
    if (event.target.closest('.voice-bar')) { seek(index, event); return; }
    if (event.target.closest('.voice-remove')) {
      if (!confirm(VOICE_WORDS.confirmRemove)) return;
      stopPlayer();
      setVoices(getVoices().filter((_, i) => i !== index));
      redraw();
    }
  });

  return async function finish() {
    stopPlayer();
    if (recorder) { stop(); await done; }
  };
}

// ---------- Voices ↔ text (for sync and backups) ----------

async function voicesToText(voices) {
  return Promise.all(voices.map(async v => ({ ...v, blob: v.blob instanceof Blob ? await blobToDataUrl(v.blob) : v.blob })));
}

async function voicesFromText(voices) {
  return Promise.all(voices.map(async v => ({ ...v, blob: typeof v.blob === 'string' ? await dataUrlToBlob(v.blob) : v.blob })));
}
