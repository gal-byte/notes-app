// ============================================================
// RECIPE TABLE ("engineer" style, like Cooking for Engineers)
// The ingredients go down the first column; each step is a cell
// to its side that spans exactly the ingredients (and earlier
// steps) it combines, so the whole recipe reads as one tree:
//
//   קמח   ┐
//   סוכר  ├ מערבבים ┐
//   ביצים ┘         ├ אופים 30 דק'
//   חמאה  ─ ממיסים  ┘
//
// Stored on the recipe as text (field "table"), one step per line:
//   "1, 2, 3 | מערבבים"     numbers = ingredient lines (from 1)
//   "4 | ממיסים"
//   "ש1, ש2 | אופים 30 דק'" ש1 / s1 = what step 1 made
// Claude writes it (connector add_recipe), and it can be typed by
// hand under "טבלת הכנה". Ingredients no step uses get a row of
// their own at the bottom.
// ============================================================

const TABLE_WORDS = {
  title: 'טבלת הכנה',
  edit: 'עריכת הטבלה',
  hint: 'שלב בכל שורה: מספרי מצרכים | מה עושים\nלמשל: 1, 2 | מערבבים\nש1, 3 | אופים 20 דק\'',
  problems: 'שורות שלא הובנו:',
};

// Text → { steps: [{ text, inputs: [{kind:'ing'|'step', n}] }], problems: [line numbers] }
function parseRecipeTable(text, ingredientCount) {
  const steps = [];
  const problems = [];
  String(text || '').split('\n').forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const bar = line.indexOf('|');
    const action = bar < 0 ? '' : line.slice(bar + 1).trim();
    const refs = bar < 0 ? [] : line.slice(0, bar).split(/[,،\s]+/).filter(Boolean);
    const inputs = [];
    let ok = !!action && refs.length > 0;
    for (const ref of refs) {
      const match = ref.match(/^(s|ש)?(\d+)$/i);
      const n = match ? Number(match[2]) : 0;
      if (!n) { ok = false; break; }
      if (match[1]) {
        if (n > steps.length) { ok = false; break; }   // only earlier steps
        inputs.push({ kind: 'step', n });
      } else {
        if (n > ingredientCount) { ok = false; break; }
        inputs.push({ kind: 'ing', n });
      }
    }
    if (!ok) { problems.push(index + 1); return; }
    steps.push({ text: action, inputs });
  });
  return { steps, problems };
}

// "--- רוטב ---" / "לרוטב:" — a heading inside the ingredients, not an ingredient
function isIngredientHeader(line) {
  return /^[-–—=*\s]{2,}.*[-–—=*]{2,}\s*$/.test(line) || /^[^\d]{1,25}:$/.test(line);
}

// Lays the tree out as table cells. Each ingredient and each step is
// used once (a second use of the same one is dropped), so every step's
// rows are next to each other. Returns rows of cells
// [{ text, rowspan, colspan, kind }] in reading order, or null.
function layoutRecipeTable(ingredientLines, steps) {
  if (!steps.length) return null;
  const usedIng = new Set();
  const usedStep = new Set();
  // Inputs of each step, keeping only first uses
  const children = steps.map(step => step.inputs.filter(input => {
    const set = input.kind === 'ing' ? usedIng : usedStep;
    const key = input.n;
    if (set.has(key)) return false;
    set.add(key);
    return true;
  }));
  // Column of each step: one past the furthest of its inputs (ingredients are column 0)
  const column = [];
  steps.forEach((_, i) => {
    column[i] = 1 + Math.max(0, ...children[i].map(c => c.kind === 'step' ? column[c.n - 1] : 0));
  });
  const width = Math.max(...column) + 1;

  const rows = [];        // rows[r] = cells starting on row r
  const newRow = () => { rows.push([]); return rows.length - 1; };

  // Draws a node whose cell runs from its column up to `until` (the parent's column - 1).
  // Returns how many rows it took.
  function place(node, until) {
    if (node.kind === 'ing') {
      const r = newRow();
      rows[r].push({ text: ingredientLines[node.n - 1], rowspan: 1, colspan: until + 1, kind: 'ing' });
      return 1;
    }
    const i = node.n - 1;
    const first = rows.length;
    let height = 0;
    for (const child of children[i]) height += place(child, column[i] - 1);
    if (!height) {   // a step with no usable inputs: a row of its own
      newRow();
      height = 1;
      rows[first].push({ text: '', rowspan: 1, colspan: column[i], kind: 'gap' });
    }
    rows[first].push({ text: steps[i].text, rowspan: height, colspan: until - column[i] + 1, kind: 'step' });
    return height;
  }

  // The last steps (the ones nothing else uses) are the roots, top to bottom
  steps.forEach((_, i) => { if (!usedStep.has(i + 1)) place({ kind: 'step', n: i + 1 }, width - 1); });
  // Ingredients no step uses (but not section lines like "--- רוטב ---")
  ingredientLines.forEach((line, i) => {
    if (!usedIng.has(i + 1) && !isIngredientHeader(line)) place({ kind: 'ing', n: i + 1 }, width - 1);
  });
  return rows;
}

function recipeTableHtml(draft, factor = 1) {
  let ingredients = String(draft.ingredients || '');
  if (factor !== 1 && typeof scaleIngredients === 'function') ingredients = scaleIngredients(ingredients, factor);
  const lines = ingredients.split('\n').map(l => l.trim()).filter(Boolean);
  const { steps, problems } = parseRecipeTable(draft.table, lines.length);
  const rows = layoutRecipeTable(lines, steps);
  if (!rows) return problems.length ? `<p class="recipe-table-problems">${TABLE_WORDS.problems} ${problems.join(', ')}</p>` : '';
  const body = rows.map(cells => `<tr>${cells.map(cell =>
    `<td class="rt-${cell.kind}"${cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : ''}${cell.colspan > 1 ? ` colspan="${cell.colspan}"` : ''} dir="auto">${escapeHtml(cell.text)}</td>`
  ).join('')}</tr>`).join('');
  return `
    <div class="recipe-table-wrap">
      <span class="label">${TABLE_WORDS.title}</span>
      <div class="recipe-table-scroll"><table class="recipe-table">${body}</table></div>
      ${problems.length ? `<p class="recipe-table-problems">${TABLE_WORDS.problems} ${problems.join(', ')}</p>` : ''}
    </div>`;
}

// The box where the table is drawn; update() redraws it after the
// ingredients, the table text or the scaler's servings change.
function setupRecipeTable(form, getDraft) {
  const box = form.querySelector('#recipe-table');
  if (!box) return { update() {} };
  let factor = 1;
  const draw = () => { box.innerHTML = recipeTableHtml(getDraft(), factor); };
  draw();
  return {
    update(newFactor) {
      if (typeof newFactor === 'number') factor = newFactor;
      draw();
    },
  };
}
