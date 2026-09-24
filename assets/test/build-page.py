#!/usr/bin/env python3
"""python3 test/build-page.py
riverside-finder/index.html: the riverside-hero page (landing frame, scroll
reveal, snap) with the finder panel in place of the search bar, plus the
"enquiries captured in this browser" table under the hero. Everything else on
the page is unchanged."""
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "..", "..", "riverside-hero", "index.html")
OUT = os.path.join(HERE, "..", "..", "index.html")
h = open(SRC, encoding="utf-8").read()

def rep(old, new, n=1):
    global h
    assert h.count(old) == n, (old[:70], h.count(old))
    h = h.replace(old, new)

# ------------------------------------------------------------ head
rep('<title>Riverside Rentals</title>\n', '<title>Riverside Rentals</title>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n')
rep('<style>\n:root{', '<link rel="stylesheet" href="assets/css/finder.css">\n<style>\n:root{')

# ------------------------------------------------------------ the hero: finder in place of the search form
s = h.index('      <form class="bar" id="bar" novalidate>')
e = h.index('      <p class="note" id="note" role="status"></p>', s) + len('      <p class="note" id="note" role="status"></p>')
h = h[:s] + '''      <div class="fa" id="bar" aria-label="Find your perfect stay">
        <div id="finder" class="fa__inner"></div>
      </div>''' + h[e:]

# the two hero photographs and the second search share files instead of base64
import re
def swap_shot(id_, file_):
    global h
    m = re.search(r'(<div class="shot" id="%s" style="background-image:url\()data:image/jpeg;base64,[^)]+(\))' % id_, h)
    assert m, id_
    h = h[:m.start(1)] + m.group(1) + "assets/img/" + file_ + h[m.end(2) - 1:]
swap_shot("shotBoats", "riverboats.jpg")
swap_shot("shotHouse", "hero.jpg")

# the live region for screen-reader announcements (enquiries are still kept in
# localStorage; the on-page table was dropped, see README)
rep('<section class="cats" id="categories">', '''<div id="finderLive" class="sr-only" aria-live="polite" aria-atomic="true"></div>

<section class="cats" id="categories">''')

# ------------------------------------------------------------ inline JS
# the page centres the block between the heading and the panel; the finder
# changes height with every phase, so it needs to be able to ask for a re-centre
rep("""  function clamp(v,a,b){return v<a?a:v>b?b:v}""", """  window.RRLayoutBook=layoutBook;

  function clamp(v,a,b){return v<a?a:v>b?b:v}""")
# the mega menu "all" pictures
rep("      else return {bg:document.getElementById(k[1]==='house'?'shotHouse':'shotBoats').style.backgroundImage};",
    "      else return {bg:'url(assets/img/'+(k[1]==='house'?'hero':'riverboats')+'.jpg)'};")
# the calendar can be bound to the finder's arrival field too
rep("""    function show(f){
      if(f.sel){
        f.value.value=iso(f.sel);
        f.text.textContent=('0'+f.sel.getDate()).slice(-2)+'/'+('0'+(f.sel.getMonth()+1)).slice(-2)+'/'+f.sel.getFullYear();
        f.text.classList.remove('is-empty');
      }else{
        f.value.value=''; f.text.textContent='dd/mm/yyyy'; f.text.classList.add('is-empty');
      }
    }""", """    function show(f){
      if(f.sel){
        f.value.value=iso(f.sel);
        f.text.textContent=f.format?f.format(iso(f.sel)):('0'+f.sel.getDate()).slice(-2)+'/'+('0'+(f.sel.getMonth()+1)).slice(-2)+'/'+f.sel.getFullYear();
        f.text.classList.remove('is-empty');
      }else{
        f.value.value=''; f.text.textContent=f.placeholder||'dd/mm/yyyy'; f.text.classList.add('is-empty');
      }
    }""")
rep("""      bind:function(form){
        var f={
          btn:form.querySelector('.datebtn'),
          text:form.querySelector('.datebtn__text'),
          value:form.querySelector('input[name=supcontrol_date]'),
          sel:null
        };
        f.btn.setAttribute('aria-controls','cal');
        f.btn.addEventListener('click',function(){(panel.hidden||active!==f)?open(f):close()});
        /* the reset button clears it with the rest of the form */
        form.querySelector('.reset').addEventListener('click',function(){
          f.sel=null; show(f); if(active===f)close();
        });
        return f;
      }
    };
  })();""", """      /* opts lets another form (the finder's enquiry) supply its own field,
         placeholder and date format */
      bind:function(form,opts){
        opts=opts||{};
        var f={
          btn:opts.btn||form.querySelector('.datebtn'),
          text:opts.text||form.querySelector('.datebtn__text'),
          value:opts.value||form.querySelector('input[name=supcontrol_date]'),
          placeholder:opts.placeholder||null,
          format:opts.format||null,
          sel:null
        };
        if(f.value.value){var d=new Date(f.value.value+'T12:00:00');if(!isNaN(d))f.sel=d}
        f.btn.setAttribute('aria-controls','cal');
        f.btn.addEventListener('click',function(){(panel.hidden||active!==f)?open(f):close()});
        /* the reset button clears it with the rest of the form */
        var reset=form.querySelector('.reset');
        if(reset)reset.addEventListener('click',function(){
          f.sel=null; show(f); if(active===f)close();
        });
        return f;
      }
    };
  })();
  window.RRCal=cal;""")
# the second search's photograph
rep("  document.getElementById('find2Shot').style.backgroundImage=shotHouse.style.backgroundImage;",
    "  document.getElementById('find2Shot').style.backgroundImage='url(assets/img/hero.jpg)';")
# no em dashes in copy or comments
h = h.replace("'Demo search — '", "'Demo search: '").replace(" — ", ", ")

# the finder's scripts, after everything else
assert h.rstrip().endswith("</script>")
h = h.rstrip() + """

<!-- Where the finder asks for live availability. Same origin by default
     (assets/server/serve.py); on a static host such as GitHub Pages, point
     this at wherever that server is running, e.g. "https://example.onrender.com/api/availability". -->
<script>window.RR_AVAILABILITY_API = "/api/availability";</script>
<script src="assets/data/icons.js"></script>
<script src="assets/data/properties.js"></script>
<script src="assets/data/questions.js"></script>
<script src="assets/data/rules.js"></script>
<script src="assets/js/engine.js"></script>
<script src="assets/js/finder.js"></script>
"""

# a proper document: this one is opened as a page, not wrapped by the artifact host
head_end = h.index("</style>") + len("</style>")
h = "<!doctype html>\n<html lang=\"en\">\n<head>\n" + h[:head_end] + "\n</head>\n<body>\n" + h[head_end:] + "</body>\n</html>\n"

assert "—" not in h
assert 'id="bar"' in h and h.count('id="cal"') == 1
open(OUT, "w", encoding="utf-8").write(h)
print("wrote", os.path.abspath(OUT), len(h))
