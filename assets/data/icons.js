// Inline SVG line icons, 24px grid, stroke-based so they take the current text
// colour (the tiles set that to the brand blue). Used by the question tiles, the
// answer chips, the result cards and the "how it works" row.

(function () {
  var wrap = function (paths) {
    return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + "</svg>";
  };
  // a numeral inside a soft square, for the party-size tiles and their chips
  var num = function (n) {
    return '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2.5" y="2.5" width="19" height="19" rx="5.5"/><text x="12" y="15.6" text-anchor="middle" font-size="8.6" font-family="inherit" font-weight="600" letter-spacing="-.03em" fill="currentColor" stroke="none">' + n + "</text></svg>";
  };
  window.RR_ICONS = {
    // who's coming
    couple:   wrap('<circle cx="8.5" cy="7.5" r="3"/><circle cx="16" cy="8.5" r="2.5"/><path d="M3 20v-2a5.5 5.5 0 0 1 11 0v2M14.5 20v-1.5a3.5 3.5 0 0 1 7 0V20"/>'),
    family:   wrap('<circle cx="7" cy="6.5" r="2.5"/><circle cx="17" cy="6.5" r="2.5"/><circle cx="12" cy="12.5" r="2"/><path d="M2.5 19v-1.5a4.5 4.5 0 0 1 6.5-4M21.5 19v-1.5a4.5 4.5 0 0 0-6.5-4M8.5 21v-1a3.5 3.5 0 0 1 7 0v1"/>'),
    friends:  wrap('<circle cx="6" cy="8" r="2.4"/><circle cx="12" cy="6.5" r="2.4"/><circle cx="18" cy="8" r="2.4"/><path d="M2 20v-2a4 4 0 0 1 6-3.5M22 20v-2a4 4 0 0 0-6-3.5M8 20v-2a4 4 0 0 1 8 0v2"/>'),
    group:    wrap('<circle cx="5" cy="9" r="2"/><circle cx="12" cy="7" r="2.5"/><circle cx="19" cy="9" r="2"/><circle cx="8.5" cy="14" r="1.8"/><circle cx="15.5" cy="14" r="1.8"/><path d="M2 20v-1.5a3 3 0 0 1 4.5-2.6M22 20v-1.5a3 3 0 0 0-4.5-2.6M5.5 21v-1a3 3 0 0 1 6 0v1M12.5 21v-1a3 3 0 0 1 6 0v1"/>'),
    solo:     wrap('<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20a7.2 7.2 0 0 1 14.4 0"/>'),
    question: wrap('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7v.5M12 17.2h.01"/>'),
    // how many
    n4: num("3-4"), n6: num("5-6"), n8: num("7-8"), n12: num("9+"), n16: num("13+"),
    // where
    pin:      wrap('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
    tree:     wrap('<path d="M12 3l5 7h-3l4 5h-4l3 4H7l3-4H6l4-5H7l5-7zM12 19v2.5"/>'),
    // when
    spring:   wrap('<path d="M12 21v-8M12 13c-3 0-5-2-5-5 3 0 5 2 5 5zM12 13c3 0 5-2 5-5-3 0-5 2-5 5zM12 9c0-3 0-5-1-6M12 9c0-3 0-5 1-6"/>'),
    summer:   wrap('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/>'),
    autumn:   wrap('<path d="M12 21v-6M20 4c-8 0-13 5-13 12 7 0 13-5 13-12zM7 16l5-5"/>'),
    winter:   wrap('<path d="M12 3v18M3 12h18M6 6l12 12M18 6L6 18M12 3l-2 2M12 3l2 2M12 21l-2-2M12 21l2-2M3 12l2-2M3 12l2 2M21 12l-2-2M21 12l-2 2"/>'),
    school:   wrap('<path d="M2 9l10-4 10 4-10 4-10-4zM6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v5"/>'),
    calendar: wrap('<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4M8 14h3M13 14h3M8 17.5h3"/>'),
    // must have
    dog:      wrap('<path d="M12 20.5c-2.9 0-5-1.6-5-3.7 0-1.9 2.2-4.1 5-4.1s5 2.2 5 4.1c0 2.1-2.1 3.7-5 3.7z"/><ellipse cx="6" cy="10.8" rx="1.7" ry="2.2"/><ellipse cx="18" cy="10.8" rx="1.7" ry="2.2"/><ellipse cx="9.3" cy="6.4" rx="1.8" ry="2.3"/><ellipse cx="14.7" cy="6.4" rx="1.8" ry="2.3"/>'),
    anchor:   wrap('<circle cx="12" cy="5" r="2.4"/><path d="M12 7.4V21M5 12H3a9 9 0 0 0 18 0h-2"/>'),
    single:   wrap('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M5.5 15.5h13"/>'),
    // Material Symbols "hot_tub" (Apache 2.0), a filled glyph on its own grid
    hottub:   '<svg viewBox="0 -960 960 960" width="24" height="24" fill="currentColor" aria-hidden="true"><path d="M280-640q-33 0-56.5-23.5T200-720q0-33 23.5-56.5T280-800q33 0 56.5 23.5T360-720q0 33-23.5 56.5T280-640ZM160-80q-33 0-56.5-23.5T80-160v-320h120v-30q0-38 26-64t64-26q20 0 37 8t31 22l56 62q7 8 15 15t17 13h434v320q0 33-23.5 56.5T800-80H160Zm560-480 4-24q5-25-3.5-48.5T694-674q-29-29-43-67.5t-9-80.5l2-18h76l-4 24q-4 24 3.5 47.5T744-728q30 30 44.5 69t9.5 81l-2 18h-76Zm-160 0 4-24q5-25-3.5-48.5T534-674q-29-29-43-67.5t-9-80.5l2-18h76l-4 24q-5 24 3 47.5t25 40.5q30 30 44.5 69t9.5 81l-2 18h-76Zm120 400h80v-240h-80v240Zm-160 0h80v-240h-80v240Zm-160 0h80v-240h-80v240Zm-160 0h80v-240h-80v240Z"/></svg>',
    river:    wrap('<path d="M3 8c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2M3 13c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2M3 18c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/>'),
    // the trip
    boat:     wrap('<path d="M3 15h18l-2 4H5l-2-4zM6 15V9h9l3 6M9 9V6h4v3"/>'),
    fish:     wrap('<path d="M3 12c3-4 7-6 11-6 3 0 5 2 7 6-2 4-4 6-7 6-4 0-8-2-11-6zM3 12l-1-4M3 12l-1 4M17.5 11.5h.01"/>'),
    walk:     wrap('<circle cx="13.5" cy="4.5" r="1.8"/><path d="M10 21l2.5-6.5 2.5 2V21M7 13l2.5-5 3.5 1 2.5 3 3-1M9.5 8L8 12.5"/>'),
    explore:  wrap('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z"/>'),
    rest:     wrap('<path d="M3 13.5h5.5L3 19.5h5.5"/><path d="M10.5 7h5.5L10.5 13h5.5"/><path d="M17 3h3.5L17 7h3.5"/>'),
    // how it works, results, chips
    chat:     wrap('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8z"/><path d="M8 8h8M8 11.5h5"/>'),
    list:     wrap('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>'),
    key:      wrap('<circle cx="8" cy="15" r="4.5"/><path d="M11.2 11.8 20 3M16 7l2.5 2.5M13.5 9.5 16 12"/>'),
    home:     wrap('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/>'),
    bed:      wrap('<path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7M3 15h18M3 18v1M21 18v1M6 9V7a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 12 7v2M12 9V7a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 18 7v2"/>'),
    people:   wrap('<circle cx="9" cy="8" r="3.2"/><path d="M2.8 20a6.2 6.2 0 0 1 12.4 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.2 14.4A6.2 6.2 0 0 1 21.2 20"/>'),
    check:    wrap('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    phone:    wrap('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
    mail:     wrap('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
    arrow:    wrap('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    back:     wrap('<path d="M19 12H5M11 18l-6-6 6-6"/>'),
    download: wrap('<path d="M12 4v11M7 10l5 5 5-5M4 19h16"/>'),
    refresh:  wrap('<path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v5h5"/>')
  };
})();
