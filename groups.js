// ============================================================
// YOUR OWN GROUPS
// Create a group with a name, an icon, a color and an optional quick-add
// shortcut. Rename it, move it, or delete it (its items then
// move to "לא ממוין", so nothing is lost).
// ============================================================

// Load your groups from the database and put them after the built-in ones
async function loadGroups() {
  const custom = await getCustomGroups();
  GROUPS = [...BUILT_IN_GROUPS, ...custom.map(group => ({ ...group, custom: true }))];
}

function customGroups() {
  return GROUPS.filter(group => group.custom);
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

  // A new group gets the next color that isn't used yet
  const usedTints = customGroups().map(g => g.tint);
  const freeTint = TINTS.find(t => !usedTints.includes(t)) || 'teal';
  const group = existing || { name: '', icon: 'folder', tint: freeTint, shortcut: '' };
  const others = customGroups();
  const position = existing ? others.findIndex(g => g.id === id) : -1;

  // An older group made with an emoji: no icon is selected until you pick one
  const iconChoices = GROUP_ICON_CHOICES.map(name =>
    `<button type="button" class="icon-choice${name === group.icon ? ' selected' : ''}" data-icon="${name}" aria-label="${name}">${icon(name)}</button>`
  ).join('');
  const tintChoices = TINTS.map(tint =>
    `<button type="button" class="tint-choice t-${tint}${tint === (group.tint || 'slate') ? ' selected' : ''}" data-tint="${tint}" aria-label="${tint}"></button>`
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
        <span class="field-label">${TEXT.groupIcon}</span>
        <div class="icon-picker" id="icon-picker" data-icon="${escapeHtml(group.icon || '')}" data-tint="${escapeHtml(group.tint || 'slate')}">
          <div class="tint-choices">${tintChoices}</div>
          <div class="icon-choices t-${escapeHtml(group.tint || 'slate')}">${iconChoices}</div>
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
  const picker = document.getElementById('icon-picker');
  const shortcutBox = document.getElementById('group-shortcut');
  const message = document.getElementById('form-message');

  // Leave this screen: back to where you came from, or to the group
  function leave(groupId) {
    if (movedInsideApp && id) history.back();
    else location.replace(groupId ? `#/group/${groupId}` : '#/groups');
  }

  // Pick an icon or a color
  form.addEventListener('click', async event => {
    const iconChoice = event.target.closest('.icon-choice');
    if (iconChoice) {
      picker.dataset.icon = iconChoice.dataset.icon;
      picker.querySelectorAll('.icon-choice').forEach(b => b.classList.toggle('selected', b === iconChoice));
      return;
    }
    const tintChoice = event.target.closest('.tint-choice');
    if (tintChoice) {
      picker.dataset.tint = tintChoice.dataset.tint;
      picker.querySelectorAll('.tint-choice').forEach(b => b.classList.toggle('selected', b === tintChoice));
      picker.querySelector('.icon-choices').className = `icon-choices t-${tintChoice.dataset.tint}`;
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
      const now = Date.now();
      await saveCustomGroup({ ...withoutFlag(a), order: b.order, updatedAt: now });
      await saveCustomGroup({ ...withoutFlag(b), order: a.order, updatedAt: now });
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
    const tint = picker.dataset.tint || 'slate';
    // Keep an older group's emoji until an icon is picked
    const looks = picker.dataset.icon ? { icon: picker.dataset.icon, tint } : { tint };
    const shortcut = shortcutBox.value.replace(/[:\s]/g, '');

    if (!name) { message.textContent = TEXT.groupNameNeeded; nameBox.focus(); return; }
    if (nameTaken(name, id)) { message.textContent = TEXT.groupNameTaken; nameBox.focus(); return; }
    if (shortcutTaken(shortcut, id)) { message.textContent = TEXT.shortcutTaken; shortcutBox.focus(); return; }

    if (id) {
      const old = customGroups().find(g => g.id === id);
      await saveCustomGroup({ ...withoutFlag(old), name, ...looks, shortcut, updatedAt: Date.now() });
      await loadGroups();
      leave(id);
    } else {
      const highest = Math.max(0, ...customGroups().map(g => g.order));
      const newId = 'g-' + crypto.randomUUID().slice(0, 8);
      await saveCustomGroup({ id: newId, name, ...looks, shortcut, order: highest + 1, updatedAt: Date.now() });
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
