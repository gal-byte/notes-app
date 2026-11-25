# notes-app

A personal notes app (installable PWA) in Hebrew: reminders, songs, movies, recipes and custom groups.
Plain HTML, CSS and JavaScript. Notes are kept on each device and synced through the home server; hosted free on GitHub Pages.

## Sync and notifications (2026-11-13)
- Notes are kept on each device **and** on the home server (`~/notify` on the server, `store.py`).
  `sync.js` syncs when the app opens, after every change and every minute; newer change wins,
  deletions spread. Works offline and catches up later. Needs Tailscale to reach the server.
- Reminders arrive as the app's own notifications (Web Push, `push.js` + `sw.js`), with
  "תזכיר בעוד שעה". Turn them on once per device in הגדרות וגיבוי. ntfy is only the fallback.
- Testing: set `localStorage.testServer` to a test sync server so tests don't touch real notes.

## Recipe table (2026-11-24)
A recipe with a `table` field shows a "Cooking for Engineers" style table on top (`recipetable.js`):
ingredients down the first column, each step a cell spanning what it combines. The text is under
"עריכת הטבלה", one step per line: `1, 2 | מערבבים` (ingredient line numbers), `ש1` / `s1` = what
step 1 made. Claude's connector fills it; the servings scaler also scales the amounts in it.
Zoom (2026-11-25): − / + next to the title shrink or grow the table (45%–130%), ⤢ shrinks it to fit
the screen width. The zoom is kept on the device (localStorage `recipeTableZoom`) for all recipes.

## Food (2026-11-24, `food.js`)
- Meals go in your group **ארוחות**. The home server (notify `autofill`) adds a line
  "≈ 650 קל׳ · 28 ג׳ חלבון (הערכה)" to each meal note; the group shows today's total on top
  ("היום: 1,450 קל׳ · 82 ג׳ חלבון", and how many still wait for an estimate) and each row its numbers.
- Long-press the app icon → **מה אכלתי 📷** (`#/meal`): a new meal with the photo button highlighted
  (phones only open the camera after a tap). A meal that is only a photo is saved as "ארוחה 13:05".
- The note **🛒 רשימת קניות** (לא ממוין, written by Claude) shows its lines as checkboxes. Ticking moves an
  item to the bottom as "✓ חלב" in the text; the server's `shopping_list` ignores ✓ lines and drops them on
  its next change. The plain text is under "עריכת הרשימה".
