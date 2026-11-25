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
    waiting ? FOOD_WORDS.waiting(waiting) : ''}</p>${targetBarsHtml(kcal, protein)}`;
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

function saveFoodTarget(kcal, protein) {
  const clean = n => (Number.isFinite(n) && n > 0 ? Math.round(n) : 0);
  const target = { kcal: clean(kcal), protein: clean(protein) };
  try {
    if (target.kcal || target.protein) localStorage.setItem('foodTarget', JSON.stringify(target));
    else localStorage.removeItem('foodTarget');
  } catch { /* not important */ }
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
  return bars.length ? `<div class="target-bars">${bars.join('')}</div>` : '';
}

// The hub's "🎯 יעד יומי" line; a tap opens two boxes in its place
function targetButtonHtml() {
  const target = foodTarget();
  const label = target.kcal || target.protein ? TARGET_WORDS.current(target.kcal, target.protein) : TARGET_WORDS.button;
  return `<button type="button" class="text-button target-edit" data-target-edit>${label}</button>`;
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
  addHint: 'מה אכלתי? כתבו בתיבה למטה, או צלמו',
  addPlaceholder: 'מה אכלתי?…',
  meals: 'ארוחות', recipes: 'מתכונים', shopping: 'רשימת קניות', kitchen: 'מה יש במטבח',
  mealsToday: n => n ? `${n} היום` : '',
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
  const today = toISODate(new Date());
  const todayCount = mealItems.filter(item => item.createdAt && toISODate(new Date(item.createdAt)) === today).length;
  const openToBuy = shop ? shopLines(shop.text).filter(line => !line.startsWith('✓')).length : 0;

  const row = (href, badge, name, end) => `
    <a class="row" href="${href}">
      ${groupBadge(badge, 'small')}
      <span class="row-main"><span class="row-title">${escapeHtml(name)}</span></span>
      <span class="row-end">${end}</span>
    </a>`;
  const rows = [];
  if (meals) rows.push(row(`#/group/${meals.id}`, meals, HUB_WORDS.meals, HUB_WORDS.mealsToday(todayCount)));
  rows.push(row('#/group/recipes', findGroup('recipes'), HUB_WORDS.recipes, recipes.length || ''));
  if (shop) rows.push(row(`#/item/${shop.id}`, { icon: 'cart', tint: 'amber' }, HUB_WORDS.shopping, HUB_WORDS.toBuy(openToBuy)));
  if (kitchen) rows.push(row(`#/item/${kitchen.id}`, { icon: 'home', tint: 'teal' }, HUB_WORDS.kitchen,
    HUB_WORDS.items(shopLines(kitchen.text).length)));

  const chips = repeatMeals(mealItems).map(meal =>
    `<button type="button" class="chip meal-chip" data-repeat-meal="${meal.id}" dir="auto">${escapeHtml(meal.title.trim())}</button>`).join('');
  const ate = meals ? `
    <div class="food-ate">
      <div id="food-today">${mealsTodayHtml(mealItems)}</div>
      <div id="food-target">${targetButtonHtml()}</div>
      ${chips ? `<p class="field-hint">${QUICK_WORDS.again}</p><div class="meal-chips">${chips}</div>` : ''}
      <p class="field-hint">${HUB_WORDS.addHint}</p>
      <label class="pill-button">${icon('camera', 'inline')} ${HUB_WORDS.photoMeal}
        <input type="file" accept="image/*" capture="environment" hidden data-meal-photo></label>
    </div>` : '';
  return ate + rowList(rows);
}

// ============================================================
// QUICK LOGGING (2026-11-25)
// Logging a meal in one tap, so it actually gets done:
//   - "שוב" chips on the hub: meals eaten often lately. A tap saves the
//     same meal again with its "≈" line, so the numbers show at once (the
//     server skips notes that already have one). Undo in the message.
//   - the camera button saves "ארוחה 13:05" with the photo right away
//     (no editor); the server estimates it from the photo later.
//   - the home אוכל row shows today's numbers.
// ============================================================

const QUICK_WORDS = {
  again: 'שוב? נגיעה אחת רושמת',
  logged: title => `נרשם: ${escapeHtml(title)}`,
  photoLogged: 'הארוחה נשמרה עם התמונה',
  mealsToday: n => n === 1 ? 'ארוחה היום' : `${n} ארוחות היום`,
};
const REPEAT_DAYS = 30;
const REPEAT_MAX = 8;
const PHOTO_ONLY_TITLE = /^ארוחה \d{1,2}:\d{2}$/;   // "ארוחה 13:05" says nothing to repeat

const mealKey = title => (title || '').trim().replace(/\s+/g, ' ').toLowerCase();

// The meals worth a chip: most often first, then most recent; one note per meal
// (the newest one that has numbers, so the copy shows them at once)
function repeatMeals(items) {
  const since = Date.now() - REPEAT_DAYS * 86400000;
  const byMeal = new Map();
  for (const item of items) {
    const key = mealKey(item.title);
    if (!key || PHOTO_ONLY_TITLE.test(key) || !(item.createdAt >= since)) continue;
    const entry = byMeal.get(key) || { count: 0, last: 0, source: null };
    entry.count++;
    entry.last = Math.max(entry.last, item.createdAt);
    const better = !entry.source || (!!mealEstimate(item) > !!mealEstimate(entry.source))
      || (!!mealEstimate(item) === !!mealEstimate(entry.source) && item.createdAt > entry.source.createdAt);
    if (better) entry.source = item;
    byMeal.set(key, entry);
  }
  return [...byMeal.values()].sort((a, b) => b.count - a.count || b.last - a.last)
    .slice(0, REPEAT_MAX).map(entry => entry.source);
}

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
  if (box && meals) box.innerHTML = mealsTodayHtml(await getItemsInGroup(meals.id));
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
    saveFoodTarget(Number(form.elements.kcal.value), Number(form.elements.protein.value));
    haptic();
    document.getElementById('food-target').innerHTML = targetButtonHtml();
    await refreshFoodToday();
  });

  hub.addEventListener('click', async event => {
    if (event.target.closest('[data-target-edit]')) {
      const box = document.getElementById('food-target');
      box.innerHTML = targetFormHtml();
      box.querySelector('input')?.focus();
      return;
    }
    const chip = event.target.closest('[data-repeat-meal]');
    if (!chip || chip.disabled) return;
    chip.disabled = true;   // no double meals from a double tap
    try {
      const source = await getItem(chip.dataset.repeatMeal);
      if (!source) return;
      const line = (source.text || '').split('\n').find(l => ESTIMATE_LINE.test(l));
      const item = await addItem(meals.id, { title: source.title.trim(), text: line ? line.trim() : '' });
      await refreshFoodToday();
      loggedToast(QUICK_WORDS.logged(item.title), item);
    } finally {
      setTimeout(() => { chip.disabled = false; }, 800);
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
