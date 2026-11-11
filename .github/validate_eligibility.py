#!/usr/bin/env python3
"""Check the AI-read eligibility files in data/e/ and build data/e/_index.json.

For every value the AI wrote, the supporting quote must appear word for word in the
trial's criteria text. Values whose quote is missing or not found are removed
(set to "unclear" / empty), so the page never shows a requirement the registry
does not state. Files that are not valid at all are deleted so they are redone.
"""
import json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
E, TDIR = os.path.join(ROOT, "e"), os.path.join(ROOT, "t")
EXTENT = {"early", "advanced", "both", "unclear"}
STAGES = {"0", "I", "IA", "IB", "II", "IIA", "IIB", "IIC", "III", "IIIA", "IIIB", "IIIC", "IV", "IVA", "IVB"}
BIO = {"positive", "negative", "low", "mutation", "no-mutation", "high", "other"}
PRIOR = {"none", "required", "allowed", "unclear"}
BRAIN = {"allowed", "treated-only", "excluded", "required", "unclear"}


def norm(s):
    s = (s or "").replace("\\", "")
    s = re.sub(r"[‘’]", "'", s)
    s = re.sub(r"[“”]", '"', s)
    s = re.sub(r"[‐-―]", "-", s)
    return re.sub(r"\s+", " ", s).strip().lower()


def found(quote, crit):
    q = norm(quote)
    return bool(q) and len(q) <= 320 and q in crit


def clean(e, crit, stats):
    def keep(quote):
        ok = found(quote, crit)
        stats["checked"] += 1
        if not ok:
            stats["dropped"] += 1
        return ok
    out = {"id": e["id"], "upd": e.get("upd", ""), "who": str(e.get("who", ""))[:400]}
    ext = e.get("extent", "unclear")
    out["extent"], out["extentQuote"] = (ext, e.get("extentQuote", "")) if ext in EXTENT and ext != "unclear" and keep(e.get("extentQuote")) else ("unclear", "")
    st = [x for x in (e.get("stages") or []) if x in STAGES]
    out["stages"], out["stagesQuote"] = (st, e.get("stagesQuote", "")) if st and keep(e.get("stagesQuote")) else ([], "")
    out["biomarkers"] = [{"name": str(b.get("name", ""))[:40], "need": b.get("need"), "detail": str(b.get("detail", ""))[:160], "quote": b.get("quote", "")}
                         for b in (e.get("biomarkers") or [])[:6] if isinstance(b, dict) and b.get("need") in BIO and keep(b.get("quote"))]
    p = e.get("priorTreatment") or {}
    out["priorTreatment"] = ({"need": p.get("need"), "detail": str(p.get("detail", ""))[:200], "quote": p.get("quote", "")}
                             if p.get("need") in PRIOR and p.get("need") != "unclear" and keep(p.get("quote")) else {"need": "unclear", "detail": "", "quote": ""})
    b = e.get("brainMets") or {}
    out["brainMets"] = ({"need": b.get("need"), "quote": b.get("quote", "")}
                        if b.get("need") in BRAIN and b.get("need") != "unclear" and keep(b.get("quote")) else {"need": "unclear", "quote": ""})
    ec = e.get("ecogMax")
    out["ecogMax"], out["ecogQuote"] = (ec, e.get("ecogQuote", "")) if isinstance(ec, int) and 0 <= ec <= 4 and keep(e.get("ecogQuote")) else (None, "")
    out["other"] = [{"text": str(o.get("text", ""))[:200], "quote": o.get("quote", "")}
                    for o in (e.get("other") or [])[:5] if isinstance(o, dict) and o.get("text") and keep(o.get("quote"))]
    return out


def main():
    os.makedirs(E, exist_ok=True)
    stats = {"files": 0, "bad": 0, "stale": 0, "checked": 0, "dropped": 0}
    index = {}
    for fn in sorted(os.listdir(E)):
        if not fn.endswith(".json") or fn.startswith("_"):
            continue
        path, nct = os.path.join(E, fn), fn[:-5]
        tpath = os.path.join(TDIR, fn)
        if not os.path.exists(tpath):  # trial closed or removed
            os.remove(path); stats["stale"] += 1; continue
        detail = json.load(open(tpath, encoding="utf-8"))
        try:
            e = json.load(open(path, encoding="utf-8"))
            assert isinstance(e, dict) and e.get("id") == nct
        except Exception:
            os.remove(path); stats["bad"] += 1; continue
        if e.get("_checked") and e.get("upd") == detail.get("upd"):
            index[nct] = {"u": e["upd"], "x": e.get("extent", "unclear"), "s": e.get("stages", [])}; stats["files"] += 1; continue
        if e.get("upd") != detail.get("upd"):  # trial record changed since it was read
            os.remove(path); stats["stale"] += 1; continue
        out = clean(e, norm(detail.get("criteria", "")), stats)
        out["_checked"] = True
        with open(path, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        index[nct] = {"u": out["upd"], "x": out["extent"], "s": out["stages"]}; stats["files"] += 1
    with open(os.path.join(E, "_index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, separators=(",", ":"))
    print(f"Eligibility files: {stats['files']} kept, {stats['bad']} invalid and {stats['stale']} out of date removed; "
          f"{stats['dropped']} of {stats['checked']} newly checked values dropped because their quote was not in the criteria")


def queue(n):
    """Print up to n trial IDs that still need reading (newest records first)."""
    rows = json.load(open(os.path.join(ROOT, "oncology", "index.json"), encoding="utf-8"))["rows"]  # AI reading is for oncology for now
    done = {}
    ip = os.path.join(E, "_index.json")
    if os.path.exists(ip):
        done = json.load(open(ip))
    up = lambda i: (done.get(i) or {}).get("u") if isinstance(done.get(i), dict) else done.get(i)
    todo = [r for r in rows if up(r["id"]) != r["upd"] and r["k"] in ("treat", "diag")] + \
           [r for r in rows if up(r["id"]) != r["upd"] and r["k"] not in ("treat", "diag")]
    print("\n".join(r["id"] for r in todo[:n]))
    print(f"{len(todo)} trials still to read", file=sys.stderr)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "queue":
        queue(int(sys.argv[2]) if len(sys.argv) > 2 else 40)
    else:
        main()
