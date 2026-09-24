# Find your perfect stay, local prototype

A second version of the Riverside Rentals demo home page. Everything is the
`riverside-hero` build (the riverboats landing frame, the scroll reveal onto
the boathouse, the snap, then categories, three reasons, featured cottages,
boat hire, the second search bar, the trust band and footer), with one change:
where the search bar sat under "Find your perfect holiday cottage in the
Norfolk Broads", there is now the finder, a wide glass bar in the same place,
centred under the heading.

The finder asks five or six quick questions, including the dates, asks the
booking system which cottages are free, recommends the top three that fit
*and* are available with a Book now button on each, lists every other free
cottage that fits, and keeps an "Ask us" route for anyone who would rather
talk. Nothing is simulated: availability is the live site's own answer.
It should feel like the owner asking "tell me about the trip and I'll suggest
the right cottage", never like searching a database.

Vanilla HTML, CSS and JS. No libraries, no build step. Serve the folder from
any static server (see "Previewing" below) rather than opening the file
directly, so the images and data files load.

## What is in here

| Path | What it is |
|---|---|
| `index.html` | The page: the scroll hero with the finder in the search bar's place, then the rest of the site. Generated from `../riverside-hero/index.html` by `assets/test/build-page.py`; the panel markup, a lede under the heading, the two hero photographs as files, and a few small script changes are the only differences |
| `assets/css/finder.css` | The panel. Uses the page's own tokens (`--ink`, `--paper`, `--sail`, `--glass`, `--sky`, `--display`, `--sans`) and nothing else |
| `assets/data/properties.js` | **Sheet 1: property master.** All 51 cottages and the 5 day boats from riverside-rentals.co.uk (read 2026-09-17). Sleeps, bedrooms, bathrooms, the pets / mooring / main-river badges, amenities and the "Prices from" figure are the site's own; descriptions are the site's page descriptions; taglines are assembled from those facts |
| `assets/data/questions.js` | **Sheet 2: questions.** Who's coming; how many (families, friends and groups only); where on the Broads; the dates (or "I'm flexible"); what they can't do without (pick several); how they'll spend their time (pick several). Each has a "not sure" / "no preference" answer |
| `assets/data/rules.js` | **Sheet 3: rules.** Written per property from the facts, about 1,450 rows of "when the guest answers X, cottage Y gets +N / is excluded, because Z" |
| `assets/data/icons.js` | Inline SVG line icons, 24px grid, stroke-based, in the brand blue |
| `assets/img/` | One photo per property and boat from the site's own pages, 720px wide, plus the two hero shots |
| `assets/js/engine.js` | Scoring engine, no DOM. Hard exclusions, weighted scoring, top three plus the full list of everything else that fits, the "talk to us" route, the day-boat suggestion, and the enquiry builder |
| `assets/js/finder.js` | The panel UI: question tiles (single and multi-select), the dates step on the site's own calendar with a nights menu in the same glass (1 to 21, default 7), answer chips with two lines reserved so the bar never jumps, a progress line that doubles as the head's rule, Back from the second question on, the live availability check, category-style result cards (village tag, name, bedrooms and bathrooms, price, Book now), the "Search all properties that match" hand-off, and the Ask us form with inline validation and confirmation |
| `assets/server/serve.py` | Static server plus `GET /api/availability?date=&nights=&guests=`, which asks the live site which cottages are free (see below) |
| `assets/test/journeys.js` | Ten example guests run through the engine with assertions. `node assets/test/journeys.js` |
| `assets/test/export-matrix.js` | Regenerates `decision-matrix/`. `node assets/test/export-matrix.js` |
| `assets/decision-matrix/*.csv` | Properties, questions, rules and a property-by-answer score grid, for checking the logic in a spreadsheet |

## How the logic works

1. The guest answers: who's coming; how many (families, friends, groups);
   where on the Broads; when (an arrival date and nights, or "I'm flexible");
   what they can't do without (as many as they like); how they want to spend
   their time (as many as they like). Every question has a "not sure", which
   never eliminates anything. Multi-select answers are arrays: a rule fires if
   any chosen value matches, so "dog + moorings" applies both.
