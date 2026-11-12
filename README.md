# notes-app

A personal notes app (installable PWA) in Hebrew: reminders, songs, movies, recipes and custom groups.
Plain HTML, CSS and JavaScript. Data is stored on the device; hosted free on GitHub Pages.

## Sync and notifications (2026-11-13)
- Notes are kept on each device **and** on the home server (`~/notify` on the server, `store.py`).
  `sync.js` syncs when the app opens, after every change and every minute; newer change wins,
  deletions spread. Works offline and catches up later. Needs Tailscale to reach the server.
- Reminders arrive as the app's own notifications (Web Push, `push.js` + `sw.js`), with
  "תזכיר בעוד שעה". Turn them on once per device in הגדרות וגיבוי. ntfy is only the fallback.
- Testing: set `localStorage.testServer` to a test sync server so tests don't touch real notes.
