// Exports the property master, the questions and the rules as CSVs that open in
// Excel or Numbers, so the owner can check the logic without reading JavaScript.
//   node test/export-matrix.js
global.window = global;
require("../data/properties.js");
require("../data/questions.js");
require("../data/rules.js");
var fs = require("fs"), path = require("path");
var out = path.join(__dirname, "..", "decision-matrix");
fs.mkdirSync(out, { recursive: true });
function csv(rows) { return rows.map(function (r) { return r.map(function (v) { v = v === null || v === undefined ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }).join("\n") + "\n"; }
function label(qid, v) { var q = window.RR_QUESTIONS.find(function (x) { return x.id === qid; }); var o = q && q.options.find(function (x) { return x.value === v; }); return o ? o.label : v; }
function qlabel(qid) { var q = window.RR_QUESTIONS.find(function (x) { return x.id === qid; }); return q ? q.label : qid; }

// Sheet 1: property master, with columns for the owner to correct or fill.
var p1 = [["ID", "Type", "Name", "Place", "Sleeps", "Bedrooms", "Bathrooms", "Prices from (£/week)", "Price band", "Tags", "Tagline", "Description (from the site)", "Page", "Enabled", "Notes / TBC", "Owner: correct?", "Owner: comment"]];
window.RR_PROPERTIES.forEach(function (p) {
  p1.push([p.id, p.type, p.name, p.place, p.sleeps, p.bedrooms, p.bathrooms, p.priceFrom === null ? "TBC" : p.priceFrom, p.priceBand, p.tags.join("; "), p.tagline, p.description, p.url, p.enabled ? "yes" : "no", p.notes, "", ""]);
});
fs.writeFileSync(path.join(out, "1-properties.csv"), csv(p1));

// Sheet 2: questions.
var p2 = [["Question ID", "Label", "Question", "Only asked when", "Answer value", "Answer label", "Icon"]];
window.RR_QUESTIONS.forEach(function (q) {
  var when = q.showIf ? Object.keys(q.showIf).map(function (k) { return qlabel(k) + " = " + q.showIf[k].map(function (v) { return label(k, v); }).join(" / "); }).join("; ") : "always";
  q.options.forEach(function (o) { p2.push([q.id, q.label, q.question, when, o.value, o.label, o.icon]); });
});
fs.writeFileSync(path.join(out, "2-questions.csv"), csv(p2));

// Sheet 3: rules, one row each.
var byId = {}; window.RR_PROPERTIES.forEach(function (p) { byId[p.id] = p.name; });
var p3 = [["Rule ID", "Property", "Question", "Answer", "Action", "Reason shown to the guest", "Owner verdict (keep / change / remove)", "Comment"]];
window.RR_RULES.forEach(function (r) {
  var q = Object.keys(r.when)[0];
  p3.push([r.id, byId[r.property] || r.property, qlabel(q), r.when[q].map(function (v) { return label(q, v); }).join(" / "), r.score === "exclude" ? "EXCLUDE" : (r.score > 0 ? "+" : "") + r.score, r.score === "exclude" ? r.reason : (r.score > 0 ? r.reason : ""), "", ""]);
});
fs.writeFileSync(path.join(out, "3-rules.csv"), csv(p3));

// Sheet 4: the score grid, property x answer, for a one-page overview.
var cols = [];
window.RR_QUESTIONS.forEach(function (q) { q.options.forEach(function (o) { if (o.value !== "unsure") cols.push({ q: q.id, v: o.value, head: q.label + ": " + o.label }); }); });
var p4 = [["Property"].concat(cols.map(function (c) { return c.head; }))];
window.RR_PROPERTIES.filter(function (p) { return p.type === "cottage"; }).forEach(function (p) {
  p4.push([p.name].concat(cols.map(function (c) {
    var total = 0, excluded = false;
    window.RR_RULES.forEach(function (r) {
      if (r.property !== p.id || !r.when[c.q] || r.when[c.q].indexOf(c.v) === -1) return;
      if (r.score === "exclude") excluded = true; else total += r.score;
    });
    return excluded ? "X" : (total === 0 ? "" : (total > 0 ? "+" : "") + total);
  })));
});
fs.writeFileSync(path.join(out, "4-score-grid.csv"), csv(p4));
console.log("wrote 4 sheets to " + out + " (" + window.RR_RULES.length + " rules)");
