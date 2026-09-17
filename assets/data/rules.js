// RULES. DRAFT for Riverside Rentals to check before this goes anywhere near
// the live site.
//
// Each rule: when every answer in `when` matches, apply `score` to `property`.
//   score: a number   -> soft rule. Added to the property's total. Positive rules
//                        also contribute their `reason` to "Why we suggest it".
//   score: "exclude"  -> hard rule. The property is removed regardless of its
//                        total, and `reason` says why (kept for the owner's view).
//
// Sleeps and pets are the only hard rules. View, layout, location and extras
// are soft, so a near miss still surfaces. Dates don't score at all: they are
// checked against live availability once the list is made. "Not sure" never eliminates.
//
// The rules are written per property from the facts in properties.js (sleeps,
// tags, village), so the decision matrix lists every property against every
// answer. Weights: +10 the thing they asked for, +6 to +8 a strong fit, +2 to
// +4 a nice-to-have, negatives the same the other way. Negative reasons are
// never shown to the guest.
//
// Rule IDs are generated in order (R001, R002...) so they can be referenced in
// the decision matrix spreadsheet.

(function () {
  var P = window.RR_PROPERTIES.filter(function (p) { return p.type === "cottage"; });
  var R = [];
  function add(property, when, score, reason) {
    R.push({ id: "R" + String(R.length + 1).padStart(3, "0"), property: property, when: when, score: score, reason: reason || "" });
  }
  function has(p, tag) { return p.tags.indexOf(tag) !== -1; }

  var RURAL = ["how-hill", "reedham", "brundall", "catfield", "neatishead", "belaugh", "martham", "repps", "halvergate", "rural", "potter-heigham"];
  // the areas the "where" question offers, and the village tags they cover
  var AREA = {
    wroxham: { label: "Wroxham", tags: ["wroxham", "belaugh"] },
    horning: { label: "Horning", tags: ["horning", "neatishead"] },
    thurne:  { label: "Potter Heigham and the Thurne", tags: ["potter-heigham", "martham", "repps", "catfield"] },
    south:   { label: "Reedham, Brundall and the Yare", tags: ["reedham", "brundall", "halvergate"] },
    quiet:   { label: "the quieter villages", tags: ["how-hill", "catfield", "halvergate", "belaugh", "neatishead", "martham", "repps", "rural"] }
  };
  // party-size bands: [minimum beds needed, comfortable maximum]
  var SIZE = { "3-4": [3, 4], "5-6": [5, 6], "7-8": [7, 8], "9-12": [9, 12], "13+": [13, 16] };

  P.forEach(function (p) {
    var id = p.id, n = p.sleeps;

    // ------------------------------------------------------- PARTY SIZE (hard)
    Object.keys(SIZE).forEach(function (band) {
      var min = SIZE[band][0], max = SIZE[band][1];
      if (n < min) add(id, { size: [band] }, "exclude", "Sleeps " + n + ", not enough beds for " + band.replace("-", " to ").replace("+", " or more"));
      else if (n <= max) add(id, { size: [band] }, 6, "Sleeps " + n + ", the right size for your party");
      else if (n >= max * 2) add(id, { size: [band] }, -12);   // twice the beds they need
      else if (n >= max + 3) add(id, { size: [band] }, -5);
      else add(id, { size: [band] }, 2, "Sleeps " + n + ", with a bed or two spare");
    });

    // ----------------------------------------------------------- WHO'S COMING
    if (has(p, "for-two")) add(id, { party: ["couple"] }, 8, "Made for two");
    else if (has(p, "small")) add(id, { party: ["couple"] }, 4, "A cottage sized for a couple");
    if (n >= 8) add(id, { party: ["couple"] }, -6);

    if (has(p, "small")) add(id, { party: ["solo"] }, 5, "Small enough to feel like your own");
    if (has(p, "for-two")) add(id, { party: ["solo"] }, 3, "Cosy for one");
    if (n >= 6) add(id, { party: ["solo"] }, -4);

    if (has(p, "family-friendly")) add(id, { party: ["family"] }, 4, "Set up for families");
    if (has(p, "garden")) add(id, { party: ["family"] }, 2, "A garden for the children");
    if (has(p, "for-two")) add(id, { party: ["family"] }, "exclude", "Sleeps 2, not enough beds for a family");

    if (has(p, "village-centre")) add(id, { party: ["friends"] }, 3, "Pubs and restaurants a short walk away");
    if (has(p, "for-two")) add(id, { party: ["friends"] }, "exclude", "Sleeps 2, not enough beds for a group of friends");

    if (has(p, "big-group")) add(id, { party: ["group"] }, 6, "Room for a big get-together");
    if (n < 6) add(id, { party: ["group"] }, -6);
    if (has(p, "for-two")) add(id, { party: ["group"] }, "exclude", "Sleeps 2, not enough beds for a big group");

    // -------------------------------------------------------------- MUST HAVE
    if (has(p, "pet-friendly")) add(id, { musthave: ["dog"] }, 10, "Dogs welcome");
    else add(id, { musthave: ["dog"] }, "exclude", "Doesn't take pets");

    if (has(p, "moorings")) add(id, { musthave: ["moorings"] }, 10, "A mooring at the property");
    else add(id, { musthave: ["moorings"] }, -8);

    if (has(p, "single-level")) add(id, { musthave: ["single"] }, 10, "Everything on one level");
    else add(id, { musthave: ["single"] }, -8);
    if (has(p, "step-free")) add(id, { musthave: ["single"] }, 3, "Step-free access");

    if (has(p, "hot-tub")) add(id, { musthave: ["hottub"] }, 12, "Has a hot tub");
    else add(id, { musthave: ["hottub"] }, -2);

    if (has(p, "river-view")) add(id, { musthave: ["river"] }, 8, "On the main river");
    else if (has(p, "waterside")) add(id, { musthave: ["river"] }, 4, "Right by the water");
    else add(id, { musthave: ["river"] }, -6);

    // --------------------------------------------------------------- THE TRIP
    if (has(p, "day-boat")) add(id, { trip: ["boating"] }, 8, "A day boat comes with the cottage");
    if (has(p, "moorings")) add(id, { trip: ["boating"] }, 6, "Moor your boat at the bottom of the garden");
    if (has(p, "river-view")) add(id, { trip: ["boating"] }, 3, "Straight out onto the main river");
    if (!has(p, "moorings") && !has(p, "day-boat")) add(id, { trip: ["boating"] }, -4);

    if (has(p, "fishing")) add(id, { trip: ["fishing"] }, 8, "Fishing from the garden or close by");
    if (has(p, "waterside")) add(id, { trip: ["fishing"] }, 3, "Right on the water");
    if (!has(p, "waterside")) add(id, { trip: ["fishing"] }, -4);

    if (RURAL.some(function (t) { return has(p, t); })) add(id, { trip: ["walking"] }, 6, "Quiet, with walks from the door");
    if (has(p, "garden")) add(id, { trip: ["walking"] }, 2, "A garden to come back to");
    if (has(p, "pet-friendly")) add(id, { trip: ["walking"] }, 2, "Dogs welcome on the walks");

    if (has(p, "village-centre")) add(id, { trip: ["exploring"] }, 6, "In the heart of the village");
    if (has(p, "wroxham")) add(id, { trip: ["exploring"] }, 3, "Wroxham's shops and boatyards close by");
    if (has(p, "horning")) add(id, { trip: ["exploring"] }, 3, "Horning's pubs and river frontage");
    if (has(p, "parking")) add(id, { trip: ["exploring"] }, 2, "Parking at the property for days out");

    if (has(p, "waterside")) add(id, { trip: ["nothing"] }, 5, "Sit by the water and watch the boats go by");
    if (has(p, "garden")) add(id, { trip: ["nothing"] }, 3, "A garden to yourselves");
    if (has(p, "hot-tub")) add(id, { trip: ["nothing"] }, 3, "A hot tub to sink into");
    if (has(p, "village-centre")) add(id, { trip: ["nothing"] }, -2);

    // ------------------------------------------------------------------ WHERE
    Object.keys(AREA).forEach(function (area) {
      var inArea = AREA[area].tags.some(function (t) { return has(p, t); });
      if (inArea) add(id, { area: [area] }, 8, "In " + AREA[area].label + ", where you asked");
      else add(id, { area: [area] }, -5);
    });
  });

  window.RR_RULES = R;
})();
