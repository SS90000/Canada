#!/usr/bin/env python3
"""Download every open cancer study with a Canadian site from ClinicalTrials.gov
and write the compact data files the Cancer Trial Finder page reads.

Output (all under data/):
  index.json      one compact row per study, used for searching, the list and the map
  t/<NCT>.json    full details for one study, loaded when a visitor opens it
  meta.json       when the data was built, and summary counts
  build-log.txt   what happened on the last run (also written when a run fails)

Only the Python standard library is used, so the GitHub Action needs no installs.
"""
import json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone

API = "https://clinicaltrials.gov/api/v2/studies"
COUNTRY = os.environ.get("TRIAL_COUNTRY", "Canada")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
LOG = []

# Conditions that count as cancer. ClinicalTrials.gov also expands these to related terms.
COND = ("cancer OR neoplasm OR tumor OR carcinoma OR lymphoma OR leukemia OR myeloma OR sarcoma "
        "OR melanoma OR glioma OR glioblastoma OR mesothelioma OR blastoma OR myelodysplastic")
OPEN = "RECRUITING|NOT_YET_RECRUITING"


def log(msg):
    line = f"{datetime.now(timezone.utc):%Y-%m-%d %H:%M:%S} UTC  {msg}"
    print(line, flush=True)
    LOG.append(line)


def get(params):
    url = API + "?" + urllib.parse.urlencode(params)
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "CancerTrialFinder/1.0 (data build)",
                                                       "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.load(r)
        except Exception as e:  # network hiccup or rate limit: wait and retry
            wait = 5 * (attempt + 1)
            log(f"Request failed ({e}); retrying in {wait}s")
            time.sleep(wait)
    raise RuntimeError("ClinicalTrials.gov did not respond after several tries")


def fetch_all():
    params = {"format": "json", "pageSize": 200, "countTotal": "true",
              "query.cond": COND, "filter.overallStatus": OPEN,
              "filter.advanced": f"AREA[LocationCountry]{COUNTRY}"}
    studies, token, total = [], None, None
    while True:
        p = dict(params)
        if token:
            p["pageToken"] = token
        page = get(p)
        if total is None:
            total = page.get("totalCount")
            log(f"Registry reports {total} open cancer studies with a site in {COUNTRY}")
        studies.extend(page.get("studies", []))
        token = page.get("nextPageToken")
        if not token:
            break
        time.sleep(0.5)
    return studies, total


