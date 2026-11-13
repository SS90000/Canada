#!/usr/bin/env python3
"""Download every open clinical study with a site in one country from ClinicalTrials.gov,
sort each one into the finder's areas (oncology, neurology, other, and an overlapping
rare-disease area), and write the data files the finder pages read. For Canada it also adds
open trials that Health Canada has authorized but whose ClinicalTrials.gov record does not
list a Canadian site yet.

The country comes from the TRIAL_COUNTRY environment variable ("Canada" or "United States").

Output (all under data/):
  <area>/index.json  compact rows for one area, used for searching, the list and the map
  <area>/meta.json   counts for that area
  t/<NCT>.json       full details for one study (shared by all areas), loaded when opened
  meta.json          when the data was built, and counts for every area
  build-log.txt      what happened on the last run (also written when a run fails)

Only the Python standard library is used, so the GitHub Action needs no installs.
"""
import html, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request
from datetime import datetime, timezone

API = "https://clinicaltrials.gov/api/v2/studies"
COUNTRY = os.environ.get("TRIAL_COUNTRY", "Canada")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
OPEN = "RECRUITING|NOT_YET_RECRUITING"
AREAS = ("oncology", "neurology", "other", "rare")
UA = {"User-Agent": "ClinicalTrialFinder/2.0 (data build; salishseven@gmail.com)"}
LOG = []


def log(msg):
    line = f"{datetime.now(timezone.utc):%Y-%m-%d %H:%M:%S} UTC  {msg}"
    print(line, flush=True)
    LOG.append(line)


def get(params):
    url = API + "?" + urllib.parse.urlencode(params)
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "ClinicalTrialFinder/2.0 (data build)",
                                                       "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.load(r)
        except Exception as e:  # network hiccup or rate limit: wait and retry
            wait = 5 * (attempt + 1)
            log(f"Request failed ({e}); retrying in {wait}s")
            time.sleep(wait)
    raise RuntimeError("ClinicalTrials.gov did not respond after several tries")


def pages():
    """Yield the registry's pages of open studies with a site in COUNTRY."""
    params = {"format": "json", "pageSize": 200, "countTotal": "true", "filter.overallStatus": OPEN,
              "filter.advanced": f"AREA[LocationCountry]{COUNTRY}"}
    token, first = None, True
    while True:
        p = dict(params)
        if token:
            p["pageToken"] = token
        page = get(p)
        if first:
            log(f"Registry reports {page.get('totalCount')} open studies with a site in {COUNTRY}")
            yield ("total", page.get("totalCount"))
            first = False
        yield ("studies", page.get("studies", []))
        token = page.get("nextPageToken")
        if not token:
            return
        time.sleep(0.4)


