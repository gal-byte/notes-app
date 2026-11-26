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
  dayLabel: 'אוכל',
  protein: 'חלבון',
  oneMeal: 'ארוחה אחת',
  meals: n => `${n} ארוחות`,
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
  let kcal = 0, protein = 0, waiting = 0;
  for (const meal of meals) {
    const estimate = mealEstimate(meal);
    if (!estimate) { waiting++; continue; }
    kcal += estimate.kcal;
    protein += estimate.protein;
  }
  // With a target the bars already say "קל׳ 1,450 / 2,300", so they replace the total line (2026-11-26)
  const target = foodTarget();
  if (target.kcal || target.protein) {
    return targetBarsHtml(kcal, protein)
      + (waiting ? `<p class="field-hint meals-wait">${FOOD_WORDS.waiting(waiting).replace(/^ · /, '')}</p>` : '');
  }
  if (!meals.length) return `<p class="todo-heading meals-today">${FOOD_WORDS.noneToday}</p>`;
  return `<p class="todo-heading meals-today"><strong>${FOOD_WORDS.today(bigNumber(kcal), bigNumber(protein))}</strong>${
    waiting ? FOOD_WORDS.waiting(waiting) : ''}</p>${targetBarsHtml(kcal, protein)}`;
}

// The journal day (2026-11-26): "🍽 1,450 קל׳ · 82 ג׳ חלבון · 3 ארוחות" from
// that date's meals, the target bars under it; a tap opens ארוחות
async function mealsDayHtml(iso) {
  const meals = mealsGroup();
  if (!meals || !iso) return '';
  const day = (await getItemsInGroup(meals.id))
    .filter(item => item.createdAt && toISODate(new Date(item.createdAt)) === iso);
  if (!day.length) return '';
  let kcal = 0, protein = 0, waiting = 0;
  for (const meal of day) {
    const estimate = mealEstimate(meal);
    if (!estimate) { waiting++; continue; }
    kcal += estimate.kcal;
    protein += estimate.protein;
  }
  const count = day.length === 1 ? FOOD_WORDS.oneMeal : FOOD_WORDS.meals(day.length);
  const numbers = day.length > waiting
    ? `<span>🍽 ${bigNumber(kcal)} קל׳ · ${bigNumber(protein)} ג׳ ${FOOD_WORDS.protein}</span>` : '<span>🍽</span>';
  // ארוחות shows today only, so only today's line opens it
  const tag = iso === toISODate(new Date()) ? `a href="#/group/${meals.id}"` : 'div';
  return `${sectionLabel(FOOD_WORDS.dayLabel)}<${tag} class="health-day journal-food">${numbers}<span>${count}${
    waiting ? FOOD_WORDS.waiting(waiting) : ''}</span></${tag.split(' ')[0]}>${day.length > waiting ? targetBarsHtml(kcal, protein) : ''}`;
}

// ---------- Daily target (2026-11-25) ----------
// An optional calories / protein target, kept on this device. Today's total
// then shows two thin bars: "1,450 / 2,000 קל׳ · עוד 550".
const TARGET_WORDS = {
  button: '🎯 יעד יומי',
  current: (kcal, protein) => `🎯 יעד: ${[kcal ? `${bigNumber(kcal)} קל׳` : '', protein ? `${bigNumber(protein)} ג׳ חלבון` : ''].filter(Boolean).join(' · ')}`,
  kcal: 'קלוריות', protein: 'חלבון (ג׳)', save: 'שמירה', hint: 'ריק = בלי יעד',
  bar: (name, done, goal, unit) => `${name} ${bigNumber(done)} / ${bigNumber(goal)}${unit}`,
  left: (n, unit) => ` · עוד ${bigNumber(n)}${unit}`,
  over: (n, unit) => ` · ${bigNumber(n)}${unit} מעל`,
  reached: ' · ✓',
};

