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