# ---------- oncology tagging (unchanged from the cancer-only version) ----------
ONC = [
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
ONC_RE = [(k, re.compile(p, re.I)) for k, p in ONC]
ONC_GENERIC = re.compile(r"cancer|neoplas|tumou?r(?! necrosis)|carcinoma|(?<!non-)(?<!non )malignan|oncolog|leuk(?:a)?emia|lymphoma", re.I)
# A study must first look like a cancer study; only then are the organ words above used to sort it.
ONC_GATE = re.compile(ONC_GENERIC.pattern + r"|sarcoma|melanoma|myeloma|glioma|glioblastoma|astrocytoma|blastoma\b|ependymoma|meningioma|mesothelioma|metasta|"
                      r"myelodysplas|myeloproliferative|myelofibrosis|polycythemia vera|hodgkin|seminoma|carcinoid|merkel|\bgist\b|waldenstr|\b(?:aml|cll|cml|mds|nsclc|sclc|hcc|rcc|dlbcl|hnscc)\b", re.I)
# Benign growths that the generic words catch but that patients would not look for under cancer
ONC_BENIGN = re.compile(r"^(?:(?!cancer|carcinoma|malignan|sarcoma|lymphoma|leuk|myeloma|melanoma|metasta).)*$", re.I)
BENIGN_ONLY = re.compile(r"fibroid|leiomyoma|polyp|adenoma(?!carcinoma)|lipoma|hemangioma|nevus|neurofibroma|cyst\b|keloid|wart", re.I)

# ---------- neurology tagging: MeSH headings and plain words ----------
NEURO = [
    ("stroke", r"stroke|cerebrovascular|cerebral (?:infarct|hemorrhage|haemorrhage|isch)|intracerebral h|subarachnoid|intracranial (?:aneurysm|hemorrhage)|brain isch|transient ischemic|carotid stenosis|moyamoya|arteriovenous malformation|cavernous malformation"),
    ("epilepsy", r"epilep|seizure|status epilepticus|dravet|lennox|infantile spasm"),
    ("ms", r"multiple sclerosis|demyelinating|neuromyelitis|\bnmosd\b|optic neuritis|\bmogad\b|acute disseminated encephalomyelitis"),
    ("movement", r"parkinson|movement disorder|dystonia|tremor|huntington|(?<!optic )ataxia|chorea|tourette|\btic disorder|restless legs|progressive supranuclear|multiple system atrophy"),
    ("dementia", r"dementia|alzheimer|cognitive (?:impairment|dysfunction|decline)|frontotemporal|lewy bod|memory (?:loss|impairment)|neurocognitive"),
    ("headache", r"migraine|headache|cluster headache|trigeminal neuralgia"),
    ("als", r"amyotrophic|\bals\b|motor neuron|spinal muscular atrophy|\bsma\b|primary lateral sclerosis"),
    ("neuromuscular", r"neuromuscular|myasthenia|muscular dystroph|duchenne|(?<!cardio)myopath|myositis|neuropath|guillain|\bcidp\b|charcot[- ]marie|polyneuropath|peripheral nervous system"),
    ("injury", r"brain injur|craniocerebral trauma|head injur|concussion|spinal cord injur|traumatic brain|\btbi\b"),
    ("braintumour", r"glioma|glioblastoma|astrocytoma|medulloblastoma|ependymoma|meningioma|brain (?:tumou?r|neoplasm|metasta|cancer)|central nervous system neoplasm|leptomening|brain neoplasm"),
    ("sleep", r"sleep wake disorder|narcolepsy|insomnia|sleep apnea|hypersomnia|circadian"),
    ("childneuro", r"cerebral palsy|hydrocephalus|spina bifida|neural tube|rett|angelman|leukodystroph|neurodevelopmental disorder"),
    ("neuroinfect", r"encephalitis|meningitis|neuroinflamm|autoimmune encephal"),
    ("generalneuro", r"central nervous system diseases|brain diseases|nervous system malformation|neurodegenerative|spinal cord diseases|cranial nerve|vestibular|vertigo|neurologic disorder|neurological disorder"),
]
NEURO_RE = [(k, re.compile(p, re.I)) for k, p in NEURO]

# ---------- other conditions: MeSH top-level headings and plain words ----------
OTHER = [
    ("heart", r"cardiovascular diseases|heart|cardiac|coronary|myocard|atrial fibrillation|arrhythm|hypertension|blood pressure|vascular disease|aortic|peripheral arter|venous thrombo|embolism|cardiomyopath|valve"),
    ("mental", r"mental disorders|depress|anxiety|bipolar|schizophren|psychos|psychiatric|post-?traumatic|ptsd|obsessive|autism|adhd|attention deficit|eating disorder|anorexia nervosa|bulimia|suicid|mental health|substance-related|substance use|alcohol use|opioid use|addiction|smoking cessation|tobacco use|cannabis use|gambling"),
    ("lung", r"respiratory tract diseases|asthma|copd|pulmonary|lung disease|cystic fibrosis|bronchiect|pneumonia|respiratory failure|interstitial lung|sleep apnea|bronchiolitis|respiratory distress"),
    ("metabolic", r"nutritional and metabolic diseases|endocrine system diseases|diabet|obesity|overweight|insulin|glucose|thyroid|lipid|cholesterol|metabolic syndrome|osteoporosis|vitamin d|adrenal|pituitary|growth hormone|hyperparathyroid|hypoparathyroid|weight (?:loss|management)"),
    ("digestive", r"digestive system diseases|crohn|colitis|inflammatory bowel|irritable bowel|liver disease|cirrhosis|hepatitis|fatty liver|\bnash\b|\bmasld\b|pancreatitis|celiac|gastro|esophag|bowel|constipation|reflux|biliary|gallstone"),
    ("kidney", r"kidney diseases|urologic diseases|renal|kidney|dialysis|hemodialysis|urinary|incontinence|bladder|prostatic hyperplasia|kidney transplant|nephro"),
    ("women", r"female urogenital diseases and pregnancy complications|pregnancy complications|pregnan|preterm|postpartum|endometriosis|polycystic ovary|fibroid|leiomyoma|uterine|ovarian cyst|menopaus|infertil|contracept|gynecolog|obstetric|preeclampsia|labor|caesarean|cesarean|breastfeed|lactation|vulvovaginal"),
    ("immune", r"immune system diseases|rheumat|arthritis|lupus|vasculitis|sjogren|scleroderma|systemic sclerosis|autoimmune|allerg|anaphyla|immunodeficien|transplant rejection|graft versus host|sarcoidosis"),
    ("skin", r"skin and connective tissue diseases|dermatitis|eczema|psoriasis|acne|hidradenitis|urticaria|vitiligo|alopecia|wound|burn|scar|pressure ulcer|skin"),
    ("blood", r"hemic and lymphatic diseases|anemia|sickle cell|thalassemia|hemophilia|bleeding disorder|von willebrand|thrombocytopenia|neutropenia|iron deficiency|coagulation|blood transfusion"),
    ("infection", r"infections|infection|covid|sars-cov|influenza|\brsv\b|hiv|tuberculosis|sepsis|hepatitis b|hepatitis c|malaria|vaccine|vaccination|bacterial|viral|fungal|antibiotic|antimicrobial"),
    ("musculoskeletal", r"musculoskeletal diseases|wounds and injuries|fracture|osteoarthritis|back pain|neck pain|knee|hip|shoulder|tendon|ligament|sports injur|sarcopenia|bone|joint|spine|scoliosis|orthop|amputation|trauma|injur"),
    ("eyeent", r"eye diseases|otorhinolaryngologic diseases|stomatognathic diseases|macular|glaucoma|cataract|retina|uveitis|dry eye|myopia|hearing|tinnitus|otitis|sinusitis|rhinitis|dental|periodont|oral health|caries|tonsil"),
    ("genetic", r"congenital, hereditary, and neonatal diseases and abnormalities|congenital|hereditary|genetic disorder|rare disease|inborn error|lysosomal|mucopolysacchar|fabry|gaucher|pompe|phenylketon|down syndrome|neonat|newborn|premature infant"),
    ("pain", r"\bpain\b|analges|anesthe|anaesthe|nerve block|opioid|postoperative|perioperative|surgery|surgical|sedation|delirium|critical illness|intensive care"),
    ("healthy", r"healthy volunteer|healthy adult|healthy participant|healthy subject|\bhealthy\b"),
]
OTHER_RE = [(k, re.compile(p, re.I)) for k, p in OTHER]

PROVINCES = {"ontario": "Ontario", "quebec": "Quebec", "québec": "Quebec", "alberta": "Alberta", "british columbia": "British Columbia",
             "britsh columbia": "British Columbia", "nova scotia": "Nova Scotia", "manitoba": "Manitoba", "saskatchewan": "Saskatchewan",
             "new brunswick": "New Brunswick", "newfoundland and labrador": "Newfoundland and Labrador", "newfoundland": "Newfoundland and Labrador",
             "prince edward island": "Prince Edward Island", "yukon": "Yukon", "northwest territories": "Northwest Territories", "nunavut": "Nunavut",
             "on": "Ontario", "qc": "Quebec", "ab": "Alberta", "bc": "British Columbia", "ns": "Nova Scotia", "mb": "Manitoba", "sk": "Saskatchewan",
             "nb": "New Brunswick", "nl": "Newfoundland and Labrador", "pe": "Prince Edward Island"}
POSTAL = {"A": "Newfoundland and Labrador", "B": "Nova Scotia", "C": "Prince Edward Island", "E": "New Brunswick", "G": "Quebec", "H": "Quebec",
          "J": "Quebec", "K": "Ontario", "L": "Ontario", "M": "Ontario", "N": "Ontario", "P": "Ontario", "R": "Manitoba", "S": "Saskatchewan",
          "T": "Alberta", "V": "British Columbia", "Y": "Yukon"}
STATES = {"AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California", "CO": "Colorado", "CT": "Connecticut",
          "DE": "Delaware", "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois",
          "IN": "Indiana", "IA": "Iowa", "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
          "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri", "MT": "Montana",
          "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico", "NY": "New York",
          "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio", "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania",
          "RI": "Rhode Island", "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah",
          "VT": "Vermont", "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
          "PR": "Puerto Rico", "GU": "Guam", "VI": "U.S. Virgin Islands"}
STATE_NAMES = {v.lower(): v for v in STATES.values()}


def region(state, zipc):
    s = (state or "").strip()
    if COUNTRY == "Canada":
        key = re.sub(r",?\s*canada$", "", s, flags=re.I).lower()
        if key in PROVINCES:
            return PROVINCES[key]
        z = (zipc or "").strip().upper()
        if re.match(r"^[A-Z]\d[A-Z]", z) and z[0] in POSTAL:
            return POSTAL[z[0]]
        return ""
    if s.upper() in STATES:
        return STATES[s.upper()]
    return STATE_NAMES.get(s.lower(), s.title() if s else "")


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


def contact_of(c):
    if not c:
        return ""
    phone = c.get("phone", "")
    if c.get("phoneExt"):
        phone += f" ext. {c['phoneExt']}"
    return " · ".join(x for x in [c.get("name", ""), phone, c.get("email", "")] if x)


# ---------- rare diseases: names and synonyms from Orphanet's nomenclature ----------
ORPHA_URL = "https://www.orphadata.com/data/xml/en_product1.xml"  # Orphanet nomenclature, CC BY 4.0
ORPHA_CACHE = os.path.join(OUT, "_ref", "orpha_names.json")
# Orphanet names that are also everyday words in registry conditions; matching them adds noise
RARE_STOP = {"disease", "syndrome", "malformation syndrome", "clinical group", "disorder", "tumor", "tumour", "cancer",
             "obesity", "hypertension", "anemia", "anaemia", "infertility", "deafness", "epilepsy", "dementia", "stroke",
             "asthma", "diabetes mellitus", "arthritis", "cardiomyopathy", "neuropathy", "lymphoma", "leukemia", "leukaemia",
             "sarcoma", "carcinoma", "adenocarcinoma", "glioma", "myopathy", "pain", "fever", "short stature", "autism",
             "intellectual disability", "rare disease", "rare tumor", "rare cancer", "rare genetic disease", "head and neck cancer"}


def norm_name(t):
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9]+", " ", t)
    return " ".join(t.split())


