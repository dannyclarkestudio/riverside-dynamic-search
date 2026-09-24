#!/usr/bin/env python3
"""Static server for the finder, plus one endpoint that asks the live site
which cottages are free.

    GET /api/availability?date=YYYY-MM-DD&nights=7&guests=4

The live site's own search form posts date, nights and guests to
/properties/cottages/ and the csd_supcontrol plugin returns the listing
filtered by SuperControl availability. This endpoint does exactly what that
form does, from here, and returns the slugs that came back:

    {"ok": true, "date": "2026-10-24", "nights": 7, "guests": 4,
     "available": ["buttercup-lodge", ...], "count": 9, "nonce": "f3ba2234e3",
     "checked_at": "..."}

`nonce` is the site's current form nonce, so the page can submit the same
search to the site itself ("Search all properties that match"). The nonce is
read from the home page and cached for an hour; a search that comes back
unfiltered is retried once with a fresh nonce. Results are cached for ten
minutes so a demo doesn't hammer the site.

The site's lookup is not always reliable: it sometimes returns every cottage
for a dated search (seen 2026-09-17 in the afternoon, after filtering
correctly all morning). A result with every cottage in it is treated as "no
answer", not as "all free". Every good answer is also written to
availability-cache.json beside this file, and if the live lookup fails the
last good answer for the same date, nights and guests is returned with
"stale": true and its "checked_at", so a demo can still show the mechanism.

Demo only. On the live site this would be a call to the plugin's own lookup,
not a request to the public listing.

Run:  python3 assets/server/serve.py [--dir PATH] [--port 8933]
      (PORT in the environment is honoured, for hosts such as Render.)
The Claude preview runs it from the scratchpad against a mirror of this folder
(the preview sandbox cannot read ~/Desktop), passing directory= rather than
chdir so the working directory is left alone.
"""
import argparse, functools, http.server, json, os, re, sys, time, urllib.parse, urllib.request

SITE = "https://www.riverside-rentals.co.uk"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 riverside-finder-demo"
NONCE_TTL = 3600
RESULT_TTL = 600

_nonce = {"value": None, "at": 0}
_cache = {}
_total = {"value": None, "at": 0}
DISK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "availability-cache.json")


def disk_load():
    try:
        with open(DISK, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def disk_save(store):
    try:
        with open(DISK, "w", encoding="utf-8") as f:
            json.dump(store, f, indent=1)
    except Exception:
        pass


def total_cottages():
    """How many cottages the un-dated listing shows; a dated search returning
    that many has not been filtered."""
    if _total["value"] and time.time() - _total["at"] < NONCE_TTL:
        return _total["value"]
    html = fetch(SITE + "/properties/cottages/")
    n = len(re.findall(r'class="post-thumbnail', html))
    if n:
        _total.update(value=n, at=time.time())
    return _total["value"] or 51


def fetch(url, data=None, timeout=20):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def nonce(force=False):
    if not force and _nonce["value"] and time.time() - _nonce["at"] < NONCE_TTL:
        return _nonce["value"]
    html = fetch(SITE + "/")
    m = re.search(r'name="supwpnonce" value="([^"]+)"', html)
    if not m:
        raise RuntimeError("no search nonce on the home page")
    _nonce.update(value=m.group(1), at=time.time())
    return _nonce["value"]


def search(date, nights, guests, n):
    body = urllib.parse.urlencode({
        "supwpnonce": n, "_wp_http_referer": "/", "supcontrol_tag": "24",
        "supcontrol_date": date, "supcontrol_nights": str(nights), "supcontrol_guests": str(guests), "supcontrol_property": "",
    }).encode()
    html = fetch(SITE + "/properties/cottages/", data=body)
    filtered = "available dates on" in html
    slugs = re.findall(r'href="%s/property/([^/"]+)/" class="post-thumbnail' % re.escape(SITE), html)
    return filtered, list(dict.fromkeys(slugs))


def availability(date, nights, guests):
    key = (date, nights, guests)
    hit = _cache.get(key)
    if hit and time.time() - hit["at"] < RESULT_TTL:
        return hit["data"]
    diskkey = "%s|%s|%s" % key
    try:
        n = nonce()
        filtered, slugs = search(date, nights, guests, n)
        if not filtered:
            n = nonce(force=True)
            filtered, slugs = search(date, nights, guests, n)
        if not filtered:
            raise RuntimeError("the site did not filter the listing; the search form may have changed")
        if len(slugs) >= total_cottages():
            raise RuntimeError("the site returned every cottage, so its availability lookup did not run")
        data = {"ok": True, "date": date, "nights": nights, "guests": guests, "available": slugs, "count": len(slugs),
                "nonce": n, "stale": False, "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
        _cache[key] = {"at": time.time(), "data": data}
        store = disk_load(); store[diskkey] = data; disk_save(store)
        return data
    except Exception as e:
        old = disk_load().get(diskkey)
        if old:
            old = dict(old); old["stale"] = True; old["live_error"] = str(e)
            try:
                old["nonce"] = _nonce["value"] or old.get("nonce")
            except Exception:
                pass
            return old
        raise


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        u = urllib.parse.urlsplit(self.path)
        if u.path != "/api/availability":
            return super().do_GET()
        q = urllib.parse.parse_qs(u.query)
        date = (q.get("date") or [""])[0]
        try:
            nights = int((q.get("nights") or ["7"])[0])
            guests = int((q.get("guests") or ["2"])[0])
            if not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
                raise ValueError("date must be YYYY-MM-DD")
            if not (1 <= nights <= 28 and 1 <= guests <= 20):
                raise ValueError("nights 1 to 28, guests 1 to 20")
            body, status = availability(date, nights, guests), 200
        except Exception as e:  # the page shows a plain message and falls back to the enquiry
            body, status = {"ok": False, "error": str(e)}, 502
        out = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        # the page may be served from elsewhere (GitHub Pages) and call here
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(out)))
        self.end_headers()
        self.wfile.write(out)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
    ap.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8933")))
    a = ap.parse_args()
    handler = functools.partial(Handler, directory=os.path.abspath(a.dir))
    print("serving", os.path.abspath(a.dir), "on http://127.0.0.1:%d" % a.port, file=sys.stderr)
    host = "0.0.0.0" if os.environ.get("PORT") else "127.0.0.1"
    http.server.ThreadingHTTPServer((host, a.port), handler).serve_forever()


if __name__ == "__main__":
    main()
