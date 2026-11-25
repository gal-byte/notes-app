// ============================================================
// MEAL PICKER (2026-11-26): exact products in a meal note
// In a note of ארוחות, "מה אכלתי" lists what was eaten as products
// with amounts ("קוטג' 5% תנובה · 120 ג׳"), like a calorie-tracker app:
//   - type "קוטג" → your own products first (a copy kept on this
//     device, instant, works offline), then Israel's national food
//     database (צמרת) and Open Food Facts from the home server
//   - barcode: the camera reads it (or type the digits)
//   - a product not found: photograph its nutrition label (the server
//     reads it once) or type its numbers per 100 g
// The note keeps the list in `foodItems` and its "≈" total line, which
// everything else (today's total, the server's log) already reads.
// Items the server guessed from free text come with ok:false ("?")
// until confirmed. The server remembers what you picked for each word
// and your usual amount, so next time the first suggestion is right.
// ============================================================

const PICK_WORDS = {
  title: 'מה אכלתי',
  search: 'הוספת מוצר: קוטג׳, לחם, ביצה…',
  barcode: 'ברקוד',
  label: 'צילום תווית',
  newProduct: 'מוצר חדש',
  grams: 'ג׳',
  total: (kcal, protein) => `סה״כ ${kcal} קל׳ · ${protein} ג׳ חלבון`,
  guess: 'ניחוש, לאישור',
  confirm: 'אישור',
  remove: 'הסרה',
  mine: 'שלי',
  nothing: 'לא נמצא. אפשר לצלם תווית או להוסיף מוצר חדש.',
  offline: 'אין חיבור לשרת: מוצגים רק המוצרים שלך',
  barcodeAsk: 'מספר הברקוד (הספרות שמתחת לפסים):',
  barcodeNone: 'הברקוד לא נמצא. אפשר לצלם את התווית או להוסיף את המוצר.',
  labelWait: 'קורא את התווית… (עד דקה)',
  labelFailed: 'לא הצלחתי לקרוא את התווית. אפשר להוסיף את המספרים ידנית.',
  form: { name: 'שם', brand: 'מותג', kcal: 'קלוריות ל־100 ג׳', protein: 'חלבון ל־100 ג׳', save: 'שמירה' },
};
const PICK_CACHE_KEY = 'myProducts';
const PICK_CACHE_MS = 10 * 60 * 1000;

// ---------- my products, kept on this device ----------
function myProducts() {
  try { return JSON.parse(localStorage.getItem(PICK_CACHE_KEY) || '{}').products || []; } catch { return []; }
}

async function refreshMyProducts(force = false) {
  let at = 0;
  try { at = JSON.parse(localStorage.getItem(PICK_CACHE_KEY) || '{}').at || 0; } catch { /* none yet */ }
  if (!force && Date.now() - at < PICK_CACHE_MS) return;
  const data = await foodApi('/food/mine');
  try { localStorage.setItem(PICK_CACHE_KEY, JSON.stringify({ at: Date.now(), products: data.products || [] })); } catch { /* full */ }
}