def load_rare_names():
    """Return a set of normalized Orphanet disease names and synonyms (cached for 30 days)."""
    try:
        if os.path.exists(ORPHA_CACHE) and time.time() - os.path.getmtime(ORPHA_CACHE) < 30 * 86400:
            with open(ORPHA_CACHE, encoding="utf-8") as f:
                return set(json.load(f))
    except Exception:
        pass
    try:
        with urllib.request.urlopen(urllib.request.Request(ORPHA_URL, headers=UA), timeout=180) as r:
            text = r.read().decode("utf-8", "ignore")
        names = set()
        found = [m.group(1) for m in re.finditer(r'<OrphaCode>\d+</OrphaCode>[\s\S]{0,400}?<Name lang="en">([^<]+)</Name>', text)]
        found += re.findall(r'<Synonym lang="en">([^<]+)</Synonym>', text)
        for raw in found:
            n = norm_name(html.unescape(raw))
            if n and n not in RARE_STOP and (" " in n or len(n) >= 8):
                names.add(n)
        if len(names) < 3000:
            raise RuntimeError(f"only {len(names)} names found")
        os.makedirs(os.path.dirname(ORPHA_CACHE), exist_ok=True)
        with open(ORPHA_CACHE, "w", encoding="utf-8") as f:
            json.dump(sorted(names), f, ensure_ascii=False, separators=(",", ":"))
        log(f"Loaded {len(names)} rare-disease names from Orphanet")
        return names
    except Exception as e:
        log(f"Could not refresh Orphanet names ({e}); using the cached list if there is one")
        if os.path.exists(ORPHA_CACHE):
            with open(ORPHA_CACHE, encoding="utf-8") as f:
                return set(json.load(f))
        return set()


