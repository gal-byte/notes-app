// ============================================================
// SEARCH
// Looks through every item in every group as you type.
// Several words = all of them must appear (in any order).
// Results are grouped by group, with the matching words marked.
// ============================================================

// Which parts of an item are searched
const SEARCH_FIELDS = ['title', 'text', 'lyrics', 'ingredients', 'steps', 'tags', 'recommendedBy'];

// Remembered while the app is open, so after opening a result
// and going back, your search is still there
let searchQuery = '';

// "  Dune  שוגון " → ['dune', 'שוגון']
function searchTerms(query) {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

function itemMatches(item, terms) {
  const everything = SEARCH_FIELDS.map(field => item[field] || '').join('\n').toLowerCase();
  return terms.every(term => everything.includes(term));
}

// Makes a word safe to use inside a search pattern ("C++" → "C\+\+")
function escapeForPattern(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Safe HTML with the search words wrapped in <mark> (shown highlighted)
function highlight(text, terms) {
  if (!terms.length) return escapeHtml(text);
  const pattern = new RegExp(`(${terms.map(escapeForPattern).join('|')})`, 'gi');
  return String(text).split(pattern)
    .map((part, i) => i % 2 === 1 ? `<mark>${escapeHtml(part)}</mark>` : escapeHtml(part))
    .join('');
}

// The line (in lyrics, notes, ingredients…) where a search word was found
function matchingLine(item, terms) {
  for (const field of SEARCH_FIELDS) {
    if (field === 'title') continue;
    const value = String(item[field] || '');
    const lower = value.toLowerCase();
    for (const term of terms) {
      const at = lower.indexOf(term);
      if (at === -1) continue;
      // Cut out just that line
      const start = lower.lastIndexOf('\n', at) + 1;
      const end = lower.indexOf('\n', at) === -1 ? value.length : lower.indexOf('\n', at);
      let line = value.slice(start, end);
      // Very long line: keep about 60 characters around the word
      if (line.length > 70) {
        const from = Math.max(0, at - start - 25);
        line = (from > 0 ? '…' : '') + line.slice(from, from + 60) + '…';
      }
      return highlight(line, terms);
    }
  }
  return '';
}

function searchScreen() {
  return `
    <form class="search-form" id="search-form">
      <input class="search-input" id="search-input" type="search" dir="auto"
             placeholder="${TEXT.searchPlaceholder}" value="${escapeHtml(searchQuery)}">
    </form>
    <div id="search-results"></div>
  `;
}

function setupSearch() {
  const form = document.getElementById('search-form');
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  let allItems = null;  // loaded once when the screen opens
  let timer = null;

  async function showResults() {
    if (!allItems) allItems = await getAllItems();
    const terms = searchTerms(searchQuery);
    const oldPhotos = takePhotoUrls();

    if (!terms.length) {
      results.innerHTML = `<p class="empty">${TEXT.searchHint}</p>`;
    } else {
      const found = allItems.filter(item => itemMatches(item, terms));
      results.innerHTML = found.length
        ? resultsHtml(found, terms)
        : `<p class="empty">${TEXT.searchNoResults(escapeHtml(searchQuery.trim()))}</p>`;
    }
    oldPhotos.forEach(url => URL.revokeObjectURL(url));
  }

  // Wait until you pause typing for a moment, then search
  input.addEventListener('input', () => {
    searchQuery = input.value;
    clearTimeout(timer);
    timer = setTimeout(showResults, 150);
  });

  // "Enter" on the keyboard just closes the keyboard
  form.addEventListener('submit', event => {
    event.preventDefault();
    input.blur();
  });

  showResults();
  if (!searchQuery) input.focus();
}

function resultsHtml(found, terms) {
  // Titles that match come first, then the most recently changed
  const titleMatch = item => terms.every(term => (item.title || '').toLowerCase().includes(term));
  found.sort((a, b) => (titleMatch(b) - titleMatch(a)) || (b.updatedAt - a.updatedAt));

  let html = `<p class="search-count">${TEXT.searchCount(found.length)}</p>`;

  // One section per group, in the usual group order
  for (const group of GROUPS) {
    const inGroup = found.filter(item => findGroup(item.group).id === group.id);
    if (!inGroup.length) continue;
    html += `<h2 class="section-title">${groupTitle(group)} · ${inGroup.length}</h2>`;
    html += listCard(inGroup.map(item => itemRow(item, matchingLine(item, terms), {
      titleHtml: highlight(item.title || TEXT.untitled, terms),
      photo: item.photo,
    })));
  }
  return html;
}