# ---------- tagging ----------
CATS = [  # key, pattern (searched in title, conditions, keywords and MeSH terms)
    ("breast", r"breast"),
    ("lung", r"\blung|nsclc|\bsclc|small[- ]cell|bronch|pulmonary (?:neoplasm|carcinoma|nodule)"),
    ("prostate", r"prostat"),
    ("colorectal", r"colorectal|\bcolon\b|colonic|\brect(?:al|um)\b|\banal\b|\banus\b|appendi"),
    ("upperGI", r"gastric|stomach|esophag|oesophag|gastro-?esophageal|\bgej\b|small bowel|duoden"),
    ("pancreas", r"pancrea"),
    ("liver", r"hepatocell|\bliver|cholangio|biliary|bile duct|gallbladder|hcc\b"),
    ("kidney", r"renal cell|kidney|\brcc\b|wilms"),
    ("bladder", r"bladder|urothel|upper tract|ureter|urethr"),
    ("gyn", r"ovar|fallopian|peritoneal carcin|primary peritoneal|cervi(?:x|cal) (?:cancer|carcin|neopl)|cervical cancer|endometri|uter(?:us|ine)|vulv|vagin|gyn(?:a)?ecolog"),
    ("headneck", r"head and neck|head & neck|oropharyn|nasopharyn|laryn|oral cavity|\boral (?:cancer|squamous)|tongue|salivary|hypopharyn|sinonasal|\bhnscc"),
    ("thyroid", r"thyroid"),
    ("brain", r"glioma|glioblastoma|astrocytoma|oligodendro|\bbrain|\bcns\b|central nervous system|medulloblastoma|ependymoma|meningioma|leptomening|spinal cord (?:tumou?r|neopl)"),
    ("skin", r"melanoma|merkel|basal cell|cutaneous|\bskin\b|keratinocyte"),
    ("leukemia", r"leuk(?:a)?emia|\baml\b|\bcll\b|\bcml\b|myelodysplas|\bmds\b|myeloproliferative|myelofibrosis|polycythemia|thrombocythemia"),
    ("lymphoma", r"lymphoma|hodgkin|\bdlbcl|mycosis fungoides|sezary|waldenstr"),
    ("myeloma", r"myeloma|plasma cell|amyloidosis|monoclonal gammopathy"),
    ("sarcoma", r"sarcoma|\bgist\b|gastrointestinal stromal|ewing|rhabdo|desmoid|chordoma|osteo(?:genic )?sarcoma"),
    ("neuroendocrine", r"neuroendocrine|carcinoid|pheochromocytoma|paraganglioma|\bnet\b|\bnets\b"),
    ("germcell", r"testic|germ cell|seminoma"),
    ("mesothelioma", r"mesothelioma"),
    ("childhood", r"neuroblastoma|retinoblastoma|hepatoblastoma|pediatric|paediatric|childhood|wilms"),
    ("solid", r"solid tumou?r|advanced (?:solid )?(?:cancer|malignanc)|metastatic (?:solid )?(?:cancer|tumou?r)s?\b|any (?:solid )?tumou?r|multiple (?:cancer|tumou?r) types|pan-?tumou?r|tumou?r[- ]agnostic"),
]
CAT_RE = [(k, re.compile(p, re.I)) for k, p in CATS]
GENERIC = re.compile(r"cancer|neoplas|tumou?r(?! necrosis)|carcinoma|malignan|oncolog|leuk(?:a)?emia|lymphoma", re.I)
PROVINCES = {"ontario": "Ontario", "quebec": "Quebec", "québec": "Quebec", "alberta": "Alberta", "british columbia": "British Columbia",
             "britsh columbia": "British Columbia", "nova scotia": "Nova Scotia", "manitoba": "Manitoba", "saskatchewan": "Saskatchewan",
             "new brunswick": "New Brunswick", "newfoundland and labrador": "Newfoundland and Labrador", "newfoundland": "Newfoundland and Labrador",
             "prince edward island": "Prince Edward Island", "yukon": "Yukon", "northwest territories": "Northwest Territories", "nunavut": "Nunavut",
             "on": "Ontario", "qc": "Quebec", "ab": "Alberta", "bc": "British Columbia", "ns": "Nova Scotia", "mb": "Manitoba", "sk": "Saskatchewan",
             "nb": "New Brunswick", "nl": "Newfoundland and Labrador", "pe": "Prince Edward Island"}
# first letter of a Canadian postal code gives the province
POSTAL = {"A": "Newfoundland and Labrador", "B": "Nova Scotia", "C": "Prince Edward Island", "E": "New Brunswick", "G": "Quebec", "H": "Quebec",
          "J": "Quebec", "K": "Ontario", "L": "Ontario", "M": "Ontario", "N": "Ontario", "P": "Ontario", "R": "Manitoba", "S": "Saskatchewan",
          "T": "Alberta", "V": "British Columbia", "Y": "Yukon"}


def province(state, zipc, city):
    key = re.sub(r",?\s*canada$", "", (state or "").strip(), flags=re.I).lower()
    if key in PROVINCES:
        return PROVINCES[key]
    z = (zipc or "").strip().upper()
    if re.match(r"^[A-Z]\d[A-Z]", z) and z[0] in POSTAL:
        return POSTAL[z[0]]
    return ""
ADV = re.compile(r"metasta(?:tic|sis|ses)|advanced|unresectable|inoperable|stage\s*(?:iv|4)\b|recurren|refractory|relapsed", re.I)
EARLY = re.compile(r"early[- ]stage|early (?:breast|lung|prostate|cancer)|stage\s*(?:0|i|ii|iii|1|2|3)\b|stages?\s*(?:i|1)\s*(?:-|–|to)\s*(?:iii|3)|resectable|resected|\badjuvant|neoadjuvant|locali[sz]ed|non-?metastatic|curative", re.I)
NOT_ADV = re.compile(r"(?:no|without|absence of|free of)\s+(?:evidence of\s+)?(?:distant\s+)?metasta", re.I)
KIND = {"TREATMENT": "treat", "DIAGNOSTIC": "diag", "SCREENING": "diag", "SUPPORTIVE_CARE": "support",
        "PREVENTION": "support", "HEALTH_SERVICES_RESEARCH": "support", "BASIC_SCIENCE": "support",
        "OTHER": "support", "DEVICE_FEASIBILITY": "support", "ECT": "support"}