RARE = set()
RARE_HITS = {}
RARE_PHRASE = re.compile(r"\brare (?:disease|disorder|genetic|cancer|tumou?r)s?\b|\borphan (?:disease|drug)", re.I)


def rare_match(texts):
    """Orphanet names found in the condition texts (as whole phrases), or [] if none."""
    found = []
    for t in texts:
        variants = [t]
        if "," in t:  # MeSH style "Muscular Dystrophy, Duchenne" -> "Duchenne Muscular Dystrophy"
            a, b = t.split(",", 1)
            variants.append(b + " " + a)
        for v in variants:
            w = norm_name(v).split()
            for i in range(len(w)):
                for j in range(i + 1, min(len(w), i + 9) + 1):
                    g = " ".join(w[i:j])
                    if g in RARE:
                        found.append(g)
    return found


# ---------- Health Canada: authorized trials whose registry record lacks a Canadian site ----------
HC_SEARCH = ("https://clinical-trials-search.canada.ca/en/search?search_api_fulltext=&field_medical_condition="
             "&field_trial_status={st}&field_province_1=All&field_city=&field_nol_date=&field_nol_date_1=&page={pg}")
HC_STATUS = {"2714": "R", "2693": "NYR"}  # Recruiting, Not yet recruiting


def hc_trials():
    """Scrape Health Canada's portal for open trials. Returns (by_nct, no_registry_count)."""
    by_nct, noreg = {}, set()
    for st, code in HC_STATUS.items():
        pg, total = 0, None
        while True:
            url = HC_SEARCH.format(st=st, pg=pg)
            page = None
            for attempt in range(4):
                try:
                    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                        page = r.read().decode("utf-8", "ignore")
                    break
                except Exception as e:
                    time.sleep(5 * (attempt + 1))
            if page is None:
                raise RuntimeError("Health Canada portal did not respond")
            if total is None:
                m = re.search(r"of\s*(?:<[^>]*>\s*)*([\d,]+)\s*(?:<[^>]*>\s*)*trials", page)
                total = int(m.group(1).replace(",", "")) if m else None
            blocks = re.split(r'<div class="views-row">', page)[1:]
            for b in blocks:
                ctrl = re.search(r'href="/en/clinical-trial/(\d+)[^"]*"', b)
                if not ctrl:
                    continue
                ids = sorted(set(re.findall(r"NCT\d{8}", b)))
                if not ids and not re.search(r"views-field-field-nct-id[\s\S]*?<a ", b):
                    noreg.add(ctrl.group(1))
                for n in ids:
                    by_nct.setdefault(n, {"ctrl": ctrl.group(1), "st": code})
            pg += 1
            if not any('/en/clinical-trial/' in b for b in blocks) or pg >= 600 or (total and pg * 10 >= total):
                break
            time.sleep(0.3)
        log(f"Health Canada portal: {total} trials with status {code} ({pg} pages read)")
    return by_nct, len(noreg)