2. Every rule whose condition matches is applied to its cottage. A soft rule
   adds or subtracts points and, if positive, contributes its reason to "Why
   we suggest it". A hard rule removes the cottage outright.
   **Sleeps and pets are the only hard rules**: a cottage without enough beds
   for the party size chosen, or one that doesn't take pets when the dog is
   coming, is out. View, layout, location, budget and extras are soft, so a
   near miss still surfaces.
3. Cottages with a positive score are ranked. If dates were given, the live
   availability answer splits them into free and taken; the top three **free**
   cottages are recommended as cards in the Popular Categories style (photo,
   a village tag, the name, and only what the answers didn't already say:
   bedrooms and bathrooms, then the "from" price) with a Book now button, every other free cottage
   that fits is listed under "Also free and a good fit" with its strongest
   reason, and the ones that fit but are booked are counted with a "Try other
   dates" link. Without dates the same list is shown un-filtered. Ties break
   alphabetically. The reasons still exist on every result (`reasons` in the
   engine output) for the owner's view; the cards don't repeat them.
4. If the top score is under 14, or three or more answers were "not sure",
   the results lead with "talk to us" (the office number) and any cottages
   that did score are shown underneath as a starting point. "Flexible" on
   dates is a preference and doesn't count as "not sure".
5. If the guest wants to be out on the water, the smallest day boat that seats
   the party is suggested alongside the cottages (a pet-friendly one when the
   dog is coming).
6. The enquiry form is pre-filled with the party size, offers the shortlisted
   cottages as a choice, takes an arrival date from the site's own calendar
   (or "flexible"), nights, contact details and a message, and produces the
   structured enquiry the office would receive.

### Live availability

The live site's own search form posts date, nights and guests to
`/properties/cottages/`, and the csd_supcontrol plugin returns the listing
filtered by SuperControl availability (the page says "Searching for available
dates on ... for N nights for N guests"). `assets/server/serve.py` does exactly what
that form does and returns the slugs that came back:

```
GET /api/availability?date=2026-10-24&nights=7&guests=4
{"ok":true,"available":["buttercup-lodge","dydle-down",...],"count":9,"nonce":"...","checked_at":"..."}
```

The form nonce is read from the home page and cached for an hour; results are
cached for ten minutes; a search that comes back unfiltered is retried once
with a fresh nonce; any failure returns `{"ok":false}` and the page falls back
to the un-filtered list with a plain message and the Ask us route. Checked
2026-09-17: 24 Oct 2026 for a week returned 9 cottages, 19 Dec 28, 7 Aug 2027
29.

**Book now** goes to the cottage's page on the live site. On the live site the
plugin reads the searched date, nights and guests from browser storage and,
once SuperControl's calendar loads, opens the booking cart on those dates
(`cartOpen`), so from the real site this is one click into checkout. The demo
runs on another origin, so it cannot set that storage; the guest picks the
date on the property page. **Search all properties that match** submits the
same dated search to the live listing in a new tab (the site's listing filters
by dates, not by the finder's answers, so it shows every free cottage; the
finder's matches are among them).

This is a demo route: on the live site the finder would call the plugin's own
lookup server-side rather than post to the public listing.

### Book now, pre-filled: verified on the live site

Tested 2026-09-17 in a real browser on riverside-rentals.co.uk, on the Fennel
property page. Posting the message the site's own plugin posts:

```js
window.postMessage({ action: "cartOpen", arrivalDate: "24/10/2026", departureDate: "31/10/2026",
  numberNights: 7, capacity: { adults: 4 }, guests: 4, cottageID: 48411 }, "*");
```

opened SuperControl's own "Your booking" cart on the page: Selected property
Fennel, Arrival Sat 24 October 2026, Stay for 7 nights until Sat 31 October
2026, Total price £738.00, BOOK NOW straight into their checkout. That is the
whole hand-off: on the live site the finder's Book now button sets the three
values the plugin already reads (`supcontrol_sdate`, `supcontrol_nights`,
`supcontrol_guests`) and links to the property page, or posts that message
itself, and the guest lands in the cart with the dates and length filled in.

Two things seen in the same test, worth fixing on the live site anyway:

- The plugin only falls back to the stored nights when the page carries an
  empty `data-nights` attribute, and the property template doesn't render one
  at all, so from a fresh session the cart opens with the date but no length
  and SuperControl answers "This date is available but does not meet the
  minimum stay requirement". The site's own search-then-click flow hit the
  same message in the test. One line in the template (or in the plugin's
  fallback) fixes it; the finder can also post the message itself and avoid
  the dependency.
- The party size did not carry: the cart showed Adults 1 with every guest
  field tried. Whether the widget accepts adults on `cartOpen` at all is a
  question for SuperControl; if not, the guest changes one dropdown. Dates
  and nights, the part that matters most, carry.

### Weights

`+10` the thing they asked for (dogs welcome, a mooring, all on one level, a
river view), `+12` a hot tub because only one cottage has one; `+6` to `+8` a
strong fit (the right size, within budget, fishing from the garden, a day boat
included); `+2` to `+4` a nice-to-have (a garden for the children, parking for
days out); negatives the same the other way, and never shown to the guest.

### Where

The "where" question offers Wroxham and Hoveton; Horning; Potter Heigham and
the Thurne; Reedham, Brundall and the Yare; somewhere quiet and rural;
anywhere. Each maps to the village tags from the site's own region terms. In
the area asked for is +8, elsewhere -5 (soft, so a strong cottage elsewhere
still surfaces). "Prices from" is shown on every card but is not a question.

The weights are a starting point drafted from the brief and the property pages.
They are **not** Riverside Rentals' judgement yet. That is what the decision
matrix export is for: send the CSVs to the office, have them mark each rule
keep / change / remove and correct anything in the property sheet, then update
the data files to match.

## What was and wasn't verifiable from the live site

Verified, and used:

- All 51 cottages on `/properties/cottages/` with name, page URL, sleeps,
  bedrooms, bathrooms, "Prices from", and the badges the site shows (Pets
  Welcome, Has a Mooring, On the main river).
- Each cottage's amenity list (the site's own `variables-*` classes: pets
  welcome, mooring at property, main river, waterfront, single level, garden,
  parking, family friendly, day boat included, hot tub, fireplace, step-free).
- Each cottage's region (Wroxham, Horning, Potter Heigham, Reedham, Brundall,
  How Hill, Belaugh, Catfield, Neatishead, Martham, Repps, Halvergate).