SITE_ST = {"RECRUITING": "R", "NOT_YET_RECRUITING": "NYR", "ACTIVE_NOT_RECRUITING": "ANR",
           "ENROLLING_BY_INVITATION": "INV", "SUSPENDED": "SUS", "TERMINATED": "STOP",
           "COMPLETED": "STOP", "WITHDRAWN": "STOP", "TEMPORARILY_NOT_AVAILABLE": "SUS"}


def years(s):
    if not s:
        return None
    m = re.match(r"\s*([\d.]+)\s*(year|month|week|day|hour|minute)", s, re.I)
    if not m:
        return None
    n, u = float(m.group(1)), m.group(2).lower()
    return round(n / {"year": 1, "month": 12, "week": 52.18, "day": 365.25, "hour": 8766, "minute": 525960}[u], 2)


def inclusion_part(text):
    parts = re.split(r"exclusion criteria", text or "", flags=re.I)
    return parts[0]


def contact_of(c):
    if not c:
        return ""
    phone = c.get("phone", "")
    if c.get("phoneExt"):
        phone += f" ext. {c['phoneExt']}"
    return " · ".join(x for x in [c.get("name", ""), phone, c.get("email", "")] if x)


def build(st):
    p = st.get("protocolSection", {})
    d = st.get("derivedSection", {})
    ident, status = p.get("identificationModule", {}), p.get("statusModule", {})
    design, elig = p.get("designModule", {}), p.get("eligibilityModule", {})
    conds = p.get("conditionsModule", {})
    cl = p.get("contactsLocationsModule", {})
    nct = ident.get("nctId")
    meshes = [m.get("term", "") for m in d.get("conditionBrowseModule", {}).get("meshes", [])]
    tagtext = " | ".join([ident.get("briefTitle", ""), ident.get("officialTitle", ""),
                          *conds.get("conditions", []), *conds.get("keywords", []), *meshes])
    cats = [k for k, rx in CAT_RE if rx.search(tagtext)]
    if not cats:
        if not GENERIC.search(tagtext):
            return None, None  # not a cancer study; the broad search terms picked it up
        cats = ["general"]
    crit = elig.get("eligibilityCriteria", "") or ""
    exttext = tagtext + " | " + NOT_ADV.sub(" ", inclusion_part(crit))
    extent = [x for x, rx in (("early", EARLY), ("advanced", ADV)) if rx.search(exttext)]
    kind = "obs" if design.get("studyType") == "OBSERVATIONAL" else KIND.get(
        (design.get("designInfo") or {}).get("primaryPurpose", "OTHER"), "support")
    phases = design.get("phases") or []
    ph = "/".join(x.replace("EARLY_PHASE1", "Early 1").replace("PHASE", "") for x in phases if x != "NA")
    locs = cl.get("locations", []) or []
    ca, outside = [], 0
    for L in locs:
        if (L.get("country") or "") != COUNTRY:
            outside += 1
            continue
        g = L.get("geoPoint") or {}
        s = SITE_ST.get(L.get("status") or "", "")
        if not s:  # some records give no site status; fall back to the study's status
            s = SITE_ST.get(status.get("overallStatus", ""), "R")
        cts = L.get("contacts") or []
        site_contact = next((c for c in cts if c.get("role") == "CONTACT"), None) or next(
            (c for c in cts if c.get("phone") or c.get("email")), None)
        ca.append({"f": L.get("facility") or "Study site", "city": L.get("city") or "",
                   "pr": province(L.get("state"), L.get("zip"), L.get("city")),
                   "zip": L.get("zip") or "", "s": s,
                   "lat": round(g["lat"], 4) if "lat" in g else None, "lon": round(g["lon"], 4) if "lon" in g else None,
                   "c": contact_of(site_contact)})
    if not ca:
        return None, None
    sex = {"FEMALE": "F", "MALE": "M"}.get(elig.get("sex", "ALL"), "A")
    row = {"id": nct, "t": ident.get("briefTitle", ""), "ac": ident.get("acronym", ""), "k": kind, "ph": ph,
           "c": cats, "x": extent, "st": status.get("overallStatus", ""), "sx": sex,
           "a0": years(elig.get("minimumAge")), "a1": years(elig.get("maximumAge")),
           "hv": bool(elig.get("healthyVolunteers")),
           "upd": (status.get("lastUpdatePostDateStruct") or {}).get("date", ""),
           "pcd": (status.get("primaryCompletionDateStruct") or {}).get("date", ""),
           "sp": (p.get("sponsorCollaboratorsModule", {}).get("leadSponsor") or {}).get("name", ""),
           "s": [[x["f"], x["city"], x["pr"], x["s"], x["lat"], x["lon"]] for x in ca]}
    detail = {"id": nct, "title": ident.get("briefTitle", ""), "official": ident.get("officialTitle", ""),
              "summary": (p.get("descriptionModule", {}) or {}).get("briefSummary", ""),
              "conditions": conds.get("conditions", []),
              "interventions": [{"type": i.get("type", ""), "name": i.get("name", "")}
                                for i in (p.get("armsInterventionsModule", {}) or {}).get("interventions", [])],
              "criteria": crit, "minAge": elig.get("minimumAge", ""), "maxAge": elig.get("maximumAge", ""),
              "sex": elig.get("sex", "ALL"), "healthy": bool(elig.get("healthyVolunteers")),
              "studyType": design.get("studyType", ""), "purpose": (design.get("designInfo") or {}).get("primaryPurpose", ""),
              "enrollment": (design.get("enrollmentInfo") or {}).get("count"),
              "start": (status.get("startDateStruct") or {}).get("date", ""),
              "pcd": row["pcd"], "upd": row["upd"], "sponsor": row["sp"],
              "central": [contact_of(c) for c in (cl.get("centralContacts") or [])][:2],
              "sites": ca, "sitesOutside": outside}
    return row, detail