def not_included_counts():
    """Studies with a site in COUNTRY that the finder leaves out, by status."""
    out = {}
    for st in ("ACTIVE_NOT_RECRUITING", "ENROLLING_BY_INVITATION", "SUSPENDED"):
        try:
            out[st] = get({"format": "json", "pageSize": 1, "countTotal": "true", "fields": "NCTId",
                           "filter.overallStatus": st, "filter.advanced": f"AREA[LocationCountry]{COUNTRY}"}).get("totalCount")
        except Exception:
            out[st] = None
    return out


RARE_OTHER = {"heart", "lung", "metabolic", "digestive", "kidney", "immune", "skin", "blood", "musculoskeletal", "eyeent", "genetic", "infection"}


def classify(ident, conds, meshes, ancestors, healthy):
    """Return {area: [categories]} for the areas this study belongs to."""
    base = " | ".join([ident.get("briefTitle", ""), ident.get("officialTitle", ""),
                       *conds.get("conditions", []), *conds.get("keywords", []), *meshes])
    full = base + " | " + " | ".join(ancestors)
    # Sponsors' free-text keywords are noisy (schizophrenia studies list movement side effects), so neurology uses only titles, conditions and MeSH terms
    # The registry sometimes maps "PD-1"/"PD-L1" keywords to "Parkinson Disease 4", so drop numbered Parkinson genes
    ntext = " | ".join([ident.get("briefTitle", ""), ident.get("officialTitle", ""), *conds.get("conditions", []),
                        *[m for m in meshes if not re.match(r"Parkinson Disease \d", m)]])
    out = {}
    is_cancer = bool(ONC_GATE.search(base))
    onc = [k for k, rx in ONC_RE if rx.search(base)] if is_cancer else []
    if is_cancer and not onc:
        onc = ["general"]
    if onc and BENIGN_ONLY.search(base) and ONC_BENIGN.match(base):
        onc = []  # only benign growths (for example fibroids or polyps)
    if onc:
        out["oncology"] = onc
    neuro = [k for k, rx in NEURO_RE if rx.search(ntext)]  # broad MeSH ancestors pulled in psychiatry, ICU and pain studies
    if len(neuro) > 1 and "generalneuro" in neuro:
        neuro.remove("generalneuro")  # only use the catch-all when nothing more specific matched
    if neuro:
        out["neurology"] = neuro
    if not out:
        other = [k for k, rx in OTHER_RE if rx.search(full)]
        if healthy and "healthy" not in other and re.search(r"healthy", base, re.I):
            other.append("healthy")
        out["other"] = other or ["general"]
    rare = rare_match([*conds.get("conditions", []), *meshes])
    if rare or RARE_PHRASE.search(base):
        for g in rare:
            RARE_HITS[g] = RARE_HITS.get(g, 0) + 1
        cats = []
        if "oncology" in out:
            cats.append("rarecancer")
        if "neurology" in out:
            cats.append("rareneuro")
        cats += [k for k, rx in OTHER_RE if k in RARE_OTHER and rx.search(full)]
        out["rare"] = cats or ["raregeneral"]
    return out


