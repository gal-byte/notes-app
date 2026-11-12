// ============================================================
// PLACES FOR REMINDERS ("where")
// A reminder can have a place. Then the home server works out when
// to leave by bus, from where your phone is (OwnTracks app), and
// sends one notification about 10 minutes before leaving.
//
// The list of places and the bus planner belong to the bus app
// "מתי לצאת" on the home server, so this needs Tailscale, like the
// server reminders (serverpush.js). Nothing here goes to outside services.
// ============================================================

const BUS_APP = 'https://home-server.tail7870b4.ts.net:10000/';
const PLACE_WAIT_MS = 200;  // wait for a pause in typing before asking for suggestions

// The homes (אמא / אבא) from the bus app, kept on the phone so quick-add works offline
function savedHomes() {
  try { return JSON.parse(localStorage.getItem('busHomes')) || []; } catch { return []; }
}

async function refreshHomes() {
  try {
    const response = await fetch(BUS_APP + 'api/homes');
    if (!response.ok) return;
    const homes = (await response.json()).map(h => ({ name: h.name, address: h.address, lat: h.lat, lon: h.lon }));
    localStorage.setItem('busHomes', JSON.stringify(homes));
  } catch { /* no Tailscale: keep the saved copy */ }
}

// Quick-add: "ארוחה אצל אמא מחר 19:00" → the place "אמא".
// Only "אצל ..." counts, so "להתקשר לאמא" doesn't become a trip.
function homePlaceIn(text) {
  for (const home of savedHomes()) {
    const pattern = new RegExp(`(^|\\s)(אצל|בבית של)\\s+${home.name}($|[\\s,.!?])`);
    if (pattern.test(text)) return { name: home.name, lat: home.lat, lon: home.lon };
  }
  return null;
}

// Link to the bus app with the destination and the "arrive by" time filled in
function directionsUrl(item) {
  const place = item.place;
  const params = new URLSearchParams({ to: `${place.lat},${place.lon}`, toname: place.name });
  const next = nextOccurrence(item);
  if (next && item.time) params.set('arrive', `${toISODate(next)}T${item.time}`);
  if (item.timeFlex === 'about') params.set('flex', '1');
  return `${BUS_APP}?${params}`;
}

function placeShortName(place) {
  return (place?.name || '').split(',')[0];
}

// ---------- The "where" box on the reminder screen ----------

function placeFieldHtml(field, place) {
  const note = !place ? TEXT.placeHint
    : editor.draft.time ? TEXT.placeOn : TEXT.placeNeedsTime;
  return `
    <div class="field place-field">
      <span class="field-label">${field.label}</span>
      <div class="place-row">
        <input type="text" data-place dir="auto" autocomplete="off"
               value="${escapeHtml(place?.name || '')}" placeholder="${TEXT.placePlaceholder}">
        ${place ? `<button type="button" class="place-clear" data-place-clear aria-label="${TEXT.placeClear}">✕</button>` : ''}
      </div>
      <div class="place-list" id="place-list" hidden></div>
      <p class="field-hint">${note}</p>
      ${place ? `<a class="small-button wide place-go" href="${escapeHtml(directionsUrl(editor.draft))}" target="_blank" rel="noopener">🚌 ${TEXT.placeDirections}</a>` : ''}
    </div>`;
}

// Called by setupItemScreen (sections.js). saveSoon saves the reminder a moment later.
function setupPlaceField(form, saveSoon) {
  const box = form.querySelector('.place-field');
  if (!box) return;
  const input = box.querySelector('[data-place]');
  const list = box.querySelector('#place-list');
  let timer = null;
  let rows = [];
  let asked = 0;

  function redraw() {
    box.outerHTML = placeFieldHtml({ label: box.querySelector('.field-label').textContent }, editor.draft.place);
    setupPlaceField(form, saveSoon);
  }

  function show(items, emptyText) {
    rows = items;
    list.hidden = false;
    list.innerHTML = items.length
      ? items.map((p, n) => `<button type="button" class="place-option" data-place-pick="${n}">
          <b dir="auto">${escapeHtml(p.title)}</b>${p.sub ? `<small>${escapeHtml(p.sub)}</small>` : ''}</button>`).join('')
      : `<p class="field-hint">${emptyText}</p>`;
  }

  function showHomes() {
    show(savedHomes().map(h => ({ title: `${TEXT.placeHomeOf} ${h.name}`, sub: h.address,
      place: { name: h.name, lat: h.lat, lon: h.lon } })), '');
    if (!rows.length) list.hidden = true;
  }

  async function search(query) {
    const mine = ++asked;
    try {
      const response = await fetch(`${BUS_APP}api/suggest?${new URLSearchParams({ q: query })}`);
      const found = await response.json();
      if (mine !== asked) return;
      show(found.map(p => ({
        title: p.name, sub: [p.kind, p.city].filter(Boolean).join(' · '),
        place: { name: p.name + (p.city ? `, ${p.city}` : ''), lat: p.lat, lon: p.lon },
      })), TEXT.placeNotFound);
    } catch {
      if (mine === asked) show([], TEXT.placeNoServer);
    }
  }

  input.addEventListener('focus', () => { if (!input.value.trim() || editor.draft.place) showHomes(); });
  input.addEventListener('input', () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (query.length < 2) { showHomes(); return; }
    timer = setTimeout(() => search(query), PLACE_WAIT_MS);
  });
  // Typed but didn't choose: go back to the saved place (a place must come from the list)
  input.addEventListener('blur', () => setTimeout(() => {
    if (!box.isConnected) return;
    list.hidden = true;
    if (!input.value.trim() && editor.draft.place) { editor.draft.place = null; saveSoon(); redraw(); return; }
    input.value = editor.draft.place?.name || '';
  }, 250));

  box.addEventListener('click', event => {
    // The trip link uses the date and time as they are right now
    const go = event.target.closest('.place-go');
    if (go) { go.href = directionsUrl(editor.draft); return; }
    const pick = event.target.closest('[data-place-pick]');
    if (pick) {
      editor.draft.place = rows[Number(pick.dataset.placePick)].place;
      saveSoon();
      redraw();
      return;
    }
    if (event.target.closest('[data-place-clear]')) {
      editor.draft.place = null;
      saveSoon();
      redraw();
    }
  });
}

refreshHomes();
