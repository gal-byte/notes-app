// ============================================================
// YOUR OWN GROUPS
// Create a group with a name, an emoji and an optional quick-add
// shortcut. Rename it, move it, or delete it (its items then
// move to "לא ממוין", so nothing is lost).
// ============================================================

const EMOJI_SUGGESTIONS = ['🎁', '📚', '💡', '🛒', '✈️', '💼', '🏋️', '🎮',
                           '🌱', '🐶', '💊', '🏠', '🎨', '📝', '⭐', '❤️'];

// Load your groups from the database and put them after the built-in ones
async function loadGroups() {
  const custom = await getCustomGroups();
  GROUPS = [...BUILT_IN_GROUPS, ...custom.map(group => ({ ...group, custom: true }))];
}

function customGroups() {
  return GROUPS.filter(group => group.custom);
}

// Keep only the first emoji you typed ("🎁🎁" → "🎁")
function firstEmoji(text) {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (Intl.Segmenter) return [...new Intl.Segmenter().segment(trimmed)][0].segment;
  return Array.from(trimmed)[0];
}

// Is this shortcut already used by another group?
function shortcutTaken(shortcut, exceptId) {
  if (!shortcut) return false;
  if (QUICK_ADD_RULES.shortcuts[shortcut]) return true;
  return customGroups().some(group => group.id !== exceptId && group.shortcut === shortcut);
}

function nameTaken(name, exceptId) {
  return GROUPS.some(group => group.id !== exceptId && group.name === name);
}

// ---------- The create / edit screen ----------

function groupSettingsScreen(id) {
  const existing = id === 'new' ? null : customGroups().find(group => group.id === id);
  if (id !== 'new' && !existing) return null;

  const group = existing || { name: '', emoji: '📁', shortcut: '' };
  const others = customGroups();
  const position = existing ? others.findIndex(g => g.id === id) : -1;

  const suggestions = EMOJI_SUGGESTIONS.map(emoji =>
    `<button type="button" class="emoji-choice" data-emoji="${emoji}">${emoji}</button>`
  ).join('');

  const moveButtons = existing && others.length > 1 ? `
    <div class="field">
      <span class="field-label">${TEXT.groupOrder}</span>
      <div class="photo-buttons">
        <button type="button" class="small-button" data-move-group="-1" ${position === 0 ? 'disabled' : ''}>${TEXT.moveEarlier}</button>
        <button type="button" class="small-button" data-move-group="1" ${position === others.length - 1 ? 'disabled' : ''}>${TEXT.moveLater}</button>
      </div>
    </div>` : '';

  return `
    <form class="editor" id="group-form" data-id="${existing ? existing.id : ''}">
      <label class="field">
        <span class="field-label">${TEXT.groupName}</span>
        <input type="text" id="group-name" dir="auto" maxlength="30"
               value="${escapeHtml(group.name)}" placeholder="${TEXT.groupNameHint}">
      </label>

      <div class="field">
        <span class="field-label">${TEXT.groupEmoji}</span>
        <div class="emoji-row">
          <input type="text" id="group-emoji" class="emoji-input" value="${escapeHtml(group.emoji)}" aria-label="${TEXT.groupEmoji}">
          <div class="emoji-choices">${suggestions}</div>
        </div>
      </div>

      <label class="field">
        <span class="field-label">${TEXT.groupShortcut}</span>
        <input type="text" id="group-shortcut" dir="auto" maxlength="10"
               value="${escapeHtml(group.shortcut || '')}" placeholder="${TEXT.groupShortcutHint}">
        <span class="field-hint" id="form-message"></span>
      </label>

      ${moveButtons}

      <button type="submit" class="primary-button">${existing ? TEXT.saveGroup : TEXT.createGroup}</button>
      ${existing ? `<button type="button" class="danger-button" id="delete-group">${TEXT.deleteGroup}</button>` : ''}
    </form>
  `;
}

function setupGroupSettings() {
  const form = document.getElementById('group-form');
  const id = form.dataset.id || null;
  const nameBox = document.getElementById('group-name');
  const emojiBox = document.getElementById('group-emoji');
  const shortcutBox = document.getElementById('group-shortcut');
  const message = document.getElementById('form-message');

  // Leave this screen: back to where you came from, or to the group
  function leave(groupId) {
    if (movedInsideApp && id) history.back();
    else location.replace(groupId ? `#/group/${groupId}` : '#/groups');
  }

  // Tap a suggested emoji
  form.addEventListener('click', async event => {
    const choice = event.target.closest('[data-emoji]');
    if (choice) {
      emojiBox.value = choice.dataset.emoji;
      return;
    }

    // Move earlier / later: swap places with the neighbour
    const move = event.target.closest('[data-move-group]');
    if (move) {
      const list = customGroups();
      const from = list.findIndex(g => g.id === id);
      const to = from + Number(move.dataset.moveGroup);
      if (to < 0 || to >= list.length) return;
      const a = list[from];
      const b = list[to];
      await saveCustomGroup({ ...withoutFlag(a), order: b.order });
      await saveCustomGroup({ ...withoutFlag(b), order: a.order });
      await loadGroups();
      showScreen();  // redraw this screen with the new order
      return;
    }

    if (event.target.closest('#delete-group')) {
      const group = customGroups().find(g => g.id === id);
      const items = await getItemsInGroup(id);
      if (!confirm(TEXT.confirmDeleteGroup(group.name, items.length))) return;
      for (const item of items) await updateItem(item.id, { group: 'inbox' });
      await deleteCustomGroup(id);
      await loadGroups();
      location.replace('#/groups');
    }
  });

  // Check the shortcut while typing
  shortcutBox.addEventListener('input', () => {
    const shortcut = shortcutBox.value.replace(/[:\s]/g, '');
    message.textContent = shortcutTaken(shortcut, id) ? TEXT.shortcutTaken : '';
  });

  // Create / save
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = nameBox.value.trim();
    const emoji = firstEmoji(emojiBox.value) || '📁';
    const shortcut = shortcutBox.value.replace(/[:\s]/g, '');

    if (!name) { message.textContent = TEXT.groupNameNeeded; nameBox.focus(); return; }
    if (nameTaken(name, id)) { message.textContent = TEXT.groupNameTaken; nameBox.focus(); return; }
    if (shortcutTaken(shortcut, id)) { message.textContent = TEXT.shortcutTaken; shortcutBox.focus(); return; }

    if (id) {
      const old = customGroups().find(g => g.id === id);
      await saveCustomGroup({ ...withoutFlag(old), name, emoji, shortcut });
      await loadGroups();
      leave(id);
    } else {
      const highest = Math.max(0, ...customGroups().map(g => g.order));
      const newId = 'g-' + crypto.randomUUID().slice(0, 8);
      await saveCustomGroup({ id: newId, name, emoji, shortcut, order: highest + 1 });
      await loadGroups();
      location.replace(`#/group/${newId}`);
    }
  });
}

// The "custom: true" mark is only used while the app runs, don't save it
function withoutFlag(group) {
  const { custom, ...rest } = group;
  return rest;
}
