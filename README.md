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
| `index.html` | The page: the scroll hero with the finder in the search bar's place, then the rest of the site. Generated from `../riverside-hero/index.html` by `test/build-page.py`; the panel markup, a lede under the heading, the two hero photographs as files, and a few small script changes are the only differences |
| `css/finder.css` | The panel. Uses the page's own tokens (`--ink`, `--paper`, `--sail`, `--glass`, `--sky`, `--display`, `--sans`) and nothing else |
| `data/properties.js` | **Sheet 1: property master.** All 51 cottages and the 5 day boats from riverside-rentals.co.uk (read 2026-09-17). Sleeps, bedrooms, bathrooms, the pets / mooring / main-river badges, amenities and the "Prices from" figure are the site's own; descriptions are the site's page descriptions; taglines are assembled from those facts |
| `data/questions.js` | **Sheet 2: questions.** Who's coming; how many (families, friends and groups only); where on the Broads; the dates (or "I'm flexible"); what they can't do without (pick several); how they'll spend their time (pick several). Each has a "not sure" / "no preference" answer |
| `data/rules.js` | **Sheet 3: rules.** Written per property from the facts, about 1,450 rows of "when the guest answers X, cottage Y gets +N / is excluded, because Z" |
| `data/icons.js` | Inline SVG line icons, 24px grid, stroke-based, in the brand blue |
| `img/` | One photo per property and boat from the site's own pages, 720px wide, plus the two hero shots |
| `js/engine.js` | Scoring engine, no DOM. Hard exclusions, weighted scoring, top three plus the full list of everything else that fits, the "talk to us" route, the day-boat suggestion, and the enquiry builder |
| `js/finder.js` | The panel UI: question tiles (single and multi-select), the dates step on the site's own calendar with a nights menu in the same glass (1 to 21, default 7), answer chips with two lines reserved so the bar never jumps, a progress line that doubles as the head's rule, Back from the second question on, the live availability check, category-style result cards (village tag, name, bedrooms and bathrooms, price, Book now), the "Search all properties that match" hand-off, and the Ask us form with inline validation and confirmation |
| `server/serve.py` | Static server plus `GET /api/availability?date=&nights=&guests=`, which asks the live site which cottages are free (see below) |
| `test/journeys.js` | Ten example guests run through the engine with assertions. `node test/journeys.js` |
| `test/export-matrix.js` | Regenerates `decision-matrix/`. `node test/export-matrix.js` |
| `decision-matrix/*.csv` | Properties, questions, rules and a property-by-answer score grid, for checking the logic in a spreadsheet |

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
dates on ... for N nights for N guests"). `server/serve.py` does exactly what
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

## Previewing

Serve it with the folder's own server, which also provides `/api/availability`:

```bash
python3 server/serve.py --port 8933
```

The Claude preview's dev server is sandboxed and cannot read files under
`~/Desktop`, so the build is mirrored into the session scratchpad and served
from there. The launch entry `riverside-finder` in
`/Users/Danny/Desktop/Claude/.claude/launch.json` runs `serve-finder.py`, a
runner that starts the mirror's `server/serve.py` with `--dir` (it passes
`directory=` to the handler, no chdir), on port 8933. After any edit here,
re-sync the mirror (and restart the preview if `server/serve.py` changed):

```bash
rsync -a --delete "/Users/Danny/Desktop/Claude/Local Websites/Riverside Rentals/riverside-finder/" /private/tmp/claude-502/-Users-Danny-Desktop-Claude/845b7589-bea4-425e-9417-75b44db60483/scratchpad/finder-mirror/
```

(Any static server shows the page, but only `server/serve.py` answers the
availability call.)

## The hero's snap and the panel

The page's scroll snap stands down while keyboard focus is inside the hero
(so a guest mid-form isn't dragged about). The panel therefore takes focus
only after the guest has answered something, never on first render; otherwise
the landing frame would not snap through to the search, which is exactly what
happened in an earlier build.

## Checks done

- `node test/journeys.js`: ten journeys pass, including the hard rules (every
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
