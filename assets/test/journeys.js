// Runs example guests through the engine and checks what comes out.
//   node test/journeys.js
global.window = global;
require("../data/properties.js");
require("../data/questions.js");
require("../data/rules.js");
require("../js/engine.js");
var E = window.RRFinderEngine, P = window.RR_PROPERTIES, R = window.RR_RULES, Q = window.RR_QUESTIONS;

var failures = 0;
function run(name, answers, expect, available) {
  var r = E.evaluate(answers, P, R, Q, available);
  var ids = r.shortlist.map(function (x) { return x.property.id; });
  var ok = true, why = [];
  (expect.top || []).forEach(function (id, i) { if (ids[i] !== id) { ok = false; why.push("expected #" + (i + 1) + " " + id); } });
  (expect.include || []).forEach(function (id) { if (ids.indexOf(id) === -1) { ok = false; why.push("expected " + id + " on the list"); } });
  (expect.exclude || []).forEach(function (id) { if (ids.indexOf(id) !== -1) { ok = false; why.push(id + " should not be on the list"); } });
  if (expect.talkToUs !== undefined && r.talkToUs !== expect.talkToUs) { ok = false; why.push("talkToUs should be " + expect.talkToUs); }
  if (expect.boat !== undefined && (r.boat ? r.boat.id : null) !== expect.boat) { ok = false; why.push("boat should be " + expect.boat + ", got " + (r.boat ? r.boat.id : null)); }
  if (expect.count !== undefined && ids.length !== expect.count) { ok = false; why.push("expected " + expect.count + " on the list, got " + ids.length); }
  if (expect.restAtLeast !== undefined && r.rest.length < expect.restAtLeast) { ok = false; why.push("expected at least " + expect.restAtLeast + " more that fit, got " + r.rest.length); }
  if (expect.taken !== undefined && r.taken.length !== expect.taken) { ok = false; why.push("expected " + expect.taken + " that fit but are taken, got " + r.taken.length); }
  if (available) r.shortlist.concat(r.rest).forEach(function (x) { if (available.indexOf(x.property.id) === -1) { ok = false; why.push(x.property.id + " is not available for the dates"); } });
  // every shortlisted cottage must actually sleep the party
  var size = E.partySize(answers);
  r.shortlist.forEach(function (x) { if (size && x.property.sleeps < size) { ok = false; why.push(x.property.id + " sleeps " + x.property.sleeps + " for a party of " + size); } });
  // and every shortlisted cottage must take dogs when the dog is coming
  if (E.wantsDog(answers)) r.shortlist.forEach(function (x) { if (x.property.tags.indexOf("pet-friendly") === -1) { ok = false; why.push(x.property.id + " doesn't take pets"); } });

  console.log((ok ? "PASS" : "FAIL") + "  " + name);
  console.log("      shortlist: " + (r.shortlist.map(function (x) { return x.property.id + " (" + x.score + ")"; }).join(", ") || "none") + (r.talkToUs ? "  [talk to us]" : "") + (r.boat ? "  + boat: " + r.boat.id : ""));
  if (r.taken.length) console.log("      taken:     " + r.taken.length + " fit but not free for the dates");
  console.log("      also fit:  " + r.rest.length + (r.rest.length ? " (" + r.rest.slice(0, 3).map(function (x) { return x.property.id + " " + x.score; }).join(", ") + (r.rest.length > 3 ? ", ..." : "") + ")" : ""));
  if (!ok) { failures += 1; why.forEach(function (w) { console.log("      ! " + w); }); }
}

run("Couple with a dog, walks, somewhere quiet",
  { party: "couple", when: "unsure", musthave: ["dog"], trip: ["walking"], area: "quiet" },
  { top: ["poppy"], exclude: ["the-sheriff-house", "patikipa"], talkToUs: false, restAtLeast: 5 });