- Each cottage's published page description and its lead photograph.
- The five day boats on `/properties/boat-hire/` with capacity and bathrooms.

Not verifiable, marked TBC or derived:

- **Boat prices.** The boat-hire listing shows no price, so all five boats are
  `priceBand: "TBC"`.
- **Poppy's bathrooms.** Not listed on the site: `bathrooms: "TBC"`.
- **Bure Croft's photo** is the listing thumbnail (the page's lead image would
  not download); the others are the page images.
- **"Fishing"** is inferred from the site's own description mentioning fishing
  or angling, or the lake-access amenity. **"Village centre"** is inferred from
  "in the heart of" or "a short walk from" in the description. Both are soft.
- **Taglines** are assembled from the verified facts (sleeps, place, mooring,
  river, hot tub, day boat, one level, dogs). They are not the site's copy.
- **Peak prices, minimum stays and changeover days** are not on the listing
  and are not in the data. "Prices from" is shown on the cards for
  information. Availability is checked for the exact arrival date and nights
  given; the site's own search decides what "available" means.

## What is deliberately not in the prototype

- **No backend.** Nothing is sent anywhere. Submitted enquiries are kept in
  the browser's localStorage (`rr_finder_enquiries`, last 50) and "Download
  JSON" on the confirmation saves the record. The on-page "enquiries captured"
  table was dropped from the demo; `renderLeads()` in `finder.js` still draws
  it into any element with `id="leads"` if one is added back.
- **No booking.** The finder checks availability and hands the guest to the
  cottage page to book; checkout stays on SuperControl, as on the live site.
- **Desktop only for the mega menus**, as in `riverside-hero`.

## Showing it to the client

Everything lives in one folder: `index.html` and `assets/`. The page works
from any static host; only the live availability check needs the small Python
server, because a browser cannot post to riverside-rentals.co.uk from another
site.

