# Journal ("יומן") — plan

Status: sessions 1, 2 and 3 built on 2026-11-18 (journal, photos on the server, 21:30
question, morning memories, "מחר" → reminder, quote of the day from the group ציטוטים,
then the calendar with frames, the weekly graph, best days and people/places, as tabs
on the journal screen). Also added: one video per day (up to a minute, made smaller on
the phone to ~720p WebM, ~15 MB a minute, stored next to the photos; its still picture
stands in for a photo). Session 4 not built yet.
All choices below were made by Gal on 2026-11-18.

## Goal
A daily journal inside the notes app: short fields, a 1-10 score for the day, up to
2 photos, a 21:30 nudge, morning memories, and ways to look back (calendar, graph,
best days, yearly book, year film on the TV). Stays on the home server; the only AI
part is "ask your journal" from Claude.

## Decisions
| | Choice |
|---|---|
| Writing style | Short fields |
| Fields | What happened · Good thing · Hard thing · Tomorrow · score 1-10 · 2 photos · people · places |
| Nudge | 21:30, only if today has no entry, no repeat |
| Missed days | Any past day can be filled in; the nudge never nags about old days |
| Privacy | No lock |
| AI | Only "ask your journal" (Claude connector, read-only) |
| Memories | "On this day" (a month / a year ago) in the morning summary, with a photo |
| Photos | Separate files on the server from day one |
| Score used for | Calendar colors · score graph · best days list |
| Extras | Calendar of written days · printable yearly book · year photo film on the TV |

## What exists today (checked in the code)
- Groups and fields: `sections.js` (`FIELDS`); types include `date`, `textarea`,
  `rating`, `photo`, `place`. Items save by themselves.
- Photos: one per item (`photo` key), shrunk to ~1000 px / ~150 KB (`shrinkPhoto`),
  Blobs in IndexedDB, synced as data URLs inside the note JSON (`notify/store.py`).
  `backup.js` treats `photo` specially.
- `calendar.js`, `search.js`, `places.js`, `daily.js` (morning summary) exist and can be reused.
- Server: `notify/sender.py` (/sync, push), `backup.py` (nightly, 14 days),
  `connector.py` (Claude connector, reads only its own notes today).

## Build order (each about one session)

### Session 1 — the journal itself
- notes-app: built-in group `journal` / "יומן", one entry per date.
  - Fields: date (default today, any past date allowed), score 1-10 (new field type:
    a row of 10 buttons), מה היה היום, דבר טוב, דבר קשה, מחר, photo 1, photo 2,
    people, places.
  - Title made automatically ("יום ג׳ 18.11"). Opening the journal on a date that
    already has an entry opens that entry.
  - People and places: chips; tap ones used before or type a new one. Stored as lists.
  - List: newest first, score badge and photo thumbnails.
- notify: photos as files.
  - `POST /photo` (JPEG only, size limit, returns an id) and `GET /photo/<id>` (+ `?thumb`).
    Stored in `reminders-data/photos/YYYY/MM/<id>.jpg`.
  - The journal entry stores only photo ids. The app caches photos it shows; a photo
    taken offline waits on the phone and uploads with the next sync.
  - `backup.py`: copy new photo files to `~/notify/backups/photos/` (only new files,
    never pruned).
- Test against a test sync server (`localStorage.testServer`), server endpoints with curl.

### Session 2 — nudge, memories, tomorrow
- `sender.py`: at 21:30, if no journal entry for today, one push: "איך היה היום?" with a
  rotating question. Tap opens today's entry. Off switch in settings.
- Morning summary (`daily.js` + server push): "לפני שנה היום…" / "לפני חודש…", the first
  line and one photo (Android Web Push shows images). Nothing if there's no old entry.
- "מחר" field: one tap turns it into a reminder for tomorrow (in the reminders group).

### Session 3 — looking back
- Calendar view (reuse `calendar.js`): every past day with an entry shows its photo
  (photo 1, cropped square to fill the cell) inside a frame colored by that day's score,
  in card-rarity style (like Clash Royale's rarities, our own colors and CSS):
  1-2 common = silver-blue (#C9DBEC→#8FA9C4) · 3-4 uncommon = green (#8FE07A→#3E9E35) ·
  5-6 rare = orange-gold (#FFC94D→#E8820F) · 7-9 epic = magenta-purple (#D774F5→#9B2FD0) ·
  10 legendary = animated pearly rainbow (teal, sky, pink, yellow, mint) — the highest.
  Each frame is a light-to-dark two-tone so it looks like a card frame.
  No legend on the screen. Same frames on the day's entry screen and in the best-days
  list. Animation stops when the phone asks for reduced motion.
  A day with an entry but no photo: the cell is filled with the score color and shows
  the number. Empty days stay plain (no streaks, no guilt). Tap a day to open it.
  Thumbnails come from `GET /photo/<id>?thumb` and are cached, so the month loads fast.
- Score graph: weekly average line over months, simple SVG, light/dark.
- "הימים הטובים": all 9s and 10s, newest first.
- People/places pages: every day with a person or in a place.

### Session 4 — extras
- Ask your journal (connector): read-only tools: list entries by date range, search
  text/person/place, get one day. Never edits or deletes journal entries. Same rate
  limits; each use posted to `server-alerts` like today.
  Note: the connector is public through Funnel (secret key in the URL), so anyone with
  that URL could read the journal. Consider a separate key for journal tools.
- Printable yearly book: a print page in the app (print CSS → "Save as PDF"): cover,
  one month per section, each day with its photos, score and text. No server needed.
- Year film on the TV: a TV hub tile "השנה שלי" that plays the year's journal photos,
  about one day per second, date and score in a corner. First one: 31.12.2026
  (will have about six weeks of photos).

## Ideas I'd add later (not chosen yet)
- Weather of the day added automatically (free Open-Meteo, one call a day).
- Places filled in from the bus app's trips that day.
- Score reminder on the TV: the week's average on Sunday morning.

## Deploy
Commit to main. notify: `git push` + `git push server`. notes-app: GitHub Pages (`git push`).