function foodTarget() {
  try {
    const saved = JSON.parse(localStorage.getItem('foodTarget') || '{}');
    const clean = n => (Number.isFinite(n) && n > 0 ? Math.round(n) : 0);
    return { kcal: clean(saved.kcal), protein: clean(saved.protein) };
  } catch {
    return { kcal: 0, protein: 0 };
  }
}

function cacheFoodTarget(kcal, protein) {
  const clean = n => (Number.isFinite(n) && n > 0 ? Math.round(n) : 0);
  const target = { kcal: clean(kcal), protein: clean(protein) };
  try {
    if (target.kcal || target.protein) localStorage.setItem('foodTarget', JSON.stringify(target));
    else localStorage.removeItem('foodTarget');
  } catch { /* not important */ }
  return target;
}

// The target itself is the note "🎯 יעד יומי" in לא ממוין ("קלוריות: 2300" / "חלבון: 120"), so it
// syncs to every device and Claude can set it (set_food_target in notify/food.py). localStorage keeps
// a copy so the bars draw without waiting; with no note yet, a target set before 2026-11-26 still counts.
const TARGET_TITLE = '🎯 יעד יומי';

function parseFoodTarget(text) {
  const num = word => {
    const m = (text || '').match(new RegExp(`${word}\\s*:?\\s*(\\d[\\d,]*)`));
    return m ? Number(m[1].replace(/,/g, '')) : 0;
  };
  return { kcal: num('קלוריות'), protein: num('חלבון') };
}

async function loadFoodTarget() {
  const note = await foodNote(TARGET_TITLE);
  let seen = false;
  try { seen = localStorage.getItem('foodTargetNote') === '1'; } catch { /* not important */ }
  if (note) {
    const t = parseFoodTarget(note.text);
    cacheFoodTarget(t.kcal, t.protein);
    try { localStorage.setItem('foodTargetNote', '1'); } catch { /* not important */ }
  } else if (seen) {
    cacheFoodTarget(0, 0);   // the note was deleted (here or on another device): no target
  }
  return foodTarget();
}

async function saveFoodTarget(kcal, protein) {
  const target = cacheFoodTarget(kcal, protein);
  const text = [target.kcal ? `קלוריות: ${target.kcal}` : '', target.protein ? `חלבון: ${target.protein}` : '']
    .filter(Boolean).join('\n');
  const note = await foodNote(TARGET_TITLE);
  if (note) {
    if ((note.text || '') !== text) await updateItem(note.id, { text });
  } else if (text) {
    await addItem('inbox', { title: TARGET_TITLE, text });
  }
  return target;
}

// Calories: going over is the thing to notice. Protein: reaching it is.
function targetBarHtml(name, done, goal, unit, kind) {
  const pct = Math.min(100, Math.round(done / goal * 100));
  const rest = goal - done;
  const note = rest > 0 ? TARGET_WORDS.left(rest, unit)
    : kind === 'kcal' && rest < 0 ? TARGET_WORDS.over(-rest, unit) : TARGET_WORDS.reached;
  const state = kind === 'kcal' ? (rest < 0 ? 'over' : '') : (rest <= 0 ? 'reached' : '');
  return `<div class="target-bar ${state}"><span class="target-text">${TARGET_WORDS.bar(name, done, goal, unit)}${note}</span>
    <span class="target-track"><span class="target-fill" style="width:${pct}%"></span></span></div>`;
}

function targetBarsHtml(kcal, protein) {
  const target = foodTarget();
  const bars = [];
  if (target.kcal) bars.push(targetBarHtml('קל׳', kcal, target.kcal, '', 'kcal'));
  if (target.protein) bars.push(targetBarHtml('חלבון', protein, target.protein, ' ג׳', 'protein'));
  return bars.length ? `<div class="target-bars" data-target-edit>${bars.join('')}</div>` : '';
}

// The hub's "🎯 יעד יומי" line, only while there is no target; a tap opens two boxes in its place.
// With a target, a tap on the bars opens them (data-target-edit above).
function targetButtonHtml() {
  const target = foodTarget();
  if (target.kcal || target.protein) return '';
  return `<button type="button" class="text-button target-edit" data-target-edit>${TARGET_WORDS.button}</button>`;
}