**GitHub Pages** (dannyclarkestudio.github.io/riverside-dynamic-search) shows
the whole page once `assets/` is in the repo alongside `index.html` (the
first upload had only `index.html`, so the styles, scripts and pictures were
404s). Without the server the dates step still works: the finder says it
couldn't check availability and shows the un-filtered list with the Ask us
route. To get live availability there too, host the server somewhere and set
the one line near the end of `index.html`:

```html
<script>window.RR_AVAILABILITY_API = "https://riverside-finder.onrender.com/api/availability";</script>
```

**Render, one service, one URL** is the simplest complete setup: `render.yaml`
in this folder defines a free web service that runs `assets/server/serve.py`,
which serves the page *and* answers the availability call from the same
origin, so nothing else needs configuring. In Render choose New > Blueprint,
point it at the repo, and use the URL it gives you. Free instances sleep when
idle and take about half a minute to wake, so open it before the meeting.

**On your own machine** for a screen-share, which is the most reliable:

```bash
python3 assets/server/serve.py
```

then open http://127.0.0.1:8933. (Any static server shows the page, but only
`serve.py` answers the availability call.)

**A safety net for the meeting.** The site's own availability lookup is not
always reliable: on 2026-09-17 it filtered correctly all morning (9 cottages
free for 24 Oct 2026) and returned every cottage all afternoon. The server
treats "every cottage" as no answer, keeps the last good answer for each
date, nights and guests in `assets/server/availability-cache.json`, and
serves that with "Availability last checked ..." in the lede when the live
lookup fails. The cache is seeded with three good answers from the morning:
24 Oct 2026, 19 Dec 2026 and 7 Aug 2027, all 7 nights for 4 guests. Run those
dates in the demo if the live site is having a bad day; run a few more dates
the day before to widen the net.

## Previewing in Claude

The Claude preview's dev server is sandboxed and cannot read files under
`~/Desktop`, so the build is mirrored into the session scratchpad and served
from there. The launch entry `riverside-finder` in
`/Users/Danny/Desktop/Claude/.claude/launch.json` runs `serve-finder.py`, a
runner that starts the mirror's `assets/server/serve.py` with `--dir` (it
passes `directory=` to the handler, no chdir), on port 8933. After any edit
here, re-sync the mirror (and restart the preview if `serve.py` changed):

```bash
rsync -a --delete --exclude .DS_Store "/Users/Danny/Desktop/Claude/Local Websites/Riverside Rentals/riverside-finder/" /private/tmp/claude-502/-Users-Danny-Desktop-Claude/845b7589-bea4-425e-9417-75b44db60483/scratchpad/finder-mirror/
```

## The hero's snap and the panel

The page's scroll snap stands down while keyboard focus is inside the hero
(so a guest mid-form isn't dragged about). The panel therefore takes focus
only after the guest has answered something, never on first render; otherwise
the landing frame would not snap through to the search, which is exactly what
happened in an earlier build.

## Checks done

- `node assets/test/journeys.js`: ten journeys pass, including the hard rules (every
  shortlisted cottage sleeps the party and takes dogs when the dog is coming),
  the "talk to us" route, the boat suggestion, and "flexible" not counting as
  unsure.
- Narrow viewports: no horizontal overflow (the document stays viewport
  wide; `scrollX` cannot move). The bar stacks: question above, tiles two
  across, cards one across, the body scrolling inside the panel with the call
  to action pinned at the foot.
- Results on desktop: the panel body takes its full height and the three
  cards are sized to what's left under the title (`fitCards()` in
  `finder.js`, between 200px and 460px), so photograph, name, details and
  Book now are on screen without scrolling at 1280×720, 1440×900 and
  1920×1080; the "also" list sits below them.
- 1440px: the landing frame, the reveal, then the heading with the bar under
  it: question on the left, six answers in a row on the right; three cards
  across on results; three fields across on the enquiry. Once there are
  results the heading steps aside so the panel can use the height, and the
  page re-centres the block after every phase.
- A full journey in the browser: family of 3 or 4, anywhere, 24 Oct 2026 for
  7 nights from the site's calendar, dog and one level, walking and doing
  nothing; the live check returned 9 free cottages, 5 of which fit; the top
  three (Willow Lodge, Fennel, Rebel) with Available badges and Book now; two
  more listed with "Search all properties that match" posting the same search
  to the live listing; Back on every step including results; the Ask us form
  pre-filled with the dates.