def main():
    os.makedirs(os.path.join(OUT, "t"), exist_ok=True)
    studies, total = fetch_all()
    log(f"Downloaded {len(studies)} study records")
    if total and len(studies) < 0.9 * total:
        raise RuntimeError(f"Only {len(studies)} of {total} records downloaded; keeping the previous data")
    rows, keep = [], set()
    for st in studies:
        row, detail = build(st)
        if not row:
            continue
        rows.append(row)
        keep.add(row["id"])
        path = os.path.join(OUT, "t", row["id"] + ".json")
        text = json.dumps(detail, ensure_ascii=False, separators=(",", ":"))
        old = open(path, encoding="utf-8").read() if os.path.exists(path) else None
        if old != text:
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
    removed = 0
    for fn in os.listdir(os.path.join(OUT, "t")):
        if fn.endswith(".json") and fn[:-5] not in keep:
            os.remove(os.path.join(OUT, "t", fn))
            removed += 1
    city_prov = {}
    for r in rows:
        for x in r["s"]:
            if x[2]:
                city_prov.setdefault(x[1].lower(), {}).setdefault(x[2], 0)
                city_prov[x[1].lower()][x[2]] += 1
    filled = 0
    for r in rows:
        for x in r["s"]:
            if not x[2] and x[1].lower() in city_prov:
                x[2] = max(city_prov[x[1].lower()].items(), key=lambda kv: kv[1])[0]
                filled += 1
    log(f"Filled in the province for {filled} sites from their city")
    import unicodedata
    def ckey(c):
        c = unicodedata.normalize("NFKD", c).encode("ascii", "ignore").decode().lower()
        c = re.sub(r"[.\-']", " ", c)
        c = re.sub(r"\bsaint\b", "st", c)
        return " ".join(c.split())
    spell = {}
    for r in rows:
        for x in r["s"]:
            spell.setdefault((ckey(x[1]), x[2]), {}).setdefault(x[1], 0)
            spell[(ckey(x[1]), x[2])][x[1]] += 1
    for r in rows:
        for x in r["s"]:
            v = spell[(ckey(x[1]), x[2])]
            x[1] = max(v.items(), key=lambda kv: kv[1])[0]
    rows.sort(key=lambda r: r["id"])
    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, separators=(",", ":"))
    cats, kinds, sites = {}, {}, 0
    for r in rows:
        for c in r["c"]:
            cats[c] = cats.get(c, 0) + 1
        kinds[r["k"]] = kinds.get(r["k"], 0) + 1
        sites += len(r["s"])
    meta = {"built": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "country": COUNTRY,
            "studies": len(rows), "registryTotal": total, "sites": sites, "categories": cats, "kinds": kinds,
            "source": "ClinicalTrials.gov API v2"}
    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    log(f"Wrote {len(rows)} studies with {sites} {COUNTRY} sites; removed {removed} closed studies")
    log("Categories: " + ", ".join(f"{k} {v}" for k, v in sorted(cats.items(), key=lambda kv: -kv[1])))


if __name__ == "__main__":
    ok = True
    try:
        main()
    except Exception as e:
        ok = False
        log(f"BUILD FAILED: {e!r}")
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, "build-log.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(LOG) + "\n")
    sys.exit(0 if ok else 1)