def build(st, hc=None):
    p = st.get("protocolSection", {})
    d = st.get("derivedSection", {})
    ident, status = p.get("identificationModule", {}), p.get("statusModule", {})
    design, elig = p.get("designModule", {}), p.get("eligibilityModule", {})
    conds = p.get("conditionsModule", {})
    cl = p.get("contactsLocationsModule", {})
    cb = d.get("conditionBrowseModule", {}) or {}
    meshes = [m.get("term", "") for m in cb.get("meshes", [])]
    ancestors = [m.get("term", "") for m in cb.get("ancestors", [])]
    nct = ident.get("nctId")
    areas = classify(ident, conds, meshes, ancestors, bool(elig.get("healthyVolunteers")))
    crit = elig.get("eligibilityCriteria", "") or ""
    extent = []
    if "oncology" in areas:
        exttext = " | ".join([ident.get("briefTitle", ""), *conds.get("conditions", []), *meshes]) + " | " + \
                  NOT_ADV.sub(" ", re.split(r"exclusion criteria", crit, flags=re.I)[0])
        extent = [x for x, rx in (("early", EARLY), ("advanced", ADV)) if rx.search(exttext)]
    kind = "obs" if design.get("studyType") == "OBSERVATIONAL" else KIND.get(
        (design.get("designInfo") or {}).get("primaryPurpose", "OTHER"), "support")
    phases = design.get("phases") or []
    ph = "/".join(x.replace("EARLY_PHASE1", "Early 1").replace("PHASE", "") for x in phases if x != "NA")
    sites, outside = [], 0
    for L in cl.get("locations", []) or []:
        if (L.get("country") or "") != COUNTRY:
            outside += 1
            continue
        g = L.get("geoPoint") or {}
        s = SITE_ST.get(L.get("status") or "", "") or SITE_ST.get(status.get("overallStatus", ""), "R")
        cts = L.get("contacts") or []
        sc = next((c for c in cts if c.get("role") == "CONTACT"), None) or next((c for c in cts if c.get("phone") or c.get("email")), None)
        sites.append({"f": L.get("facility") or "Study site", "city": L.get("city") or "", "pr": region(L.get("state"), L.get("zip")),
                      "zip": L.get("zip") or "", "s": s,
                      "lat": round(g["lat"], 4) if "lat" in g else None, "lon": round(g["lon"], 4) if "lon" in g else None,
                      "c": contact_of(sc)})
    if not sites and not hc:
        return None, None
    row = {"id": nct, "t": ident.get("briefTitle", ""), "ac": ident.get("acronym", ""), "k": kind, "ph": ph,
           "areas": areas, "x": extent, "sx": {"FEMALE": "F", "MALE": "M"}.get(elig.get("sex", "ALL"), "A"),
           "a0": years(elig.get("minimumAge")), "a1": years(elig.get("maximumAge")), "hv": bool(elig.get("healthyVolunteers")),
           "upd": (status.get("lastUpdatePostDateStruct") or {}).get("date", ""),
           "pcd": (status.get("primaryCompletionDateStruct") or {}).get("date", ""),
           "sp": (p.get("sponsorCollaboratorsModule", {}).get("leadSponsor") or {}).get("name", ""),
           "sites": sites}
    if hc:
        row["hc"] = hc["ctrl"]
        row["os"] = SITE_ST.get(status.get("overallStatus", ""), "R")
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
              "pcd": row["pcd"], "upd": row["upd"], "sponsor": row["sp"], "areas": sorted(areas),
              "central": [contact_of(c) for c in (cl.get("centralContacts") or [])][:2],
              "sites": sites, "sitesOutside": outside}
    if hc:
        detail["hc"] = hc["ctrl"]
    return row, detail


