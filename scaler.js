// ============================================================
// RECIPE SCALER
// A recipe says how many servings it makes ("מנות"). Under the
// ingredients, − / + picks another number and the ingredients are
// shown again with every amount changed to fit:
//   "2 ביצים" → "3 ביצים", "½ כוס" → "¾ כוס", "200 גרם" → "300 גרם".
// It only changes what's on the screen; the recipe stays as written.
// ============================================================

const SCALER_WORDS = {
  forHow: 'לכמה מנות?',
  servings: n => n === 1 ? 'מנה אחת' : `${n} מנות`,
  less: 'פחות מנות',
  more: 'יותר מנות',
  scaledTitle: n => `מצרכים ל־${n === 1 ? 'מנה אחת' : `${n} מנות`}`,
};

const FRACTION_CHARS = { '½': 1 / 2, '¼': 1 / 4, '¾': 3 / 4, '⅓': 1 / 3, '⅔': 2 / 3, '⅛': 1 / 8 };
const NICE_FRACTIONS = [[0, ''], [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [1 / 2, '½'], [2 / 3, '⅔'], [3 / 4, '¾'], [1, '']];

// A number written in a recipe: "2", "1.5", "1,5", "1/2", "1 1/2", "½", "1½"
const AMOUNT = /(\d+(?:[.,]\d+)?)?\s?(\d+\/\d+|[½¼¾⅓⅔⅛])|\d+(?:[.,]\d+)?/g;

function readAmount(text) {
  const parts = text.match(/^(?:(\d+(?:[.,]\d+)?)\s?)?(\d+\/\d+|[½¼¾⅓⅔⅛])$/);
  if (!parts) return Number(text.replace(',', '.')) || 0;
  let value = parts[1] ? Number(parts[1].replace(',', '.')) : 0;
  if (FRACTION_CHARS[parts[2]]) value += FRACTION_CHARS[parts[2]];
  else { const [a, b] = parts[2].split('/').map(Number); if (b) value += a / b; }
  return value;
}

// 0.75 → "¾" · 1.5 → "1½" · 2.4 → "2.4" · 37.5 → "38"
function writeAmount(value) {
  if (value >= 10) return String(Math.round(value));
  const whole = Math.floor(value);
  const rest = value - whole;
  for (const [fraction, char] of NICE_FRACTIONS) {
    if (Math.abs(rest - fraction) < 0.035) {
      const w = fraction === 1 ? whole + 1 : whole;
      if (!char) return String(w);
      return w ? `${w}${char}` : char;
    }
  }
  return String(Math.round(value * 10) / 10);
}

// Change every amount on each line. Numbers right before "%" or
// "מעלות" (oven heat) are left alone.
function scaleIngredients(text, factor) {
  return text.split('\n').map(line => line.replace(AMOUNT, (match, _w, _f, offset, whole) => {
    const after = whole.slice(offset + match.length).trimStart();
    if (after.startsWith('%') || after.startsWith('מעלות')) return match;
    const value = readAmount(match.trim());
    if (!value) return match;
    const lead = match.startsWith(' ') ? ' ' : '';
    // Kept left-to-right, or right-to-left text shows "2½" as "½2"
    return `${lead}⁦${writeAmount(value * factor)}⁩`;
  })).join('\n');
}

// "4" / "4 מנות" / "ל-4" → 4
function servingsNumber(text) {
  const match = String(text || '').match(/\d+/);
  const n = match ? Number(match[0]) : 0;
  return n > 0 && n < 1000 ? n : 0;
}

// Hooks up the strip under the ingredients. update() redraws it
// (after the servings or ingredients change).
function setupScaler(form, getDraft) {
  const box = form.querySelector('#scaler');
  if (!box) return { update() {} };
  let target = 0;   // 0 = as written

  function draw() {
    const draft = getDraft();
    const base = servingsNumber(draft.servings);
    if (!base || !(draft.ingredients || '').trim()) { box.innerHTML = ''; return; }
    const showing = target || base;
    const changed = showing !== base;
    box.innerHTML = `
      <div class="scaler">
        <span class="scaler-label">${SCALER_WORDS.forHow}</span>
        <div class="scaler-buttons">
          <button type="button" data-step="-1" aria-label="${SCALER_WORDS.less}" ${showing <= 1 ? 'disabled' : ''}>${icon('minus')}</button>
          <b>${SCALER_WORDS.servings(showing)}</b>
          <button type="button" data-step="1" aria-label="${SCALER_WORDS.more}">${icon('plus')}</button>
        </div>
      </div>
      ${changed ? `
        <div class="scaled">
          <span class="label">${SCALER_WORDS.scaledTitle(showing)}</span>
          <p dir="auto">${escapeHtml(scaleIngredients(draft.ingredients, showing / base)).replace(/\n/g, '<br>')}</p>
        </div>` : ''}`;
  }

  box.addEventListener('click', event => {
    const button = event.target.closest('[data-step]');
    if (!button) return;
    const base = servingsNumber(getDraft().servings);
    target = Math.max(1, (target || base) + Number(button.dataset.step));
    if (target === base) target = 0;
    haptic(5);
    draw();
  });

  draw();
  return {
    update(servingsChanged) {
      if (servingsChanged) target = 0;
      draw();
    },
  };
}
