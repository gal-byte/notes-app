// ============================================================
// FOOD
// Meals (your group ארוחות) and the shopping list.
//
// Meals: the home server (notify, autofill.py) adds an estimate line to
// each meal note: "≈ 650 קל׳ · 28 ג׳ חלבון (הערכה)". The group shows
// today's total from those lines, and each row its own numbers.
// The app icon's long-press menu has "מה אכלתי 📷" (#/meal): a new meal
// with the photo button waiting.
//
// Shopping list: the note "🛒 רשימת קניות" (written by Claude, one item
// per line) shows its lines as checkboxes. A ticked item moves to the
// bottom as "✓ חלב"; the server ignores those lines (food.py lines_of).
// ============================================================

const MEALS_GROUP_NAME = 'ארוחות';
const SHOP_TITLE = '🛒 רשימת קניות';
const TICK = '✓ ';
const FOOD_WORDS = {
  today: (kcal, protein) => `היום: ${kcal} קל׳ · ${protein} ג׳ חלבון`,
  noneToday: 'היום עוד לא נרשמו ארוחות',
  waiting: n => n === 1 ? ' · ארוחה אחת מחכה להערכה' : ` · ${n} ארוחות מחכות להערכה`,
  numbers: (kcal, protein) => `${kcal} קל׳ · ${protein} ג׳`,
  meal: 'ארוחה',
  editList: 'עריכת הרשימה',
  emptyList: 'הרשימה ריקה',
};

// ---------- Meals ----------

function mealsGroup() {
  return GROUPS.find(group => (group.name || '').trim() === MEALS_GROUP_NAME) || null;
}

function isMealsGroup(groupId) {
  return !!groupId && mealsGroup()?.id === groupId;
}

// "≈ 650 קל׳ · 28 ג׳ חלבון (הערכה)"
const ESTIMATE_LINE = /^\s*≈\s*([\d,.]+)\s*קל\S*\s*·\s*([\d,.]+)\s*ג/;

function mealEstimate(item) {
  for (const line of (item.text || '').split('\n')) {
    const match = line.match(ESTIMATE_LINE);
    if (match) return { kcal: Number(match[1].replace(/,/g, '')) || 0, protein: Number(match[2].replace(/,/g, '')) || 0 };
  }
  return null;
}

const bigNumber = n => Math.round(n).toLocaleString('en-US');

// The small numbers at the end of a meal's row
function mealPillHtml(item) {
  const estimate = mealEstimate(item);
  return estimate ? `<span class="calories meal-numbers">${FOOD_WORDS.numbers(bigNumber(estimate.kcal), bigNumber(estimate.protein))}</span>` : '';
}

// "היום: 1,450 קל׳ · 82 ג׳ חלבון" above the meals
function mealsTodayHtml(items) {
  const today = toISODate(new Date());
  const meals = items.filter(item => item.createdAt && toISODate(new Date(item.createdAt)) === today);
  if (!meals.length) return `<p class="todo-heading meals-today">${FOOD_WORDS.noneToday}</p>`;
  let kcal = 0, protein = 0, waiting = 0;
  for (const meal of meals) {
    const estimate = mealEstimate(meal);
    if (!estimate) { waiting++; continue; }
    kcal += estimate.kcal;
    protein += estimate.protein;
  }
  return `<p class="todo-heading meals-today"><strong>${FOOD_WORDS.today(bigNumber(kcal), bigNumber(protein))}</strong>${
    waiting ? FOOD_WORDS.waiting(waiting) : ''}</p>`;
}

// A meal with a photo and no title still gets saved: "ארוחה 13:05"
function mealTitle() {
  const now = new Date();
  return `${FOOD_WORDS.meal} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// #/meal (the app icon's shortcut): show the photo button, and open the picker if the phone lets us
function askForMealPhoto() {
  const field = document.querySelector('.photo-field');
  if (!field) return;
  document.activeElement?.blur();
  field.classList.add('ask');
  field.scrollIntoView({ block: 'center' });
  try { field.querySelector('input[type="file"]')?.click(); } catch { /* needs a tap; the button is waiting */ }
}

// ---------- Shopping list ----------

function isShoppingList(groupId, draft) {
  return groupId === 'inbox' && (draft.title || '').trim() === SHOP_TITLE;
}

function shopLines(text) {
  return (text || '').split('\n').map(line => line.trim()).filter(Boolean);
}

function shopListInner(text) {
  const lines = shopLines(text);
  if (!lines.length) return `<p class="todo-heading">${FOOD_WORDS.emptyList}</p>`;
  const row = (line, index) => {
    const done = line.startsWith('✓');
    const label = done ? line.replace(/^✓\s*/, '') : line;
    return `<label class="shop-item${done ? ' done' : ''}"><input type="checkbox" data-shop-line="${index}"${done ? ' checked' : ''}>
      <span dir="auto">${escapeHtml(label)}</span></label>`;
  };
  // Open items first, ticked ones at the bottom (the text keeps that order too)
  const rows = lines.map((line, index) => ({ line, index }));
  return rows.filter(r => !r.line.startsWith('✓')).map(r => row(r.line, r.index)).join('') +
         rows.filter(r => r.line.startsWith('✓')).map(r => row(r.line, r.index)).join('');
}

// The checkboxes, with the plain text folded underneath for editing
function shopListHtml(textFieldHtml, text) {
  return `<div class="shop-list" id="shop-list">${shopListInner(text)}</div>
    <details class="reel-more shop-edit"><summary>${FOOD_WORDS.editList}</summary>${textFieldHtml}</details>`;
}

function setupShopList(form) {
  const list = form.querySelector('#shop-list');
  const box = form.querySelector('.shop-edit textarea[data-key="text"]');
  if (!list || !box) return;
  const redraw = () => { list.innerHTML = shopListInner(box.value); };

  list.addEventListener('change', event => {
    const check = event.target.closest('[data-shop-line]');
    if (!check) return;
    const lines = shopLines(box.value);
    const [line] = lines.splice(Number(check.dataset.shopLine), 1);
    if (line === undefined) return;
    const plain = line.replace(/^✓\s*/, '');
    if (check.checked) {
      lines.push(TICK + plain);                      // bought: to the bottom
    } else {
      const firstDone = lines.findIndex(l => l.startsWith('✓'));
      lines.splice(firstDone < 0 ? lines.length : firstDone, 0, plain);  // back with the open ones
    }
    box.value = lines.join('\n');
    haptic(5);
    box.dispatchEvent(new Event('input', { bubbles: true }));   // saved like typing (setupItemScreen)
  });
  box.addEventListener('input', redraw);
  form.querySelector('.shop-edit').addEventListener('toggle', () => autoGrow(box));
}
