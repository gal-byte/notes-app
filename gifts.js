// ============================================================
// GIFTS
// One item per person: their birthday and gift ideas (one per
// line), plus what you already gave, so you don't give it twice.
// The list is sorted by whose birthday comes next.
//
// A birthday also makes a yearly reminder in תזכורות ("יום הולדת
// לדנה"), which says there are gift ideas. If you already have a
// yearly birthday reminder with that name, that one is used instead.
// ============================================================

const GIFT_WORDS = {
  reminderTitle: name => `יום הולדת ל${name}`,
  reminderText: 'יש רעיונות למתנה ב"מתנות"',
  ideas: n => n === 0 ? '' : n === 1 ? 'רעיון אחד' : `${n} רעיונות`,
  noBirthday: 'בלי תאריך',
  inDays: n => n === 0 ? 'היום' : n === 1 ? 'מחר' : `בעוד ${n} ימים`,
};

function giftLines(text) {
  return String(text || '').split('\n').map(line => line.trim()).filter(Boolean);
}

function nextBirthday(item) {
  return item.birthday ? nextOccurrence({ date: item.birthday, repeatYearly: true }) : null;
}

function giftsList(items) {
  const withNext = items.map(item => ({ item, next: nextBirthday(item) }));
  withNext.sort((a, b) => (a.next ? 0 : 1) - (b.next ? 0 : 1) || (a.next - b.next) ||
    (a.item.title || '').localeCompare(b.item.title || '', 'he'));
  return rowList(withNext.map(({ item, next }) => {
    const sub = GIFT_WORDS.ideas(giftLines(item.ideas).length);
    let end = '';
    if (next) {
      const days = daysUntil(next);
      end = days < 30 ? GIFT_WORDS.inDays(days) : `${next.getDate()}.${next.getMonth() + 1}`;
    }
    return itemRow(item, escapeHtml(sub), { end: escapeHtml(end), dim: !next && !sub });
  }));
}

const isBirthdayTitle = title => /יום\s*הולדת|יומולדת/.test(title || '');

// Keep the birthday reminder in step with the gift item.
// Returns the reminder's id (or '' when there's none).
async function syncGiftReminder(giftId, gift) {
  const name = (gift.title || '').trim();
  let reminder = gift.reminderId ? await getItem(gift.reminderId) : null;
  if (reminder && reminder.group !== 'reminders') reminder = null;

  if (!name || !gift.birthday) return reminder ? reminder.id : '';

  // No linked reminder yet: maybe there already is one for this person
  if (!reminder) {
    const reminders = await getItemsInGroup('reminders');
    reminder = reminders.find(r => r.repeatYearly && isBirthdayTitle(r.title) && (r.title || '').includes(name)) || null;
    if (reminder) {
      if (reminder.date !== gift.birthday) await updateItem(reminder.id, { date: gift.birthday });
      return reminder.id;
    }
    const created = await addItem('reminders', {
      title: GIFT_WORDS.reminderTitle(name), date: gift.birthday, repeatYearly: true,
      text: GIFT_WORDS.reminderText, giftId,
    });
    return created.id;
  }

  // Keep it up to date (the title only on reminders made here)
  const changes = {};
  if (reminder.date !== gift.birthday) changes.date = gift.birthday;
  if (reminder.giftId === giftId && reminder.title !== GIFT_WORDS.reminderTitle(name)) changes.title = GIFT_WORDS.reminderTitle(name);
  if (Object.keys(changes).length) await updateItem(reminder.id, changes);
  return reminder.id;
}