def ckey(c):
    c = unicodedata.normalize("NFKD", c).encode("ascii", "ignore").decode().lower()
    c = re.sub(r"[.\-']", " ", c)
    c = re.sub(r"\bsaint\b", "st", c)
    return " ".join(c.split())


def tidy_places(rows):
    """Fill in missing regions from the city, and use one spelling per city."""
    city_reg = {}
    for r in rows:
        for x in r["sites"]:
            if x["pr"]:
                d = city_reg.setdefault(ckey(x["city"]), {})
                d[x["pr"]] = d.get(x["pr"], 0) + 1
    filled = 0
    for r in rows:
        for x in r["sites"]:
            if not x["pr"] and ckey(x["city"]) in city_reg:
                x["pr"] = max(city_reg[ckey(x["city"])].items(), key=lambda kv: kv[1])[0]
                filled += 1
    spell = {}
    for r in rows:
        for x in r["sites"]:
            d = spell.setdefault((ckey(x["city"]), x["pr"]), {})
            d[x["city"]] = d.get(x["city"], 0) + 1
    for r in rows:
        for x in r["sites"]:
            x["city"] = max(spell[(ckey(x["city"]), x["pr"])].items(), key=lambda kv: kv[1])[0]
    log(f"Filled in the region for {filled} sites from their city")


