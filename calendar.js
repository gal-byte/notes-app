// ============================================================
// CALENDAR
// A month grid (Sunday on the right, Israeli style) with a dot
// on every day that has a reminder. Tap a day to see its
// reminders underneath, or add a new one on that day.
// ============================================================

// Remembered while the app is open, so after editing a reminder
// you come back to the same month and day
let calendarMonth = null;     // first day of the month on screen
let calendarSelected = null;  // the tapped day, like "2026-11-12"

// Does this reminder happen on this day?
// Yearly ones (birthdays) happen every year from their first date on.
function happensOn(item, date) {
  if (!item.date) return false;
  const first = parseISODate(item.date);
  if (!item.repeatYearly) return first.getTime() === date.getTime();
  return first.getMonth() === date.getMonth()
      && first.getDate() === date.getDate()
      && date >= first;
}

function remindersOn(reminders, date) {
  return reminders
    .filter(item => happensOn(item, date))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));
}

async function calendarScreen() {
  if (!calendarMonth) {
    const today = todayStart();
    calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    calendarSelected = toISODate(today);
  }
  // The month (redrawn when you move around)
  return `<div id="calendar">${await calendarHtml()}</div>`;
}

async function calendarHtml() {
  const reminders = await getItemsInGroup('reminders');
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const todayIso = toISODate(todayStart());

  // Month title like "נובמבר 2026" – the browser knows Hebrew month names
  const monthTitle = calendarMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });

  const isThisMonth = toISODate(calendarMonth).slice(0, 7) === todayIso.slice(0, 7);
  const showTodayButton = !isThisMonth || calendarSelected !== todayIso;

  // Empty boxes before the 1st (getDay: 0 = Sunday)
  let cells = '<span class="cal-blank"></span>'.repeat(calendarMonth.getDay());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const iso = toISODate(date);
    const count = remindersOn(reminders, date).length;
    const classes = ['cal-day'];
    if (iso === todayIso) classes.push('today');
    if (iso === calendarSelected) classes.push('selected');
    const dots = '<i></i>'.repeat(Math.min(count, 3));  // up to 3 dots

    cells += `
      <button type="button" class="${classes.join(' ')}" data-day="${iso}">
        <span>${day}</span>
        <span class="cal-dots">${dots}</span>
      </button>`;
  }

  const weekdays = TEXT.weekdaysShort.map(name => `<span>${name}</span>`).join('');

  return `
    <div class="cal-header">
      <h2 class="cal-title">${monthTitle}</h2>
      ${showTodayButton ? `<button type="button" class="text-button" data-go-today>${TEXT.today}</button>` : ''}
      <button type="button" class="icon-button" data-move="-1" aria-label="${TEXT.prevMonth}">
        <svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>
      </button>
      <button type="button" class="icon-button" data-move="1" aria-label="${TEXT.nextMonth}">
        <svg viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></svg>
      </button>
    </div>

    <div class="cal-grid-card">
      <div class="cal-weekdays">${weekdays}</div>
      <div class="cal-grid" id="cal-grid">${cells}</div>
    </div>

    ${selectedDayHtml(reminders)}
  `;
}

// The list under the grid for the tapped day
function selectedDayHtml(reminders) {
  if (!calendarSelected) return '';
  const date = parseISODate(calendarSelected);
  const title = date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  const items = remindersOn(reminders, date);

  const list = items.length
    ? rowList(items.map(item => itemRow(item, '', { end: item.time || '' })))
    : '';

  return `
    ${sectionLabel(title)}
    ${list}
    <a class="row row-quiet" href="#/new/reminders/${calendarSelected}">
      <span class="badge small plain">${icon('plus')}</span>
      <span class="row-main"><span class="row-title">${TEXT.newReminderThisDay}</span></span>
    </a>
  `;
}

function setupCalendar() {
  const box = document.getElementById('calendar');

  async function redraw() {
    box.innerHTML = await calendarHtml();
  }

  function moveMonth(step) {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + step, 1);
    redraw();
  }

  // One listener for every button in the calendar
  box.addEventListener('click', event => {
    const day = event.target.closest('[data-day]');
    if (day) {
      calendarSelected = day.dataset.day;
      redraw();
      return;
    }
    const arrow = event.target.closest('[data-move]');
    if (arrow) {
      moveMonth(Number(arrow.dataset.move));
      return;
    }
    if (event.target.closest('[data-go-today]')) {
      const today = todayStart();
      calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      calendarSelected = toISODate(today);
      redraw();
    }
  });

  // Swipe sideways on the grid to change month.
  // In Hebrew the next month is to the left, so swiping right moves forward.
  let startX = null;
  let startY = null;
  box.addEventListener('touchstart', event => {
    if (!event.target.closest('.cal-grid-card')) return;
    startX = event.touches[0].clientX;
    startY = event.touches[0].clientY;
  }, { passive: true });

  box.addEventListener('touchend', event => {
    if (startX === null) return;
    const dx = event.changedTouches[0].clientX - startX;
    const dy = event.changedTouches[0].clientY - startY;
    startX = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      moveMonth(dx > 0 ? 1 : -1);
    }
  });
}
