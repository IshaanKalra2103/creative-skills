# /// script
# requires-python = ">=3.10"
# ///
"""Scrape prompt-motion.com and render the categorised prompt library.

    uv run scripts/update.py --fetch   # re-scrape the site into data/prompts.json, then render
    uv run scripts/update.py           # render prompts/*.md and the index in SKILL.md from data/
                                       # (fetches first if data/prompts.json is missing)

Categories live in data/categories.json ("assign": slug -> category id). Entries the site
added since the last run land in prompts/uncategorized.md until you give them a category.
"""
import argparse, json, re, sys, urllib.request
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SITE = "https://prompt-motion.com"
ROOT = Path(__file__).resolve().parent.parent
DATA, OUT, SKILL = ROOT / "data", ROOT / "prompts", ROOT / "SKILL.md"
UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36"}

# ---------------------------------------------------------------- scrape

def get(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read().decode("utf-8")
        except Exception:
            if attempt == 2: raise

PUSH = re.compile(r'self\.__next_f\.push\(\[1,(".*?")\]\)</script>', re.S)

def rsc_rows(html):
    """Next.js flight payload -> {row id: value}"""
    payload = "".join(json.loads(c) for c in PUSH.findall(html))
    rows, i, dec = {}, 0, json.JSONDecoder()
    while i < len(payload):
        m = re.match(r"([0-9a-f]+):", payload[i:])
        nl = payload.find("\n", i)
        if not m:
            i = nl + 1 if nl >= 0 else len(payload); continue
        rid = m.group(1); i += m.end()
        if payload.startswith("T", i):  # text row, T<hex byte length>,<text>
            c = payload.index(",", i)
            txt = payload[c + 1:].encode()[:int(payload[i + 1:c], 16)].decode("utf-8", "ignore")
            rows[rid] = txt; i = c + 1 + len(txt); continue
        try:
            rows[rid], i = dec.raw_decode(payload, i)
        except ValueError:  # module imports (I[...]) and hints
            nl = payload.find("\n", i); i = nl + 1 if nl >= 0 else len(payload)
    return rows

def resolve(v, rows, depth=0):
    if depth > 60: return v
    if isinstance(v, str):
        m = re.fullmatch(r"\$L?([0-9a-f]+)", v)
        return resolve(rows[m.group(1)], rows, depth + 1) if m and m.group(1) in rows else v
    if isinstance(v, list): return [resolve(x, rows, depth + 1) for x in v]
    if isinstance(v, dict): return {k: resolve(x, rows, depth + 1) for k, x in v.items()}
    return v

def is_el(n): return isinstance(n, list) and len(n) == 4 and n[0] == "$" and isinstance(n[3], dict)

def text(n):
    if isinstance(n, str): return "" if n.startswith("$") else n
    if is_el(n): return text(n[3].get("children"))
    if isinstance(n, list): return "".join(text(x) for x in n)
    return ""

def elements(n):
    if is_el(n):
        yield n[1], n[3]; yield from elements(n[3].get("children"))
    elif isinstance(n, list):
        for x in n: yield from elements(x)

def parse_entry(slug, html):
    rows = rsc_rows(html)
    e = {"slug": slug, "url": f"{SITE}/{slug}", "title": "", "creator": "", "handle": "", "post": None,
         "video": None, "poster": None, "size": None, "prompt": "", "skills": [], "meta": {}}
    for v in rows.values():
        for tag, p in elements(resolve(v, rows)):
            if tag == "title" and not e["title"]:
                e["title"] = text(p.get("children"))
            elif p.get("slug") == slug and str(p.get("src", "")).endswith(".mp4"):
                e.update(video=p["src"], poster=p.get("poster"), size=[p.get("width"), p.get("height")])
            elif p.get("data-slot") == "entry-creator" and not e["creator"]:
                kids = list(elements(p.get("children")))
                names = [text(q.get("children")) for t, q in kids if t == "div" and "truncate" in q.get("className", "")]
                e["creator"] = names[0] if names else ""
                e["handle"] = names[1].lstrip("@") if len(names) > 1 else ""
                e["post"] = next((q["href"] for t, q in kids if t == "a" and q.get("href", "").startswith("http")), None)
            elif "likelyLong" in p and isinstance(p.get("text"), str) and not e["prompt"]:
                e["prompt"] = p["text"]
            elif tag == "section":
                kids = list(elements(p.get("children")))
                if [text(q.get("children")) for t, q in kids if t == "h2"][:1] == ["Skill"]:
                    sk = {"about": next((text(q.get("children")) for t, q in kids if t == "p"), ""),
                          "install": next((text(q.get("children")) for t, q in kids if t == "code"), ""),
                          "repo": next((q["href"] for t, q in kids if t == "a" and "github.com" in q.get("href", "")), None)}
                    if sk not in e["skills"]: e["skills"].append(sk)
            elif tag == "div" and p.get("className") == "contents":
                kids = list(elements(p.get("children")))
                dt = next((text(q.get("children")) for t, q in kids if t == "dt"), None)
                dd = next((q for t, q in kids if t == "dd"), None)
                if dt and dd is not None:
                    when = next((q.get("dateTime") for t, q in elements(dd.get("children")) if t == "time"), None)
                    e["meta"][dt.lower()] = when or text(dd.get("children"))
    return e

def fetch():
    home = get(SITE + "/")
    slugs = sorted(set(re.findall(r'href="/([a-z0-9_-]+-[0-9a-f]{6})"', home)))
    if not slugs: sys.exit("no entries found on the home page; the site layout may have changed")
    print(f"{len(slugs)} entries on {SITE}", file=sys.stderr)
    with ThreadPoolExecutor(8) as pool:
        entries = list(pool.map(lambda s: parse_entry(s, get(f"{SITE}/{s}")), slugs))
    bad = [e["slug"] for e in entries if not e["title"] or not (e["prompt"] or e["skills"])]
    if bad: print("could not parse:", *bad, file=sys.stderr)
    return entries

# ---------------------------------------------------------------- tags

TEMPLATE = re.compile(r"<inputs>|\{\{|\[(?i:product|topic)\]|\[[A-Z][A-Za-z _'’,]{3,}\]|(?i:\((?:your product|product url|product link|replace with your project)\)|<website url>)")
STOP = {
    "fr": {"moi", "une", "vidéo", "pour", "depuis", "sur", "réalise", "fait", "sympa"},
    "es": {"necesito", "con", "esta", "armes", "bien", "publicitario", "en"},
    "de": {"wir", "brauchen", "für", "den", "kannst", "du", "das", "hab", "ein"},
    "tr": {"ne", "kadar", "bir", "istiyorum", "bunu", "senden", "elinden", "geleni"},
    "en": {"the", "a", "and", "that", "you", "make", "of", "to", "for", "it", "with", "is"},
}

def language(p):
    if re.search(r"[぀-ヿ]", p): return "ja"
    if re.search(r"[가-힯]", p): return "ko"
    if re.search(r"[一-鿿]", p): return "zh"
    words = Counter(re.findall(r"[^\W\d_]+", p.lower()))
    score = {k: sum(words[w] for w in v) for k, v in STOP.items()}
    best = max(score, key=score.get)
    return None if best == "en" or score[best] < 2 or score[best] <= score["en"] else best

def tags(e):
    p, m, t = e["prompt"], e["meta"], []
    if TEMPLATE.search(p): t.append("template")
    if len(p) > 1500: t.append("long brief")
    if m.get("stack"): t.append(m["stack"])
    if m.get("iterations"): t.append(m["iterations"].lower())
    if m.get("effort"): t.append(f"effort {m['effort'].lower()}")
    if e["size"] and all(e["size"]):
        w, h = e["size"]; t.append("vertical" if h > w else "square" if h == w else "landscape")
    if (lang := language(p)): t.append(lang)
    if e["skills"]: t.append("skill")
    return t

# ---------------------------------------------------------------- render

def norm(p): return re.sub(r"\W+", "", p.lower().replace("’", "'").replace("résumé", "resume"))

def fence(p):
    run = max((len(x) for x in re.findall(r"`+", p)), default=0)
    return "`" * max(3, run + 1)

def anchor(heading, seen):
    a = re.sub(r"[^\w\- ]", "", heading.lower()).replace(" ", "-")
    n = seen[a]; seen[a] += 1
    return a if n == 0 else f"{a}-{n}"

def credit(e):
    who = f"[@{e['handle']}]({e['post']})" if e["post"] else f"@{e['handle']}"
    bits = [who, e["meta"].get("posted", "")]
    if e["video"]: bits.append(f"[watch]({e['video']})")
    bits.append(f"[entry]({e['url']})")
    return " · ".join(b for b in bits if b)

def chips(t): return " ".join(f"`{x}`" for x in t)

def skill_block(sk):
    out = [f"**Skill:** {sk['about']}"]
    if sk["install"]: out += ["", "```sh", sk["install"], "```"]
    if sk["repo"]: out += ["", f"Repo: {sk['repo']}"]
    return out

def render_group(g, seen):
    """g: entries with the same prompt, oldest first"""
    e = g[0]
    if len(g) == 1:
        head = e["title"]
    else:
        words = re.sub(r"<[^>]*>", " ", e["prompt"]).split()
        head = f"“{' '.join(words[:9])}{'…' if len(words) > 9 else ''}” · {len(g)} videos"
    lines = [f"### {head}", ""]
    if len(g) == 1:
        lines += [f"{credit(e)}  ", chips(e["tags"]), ""]
    else:
        shared = [x for x in e["tags"] if all(x in o["tags"] for o in g)]
        if shared: lines += [chips(shared), ""]
    if e["prompt"]:
        variants = Counter(o["prompt"] for o in g)
        p = variants.most_common(1)[0][0]
        f = fence(p)
        lines += [f + "text", p, f, ""]
    for sk in e["skills"]:
        lines += skill_block(sk) + [""]
    if len(g) > 1:
        lines += ["Made with it:", ""]
        lines += [f"- {o['title']}: {credit(o)}" + (f" · `{o['meta']['stack']}`" if o["meta"].get("stack") else "") for o in g]
        lines.append("")
    return anchor(head, seen), head, lines

def render(entries, cats):
    by_cat = defaultdict(list)
    for e in entries:
        e["category"] = cats["assign"].get(e["slug"], "uncategorized")
        e["tags"] = tags(e)
        by_cat[e["category"]].append(e)
    defs = cats["categories"] + ([{"id": "uncategorized", "title": "Uncategorized",
                                    "about": "New on the site since the last categorisation. Give each a category in data/categories.json."}]
                                  if by_cat.get("uncategorized") else [])
    OUT.mkdir(exist_ok=True)
    for old in OUT.glob("*.md"): old.unlink()
    index, briefs = [], []
    for c in defs:
        es = by_cat.get(c["id"], [])
        if not es: continue
        groups = defaultdict(list)
        for e in sorted(es, key=lambda e: (e["meta"].get("posted", ""), e["slug"])):
            groups[norm(e["prompt"]) or e["slug"]].append(e)
        groups = list(groups.values())
        reusable = sorted((g for g in groups if {"template", "long brief"} & set(g[0]["tags"])), key=lambda g: -len(g[0]["prompt"]))
        rest = sorted((g for g in groups if g not in reusable), key=lambda g: (-len(g), [-int(x) for x in re.findall(r"\d+", g[0]["meta"].get("posted", "0"))]))
        seen = Counter()
        lines = [f"# {c['title']}", "", c["about"], "",
                 f"{len(groups)} prompts behind {len(es)} videos. Every entry credits its creator and links the original post; "
                 "videos and prompts belong to their creators.", ""]
        for title, part in (("Reusable briefs", reusable), ("Prompts", rest)):
            if not part: continue
            seen[anchor(title, Counter())] += 1
            lines += [f"## {title}", ""]
            for g in part:
                a, head, block = render_group(g, seen)
                lines += block
                if part is reusable: briefs.append((c["id"], a, head, g[0]))
        (OUT / f"{c['id']}.md").write_text("\n".join(lines).rstrip() + "\n")
        index.append(f"| [{c['title']}](prompts/{c['id']}.md) | {len(groups)} | {len(es)} | {c['about']} |")

    langs = Counter(next((t for t in e["tags"] if t in ("ja", "ko", "zh", "fr", "es", "de", "tr")), "en") for e in entries)
    block = ["<!-- index:start (generated by scripts/update.py) -->",
             f"{len(entries)} videos from [prompt-motion.com]({SITE}/), all made with Claude {entries[0]['meta'].get('model', '')}, "
             f"{sum(1 for e in entries if e['prompt'])} with a prompt and {sum(1 for e in entries if e['skills'])} with a skill. "
             "Languages: " + ", ".join(f"{k} {v}" for k, v in langs.most_common()) + ".", "",
             "| category | prompts | videos | what's in it |", "|---|---|---|---|", *index, "",
             "**Reusable briefs.** Fill-in templates (`<inputs>`, `[product]`, `{{PRODUCT}}`) and long, fully specified briefs:", ""]
    for cid, a, head, e in briefs:
        stack = f" · `{e['meta']['stack']}`" if e["meta"].get("stack") else ""
        block.append(f"- [{head}](prompts/{cid}.md#{a}): @{e['handle']}, {len(e['prompt']):,} chars{stack}")
    block += ["", "**Skills shared on the site:**", ""]
    for e in entries:
        for sk in e["skills"]:
            block.append(f"- [{sk['repo'].split('github.com/')[-1]}]({sk['repo']}): {sk['about']} Install: `{sk['install'].replace(chr(10), '` then `')}`")
    block.append("<!-- index:end -->")
    s = SKILL.read_text()
    s = re.sub(r"<!-- index:start.*?<!-- index:end -->", lambda _: "\n".join(block), s, flags=re.S)
    SKILL.write_text(s)
    if by_cat.get("uncategorized"):
        print("uncategorized:", *(e["slug"] for e in by_cat["uncategorized"]), file=sys.stderr)

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--fetch", action="store_true", help="re-scrape the site first")
    args = ap.parse_args()
    cats = json.loads((DATA / "categories.json").read_text())
    if args.fetch or not (DATA / "prompts.json").exists():
        old = {e["slug"] for e in json.loads((DATA / "prompts.json").read_text())} if (DATA / "prompts.json").exists() else set()
        entries = fetch()
        new = [e["slug"] for e in entries if e["slug"] not in old]
        gone = sorted(old - {e["slug"] for e in entries})
        if old: print(f"{len(new)} new, {len(gone)} gone from the site" + (f": {', '.join(gone)}" if gone else ""), file=sys.stderr)
    else:
        entries = json.loads((DATA / "prompts.json").read_text())
    entries.sort(key=lambda e: e["slug"])
    render(entries, cats)
    (DATA / "prompts.json").write_text(json.dumps(entries, ensure_ascii=False, indent=1) + "\n")
    print(f"rendered {len(entries)} entries into {OUT.relative_to(ROOT)}/", file=sys.stderr)

if __name__ == "__main__":
    main()
