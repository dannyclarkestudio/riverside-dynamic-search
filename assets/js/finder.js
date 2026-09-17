// Find your perfect stay: the panel UI. Renders into #finder, the wide bar
// under the hero heading. Depends on RRFinderEngine, RR_ICONS, the three data
// files, and the page's shared calendar (window.RRCal). No libraries.

(function () {
  "use strict";

  var E = window.RRFinderEngine;
  var ICONS = window.RR_ICONS;
  var PROPERTIES = window.RR_PROPERTIES;
  var QUESTIONS = window.RR_QUESTIONS;
  var RULES = window.RR_RULES;
  var STORAGE_KEY = "rr_finder_enquiries";
  var PHONE = "01493 368300";
  var SITE = "https://www.riverside-rentals.co.uk";
  var AVAILABILITY_API = "/api/availability";

  var state = {
    phase: "questions", step: 0, answers: {}, dates: null,   // dates: {arrival, nights}
    details: {}, result: null, availability: null,           // availability: {ok, available:[ids], nonce, count} or {error}
    checking: false, enquiry: null
  };

  var root = document.getElementById("finder");
  var live = document.getElementById("finderLive");

  // ----------------------------------------------------------- helpers
  function h(tag, attrs, children) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "class") el.className = attrs[k];
      else if (k === "html") el.innerHTML = attrs[k];
      else if (k.indexOf("on") === 0) el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return el;
  }
  function icon(name, cls) { return h("span", { class: cls || "fa__ico", html: ICONS[name] || "" }); }
  function visible() { return E.visibleQuestions(QUESTIONS, state.answers); }
  function answered(q) { var a = state.answers[q.id]; return a !== undefined && !(Array.isArray(a) && a.length === 0); }
  function optionOf(q, v) { return q.options.filter(function (o) { return o.value === v; })[0]; }
  function announce(text) { live.textContent = ""; setTimeout(function () { live.textContent = text; }, 30); }
  var interacted = false;   // the page's snap stands down while focus is in the panel, so only take it once the guest has started
  function focusHeading() {
    if (!interacted) return;
    var el = root.querySelector("[data-focus]");
    if (el) el.focus({ preventScroll: true });
    var body = root.querySelector(".fa__body");
    if (body) body.scrollTop = 0;
  }
  // The panel sits in the pinned hero, centred by the page; every phase is a
  // different height, so ask the page to re-centre once things have laid out.
  function recentre() {
    if (!window.RRLayoutBook) return;
    window.RRLayoutBook();
    requestAnimationFrame(window.RRLayoutBook);
    setTimeout(window.RRLayoutBook, 260);
  }
  function fmtDate(iso) {
    var d = new Date(iso + "T12:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }
  function joinNames(names) {
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  }
  // Any number of nights from 1 to 21, 7 by default. A button that opens a
  // panel in the same glass as the calendar; a hidden select carries the value.
  function nightsSelect(id, current) {
    var value = h("input", { type: "hidden", name: "nights", id: id + "-value", value: String(current) });
    var label = function (n) { return n + (n === 1 ? " night" : " nights"); };
    var btn = h("button", { type: "button", class: "fa__datebtn datebtn fa__nightsbtn", id: id, "aria-haspopup": "listbox", "aria-expanded": "false" }, [
      h("span", { class: "datebtn__text" }, [label(parseInt(current, 10))]),
      h("span", { class: "fa__chev", "aria-hidden": "true" })
    ]);
    var panel = null;
    function close() {
      if (!panel) return;
      panel.remove(); panel = null;
      btn.setAttribute("aria-expanded", "false");
      window.removeEventListener("pointerdown", onDown); window.removeEventListener("keydown", onKey); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true);
    }
    function onDown(e) { if (panel && !panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close(); }
    function onKey(e) { if (e.key === "Escape") { close(); btn.focus(); } }
    function place() {
      if (!panel) return;
      var b = btn.getBoundingClientRect(), w = panel.offsetWidth, ht = panel.offsetHeight, top = b.bottom + 10, left = b.left;
      if (top + ht > innerHeight - 12) top = Math.max(12, b.top - 10 - ht);
      if (left + w > innerWidth - 12) left = innerWidth - 12 - w;
      panel.style.top = Math.round(top) + "px"; panel.style.left = Math.round(Math.max(12, left)) + "px";
    }
    function open() {
      if (panel) return close();
      var cur = parseInt(value.value, 10);
      var cells = [];
      for (var i = 1; i <= 21; i++) (function (n) {
        cells.push(h("button", { type: "button", role: "option", class: "fa__nights-day", "aria-selected": n === cur ? "true" : "false", onclick: function () {
          value.value = String(n); btn.querySelector(".datebtn__text").textContent = label(n); close(); btn.focus();
        } }, [String(n)]));
      })(i);
      panel = h("div", { class: "cal fa__nights", role: "listbox", "aria-label": "How many nights" }, [
        h("div", { class: "cal__top" }, [h("span", { class: "cal__month" }, ["How many nights?"])]),
        h("div", { class: "fa__nights-grid" }, cells)
      ]);
      document.body.appendChild(panel);
      btn.setAttribute("aria-expanded", "true");
      place();
      window.addEventListener("pointerdown", onDown); window.addEventListener("keydown", onKey); window.addEventListener("resize", place); window.addEventListener("scroll", place, true);
      var sel = panel.querySelector('[aria-selected="true"]'); if (sel) sel.focus();
    }
    btn.addEventListener("click", open);
    return h("div", { class: "fa__nightswrap" }, [btn, value]);
  }
  function guests() { return parseInt(state.details.partySize, 10) || E.partySize(state.answers) || 2; }
  function cottageCount() { return PROPERTIES.filter(function (p) { return p.type === "cottage"; }).length; }

  // ----------------------------------------------------------- actions
  function restart() {
    interacted = true;
    state = { phase: "questions", step: 0, answers: {}, dates: null, details: {}, result: null, availability: null, checking: false, enquiry: null };
    render();
  }
  function goStep(i) {
    var vis = visible();
    if (i >= vis.length) { finish(); return; }
    state.step = Math.max(0, i);
    state.phase = "questions";
    render();
  }
  // a single-choice tile: answer and move on
  function answer(qid, value) {
    interacted = true;
    state.answers[qid] = value;
    state.answers = E.pruneAnswers(QUESTIONS, state.answers);
    advanceFrom(qid);
  }
  // a multi-choice tile: toggle, stay on the question
  function toggle(qid, value) {
    interacted = true;
    var cur = Array.isArray(state.answers[qid]) ? state.answers[qid].slice() : [];
    if (value === "unsure") cur = cur.indexOf("unsure") === -1 ? ["unsure"] : [];
    else {
      cur = cur.filter(function (v) { return v !== "unsure"; });
      var i = cur.indexOf(value);
      if (i === -1) cur.push(value); else cur.splice(i, 1);
    }
    if (cur.length) state.answers[qid] = cur; else delete state.answers[qid];
    render();
  }
  function advanceFrom(qid) {
    var vis = visible();
    var idx = vis.findIndex(function (q) { return q.id === qid; });
    if (idx + 1 < vis.length) { state.step = idx + 1; state.phase = "questions"; render(); }
    else finish();
  }
  function goTo(qid) {
    var idx = visible().findIndex(function (q) { return q.id === qid; });
    if (idx !== -1) goStep(idx);
  }
  function back() {
    if (state.phase === "questions") { if (state.step > 0) goStep(state.step - 1); }
    else if (state.phase === "results") goStep(visible().length - 1);
    else if (state.phase === "enquiry") { state.phase = "results"; render(); }
  }
  function finish() {
    state.phase = "results";
    state.result = E.evaluate(state.answers, PROPERTIES, RULES, QUESTIONS, state.availability && state.availability.available);
    render();
    if (state.dates && !state.availability) checkAvailability();
  }
  function enquire() {
    state.phase = "enquiry";
    render();
  }
  function submit(form) {
    var d = readForm(form);
    var errors = validate(d);
    showErrors(form, errors);
    if (Object.keys(errors).length) {
      var first = form.querySelector(".has-error .fa__input, .has-error input, .has-error button");
      if (first) first.focus();
      announce("Please check the highlighted fields.");
      return;
    }
    state.details = d;
    state.enquiry = E.buildEnquiry(state.answers, d, state.result, QUESTIONS);
    saveEnquiry(state.enquiry);
    state.phase = "done";
    render();
  }

  // ------------------------------------------------------ availability
  // Asks the local server, which asks the live site exactly as its own search
  // form does, which cottages are free for the dates. Any failure falls back
  // to the un-dated list and the enquiry route, with a plain message.
  function checkAvailability() {
    var d = state.dates;
    if (!d || !d.arrival) return;
    state.checking = true;
    state.availability = null;
    render();
    var url = AVAILABILITY_API + "?date=" + encodeURIComponent(d.arrival) + "&nights=" + encodeURIComponent(d.nights || 7) + "&guests=" + encodeURIComponent(guests());
    fetch(url, { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      state.availability = j && j.ok ? j : { error: (j && j.error) || "no answer" };
    }).catch(function (err) {
      state.availability = { error: String(err && err.message || err) };
    }).then(function () {
      state.checking = false;
      if (state.phase !== "results") return;
      state.result = E.evaluate(state.answers, PROPERTIES, RULES, QUESTIONS, state.availability.available || null);
      render();
    });
  }
  // "Search all properties that match": submit the same dated search to the
  // site itself, in a new tab, so the guest sees the live listing for their dates.
  function siteSearchForm() {
    var d = state.dates, a = state.availability;
    if (!d || !a || !a.nonce) return null;
    return h("form", { method: "post", action: SITE + "/properties/cottages/", target: "_blank", class: "fa__hiddenform" }, [
      h("input", { type: "hidden", name: "supwpnonce", value: a.nonce }),
      h("input", { type: "hidden", name: "_wp_http_referer", value: "/" }),
      h("input", { type: "hidden", name: "supcontrol_tag", value: "24" }),
      h("input", { type: "hidden", name: "supcontrol_date", value: d.arrival }),
      h("input", { type: "hidden", name: "supcontrol_nights", value: String(d.nights || 7) }),
      h("input", { type: "hidden", name: "supcontrol_guests", value: String(guests()) }),
      h("input", { type: "hidden", name: "supcontrol_property", value: "" })
    ]);
  }

  // -------------------------------------------------------------- form
  function readForm(form) {
    var fd = new FormData(form), d = {};
    ["arrival", "nights", "partySize", "property", "name", "email", "phone", "message"].forEach(function (k) {
      var v = fd.get(k); d[k] = v ? String(v).trim() : "";
    });
    return d;
  }
  function validate(d) {
    var e = {};
    if (!d.name) e.name = "We need a name to reply to.";
    if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) e.email = "Enter an email address we can reply to.";
    if (d.phone && !/^[+\d][\d\s()-]{6,}$/.test(d.phone)) e.phone = "That phone number doesn't look right.";
    if (d.partySize && !/^\d{1,2}$/.test(d.partySize)) e.partySize = "How many people, as a number.";
    return e;
  }
  function showErrors(form, errors) {
    Array.prototype.forEach.call(form.querySelectorAll(".has-error"), function (el) { el.classList.remove("has-error"); });
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid="true"]'), function (el) { el.removeAttribute("aria-invalid"); });
    Object.keys(errors).forEach(function (k) {
      var wrap = form.querySelector('[data-field="' + k + '"]');
      if (!wrap) return;
      wrap.classList.add("has-error");
      var msg = wrap.querySelector(".fa__error"); if (msg) msg.textContent = errors[k];
      var input = wrap.querySelector(".fa__input"); if (input) input.setAttribute("aria-invalid", "true");
    });
  }

  // ---------------------------------------------------------- enquiries
  function loadEnquiries() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch (err) { return []; } }
  function saveEnquiry(e) {
    try { var all = loadEnquiries(); all.unshift(e); localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 50))); } catch (err) { /* storage blocked: the confirmation still renders */ }
    renderLeads();
  }
  function clearEnquiries() { try { localStorage.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ } renderLeads(); }
  function download(e) {
    var blob = new Blob([JSON.stringify(e, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "riverside-enquiry-" + e.submitted_at.replace(/[:.]/g, "-") + ".json";
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  // ------------------------------------------------------------ render
  function render() {
    root.innerHTML = "";
    var parts = { questions: renderQuestion, results: renderResults, enquiry: renderEnquiry, done: renderDone }[state.phase]();
    root.appendChild(h("div", { class: "fa__head" }, parts.head));
    root.appendChild(h("div", { class: "fa__body" + (parts.row ? " fa__body--row" : "") + (parts.fit ? " fa__body--results" : "") }, parts.body));
    root.appendChild(h("div", { class: "fa__foot" + (parts.stack ? " fa__foot--stack" : "") }, parts.foot));
    /* once there are results the panel is the point: the hero heading steps
       aside so the panel can use the height */
    var book = document.getElementById("book");
    if (book) book.classList.toggle("is-deep", state.phase !== "questions");
    focusHeading();
    if (parts.after) parts.after();
    recentre();
    fitCards();
  }

  // On desktop the three cards take whatever height the panel has left, so the
  // photograph and Book now are on screen without scrolling; the rest of the
  // list sits below them.
  function fitCards() {
    var body = root.querySelector(".fa__body--results"), cards = root.querySelector(".fa__cards");
    if (!body || !cards) return;
    function fit() {
      if (!window.matchMedia("(min-width: 900px)").matches) { cards.style.height = ""; return; }
      var top = cards.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
      var avail = body.clientHeight - top - 12;
      cards.style.height = Math.max(200, Math.min(460, Math.round(avail))) + "px";
    }
    fit(); requestAnimationFrame(fit); setTimeout(fit, 260);
    window.addEventListener("resize", fit);
  }

  function startAgain() {
    var any = Object.keys(state.answers).length > 0 || state.phase !== "questions";
    return any ? h("button", { class: "fa__text", type: "button", onclick: restart }, ["Start again"]) : h("span");
  }
  function backBtn(hidden) {
    return hidden ? h("span") : h("button", { class: "fa__btn fa__btn--ghost", type: "button", onclick: back }, [icon("back", "fa__ico"), "Back"]);
  }
  function headRow(kicker) {
    return h("div", { class: "fa__progress" }, [h("p", { class: "fa__kicker" }, [kicker]), startAgain()]);
  }
  function fullBar() { return h("div", { class: "fa__bar", "aria-hidden": "true" }, [h("div", { class: "fa__fill", style: "width:100%" })]); }

  // Answer chips: one per chosen option, click to change that question.
  function chips(editable) {
    var list = [];
    visible().filter(answered).forEach(function (q) {
      var a = state.answers[q.id];
      var values = Array.isArray(a) ? a : [a];
      values.forEach(function (v) {
        var o = optionOf(q, v) || { icon: "question", label: String(v) };
        var label = o.label;
        if (q.type === "dates" && v === "dates" && state.dates) label = fmtDate(state.dates.arrival) + ", " + state.dates.nights + " nights";
        var kids = [icon(o.icon, "i"), h("span", { class: "t" }, [label])];
        list.push(h("li", null, [editable
          ? h("button", { type: "button", title: q.label + ": " + label + ". Change", "aria-label": q.label + ": " + label + ". Change this answer", onclick: function () { goTo(q.id); } }, kids)
          : h("span", { title: q.label + ": " + label }, kids)]));
      });
    });
    return list.length ? h("ul", { class: "fa__chips", "aria-label": "Your answers" }, list) : null;
  }

  function questionHead(n, total) {
    return [
      (function () {
        var c = chips(true);
        return c
          ? h("div", { class: "fa__progress fa__progress--chips" }, [c, startAgain()])
          : h("div", { class: "fa__progress fa__progress--intro" }, [h("p", { class: "fa__intro" }, ["Tell us about your perfect trip and we'll suggest the cottages that fit you and your dates."])]);
      })(),
      h("div", { class: "fa__bar", role: "progressbar", "aria-valuemin": "1", "aria-valuemax": String(total), "aria-valuenow": String(n), "aria-label": "Progress" }, [
        h("div", { class: "fa__fill", style: "width:" + Math.round((n - 1) / total * 100) + "%" })
      ])
    ];
  }

  function renderQuestion() {
    var vis = visible(), q = vis[state.step], n = state.step + 1, total = vis.length;
    announce("Question " + n + " of " + total + ". " + q.question);
    if (q.type === "dates") return renderDates(q, n, total);
    var multi = !!q.multiple;
    var cur = state.answers[q.id];
    var chosen = function (v) { return multi ? (Array.isArray(cur) && cur.indexOf(v) !== -1) : cur === v; };
    var tiles = q.options.map(function (o) {
      var unsure = o.value === "unsure";
      return h("li", null, [h("button", {
        class: "fa__tile" + (unsure ? " fa__tile--unsure" : ""), type: "button", role: multi ? "checkbox" : "radio",
        "aria-checked": chosen(o.value) ? "true" : "false",
        onclick: function () { if (multi) toggle(q.id, o.value); else answer(q.id, o.value); }
      }, [icon(o.icon), h("span", null, [o.label])])]);
    });
    return {
      head: questionHead(n, total),
      body: [
        h("div", { class: "fa__ask" }, [
          h("h2", { class: "fa__q", tabindex: "-1", "data-focus": "" }, [q.question]),
          h("p", { class: "fa__help" }, [q.help || "Pick the closest match."])
        ]),
        h("ul", { class: "fa__tiles", role: multi ? "group" : "radiogroup", "aria-label": q.question }, tiles)
      ],
      row: true,
      foot: [
        backBtn(state.step === 0),
        answered(q)
          ? h("button", { class: "fa__btn", type: "button", onclick: function () { advanceFrom(q.id); } }, [n === total ? "See your perfect cottage" : "Continue", icon("arrow", "fa__ico")])
          : h("span", { class: "fa__small" }, [multi ? "Pick one or more, then continue." : ""])
      ]
    };
  }

  // The dates step: arrival from the site's own calendar, nights, or "I'm flexible".
  function renderDates(q, n, total) {
    var d = state.dates || {};
    var dateBtn = h("button", { type: "button", class: "fa__datebtn datebtn", id: "q-arrival", "aria-haspopup": "dialog", "aria-expanded": "false" }, [
      h("span", { class: "datebtn__text" + (d.arrival ? "" : " is-empty") }, [d.arrival ? fmtDate(d.arrival) : "Choose an arrival date"]),
      h("span", { html: ICONS.calendar })
    ]);
    var dateVal = h("input", { type: "hidden", name: "arrival", id: "q-arrival-value", value: d.arrival || "" });
    var nights = nightsSelect("q-nights", d.nights || 7);
    var form = h("form", { class: "fa__dates", novalidate: "novalidate", onsubmit: function (ev) { ev.preventDefault(); useDates(); } }, [
      h("div", { class: "fa__field", "data-field": "arrival" }, [h("label", { class: "fa__label", for: "q-arrival" }, ["Arrival"]), h("div", null, [dateBtn, dateVal]), h("p", { class: "fa__error", role: "alert" })]),
      h("div", { class: "fa__field" }, [h("label", { class: "fa__label", for: "q-nights" }, ["How long"]), nights])
    ]);
    function useDates() {
      var arrival = dateVal.value;
      if (!arrival) {
        form.querySelector("[data-field=arrival]").classList.add("has-error");
        form.querySelector(".fa__error").textContent = "Pick an arrival date, or choose \"I'm flexible\".";
        dateBtn.focus();
        return;
      }
      var nightsSel = form.querySelector("#q-nights-value").value;
      var changed = !state.dates || state.dates.arrival !== arrival || String(state.dates.nights) !== nightsSel;
      state.dates = { arrival: arrival, nights: parseInt(nightsSel, 10) };
      if (changed) state.availability = null;
      state.answers[q.id] = "dates";
      advanceFrom(q.id);
    }
    function flexible() {
      state.dates = null; state.availability = null;
      state.answers[q.id] = "unsure";
      advanceFrom(q.id);
    }
    return {
      head: questionHead(n, total),
      body: [
        h("div", { class: "fa__ask" }, [
          h("h2", { class: "fa__q", tabindex: "-1", "data-focus": "" }, [q.question]),
          h("p", { class: "fa__help" }, [q.help])
        ]),
        h("div", { class: "fa__dateswrap" }, [
          form,
          h("div", { class: "fa__dates-acts" }, [
            h("button", { class: "fa__btn", type: "button", onclick: useDates }, ["Use these dates", icon("arrow", "fa__ico")]),
            h("button", { class: "fa__btn fa__btn--ghost", type: "button", onclick: flexible }, ["I'm flexible"])
          ])
        ])
      ],
      row: true,
      foot: [backBtn(state.step === 0), h("span", { class: "fa__small" }, ["Availability comes straight from the booking system."])],
      after: function () {
        if (window.RRCal) window.RRCal.bind(form, { btn: dateBtn, text: dateBtn.querySelector(".datebtn__text"), value: dateVal, placeholder: "Choose an arrival date", format: fmtDate });
      }
    };
  }

  function renderResults() {
    var r = state.result, a = state.availability, d = state.dates;
    var n = r.shortlist.length, dated = !!(d && d.arrival), checked = r.checked;
    var title, lede;
    var when = dated ? fmtDate(d.arrival) + " for " + d.nights + " nights" : "";
    if (state.checking) {
      title = "Checking availability";
      lede = "Asking the booking system which cottages are free from " + when + ".";
    } else if (r.fits.length === 0) {
      title = "Let's talk it through";
      lede = "Your answers don't point clearly at one cottage, which usually means a quick chat will get you there faster than a list.";
    } else if (checked && n === 0) {
      title = "Nothing that fits is free for those dates";
      lede = r.taken.length + (r.taken.length === 1 ? " cottage fits" : " cottages fit") + " what you've told us but none are available from " + when + ". Try different dates, or ask us and we'll suggest the nearest.";
    } else if (r.talkToUs) {
      title = "A starting point, and a conversation";
      lede = "A few answers were \"not sure\", so the surest next step is a short call. The cottages below are worth a look in the meantime.";
    } else if (checked) {
      title = n === 1 ? "One cottage fits and is free" : "Our top " + (n === 2 ? "two" : "three") + ", free for your dates";
      lede = (n + r.rest.length) + " of the " + a.count + " cottages free from " + when + " fit what you've told us." + (r.taken.length ? " Another " + r.taken.length + " would fit but " + (r.taken.length === 1 ? "is" : "are") + " already booked." : "") + " Book straight through to the cottage.";
    } else {
      title = n === 1 ? "We'd suggest this one" : "Our top " + (n === 2 ? "two" : "three");
      lede = (n + r.rest.length) + " of our " + cottageCount() + " cottages fit what you've told us. These fit best; the rest are listed below." + (dated && a && a.error ? " We couldn't check live availability just now, so ask us and we'll confirm the dates." : "");
    }
    announce(title);
    var body = [
      h("h2", { class: "fa__r-title", tabindex: "-1", "data-focus": "" }, [title]),
      h("p", { class: "fa__r-lede" }, [lede])
    ];
    if (state.checking) {
      body.push(h("div", { class: "fa__checking" }, [h("span", { class: "fa__spinner", "aria-hidden": "true" }), "One moment"]));
      return { head: [headRow("Your dates"), chips(true)], body: body, foot: [backBtn(false), h("span")] };
    }
    if (r.talkToUs && r.fits.length) body.push(h("div", { class: "fa__talk" }, [icon("phone"), h("p", null, [h("b", null, ["Call " + PHONE + " and tell us about the trip. "]), "We know every cottage inside out and can usually suggest the right one in a couple of minutes."])]));
    if (n) body.push(h("div", { class: "fa__cards" }, r.shortlist.map(function (item, i) { return renderCard(item, i + 1, checked); })));
    if (r.rest.length) {
      var shown = r.rest.slice(0, 6);
      body.push(h("div", { class: "fa__rest" }, [
        h("h3", { class: "fa__rest-title" }, [checked ? "Also free and a good fit" : "Also worth a look", h("span", null, [r.rest.length + " more"])]),
        h("ul", { class: "fa__rest-list" }, shown.map(function (item) {
          var p = item.property;
          return h("li", null, [
            h("a", { href: p.url, target: "_blank", rel: "noopener" }, [
              h("img", { src: p.image, alt: "", loading: "lazy" }),
              h("span", { class: "fa__rest-body" }, [
                h("b", null, [p.name]),
                h("span", null, [p.place + " · sleeps " + p.sleeps + (item.reasons[0] ? " · " + item.reasons[0] : "")])
              ])
            ])
          ]);
        })),
        restCta()
      ]));
    } else if (checked && r.taken.length && n) {
      body.push(h("p", { class: "fa__note" }, [r.taken.length + " more would fit but " + (r.taken.length === 1 ? "is" : "are") + " booked for those dates. ", h("button", { class: "fa__text", type: "button", onclick: function () { goTo("when"); } }, ["Try other dates"])]));
    }
    if (r.boat && n) {
      var b = r.boat;
      body.push(h("div", { class: "fa__boat" }, [
        h("img", { src: b.image, alt: b.name }),
        h("div", null, [h("b", null, ["Add a day boat: " + b.name]), b.tagline + " Hired for the week alongside your cottage. ", h("a", { href: b.url, target: "_blank", rel: "noopener" }, ["About " + b.name])])
      ]));
    }
    var foot = [backBtn(false)];
    if (n) foot.push(h("button", { class: "fa__btn fa__btn--ghost", type: "button", onclick: enquire }, ["Not sure? Ask us", icon("arrow", "fa__ico")]));
    else foot.push(h("button", { class: "fa__btn", type: "button", onclick: enquire }, ["Tell us about your trip", icon("arrow", "fa__ico")]));
    return {
      head: [headRow(checked ? "Free for your dates" : (n ? "Your shortlist" : "Next step")), chips(true), fullBar()],
      body: body,
      fit: n > 0,
      foot: foot
    };
  }

  // "Search all properties that match": with dates and a live answer, the same
  // search on the site itself; otherwise the site's cottages listing.
  function restCta() {
    var form = siteSearchForm();
    var label = "Search all properties that match";
    if (form) {
      var btn = h("button", { class: "fa__btn fa__btn--ghost fa__rest-cta", type: "button", onclick: function () { form.submit(); } }, [label, icon("arrow", "fa__ico")]);
      return h("div", { class: "fa__rest-foot" }, [form, btn, h("span", { class: "fa__small" }, ["Opens the cottage listing on riverside-rentals.co.uk, filtered to your dates."])]);
    }
    return h("div", { class: "fa__rest-foot" }, [
      h("a", { class: "fa__btn fa__btn--ghost fa__rest-cta", href: SITE + "/properties/cottages/", target: "_blank", rel: "noopener" }, [label, icon("arrow", "fa__ico")]),
      h("span", { class: "fa__small" }, ["Opens the cottage listing on riverside-rentals.co.uk."])
    ]);
  }

  function renderCard(item, num, checked) {
    var p = item.property;
    var rooms = [
      p.bedrooms + (p.bedrooms === 1 ? " bedroom" : " bedrooms"),
      p.bathrooms === "TBC" ? null : p.bathrooms + (p.bathrooms === 1 ? " bathroom" : " bathrooms")
    ].filter(Boolean).join(" · ");
    var price = p.priceBand === "TBC" ? "Price TBC" : "From £" + p.priceFrom.toLocaleString("en-GB") + " a week";
    var place = p.place === "rural Norfolk" ? "Norfolk" : p.place;
    return h("a", { class: "fa__pcard", href: p.url, target: "_blank", rel: "noopener", "aria-label": p.name + ", " + place + ". " + rooms + ". " + price + ". Book now" }, [
      h("img", { src: p.image, alt: "", loading: "lazy" }),
      h("span", { class: "fa__pcard-tags" }, [
        h("span", { class: "tag" }, [icon("pin", "i"), place]),
        checked ? h("span", { class: "tag" }, [icon("check", "i"), "Available"]) : null
      ]),
      h("span", { class: "fa__pcard-body" }, [
        h("span", { class: "fa__pcard-title" }, [p.name]),
        h("span", { class: "fa__pcard-meta" }, [rooms]),
        h("span", { class: "fa__pcard-price" }, [price]),
        h("span", { class: "fa__pcard-btn" }, ["Book now"])
      ])
    ]);
  }

  function field(name, label, input, required, hint) {
    return h("div", { class: "fa__field", "data-field": name }, [
      h("label", { class: "fa__label" + (required ? " req" : ""), for: "f-" + name }, [label]),
      hint ? h("p", { class: "fa__hint" }, [hint]) : null,
      input,
      h("p", { class: "fa__error", role: "alert" })
    ]);
  }
  function text(name, opts) {
    opts = opts || {};
    return h("input", { class: "fa__input", type: opts.type || "text", id: "f-" + name, name: name, value: state.details[name] || opts.value || "", placeholder: opts.placeholder || null, autocomplete: opts.autocomplete || null, inputmode: opts.inputmode || null });
  }
  function pills(name, values, checked) {
    return h("div", { class: "fa__pills" }, values.map(function (v, i) {
      var id = name + "-" + i;
      return h("span", { class: "fa__pill" }, [
        h("input", { type: "radio", name: name, id: id, value: v, checked: checked === v ? "checked" : null }),
        h("label", { for: id }, [v])
      ]);
    }));
  }

  function renderEnquiry() {
    announce("Ask us");
    var d = state.details, r = state.result, dates = state.dates || {};
    var surfaced = r && r.shortlist.length ? r.shortlist.map(function (x) { return x.property.name; }) : [];
    var size = d.partySize || E.partySize(state.answers) || "";
    var arrival = d.arrival || dates.arrival || "";

    var dateBtn = h("button", { type: "button", class: "fa__datebtn datebtn", id: "f-arrival", "aria-haspopup": "dialog", "aria-expanded": "false" }, [
      h("span", { class: "datebtn__text" + (arrival ? "" : " is-empty") }, [arrival ? fmtDate(arrival) : "Flexible, or pick a date"]),
      h("span", { html: ICONS.calendar })
    ]);
    var dateVal = h("input", { type: "hidden", name: "arrival", id: "f-arrival-value", value: arrival });
    var nights = nightsSelect("f-nights", d.nights || dates.nights || 7);

    var form = h("form", { class: "fa__form", id: "enquiry-form", novalidate: "novalidate", onsubmit: function (ev) { ev.preventDefault(); submit(form); } }, [
      h("div", { class: "fa__grid3" }, [
        field("arrival", "Arrival", h("div", null, [dateBtn, dateVal]), false),
        field("nights", "How long", nights),
        field("partySize", "How many of you", text("partySize", { value: String(size), inputmode: "numeric", placeholder: "e.g. 4" }))
      ]),
      surfaced.length ? h("fieldset", { class: "fa__field", "data-field": "property" }, [
        h("legend", { class: "fa__label" }, ["Which cottage"]),
        pills("property", surfaced.concat(["Any of them"]), d.property || "Any of them"),
        h("p", { class: "fa__error", role: "alert" })
      ]) : null,
      h("div", { class: "fa__grid3" }, [
        field("name", "Name", text("name", { autocomplete: "name" }), true),
        field("email", "Email", text("email", { type: "email", autocomplete: "email", inputmode: "email" }), true),
        field("phone", "Telephone", text("phone", { type: "tel", autocomplete: "tel", inputmode: "tel" }))
      ]),
      field("message", "Anything we should know?", h("textarea", { class: "fa__input", id: "f-message", name: "message", placeholder: "The dog's name, a birthday, a boat you're bringing..." }, [d.message || ""]))
    ]);

    return {
      head: [headRow("Ask us"), chips(true), fullBar()],
      body: [
        h("h2", { class: "fa__r-title", tabindex: "-1", "data-focus": "" }, ["Nearly there"]),
        h("p", { class: "fa__r-lede" }, [surfaced.length ? "We'll look at " + joinNames(surfaced) + " for your dates and come back to you. Change any answer above if we've got it wrong." : "Tell us how to reach you and we'll suggest the right cottage ourselves. Change any answer above if we've got it wrong."]),
        form
      ],
      foot: [
        backBtn(false),
        h("button", { class: "fa__btn", type: "submit", form: "enquiry-form" }, ["Send my enquiry", icon("arrow", "fa__ico")])
      ],
      after: function () {
        if (window.RRCal) window.RRCal.bind(form, { btn: dateBtn, text: dateBtn.querySelector(".datebtn__text"), value: dateVal, placeholder: "Flexible, or pick a date", format: fmtDate });
      }
    };
  }

  function renderDone() {
    var e = state.enquiry;
    announce("Thank you. Your enquiry has been recorded.");
    var rows = [
      ["Who's coming", e.party], ["Party size", e.party_size ? String(e.party_size) : null], ["Where", e.area],
      ["Arrival", e.arrival ? fmtDate(e.arrival) : "Flexible"], ["Nights", e.nights], ["Availability checked", e.availability_checked ? "Yes, against the booking system" : "No"],
      ["Must have", e.must_have], ["Their time", e.trip],
      ["Cottages suggested", e.properties_surfaced.join(", ") || "None, talk to us"],
      ["Also fit", e.properties_also_fit.length ? e.properties_also_fit.length + " more" : null],
      ["Fit but booked", e.properties_fit_but_taken.length ? e.properties_fit_but_taken.join(", ") : null],
      ["Cottage chosen", e.property_chosen], ["Day boat suggested", e.boat_suggested],
      ["Contact", [e.contact.name, e.contact.email, e.contact.phone].filter(Boolean).join(", ")],
      ["Message", e.message]
    ];
    var dl = h("dl", null, []);
    rows.forEach(function (row) {
      dl.appendChild(h("dt", null, [row[0]]));
      dl.appendChild(h("dd", { class: row[1] ? "" : "empty" }, [row[1] || "Not given"]));
    });
    var firstName = (e.contact.name || "").split(" ")[0];
    return {
      head: [headRow("Enquiry sent"), chips(false), fullBar()],
      body: [
        h("h2", { class: "fa__r-title", tabindex: "-1", "data-focus": "" }, ["Thanks" + (firstName ? ", " + firstName : "") + ". We'll be in touch."]),
        h("p", { class: "fa__done-lede" }, ["Someone from the office will reply" + (e.contact.phone ? " by phone or email" : " by email") + ", usually the same day. If you'd rather talk now, call " + PHONE + "."]),
        h("div", { class: "fa__brief" }, [
          h("div", { class: "fa__brief-head" }, [h("h3", null, ["What the office receives"]), h("span", { class: "fa__mono" }, ["Demo view"])]),
          dl,
          h("details", null, [h("summary", null, ["Raw enquiry data"]), h("pre", null, [JSON.stringify(e, null, 2)])])
        ])
      ],
      foot: [
        h("button", { class: "fa__btn fa__btn--ghost", type: "button", onclick: function () { download(e); } }, [icon("download", "fa__ico"), "Download JSON"]),
        h("button", { class: "fa__btn fa__btn--ghost", type: "button", onclick: restart }, [icon("refresh", "fa__ico"), "Start again"])
      ]
    };
  }

  // ---------------------------------------------------------- leads log
  function renderLeads() {
    var host = document.getElementById("leads");
    if (!host) return;
    var leads = loadEnquiries();
    host.innerHTML = "";
    if (!leads.length) {
      host.appendChild(h("p", { class: "leads__empty" }, ["No enquiries recorded in this browser yet. Complete the finder above, choose \"Ask us\", and it will appear here."]));
      return;
    }
    var rows = leads.map(function (l) {
      return h("tr", null, [
        h("td", null, [new Date(l.submitted_at).toLocaleString("en-GB")]),
        h("td", null, [(l.contact.name || "") + (l.contact.email ? " · " + l.contact.email : "")]),
        h("td", null, [(l.party || "") + (l.party_size ? " (" + l.party_size + ")" : "")]),
        h("td", null, [l.arrival ? fmtDate(l.arrival) + (l.nights ? ", " + l.nights + " nights" : "") : "Flexible"]),
        h("td", null, [[l.must_have, l.trip, l.area].filter(Boolean).join(" · ")]),
        h("td", null, [(l.properties_surfaced || []).join(", ") || "Talk to us"]),
        h("td", null, [l.property_chosen || ""])
      ]);
    });
    host.appendChild(h("div", { class: "leads__scroll" }, [h("table", null, [
      h("thead", null, [h("tr", null, ["Received", "Guest", "Party", "Dates", "Answers", "Suggested", "Chosen"].map(function (t) { return h("th", null, [t]); }))]),
      h("tbody", null, rows)
    ])]));
    host.appendChild(h("button", { class: "leads__clear", type: "button", onclick: clearEnquiries }, ["Clear this log"]));
  }

  // -------------------------------------------------------------- boot
  render();
  renderLeads();
})();