function targetFormHtml() {
  const target = foodTarget();
  return `<form class="target-form" data-target-form>
    <label>${TARGET_WORDS.kcal} <input type="number" inputmode="numeric" min="0" step="50" name="kcal" value="${target.kcal || ''}"></label>
    <label>${TARGET_WORDS.protein} <input type="number" inputmode="numeric" min="0" step="5" name="protein" value="${target.protein || ''}"></label>
    <button type="submit" class="pill-button">${TARGET_WORDS.save}</button>
    <span class="field-hint">${TARGET_WORDS.hint}</span>
  </form>`;
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

// ============================================================
// THE FOOD HUB (#/food, 2026-11-25)
// One "אוכל" row on home instead of separate מתכונים and ארוחות rows.
// Inside: today's total, an easy "what I ate" (the box at the bottom adds
// a meal, 📷 opens #/meal), then meals, recipes, the shopping list and
// the kitchen note. Nothing moves: the notes stay in their groups.
// ============================================================

const KITCHEN_TITLE = '🍳 מה יש במטבח';
const HUB_WORDS = {
  title: 'אוכל',
  photoMeal: 'צילום ארוחה',
  addPlaceholder: 'מה אכלתי?…',
  meals: 'ארוחות', recipes: 'מתכונים', shopping: 'רשימת קניות', kitchen: 'מה יש במטבח',
  toBuy: n => n ? `${n} לקנות` : '',
  items: n => n ? `${n} פריטים` : '',
};
const FOOD_HUB = { id: 'food', name: HUB_WORDS.title, icon: 'utensils', tint: 'green' };

// Groups that live inside the hub (their own rows are left off home)
function isFoodHubGroup(groupId) {
  return groupId === 'recipes' || isMealsGroup(groupId);
}

async function foodNote(title) {
  return (await getItemsInGroup('inbox')).find(item => (item.title || '').trim() === title) || null;
}

async function foodScreen() {
  const meals = mealsGroup();
  const mealItems = meals ? await getItemsInGroup(meals.id) : [];
  const recipes = await getItemsInGroup('recipes');
  const shop = await foodNote(SHOP_TITLE);
  const kitchen = await foodNote(KITCHEN_TITLE);
  await loadFoodTarget();
  const today = toISODate(new Date());
  const todayCount = mealItems.filter(item => item.createdAt && toISODate(new Date(item.createdAt)) === today).length;
  const openToBuy = shop ? shopLines(shop.text).filter(line => !line.startsWith('✓')).length : 0;

  const row = (href, badge, name, end) => `
    <a class="row" href="${href}">
      ${groupBadge(badge, 'small')}
      <span class="row-main"><span class="row-title">${escapeHtml(name)}</span></span>
      <span class="row-end">${end}</span>
    </a>`;
  // ארוחות has no row of its own (2026-11-26): the small "N ארוחות היום" chip next to the photo opens it
  const rows = [];
  rows.push(row('#/group/recipes', findGroup('recipes'), HUB_WORDS.recipes, recipes.length || ''));
  if (shop) rows.push(row(`#/item/${shop.id}`, { icon: 'cart', tint: 'amber' }, HUB_WORDS.shopping, HUB_WORDS.toBuy(openToBuy)));
  if (kitchen) rows.push(row(`#/item/${kitchen.id}`, { icon: 'home', tint: 'teal' }, HUB_WORDS.kitchen,
    HUB_WORDS.items(shopLines(kitchen.text).length)));

  const ate = meals ? `
    <div class="food-ate">
      <div id="food-today">${mealsTodayHtml(mealItems)}</div>
      <div id="food-target">${targetButtonHtml()}</div>
      <div class="meal-chips">
        <a class="chip" id="food-count" href="#/group/${meals.id}">${mealsCountText(todayCount)}</a>
        <label class="chip photo-chip">${icon('camera', 'inline')} ${HUB_WORDS.photoMeal}
          <input type="file" accept="image/*" capture="environment" hidden data-meal-photo></label></div>
    </div>` : '';
  return ate + rowList(rows);
}

// ============================================================
// QUICK LOGGING (2026-11-25)
// Logging a meal in one tap, so it actually gets done:
//   - (the "שוב" repeat chips were removed on 2026-11-26: they cluttered the hub)
//   - the camera button saves "ארוחה 13:05" with the photo right away
//     (no editor); the server estimates it from the photo later.
//   - the home אוכל row shows today's numbers.
// ============================================================

const QUICK_WORDS = {
  photoLogged: 'הארוחה נשמרה עם התמונה',
  mealsToday: n => n === 1 ? 'ארוחה היום' : `${n} ארוחות היום`,
};

// The hub chip that opens ארוחות
const mealsCountText = n => (n ? QUICK_WORDS.mealsToday(n) : HUB_WORDS.meals);

function todayMeals(items) {
  const today = toISODate(new Date());
  return items.filter(item => item.createdAt && toISODate(new Date(item.createdAt)) === today);
}

// The end of the home אוכל row: "1,450 קל׳ · 82 ג׳" today, or else the count
async function foodHomeEnd(fallback) {
  const meals = mealsGroup();
  if (!meals) return fallback || '';
  const today = todayMeals(await getItemsInGroup(meals.id));
  if (!today.length) return fallback || '';
  let kcal = 0, protein = 0, known = 0;
  for (const meal of today) {
    const estimate = mealEstimate(meal);
    if (!estimate) continue;
    known++; kcal += estimate.kcal; protein += estimate.protein;
  }
  return known ? FOOD_WORDS.numbers(bigNumber(kcal), bigNumber(protein)) : QUICK_WORDS.mealsToday(today.length);
}

// Redraw just today's total (keeps the scroll and the box at the bottom)
async function refreshFoodToday() {
  const box = document.getElementById('food-today');
  const meals = mealsGroup();
  if (!box || !meals) return;
  await loadFoodTarget();
  const items = await getItemsInGroup(meals.id);
  box.innerHTML = mealsTodayHtml(items);
  const count = document.getElementById('food-count');
  if (count) count.textContent = mealsCountText(todayMeals(items).length);
}

function loggedToast(text, item) {
  haptic();
  showToast(text, {
    action: TEXT.undo, ms: 6000,
    onAction: async () => { await deleteItem(item.id); refreshFoodToday(); },
  });
}

function setupFoodHub() {
  const box = document.getElementById('quick-text');
  if (box) box.placeholder = HUB_WORDS.addPlaceholder;
  const hub = document.querySelector('.food-ate');
  const meals = mealsGroup();
  if (!hub || !meals) return;

  hub.addEventListener('submit', async event => {
    const form = event.target.closest('[data-target-form]');
    if (!form) return;
    event.preventDefault();
    await saveFoodTarget(Number(form.elements.kcal.value), Number(form.elements.protein.value));
    haptic();
    document.getElementById('food-target').innerHTML = targetButtonHtml();
    await refreshFoodToday();
  });

  hub.addEventListener('click', async event => {
    if (event.target.closest('[data-target-edit]')) {
      const box = document.getElementById('food-target');
      box.innerHTML = targetFormHtml();
      box.querySelector('input')?.focus();
    }
  });

  hub.addEventListener('change', async event => {
    const input = event.target.closest('[data-meal-photo]');
    const file = input?.files?.[0];
    if (!file) return;
    let photo;
    try {
      photo = await shrinkPhoto(file);
    } catch {
      alert(TEXT.photoError);
      return;
    } finally {
      input.value = '';
    }
    const item = await addItem(meals.id, { title: mealTitle(), photo });
    await refreshFoodToday();
    loggedToast(QUICK_WORDS.photoLogged, item);
  });
}

// ---------- Recipe categories ----------
// Recipe tags are free words (עוף, אייר פרייר, יפני…). The list's filter shows a few
// fixed categories instead, worked out from the tags and the title. A tag that is
// exactly a category's name wins; otherwise the first category whose words match.
const RECIPE_CATEGORIES = [
  ['ארוחת בוקר', ['ארוחת בוקר', 'בוקר', 'חביתה', 'שקשוקה', 'פנקייק', 'גרנולה', 'דייסה', 'טוסט']],
  ['קינוחים', ['קינוח', 'עוג', 'שוקולד', 'גלידה', 'בראוני', 'מאפין', 'מתוק', 'פאי', 'קרם', 'ממתק']],
  ['מרקים', ['מרק']],
  ['סלטים', ['סלט']],
  ['מאפים ולחמים', ['לחם', 'מאפה', 'מאפים', 'פיצה', 'בצק', 'פוקאצ', 'פיתה', 'בורקס']],
  // before תוספות, so "עוף עם אורז" is a main dish and not a side
  ['עיקריות', ['עיקרית', 'עיקריות', 'עוף', 'בשר', ' דג ', 'דגים', 'סלמון', 'פסטה', 'קציצ', 'טופו', 'סטייק', 'המבורגר', 'נודלס', 'שניצל', 'קארי', 'מוקפץ']],
  ['תוספות', ['תוספת', 'צ\'יפס', 'ציפס', 'בטטה', 'תפוחי אדמה', 'תפו"א', 'אורז', 'פירה', 'קוסקוס', 'פתיתים']],
];
const OTHER_CATEGORY = 'אחר';

function recipeCategory(item) {
  const tags = parseTags(item.tags).map(tag => tag.trim());
  const named = RECIPE_CATEGORIES.find(([name]) => tags.includes(name));
  if (named) return named[0];
  // the tags say more than the title, so look at them first; spaces around the
  // text let a short key like ' דג ' match a whole word only
  for (const text of [tags.join(' '), item.title || '']) {
    const padded = ` ${text.replace(/[,.;:!?()]/g, ' ')} `;
    const found = RECIPE_CATEGORIES.find(([, keys]) => keys.some(key => padded.includes(key)));
    if (found) return found[0];
  }
  return OTHER_CATEGORY;
}

// "הכל" plus the categories that have recipes, in the fixed order
function recipeCategoryChips(items) {
  const used = new Set(items.map(recipeCategory));
  const names = [...RECIPE_CATEGORIES.map(([name]) => name), OTHER_CATEGORY].filter(name => used.has(name));
  return names.length > 1 ? filterChips(Object.fromEntries([['', TEXT.all], ...names.map(n => [n, n])]), '') : '';
}

// ---------- A meal from a recipe (2026-11-26) ----------
// Each recipe row has a "+": it opens a small form under the row (how many servings, and
// an optional sentence of changes, like "חצי מהשיבולת שועל, במקום זה חצי בננה") and saves
// a meal in ארוחות. The meal's text carries the recipe's ingredients and servings, so the
// server's estimate (notify autofill) counts the right dish and the changes.

const FROM_RECIPE_WORDS = {
  add: 'להוסיף לארוחות',
  servings: 'כמה מנות אכלתי',
  changes: 'שינויים (לא חובה)',
  changesHint: 'למשל: חצי מכמות השיבולת שועל, ובמקומה חצי בננה',
  save: 'הוספה',
  cancel: 'ביטול',
  portion: n => n === 1 ? 'מנה אחת' : n === 0.5 ? 'חצי מנה' : `${n} מנות`,
  line: (portion, title, servings) => `${portion} מהמתכון "${title}"${servings ? ` (המתכון ל-${servings} מנות)` : ''}`,
  changesLine: text => `שינויים: ${text}`,
  ingredients: 'מצרכים (לכל המתכון)',
  logged: title => `נוסף לארוחות: ${escapeHtml(title)}`,
};
const INGREDIENTS_MAX = 1500;

function addMealButtonHtml(item) {
  if (!mealsGroup()) return '';
  return `<span class="add-meal" role="button" tabindex="0" data-add-meal="${escapeHtml(item.id)}"
    aria-label="${FROM_RECIPE_WORDS.add}" title="${FROM_RECIPE_WORDS.add}">${icon('plus')}</span>`;
}

// The meal note's text: the portion, the changes, then the recipe's ingredients
function mealFromRecipeText(recipe, portion, changes) {
  const servings = String(recipe.servings || '').trim();
  const ingredients = (recipe.ingredients || '').split('\n').map(line => line.trim()).filter(Boolean).join(' · ');
  return [
    FROM_RECIPE_WORDS.line(FROM_RECIPE_WORDS.portion(portion), (recipe.title || '').trim(), servings),
    changes ? FROM_RECIPE_WORDS.changesLine(changes) : '',
    ingredients ? `${FROM_RECIPE_WORDS.ingredients}: ${ingredients.slice(0, INGREDIENTS_MAX)}` : '',
  ].filter(Boolean).join('\n');
}

function addMealFormHtml(recipeId, filter) {
  return `<form class="add-meal-form" data-add-meal-form="${escapeHtml(recipeId)}"${
    filter !== undefined ? ` data-filter-values="${escapeHtml(filter)}"` : ''}>
    <label>${FROM_RECIPE_WORDS.servings} <input type="number" inputmode="decimal" min="0.25" step="0.25" name="portion" value="1"></label>
    <label class="add-meal-changes">${FROM_RECIPE_WORDS.changes}
      <input type="text" name="changes" dir="auto" placeholder="${FROM_RECIPE_WORDS.changesHint}"></label>
    <span class="add-meal-buttons">
      <button type="submit" class="pill-button">${icon('plus', 'inline')} ${FROM_RECIPE_WORDS.save}</button>
      <button type="button" class="pill-button" data-add-meal-cancel>${FROM_RECIPE_WORDS.cancel}</button>
    </span>
  </form>`;
}

function openAddMealForm(button) {
  const row = button.closest('.row');
  if (!row) return;
  const open = row.nextElementSibling?.matches('[data-add-meal-form]') ? row.nextElementSibling : null;
  document.querySelectorAll('[data-add-meal-form]').forEach(form => form.remove());
  if (open) return;   // a second tap closes it
  row.insertAdjacentHTML('afterend', addMealFormHtml(button.dataset.addMeal, row.dataset.filterValues));
  row.nextElementSibling.querySelector('[name=changes]')?.focus();
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-add-meal]');
  if (button) {
    event.preventDefault();   // the "+" sits inside the recipe's row link
    event.stopPropagation();
    haptic(5);
    openAddMealForm(button);
    return;
  }
  if (event.target.closest('[data-add-meal-cancel]')) event.target.closest('[data-add-meal-form]')?.remove();
}, true);

document.addEventListener('keydown', event => {
  const button = event.target.closest?.('[data-add-meal]');
  if (!button || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  openAddMealForm(button);
});

document.addEventListener('submit', async event => {
  const form = event.target.closest('[data-add-meal-form]');
  if (!form) return;
  event.preventDefault();
  const meals = mealsGroup();
  const submit = form.querySelector('[type=submit]');
  if (!meals || submit.disabled) return;
  submit.disabled = true;   // no double meals from a double tap
  try {
    const recipe = await getItem(form.dataset.addMealForm);
    if (!recipe) return;
    const portion = Number(form.elements.portion.value) > 0 ? Number(form.elements.portion.value) : 1;
    const changes = form.elements.changes.value.trim().replace(/\s+/g, ' ');
    const item = await addItem(meals.id, {
      title: (recipe.title || '').trim() || FOOD_WORDS.meal,
      text: mealFromRecipeText(recipe, portion, changes),
    });
    form.remove();
    loggedToast(FROM_RECIPE_WORDS.logged(item.title), item);
  } finally {
    submit.disabled = false;
  }
});
