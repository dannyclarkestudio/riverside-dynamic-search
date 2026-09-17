// Finder engine. No DOM, no dependencies, so it runs in the browser and in Node
// for the journey tests. Everything the guest sees on the results screen comes
// from evaluate(); everything the owner receives comes from buildEnquiry().

(function (global) {
  "use strict";

  // Does every condition in `when` match the guest's answers?
  // A multi-select answer is an array: the rule fires if any chosen value matches.
  function matches(when, answers) {
    if (!when) return true;
    return Object.keys(when).every(function (q) {
      var a = answers[q];
      if (Array.isArray(a)) return a.some(function (v) { return when[q].indexOf(v) !== -1; });
      return when[q].indexOf(a) !== -1;
    });
  }
  function isUnsure(a) { return Array.isArray(a) ? a.indexOf("unsure") !== -1 : a === "unsure"; }

  // Questions that apply given the answers so far (honours showIf).
  function visibleQuestions(questions, answers) {
    return questions.filter(function (q) { return matches(q.showIf, answers); });
  }

  // Drop answers to questions that are no longer asked.
  function pruneAnswers(questions, answers) {
    var keep = {};
    visibleQuestions(questions, answers).forEach(function (q) {
      if (answers[q.id] !== undefined) keep[q.id] = answers[q.id];
    });
    return keep;
  }

  var SHORTLIST_MAX = 3;     // the recommendation; everything else that fits is listed under it
  var CONFIDENT_SCORE = 14;  // below this, "talk to us" leads
  var UNSURE_LIMIT = 3;      // this many "not sure" answers and "talk to us" leads

  // How many people the answers describe. Couples and solo guests skip the size
  // question, so infer it; a size band gives its lower bound.
  function partySize(answers) {
    if (answers.party === "couple") return 2;
    if (answers.party === "solo") return 1;
    var m = /^(\d+)/.exec(answers.size || "");
    return m ? parseInt(m[1], 10) : null;
  }

  // `available`, when given, is the list of property ids free for the guest's
  // dates (from the live site). Recommendations are then drawn from those; the
  // rest that fit but are taken are kept aside so the guest can try other dates.
  function evaluate(answers, properties, rules, questions, available) {
    var results = properties
      .filter(function (p) { return p.enabled !== false && p.type === "cottage"; })
      .map(function (p) { return { property: p, score: 0, reasons: [], excluded: false, excludedReason: null, fired: [] }; });
    var byId = {};
    results.forEach(function (r) { byId[r.property.id] = r; });

    rules.forEach(function (rule) {
      var r = byId[rule.property];
      if (!r || !matches(rule.when, answers)) return;
      r.fired.push(rule.id);
      if (rule.score === "exclude") {
        r.excluded = true;
        if (!r.excludedReason) r.excludedReason = rule.reason;
        return;
      }
      r.score += rule.score;
      if (rule.score > 0 && rule.reason) r.reasons.push({ text: rule.reason, weight: rule.score });
    });

    // Dedupe reasons, strongest first, top four.
    results.forEach(function (r) {
      var seen = {};
      r.reasons = r.reasons
        .sort(function (a, b) { return b.weight - a.weight; })
        .filter(function (x) { if (seen[x.text]) return false; seen[x.text] = true; return true; })
        .slice(0, 4)
        .map(function (x) { return x.text; });
    });

    var fits = results
      .filter(function (r) { return !r.excluded && r.score > 0; })
      .sort(function (a, b) { return b.score - a.score || a.property.name.localeCompare(b.property.name); });

    var ranked = fits, taken = [];
    if (available) {
      var free = {};
      available.forEach(function (id) { free[id] = true; });
      fits.forEach(function (r) { r.available = !!free[r.property.id]; });
      ranked = fits.filter(function (r) { return r.available; });
      taken = fits.filter(function (r) { return !r.available; });
    }

    // top three recommended; the rest of the cottages that fit are listed too
    var shortlist = ranked.slice(0, SHORTLIST_MAX);
    var rest = ranked.slice(SHORTLIST_MAX);

    // "Flexible" on dates is a preference, not uncertainty, so it doesn't count.
    var unsureCount = Object.keys(answers).filter(function (k) {
      if (!isUnsure(answers[k])) return false;
      var q = (questions || []).filter(function (x) { return x.id === k; })[0];
      return !(q && q.unsureIsPreference);
    }).length;
    var best = fits.length ? fits[0].score : 0;
    var talkToUs = fits.length === 0 || best < CONFIDENT_SCORE || unsureCount >= UNSURE_LIMIT;

    return {
      ranked: ranked,
      shortlist: shortlist,
      rest: rest,
      taken: taken,
      fits: fits,
      checked: !!available,
      excluded: results.filter(function (r) { return r.excluded; }),
      talkToUs: talkToUs,
      unsureCount: unsureCount,
      boat: suggestBoat(answers, properties)
    };
  }

  // A day boat to go with the cottage, when the guest wants to be on the water:
  // the smallest boat that seats the party, pet-friendly if the dog is coming.
  function suggestBoat(answers, properties) {
    var t = answers.trip;
    if (!(Array.isArray(t) ? t.indexOf("boating") !== -1 : t === "boating")) return null;
    var size = partySize(answers) || 2;
    var boats = properties.filter(function (p) { return p.type === "boat" && p.enabled !== false; })
      .filter(function (b) { return b.sleeps >= size; })
      .filter(function (b) { return !wantsDog(answers) || b.tags.indexOf("pet-friendly") !== -1; })
      .sort(function (a, b) { return a.sleeps - b.sleeps || a.name.localeCompare(b.name); });
    return boats[0] || null;
  }

  function wantsDog(answers) {
    var m = answers.musthave;
    return Array.isArray(m) ? m.indexOf("dog") !== -1 : m === "dog";
  }

  function optionLabel(questions, qid, value) {
    var q = questions.filter(function (x) { return x.id === qid; })[0];
    if (!q) return value;
    if (Array.isArray(value)) return value.map(function (v) { return optionLabel(questions, qid, v); }).join(", ");
    var o = q.options.filter(function (x) { return x.value === value; })[0];
    return o ? o.label : value;
  }

  // The structured enquiry. This is what the owner receives instead of a blank
  // contact form: the trip, the must-haves, what was suggested, and the dates.
  function buildEnquiry(answers, details, result, questions) {
    var lbl = function (q) { return answers[q] === undefined ? null : optionLabel(questions, q, answers[q]); };
    return {
      submitted_at: new Date().toISOString(),
      source: "Find your perfect stay",
      party: lbl("party"),
      party_size: details.partySize || partySize(answers),
      area: lbl("area"),
      arrival: details.arrival || null,
      nights: details.nights || null,
      dates_flexible: !details.arrival,
      availability_checked: result.checked,
      must_have: lbl("musthave"),
      trip: lbl("trip"),
      properties_surfaced: result.shortlist.map(function (r) { return r.property.name; }),
      properties_also_fit: result.rest.map(function (r) { return r.property.name; }),
      properties_fit_but_taken: result.taken.map(function (r) { return r.property.name; }),
      property_chosen: details.property || null,
      boat_suggested: result.boat ? result.boat.name : null,
      scores: result.ranked.slice(0, 5).map(function (r) { return { property: r.property.id, score: r.score }; }),
      talk_to_us: result.talkToUs,
      contact: {
        name: details.name || null,
        email: details.email || null,
        phone: details.phone || null
      },
      message: details.message || null,
      answers_raw: answers
    };
  }

  global.RRFinderEngine = {
    matches: matches,
    visibleQuestions: visibleQuestions,
    pruneAnswers: pruneAnswers,
    partySize: partySize,
    evaluate: evaluate,
    suggestBoat: suggestBoat,
    wantsDog: wantsDog,
    isUnsure: isUnsure,
    optionLabel: optionLabel,
    buildEnquiry: buildEnquiry
  };
})(typeof window !== "undefined" ? window : globalThis);
