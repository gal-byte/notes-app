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

## Food hub (2026-11-25, `food.js`, `#/food`)
- Home shows one **אוכל** row (where מתכונים was) instead of separate מתכונים and ארוחות rows. Inside: today's
  total, "מה אכלתי?" (the box at the bottom adds a meal to ארוחות; **צילום ארוחה** opens `#/meal`), then rows for
  ארוחות, מתכונים, 🛒 רשימת קניות and 🍳 מה יש במטבח (both notes stay in לא ממוין; a row shows only if the note exists).
  Back from ארוחות / מתכונים goes to the hub. Nothing is moved or renamed.
- Anywhere, typing "אכלתי שקשוקה" in the quick-add box saves a meal "שקשוקה" in ארוחות.
- Recipes filter by fixed categories instead of every tag: ארוחת בוקר, קינוחים, מרקים, סלטים, מאפים ולחמים,
  תוספות, עיקריות, אחר. Worked out from the tags and title (`RECIPE_CATEGORIES`); a tag that is exactly a
  category name wins, then keywords in the tags, then in the title. עיקריות is checked before תוספות (so
  "עוף עם אורז" is a main dish). To fix a recipe in the wrong category, give it a tag with the category's
  name. The tags themselves are unchanged.

## Meal picker (2026-11-26, `mealpicker.js`)
- A meal note has **מה אכלתי**: products with amounts, like a calorie-tracker app. Type "קוטג" → your own
  products first (a copy on the device, `localStorage` `myProducts`), then צמרת / Open Food Facts from the
  server (notify `foodapi`, README "Food"). Amount in grams or a serving ("2 × פרוסה"); **ברקוד** (camera on
  Android Chrome, else type the digits), **צילום תווית** (the server reads it once) or **מוצר חדש**.
- The list is the note's `foodItems`; the "≈" line follows its total. Items the server split from free text
  show "?" until **אישור**. Picked products teach the server your usual brand and amount for that word.

## Food: quick logging (2026-11-25, `food.js`)
- The hub shows up to 8 **"שוב?" chips**: meals from the last 30 days, most frequent then most recent
  (titles compared trimmed/lowercase; "ארוחה 13:05" photo-only titles are left out). One tap saves the meal
  again in ארוחות with the old note's "≈" line, so the numbers show at once (the server's autofill skips notes
  that already have one). The message has **ביטול** (deletes the new note); today's total updates in place.
- **צילום ארוחה** opens the camera directly and saves "ארוחה 13:05" with the photo, staying on the hub (no
  editor). `#/meal` (app icon shortcut) is unchanged.
- The home **אוכל** row shows today's "1,450 קל׳ · 82 ג׳" (or "2 ארוחות היום" while waiting for estimates),
  and the item count when nothing is logged today.
- Daily target (2026-11-25): **🎯 יעד יומי** under today's total on the hub opens two boxes (calories, protein;
  empty = no target). Today's total, on the hub and in ארוחות, then shows two thin bars: "קל׳ 1,450 / 2,000 · עוד 550",
  "חלבון 82 / 120 ג׳ · עוד 38 ג׳". Calories over the target turn amber ("250 מעל"), protein reached shows ✓.
  Kept on the device only (localStorage `foodTarget`), so set it once per phone/tablet.

## Server screen (2026-11-25, `dashboard.js`, `#/server`)
The shield at the top of home opens **שרת**: whether the home server's apps answer (and stopped containers,
TV hub, memory, disk), Claude on the server (last and next run of the קלוד to-do list, its result, changes
waiting for your OK with a **לפרוס** button), the קלוד list itself, today's Claude API spend, and the last
notifications and server alerts. Buttons: run the to-do list now, restart an app. Data comes from notify's
`GET /dashboard` (tailnet only, nothing kept offline); buttons `POST /dashboard/action` with an allowlisted
name only, and a host helper on the server runs them (see notify's README, "Claude Code on the server").
Layout (calm by default): one card (all good or the problems, Claude's next run, today's spend in shekels),
then only what needs you: a card per change waiting for approval (Claude's short Hebrew summary, the files,
אישור / דחייה), failing apps, the open קלוד items and the ones the server Claude finished on its own
(not ones done in a session with Gal). The rest is folded under פרטים and פעולות.

**"Claude now" bar** (top of home, `dashboard.js` `startClaudeNow`): one slim line with what Claude is doing:
idle (with the last run's result, a waiting question or a failure from the last 36 hours) / working on
"<note>" since <time> / a change waiting for your approval / Claude in a chat changing notes (last 15 minutes).
It polls notify's light `GET /dashboard/now` every 45 s while home is open and the app is in front, and is
hidden when the server doesn't answer. Tapping it opens `#/server`.
When the server Claude asked a question (an open קלוד note, not טופל / בעבודה, whose last line starts
"— Claude"; found in the app's own notes, so it works offline too, oldest first), the bar shows
"קלוד שואל: <question>" (it ranks below working and a waiting change, above chat and idle). Tapping it
opens a small panel instead: the note, the question, a box, and "שליחה" / "שליחה והרצה עכשיו". Sending
appends "— תשובה (date): <answer>" to the note (synced as usual); the second button also asks the server
to run the to-do list now (`run-todo`). The next run reads the answer and continues the request.

**"קלוד" button** (note page, next to שיתוף; `sections.js` `askClaude`): in the group קלוד it saves and syncs
the note, then asks the server to run the to-do list now (`run-todo`); the runner still takes the oldest open
note first, so the toast says how many are ahead. A note tagged בעבודה / טופל is not re-run (remove טופל to
run it again). In any other group it opens a new Claude chat (`https://claude.ai/new?q=…`, or the Claude app
if it takes the link) with the note's text (cut at 6000 characters).