async function foodApi(path, options = {}) {
  const response = await fetch(SERVER + path, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function productLabel(p) {
  const name = p.name || '';
  return [name, p.brand && !name.includes(p.brand) ? p.brand : ''].filter(Boolean).join(' · ');
}

// Every word typed is the start of a word in the name or brand (like the server's search)
function matchesWords(p, text) {
  const hay = `${p.name} ${p.brand || ''} ${(p.words || []).join(' ')}`.toLowerCase().split(/[^\p{L}\p{N}]+/u);
  const words = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return words.length && words.every(w => hay.some(h => h.startsWith(w)));
}

// ---------- amounts ----------
function defaultGrams(p) {
  if (p.grams) return p.grams;               // the usual amount
  if (p.servings?.length) return p.servings[0][1];
  return 100;
}

function itemNumbers(item) {
  const factor = (item.grams || 0) / 100;
  return { kcal: Math.round((item.per?.kcal || 0) * factor), protein: Math.round((item.per?.protein || 0) * factor * 10) / 10 };
}

function itemFromProduct(p, word) {
  const item = { name: productLabel(p), productId: p.id, grams: defaultGrams(p), per: { kcal: p.kcal || 0, protein: p.protein || 0 },
    servings: p.servings || [], word: (word || '').trim().slice(0, 40), ok: true };
  return { ...item, ...itemNumbers(item) };
}

function itemsTotal(items) {
  const kcal = items.reduce((sum, x) => sum + (x.kcal || 0), 0);
  const protein = items.reduce((sum, x) => sum + (x.protein || 0), 0);
  return { kcal: Math.round(kcal), protein: Math.round(protein) };
}

// The note's "≈" line follows the list (no "(הערכה)" once everything is confirmed)
function textWithTotal(text, items) {
  const kept = (text || '').split('\n').filter(line => !line.trim().startsWith('≈'));
  if (!items.length) return kept.join('\n').trim();
  const { kcal, protein } = itemsTotal(items);
  const line = `≈ ${kcal} קל׳ · ${protein} ג׳ חלבון${items.every(x => x.ok) ? '' : ' (הערכה)'}`;
  return [...kept, line].join('\n').trim();
}

// ---------- the picker ----------
function mealPickerHtml(draft) {
  return `<section class="meal-picker" id="meal-picker">
    <h3 class="meal-picker-title">${PICK_WORDS.title}</h3>
    <ul class="pick-items" id="pick-items">${pickItemsHtml(draft.foodItems || [])}</ul>
    <div class="pick-search">
      <input type="search" id="pick-search" dir="auto" autocomplete="off" enterkeyhint="search" placeholder="${escapeHtml(PICK_WORDS.search)}">
      <ul class="pick-results" id="pick-results"></ul>
    </div>
    <div class="pick-actions">
      <button type="button" class="text-button" data-pick="barcode">${icon('search', 'inline')} ${PICK_WORDS.barcode}</button>
      <label class="text-button">${icon('camera', 'inline')} ${PICK_WORDS.label}<input type="file" accept="image/*" capture="environment" data-pick-label hidden></label>
      <button type="button" class="text-button" data-pick="new">${icon('plus', 'inline')} ${PICK_WORDS.newProduct}</button>
    </div>
    <div id="pick-form"></div>
    <p class="field-hint" id="pick-status" aria-live="polite"></p>
  </section>`;
}

function pickItemsHtml(items) {
  if (!items.length) return '';
  const rows = items.map((x, i) => {
    const units = [[PICK_WORDS.grams, 1], ...(x.servings || [])];
    const options = units.map(([name, grams], u) =>
      `<option value="${u}" ${u === (x.unit || 0) ? 'selected' : ''}>${escapeHtml(u ? `${name} (${grams} ${PICK_WORDS.grams})` : name)}</option>`).join('');
    const amount = x.unit ? x.count : x.grams;   // "2 × כף" or grams
    return `<li class="pick-item ${x.ok ? '' : 'guess'}" data-index="${i}">
      <span class="pick-name">${x.ok ? '' : '<b class="pick-q" title="' + PICK_WORDS.guess + '">?</b> '}${escapeHtml(x.name)}</span>
      <span class="pick-amount">
        <input type="number" inputmode="decimal" min="0" step="any" value="${Math.round(amount * 10) / 10}" data-pick-grams aria-label="כמות">
        <select data-pick-unit aria-label="יחידה">${options}</select>
      </span>
      <span class="pick-numbers">${x.kcal} קל׳ · ${x.protein} ג׳</span>
      ${x.ok ? '' : `<button type="button" class="text-button" data-pick-ok>${PICK_WORDS.confirm}</button>`}
      <button type="button" class="icon-button" data-pick-remove aria-label="${PICK_WORDS.remove}">${icon('x')}</button>
    </li>`;
  }).join('');
  const { kcal, protein } = itemsTotal(items);
  return rows + `<li class="pick-total">${PICK_WORDS.total(kcal, protein)}</li>`;
}

function setupMealPicker(form, editor, saveSoon) {
  const box = form.querySelector('#meal-picker');
  if (!box) return;
  const search = box.querySelector('#pick-search');
  const results = box.querySelector('#pick-results');
  const status = box.querySelector('#pick-status');
  let shown = [];          // the products in the result list
  let typed = '';          // what was typed (remembered as the word for the chosen product)
  let timer = 0;
  let asked = 0;           // only the latest search's answer is shown
  refreshMyProducts().catch(() => {});

  const items = () => editor.draft.foodItems || (editor.draft.foodItems = []);
  function changed() {
    editor.draft.foodItems = items().map(x => ({ ...x, ...itemNumbers(x) }));
    editor.draft.text = textWithTotal(editor.draft.text, editor.draft.foodItems);
    const textBox = form.querySelector('textarea[data-key="text"]');
    if (textBox) { textBox.value = editor.draft.text; autoGrow(textBox); }
    box.querySelector('#pick-items').innerHTML = pickItemsHtml(editor.draft.foodItems);
    saveSoon();
  }

  function showResults(list, note = '') {
    shown = list;
    results.innerHTML = list.map((p, i) => `<li><button type="button" data-pick-result="${i}">
        <span>${escapeHtml(productLabel(p))}${p.uses ? ` <small class="pick-mine">${PICK_WORDS.mine}</small>` : ''}</span>
        <small>${Math.round(p.kcal || 0)} קל׳ · ${Math.round((p.protein || 0) * 10) / 10} ג׳ חלבון ל־100 ג׳</small>
      </button></li>`).join('') + (note ? `<li class="field-hint">${escapeHtml(note)}</li>` : '');
  }

  async function runSearch() {
    const text = search.value.trim();
    typed = text;
    if (text.length < 2) { showResults([]); return; }
    const local = myProducts().filter(p => matchesWords(p, text)).slice(0, 8);
    showResults(local);
    const ticket = ++asked;
    try {
      const data = await foodApi(`/food/search?q=${encodeURIComponent(text)}&limit=20`);
      if (ticket !== asked) return;
      const seen = new Set(local.map(p => p.id));
      const all = [...local, ...(data.products || []).filter(p => !seen.has(p.id))].slice(0, 20);
      showResults(all, all.length ? '' : PICK_WORDS.nothing);
    } catch {
      if (ticket === asked) showResults(local, PICK_WORDS.offline);
    }
  }

  function add(product, word = typed) {
    // A label or barcode answer that comes after the note was closed is dropped (the product
    // itself is kept on the server, under "שלי")
    if (!box.isConnected || !product) return;
    asked++;   // a search answer still on its way is not shown over the cleared list
    items().push(itemFromProduct(product, word));
    search.value = ''; typed = ''; showResults([]);
    changed();
  }

  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(runSearch, 300); });

  box.addEventListener('click', async event => {
    const result = event.target.closest('[data-pick-result]');
    if (result) { add(shown[Number(result.dataset.pickResult)]); return; }
    const row = event.target.closest('.pick-item');
    if (row && event.target.closest('[data-pick-remove]')) { items().splice(Number(row.dataset.index), 1); changed(); return; }
    if (row && event.target.closest('[data-pick-ok]')) { items()[Number(row.dataset.index)].ok = true; changed(); return; }
    const action = event.target.closest('[data-pick]')?.dataset.pick;
    if (action === 'barcode') await scanBarcode();
    if (action === 'new') showProductForm();
  });

  // Amount: grams typed directly, or a serving ("פרוסה (30 ג׳)") which sets the grams
  box.addEventListener('change', async event => {
    const row = event.target.closest('.pick-item');
    if (row && event.target.matches('[data-pick-unit]')) {
      const item = items()[Number(row.dataset.index)];
      const unit = Number(event.target.value);
      // A serving: the number becomes how many (1 to start); grams: the number is grams
      if (unit > 0 && item.servings?.[unit - 1]) {
        item.unit = unit; item.count = 1; item.grams = item.servings[unit - 1][1];
      } else { delete item.unit; delete item.count; }
      changed();
      return;
    }
    if (row && event.target.matches('[data-pick-grams]')) { changed(); return; }   // typing done: redraw
    if (event.target.matches('[data-pick-label]')) await sendLabel(event.target);
  });
  box.addEventListener('input', event => {
    // The picker's own inputs are not note fields: keep them from the editor's handler
    if (event.target.closest('#meal-picker')) event.stopPropagation();
    const row = event.target.closest('.pick-item');
    if (!row || !event.target.matches('[data-pick-grams]')) return;
    const item = items()[Number(row.dataset.index)];
    const value = Math.max(0, Number(event.target.value) || 0);
    const serving = item.unit && item.servings?.[item.unit - 1];
    if (serving) { item.count = value; item.grams = Math.round(value * serving[1] * 10) / 10; }
    else item.grams = value;
    Object.assign(item, itemNumbers(item));
    // While typing: only the numbers change (no redraw, so the keyboard stays open); saved at once
    row.querySelector('.pick-numbers').textContent = `${item.kcal} קל׳ · ${item.protein} ג׳`;
    const { kcal, protein } = itemsTotal(items());
    const total = box.querySelector('.pick-total');
    if (total) total.textContent = PICK_WORDS.total(kcal, protein);
    editor.draft.text = textWithTotal(editor.draft.text, items());
    const textBox = form.querySelector('textarea[data-key="text"]');
    if (textBox) { textBox.value = editor.draft.text; autoGrow(textBox); }
    saveSoon();
  });

  async function scanBarcode() {
    let code = String(await readBarcodeWithCamera().catch(() => null) || '').replace(/\D/g, '');
    if (!code) code = (prompt(PICK_WORDS.barcodeAsk) || '').replace(/\D/g, '');
    if (!code) return;
    status.textContent = '…';
    try {
      const data = await foodApi(`/food/barcode/${code}`);
      status.textContent = '';
      if (data.product) { add(data.product, ''); refreshMyProducts(true).catch(() => {}); }
      else showProductForm({ barcode: code }, PICK_WORDS.barcodeNone);
    } catch (error) {
      status.textContent = error.message;
    }
  }

  async function sendLabel(input) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    status.textContent = PICK_WORDS.labelWait;
    try {
      const photo = await shrinkPhoto(file, 1024);
      const { id } = await foodApi(`/food/label?hint=${encodeURIComponent(search.value.trim())}`,
        { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: photo });
      for (let i = 0; i < 36; i++) {   // the server reads it within a minute or two
        await new Promise(resolve => setTimeout(resolve, 5000));
        if (!box.isConnected) return;   // the note was closed: the product still lands under "שלי"
        const answer = await foodApi(`/food/label/${id}`).catch(() => null);
        if (answer?.status === 'done' && answer.product) {
          status.textContent = '';
          add(answer.product, search.value.trim());
          refreshMyProducts(true).catch(() => {});
          return;
        }
        if (answer?.status === 'failed') break;
      }
      status.textContent = PICK_WORDS.labelFailed;
      showProductForm({ name: search.value.trim() });
    } catch (error) {
      status.textContent = error.message;
    }
  }

  function showProductForm(start = {}, note = '') {
    const place = box.querySelector('#pick-form');
    const w = PICK_WORDS.form;
    place.innerHTML = `<div class="pick-new">
      ${note ? `<p class="field-hint">${escapeHtml(note)}</p>` : ''}
      <label>${w.name}<input name="name" dir="auto" value="${escapeHtml(start.name || search.value.trim())}"></label>
      <label>${w.brand}<input name="brand" dir="auto"></label>
      <label>${w.kcal}<input name="kcal" type="number" inputmode="decimal" min="0" max="900" step="any"></label>
      <label>${w.protein}<input name="protein" type="number" inputmode="decimal" min="0" max="100" step="any"></label>
      <button type="button" class="pill-button" data-pick-save>${w.save}</button>
    </div>`;
    const values = name => place.querySelector(`[name="${name}"]`).value.trim();
    place.querySelector('[data-pick-save]').addEventListener('click', async () => {
      try {
        const { product } = await foodApi('/food/product', { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: values('name'), brand: values('brand'), kcal: values('kcal'), protein: values('protein'),
            barcode: start.barcode || '' }) });
        place.innerHTML = '';
        add(product);
        refreshMyProducts(true).catch(() => {});
      } catch (error) {
        status.textContent = error.message;
      }
    });
    place.querySelector('[name="name"]').focus();
  }
}

// The phone's built-in barcode reader (Chrome on Android). null when there is none.
async function readBarcodeWithCamera() {
  if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) return null;
  const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  const layer = document.createElement('div');
  try {
    layer.className = 'barcode-layer';
    layer.innerHTML = `<video playsinline muted></video><button type="button" class="pill-button">ביטול</button>`;
    document.body.append(layer);
    const video = layer.querySelector('video');
    video.srcObject = stream;
    await video.play();
    return await new Promise(resolve => {
      layer.querySelector('button').addEventListener('click', () => resolve(null));
      const look = async () => {
        if (!layer.isConnected) return;
        const codes = await detector.detect(video).catch(() => []);
        if (codes.length) resolve(codes[0].rawValue);
        else setTimeout(look, 250);
      };
      look();
      setTimeout(() => resolve(null), 30000);
    });
  } finally {
    stream.getTracks().forEach(track => track.stop());
    layer.remove();
  }
}