run("Family of five or six, fishing, anywhere",
  { party: "family", size: "5-6", when: "unsure", musthave: ["unsure"], trip: ["fishing"], area: "unsure" },
  { include: ["broadwater", "kingfisher-lodge"], count: 3, talkToUs: false, restAtLeast: 10 });

run("Eight friends who want pubs and days out, in Horning",
  { party: "friends", size: "7-8", when: "unsure", musthave: ["unsure"], trip: ["exploring"], area: "horning" },
  { top: ["westbury"], talkToUs: false });

run("Big get-together of thirteen or more, out on the water",
  { party: "group", size: "13+", when: "unsure", musthave: ["unsure"], trip: ["boating"], area: "unsure" },
  { top: ["the-sheriff-house"], count: 1, boat: null, talkToUs: false });

run("Couple who must have a hot tub and want to do very little",
  { party: "couple", when: "unsure", musthave: ["hottub"], trip: ["nothing"], area: "unsure" },
  { top: ["parsley"], talkToUs: false });

run("Family of three or four, all on one level, dog coming, in Wroxham",
  { party: "family", size: "3-4", when: "unsure", musthave: ["dog", "single"], trip: ["nothing"], area: "wroxham" },
  { talkToUs: false });

run("Six friends with their own boat, need a mooring, Potter Heigham way",
  { party: "friends", size: "5-6", when: "unsure", musthave: ["moorings", "river"], trip: ["boating"], area: "thurne" },
  { include: ["melrose"], boat: "bertie-boat", talkToUs: false });

run("Family with the dog, out on the water: the boat must take dogs",
  { party: "family", size: "5-6", when: "unsure", musthave: ["dog"], trip: ["boating"], area: "unsure" },
  { boat: "bertie-boat", talkToUs: false });

run("Everything unsure (should route to talk to us)",
  { party: "unsure", size: "unsure", when: "unsure", musthave: ["unsure"], trip: ["unsure"], area: "unsure" },
  { count: 0, talkToUs: true });

run("Flexible dates alone must not count as unsure",
  { party: "couple", when: "unsure", musthave: ["river"], trip: ["nothing"], area: "south" },
  { talkToUs: false });

// With live availability: only free cottages are recommended, the rest kept aside
run("Family of four with the dog, 24 Oct 2026 for a week (9 cottages free that week)",
  { party: "family", size: "3-4", area: "unsure", when: "dates", musthave: ["dog"], trip: ["unsure"] },
  { include: ["fennel"], exclude: ["kingfisher-lodge"], talkToUs: false },
  ["buttercup-lodge", "dydle-down", "fennel", "holkham-cottage", "rebel", "rendezvous", "the-firs", "swan-cottage", "willow-lodge"]);

run("Boating and fishing both chosen: mooring, day boat and fishing all count",
  { party: "friends", size: "5-6", area: "unsure", when: "unsure", musthave: ["unsure"], trip: ["boating", "fishing"] },
  { include: ["broadwater"], boat: "bertie-boat", talkToUs: false });

run("Dog plus moorings both chosen: no pets is still a hard exclusion, no mooring is a soft miss",
  { party: "couple", area: "unsure", when: "unsure", musthave: ["dog", "moorings"], trip: ["unsure"] },
  { talkToUs: false });

// Conditional question and pruning
var vis = E.visibleQuestions(Q, { party: "couple" }).map(function (q) { return q.id; });
console.log("visible for a couple (no size question): " + vis.join(", "));
var pruned = E.pruneAnswers(Q, { party: "couple", size: "5-6", when: "unsure" });
console.log("pruned (size should be gone): " + JSON.stringify(pruned));
console.log("rules: " + R.length + ", cottages: " + P.filter(function (p) { return p.type === "cottage"; }).length + ", boats: " + P.filter(function (p) { return p.type === "boat"; }).length);
if (failures) { console.log(failures + " journey(s) failed"); process.exitCode = 1; } else console.log("All journeys passed");