def write_area(area, rows, built, total):
    """Compact format: shared tables of cities and facilities, and sites as small index lists."""
    cities, cidx, facs, fidx = [], {}, [], {}
    out = []
    for r in rows:
        if area not in r["areas"]:
            continue
        s = []
        for x in r["sites"]:
            ck = (x["city"], x["pr"])
            if ck not in cidx:
                cidx[ck] = len(cities)
                cities.append([x["city"], x["pr"], x["lat"], x["lon"]])
            if x["f"] not in fidx:
                fidx[x["f"]] = len(facs)
                facs.append(x["f"])
            s.append([fidx[x["f"]], cidx[ck], x["s"]])
        row = {k: r[k] for k in ("id", "t", "ac", "k", "ph", "sx", "a0", "a1", "hv", "upd", "pcd", "sp")}
        row["c"] = r["areas"][area]
        if area == "oncology":
            row["x"] = r["x"]
        if r.get("hc"):
            row["hc"], row["os"] = r["hc"], r["os"]
        row["s"] = s
        out.append(row)
    d = os.path.join(OUT, area)
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"v": 2, "country": COUNTRY, "area": area, "cities": cities, "fac": facs, "rows": out},
                  f, ensure_ascii=False, separators=(",", ":"))
    if not out:
        log(f"{area}: no studies")
    cats, kinds = {}, {}
    for r in out:
        for c in r["c"]:
            cats[c] = cats.get(c, 0) + 1
        kinds[r["k"]] = kinds.get(r["k"], 0) + 1
    meta = {"built": built, "country": COUNTRY, "area": area, "studies": len(out), "registryTotal": total,
            "sites": sum(len(r["s"]) for r in out), "hcOnly": sum(1 for r in out if r.get("hc")), "categories": cats, "kinds": kinds, "source": "ClinicalTrials.gov API v2"}
    with open(os.path.join(d, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    log(f"{area}: {meta['studies']} studies at {meta['sites']} sites; " +
        ", ".join(f"{k} {v}" for k, v in sorted(cats.items(), key=lambda kv: -kv[1])))
    return meta


def main():
    global RARE
    RARE = load_rare_names()
    log(f"Rare-disease name list: {len(RARE)} names")
    tdir = os.path.join(OUT, "t")
    os.makedirs(tdir, exist_ok=True)
    rows, keep, total, seen, written = [], set(), None, 0, 0
    for kind, val in pages():
        if kind == "total":
            total = val
            continue
        for st in val:
            seen += 1
            row, detail = build(st)
            if not row:
                continue
            rows.append(row)
            keep.add(row["id"])
            path = os.path.join(tdir, row["id"] + ".json")
            text = json.dumps(detail, ensure_ascii=False, separators=(",", ":"))
            old = open(path, encoding="utf-8").read() if os.path.exists(path) else None
            if old != text:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(text)
                written += 1
    log(f"Downloaded {seen} study records; {written} detail files new or changed")
    if total and seen < 0.9 * total:
        raise RuntimeError(f"Only {seen} of {total} records downloaded; keeping the previous data")
    hc_added, hc_noreg = 0, None
    if COUNTRY == "Canada":
        try:
            by_nct, hc_noreg = hc_trials()
            want = [n for n in by_nct if n not in keep]
            log(f"Health Canada lists {len(by_nct)} open trials with a ClinicalTrials.gov number; "
                f"{len(want)} are not in the registry download (no Canadian site listed, or a different status); "
                f"{hc_noreg} have no registry record")
            for i in range(0, len(want), 100):
                pg = get({"format": "json", "pageSize": 100, "filter.ids": ",".join(want[i:i + 100]),
                          "filter.overallStatus": OPEN})
                for st in pg.get("studies", []):
                    nct = st["protocolSection"]["identificationModule"]["nctId"]
                    row, detail = build(st, hc=by_nct[nct])
                    if not row or row["sites"]:
                        continue
                    rows.append(row)
                    keep.add(nct)
                    hc_added += 1
                    path = os.path.join(tdir, nct + ".json")
                    text = json.dumps(detail, ensure_ascii=False, separators=(",", ":"))
                    if not os.path.exists(path) or open(path, encoding="utf-8").read() != text:
                        with open(path, "w", encoding="utf-8") as f:
                            f.write(text)
                time.sleep(0.4)
            log(f"Added {hc_added} Health Canada-authorized trials whose Canadian sites are not listed yet")
        except Exception as e:
            log(f"Health Canada step skipped ({e!r}); the registry data is still complete")
    left_out = not_included_counts()
    log("Left out (not open to new participants): " + ", ".join(f"{k} {v}" for k, v in left_out.items()))
    top = sorted(RARE_HITS.items(), key=lambda kv: -kv[1])[:40]
    log("Most frequent rare-disease matches: " + ", ".join(f"{k} {v}" for k, v in top))
    removed = 0
    for fn in os.listdir(tdir):
        if fn.endswith(".json") and fn[:-5] not in keep:
            os.remove(os.path.join(tdir, fn))
            removed += 1
    tidy_places(rows)
    rows.sort(key=lambda r: r["id"])
    built = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    metas = {a: write_area(a, rows, built, total) for a in AREAS}
    old_index = os.path.join(OUT, "index.json")  # file from the cancer-only version
    if os.path.exists(old_index):
        os.remove(old_index)
    with open(os.path.join(OUT, "meta.json"), "w", encoding="utf-8") as f:
        json.dump({"built": built, "country": COUNTRY, "studies": len(rows), "registryTotal": total,
                   "areas": {a: {"studies": m["studies"], "sites": m["sites"]} for a, m in metas.items()},
                   "hcOnly": hc_added, "hcNoRegistry": hc_noreg, "notIncluded": left_out,
                   "source": "ClinicalTrials.gov API v2" + ("; Health Canada clinical trial search portal" if hc_added else "")}, f, ensure_ascii=False, indent=1)
    log(f"Wrote {len(rows)} studies; removed {removed} closed studies")


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
