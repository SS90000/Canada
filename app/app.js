/* Clinical Trial Finder – page logic (area and country come from areas.js and country.js).
   Settings (Mapbox token, organization name, contact) are at the top of index.html. */
"use strict";

/* ---------- helpers ---------- */
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const $ = id => document.getElementById(id);
const km = (a, b, c, d) => { const R = 6371, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r;
  const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const today = new Date();
const MI = COUNTRY.unit === "mi";
const toUnit = d => MI ? d * 0.621371 : d;            /* km to the display unit */
const fromUnit = d => MI ? d / 0.621371 : d;          /* display unit to km */
const UNIT = MI ? "mi" : "km";
const OPEN = s => s === "R" || s === "NYR";
const KIND_ORDER = { treat: 0, diag: 1, support: 2, obs: 3 };
const BLOOD = new Set(["leukemia", "lymphoma", "myeloma"]);

/* ---------- labels ---------- */
const A = AREAS[AREA];
const CAT = A.cats;
const MANY = A.many ? new Set(["solid", "general"]) : new Set();
const KIND = { treat: ["Treatment", "Traitement"], diag: ["Diagnosis and screening", "Diagnostic et dépistage"],
  support: ["Supportive care and other", "Soins de soutien et autres"], obs: ["Observational", "Observation"] };
const SITE = { R: ["Recruiting", "Recrute", "st-rec"], NYR: ["Coming soon", "Bientôt", "st-soon"], ANR: ["Not recruiting", "Ne recrute pas", "st-stop"],
  INV: ["By invitation only", "Sur invitation seulement", "st-stop"], SUS: ["Suspended", "Suspendu", "st-stop"], STOP: ["Closed", "Fermé", "st-stop"] };
const PROV_FR = COUNTRY.regionFr || {};

const T = {
en: {
  sub: "Canada · All cancers · Beta", pill: "Beta",
  band: (n, d) => `Beta. Not medical advice. Lists all ${n} open cancer studies with Canadian sites on ClinicalTrials.gov, updated daily (last update ${d}).`,
  loading: "Loading the latest trial list…", loadErr: "The trial list couldn't be loaded. Check your internet connection and reload the page.",
  h1: "Find cancer clinical trials in Canada",
  lede: "Search open clinical trials and studies for any type of cancer, near you or anywhere in Canada. See each site's status and contact, and read the full eligibility criteria, so you can raise the right studies with your care team.",
  before: "Before you start",
  b1: "This is a beta version. It is not medical advice.", b2: "Results are a first screen. Only a study team can confirm whether you can join.",
  b3: "Study details come from ClinicalTrials.gov and can be out of date. Cancer type and disease stage are detected automatically and can be wrong.",
  b4: "Your answers stay in this browser tab. Nothing is saved or sent anywhere.", b5: "In an emergency, call 911 or go to the nearest emergency department.",
  consent: "I have read and agree to the Terms of use. I understand this is a beta, not medical advice, and that I should confirm everything with my care team.",
  readTerms: "Read the full terms of use",
  searchH: "Search", cat: "Type of cancer", catAny: "Any type of cancer", many: "Also show studies open to many cancer types",
  where: "Where", prov: "Province or territory", provAny: "Anywhere in Canada", near: "Near a city", nearPh: "Start typing a city", dist: "Within",
  distAny: "Any distance", useLoc: "Use my location", locOn: "Using your location", locErr: "Your location isn't available. Type a city instead.",
  about: "About you (optional)", age: "Age", sex: "Sex at birth", sexAny: "Not specified", female: "Female", male: "Male",
  spread: "Has the cancer spread?", spreadAny: "Not sure or not relevant", early: "No, it's early-stage or local", advanced: "Yes, it's advanced or metastatic",
  types: "Types of study", closed: "Include sites that aren't recruiting", search: "Search trials", browse: "Browse all trials",
  refine: "Refine your search", results: n => n === 1 ? "1 study found" : `${n} studies found`,
  hidSpread: n => `${n} more ${n === 1 ? "study appears" : "studies appear"} to be only for the other disease stage.`, showThem: "Show them anyway",
  sort: "Sort by", sBest: "Best match", sNear: "Nearest open site", sNew: "Recently updated",
  mapH: "Where these studies are", mapP: "Each pin is a city, with the number of studies there. Select a city to see its studies.",
  mapNoTiles: "The street map isn't available here, so studies are listed by city.",
  cityAll: "All cities", atCity: c => `Showing studies in ${c}.`, clearCity: "Show all cities", seeHere: "Show studies here",
  lgR: "Recruiting", lgS: "Coming soon", lgX: "Not recruiting", studies: n => n === 1 ? "1 study" : `${n} studies`,
  more: n => `Show ${n} more`, none: "No studies match. Try a wider distance, another province, or fewer filters.",
  nearest: "Nearest site", sitesCa: (n, r) => `${n} ${n === 1 ? "site" : "sites"} ${COUNTRY.inName[0]} · ${r} recruiting`,
  ageRange: (a, b) => a == null && b == null ? "Any age" : b == null ? `Age ${a}+` : a == null ? `Up to age ${b}` : `Age ${a} to ${b}`,
  sexOnly: { F: "Women only", M: "Men only" }, healthy: "Also accepts healthy volunteers",
  extent: { early: "Early-stage", advanced: "Advanced or metastatic" }, auto: "detected automatically",
  stage: "Stage at diagnosis", stageAny: "Not sure", stageN: x => x === "0" ? "Stage 0" : `Stage ${x}`, stagesL: a => `Stage ${a.join(", ")}`,
  aiRead: "read by AI", aiBadge: "AI-read eligibility", aiH: "Who this study is for (read by AI)", regText: "Registry text",
  aiStage: "Stage:", aiPrior: "Earlier treatment:", aiBrain: "Brain metastases:", aiEcog: "Activity level:",
  bio: { positive: "must be positive", negative: "must be negative", low: "must be low", mutation: "a change (mutation) is required", "no-mutation": "must not have this change", high: "must be high", other: "" },
  prior: { none: "no earlier treatment for this cancer (or this stage)", required: "a specific earlier treatment is required", allowed: "earlier treatment is allowed" },
  brain: { allowed: "allowed", "treated-only": "allowed only if treated or stable", excluded: "not allowed", required: "the study is for people with brain metastases" },
  ecog: n => `ECOG ${n === 0 ? "0 (fully active)" : `0 to ${n}`}${n === 1 ? ": able to do at least light activities" : n === 2 ? ": up and about more than half the day" : n >= 3 ? ": limited activity is accepted" : ""}`,
  aiNote: "Read automatically by AI from the registry text, with each point checked against the quoted wording. It can still miss or misread things. The full criteria below, and the study team, are the final word.",
  details: "Details, sites and eligibility", hide: "Hide details", save: "Save to my list", saved: "Saved", loadingD: "Loading details…",
  summaryH: "About this study", fromReg: "From the registry, in the sponsor's words:", treatments: "What is being tested",
  allSites: "Sites " + COUNTRY.inName[0], siteContact: "Site contact", noContact: "No site contact listed. Study contact:", noContact2: "No contact listed. Use the registry record.",
  openMap: "Map", allN: n => `Show all ${n} sites`, copy: "Copy", copied: "Copied", eligH: "Who can join (full criteria from the registry)",
  registry: "Full record on ClinicalTrials.gov", recUpd: "Record last updated", started: "Started", sponsor: "Sponsor",
  flagStale: "Status uncertain", flagPcd: d => `The estimated completion date (${d}) has passed, but the record still says open.`, flagOld: "The record hasn't been updated in more than 12 months.",
  flagSoon: "Not open yet", flagSoonP: "No site in this area is recruiting yet. Ask the study team when it will open.",
  flagClosed: "No open site in this area", flagClosedP: "The study is open, but its sites in this area are not currently recruiting.",
  confirm: "Confirm the current status with the study team before acting.",
  myList: n => `My list (${n})`, sumH: "Summary for your oncologist", sumP: "Copy this into an email or notes app, or show it at your appointment.",
  sumEmpty: "Save studies with “Save to my list” to add them here.", copySum: "Copy summary", back: "Back to results", startOver: "Start over",
  fTerms: "Terms of use", fPriv: "Privacy", fData: "Data sources", legalBack: "Back",
  foot: () => `Operated by ${ORG.name}. Not affiliated with or endorsed by ClinicalTrials.gov, the U.S. National Library of Medicine, or any hospital or sponsor listed.`,
  trEn: "", km: d => `${Math.round(toUnit(d))} ${UNIT}`, kmAway: d => `${Math.round(toUnit(d))} ${UNIT} away`
},
fr: {
  sub: "Canada · Tous les cancers · Bêta", pill: "Bêta",
  band: (n, d) => `Bêta. Ne constitue pas un avis médical. Présente les ${n} études sur le cancer ouvertes ayant des sites au Canada sur ClinicalTrials.gov, mises à jour chaque jour (dernière mise à jour : ${d}).`,
  loading: "Chargement de la liste à jour…", loadErr: "La liste des études n'a pas pu être chargée. Vérifiez votre connexion Internet et rechargez la page.",
  h1: "Trouver des essais cliniques sur le cancer au Canada",
  lede: "Cherchez des essais et des études ouverts pour tout type de cancer, près de chez vous ou partout au Canada. Consultez le statut et le contact de chaque site et les critères d'admissibilité complets, pour en parler avec votre équipe soignante.",
  before: "Avant de commencer",
  b1: "Ceci est une version bêta. Ce n'est pas un avis médical.", b2: "Les résultats sont un premier tri. Seule l'équipe de l'étude peut confirmer votre admissibilité.",
  b3: "Les détails proviennent de ClinicalTrials.gov et peuvent être dépassés. Le type de cancer et le stade sont détectés automatiquement et peuvent être erronés.",
  b4: "Vos réponses restent dans cet onglet. Rien n'est enregistré ni transmis.", b5: "En cas d'urgence, composez le 911 ou rendez-vous à l'urgence la plus proche.",
  consent: "J'ai lu et j'accepte les Conditions d'utilisation. Je comprends qu'il s'agit d'une version bêta, et non d'un avis médical, et que je dois tout confirmer avec mon équipe soignante.",
  readTerms: "Lire les conditions d'utilisation complètes",
  searchH: "Recherche", cat: "Type de cancer", catAny: "Tout type de cancer", many: "Afficher aussi les études ouvertes à plusieurs types de cancer",
  where: "Où", prov: "Province ou territoire", provAny: "Partout au Canada", near: "Près d'une ville", nearPh: "Commencez à taper une ville", dist: "Dans un rayon de",
  distAny: "Toute distance", useLoc: "Utiliser ma position", locOn: "Votre position est utilisée", locErr: "Votre position n'est pas disponible. Tapez plutôt une ville.",
  about: "À propos de vous (facultatif)", age: "Âge", sex: "Sexe à la naissance", sexAny: "Non précisé", female: "Féminin", male: "Masculin",
  spread: "Le cancer s'est-il propagé?", spreadAny: "Je ne sais pas ou sans objet", early: "Non, stade précoce ou localisé", advanced: "Oui, avancé ou métastatique",
  types: "Types d'études", closed: "Inclure les sites qui ne recrutent pas", search: "Chercher des essais", browse: "Parcourir tous les essais",
  refine: "Affiner la recherche", results: n => n === 1 ? "1 étude trouvée" : `${n} études trouvées`,
  hidSpread: n => `${n} autre${n === 1 ? " étude semble" : "s études semblent"} viser seulement l'autre stade de la maladie.`, showThem: "Les afficher quand même",
  sort: "Trier par", sBest: "Meilleure correspondance", sNear: "Site ouvert le plus proche", sNew: "Mise à jour récente",
  mapH: "Où se trouvent ces études", mapP: "Chaque repère est une ville, avec le nombre d'études. Choisissez une ville pour voir ses études.",
  mapNoTiles: "La carte n'est pas disponible ici; les études sont donc listées par ville.",
  cityAll: "Toutes les villes", atCity: c => `Études à ${c}.`, clearCity: "Afficher toutes les villes", seeHere: "Voir les études ici",
  lgR: "Recrute", lgS: "Bientôt", lgX: "Ne recrute pas", studies: n => n === 1 ? "1 étude" : `${n} études`,
  more: n => `Afficher ${n} de plus`, none: "Aucune étude ne correspond. Essayez une plus grande distance, une autre province ou moins de filtres.",
  nearest: "Site le plus proche", sitesCa: (n, r) => `${n} site${n === 1 ? "" : "s"} ${COUNTRY.inName[1]} · ${r} recrute${r === 1 ? "" : "nt"}`,
  ageRange: (a, b) => a == null && b == null ? "Tout âge" : b == null ? `${a} ans et plus` : a == null ? `Jusqu'à ${b} ans` : `${a} à ${b} ans`,
  sexOnly: { F: "Femmes seulement", M: "Hommes seulement" }, healthy: "Accepte aussi des volontaires en santé",
  extent: { early: "Stade précoce", advanced: "Avancé ou métastatique" }, auto: "détecté automatiquement",
  stage: "Stade au diagnostic", stageAny: "Je ne sais pas", stageN: x => `Stade ${x}`, stagesL: a => `Stade ${a.join(", ")}`,
  aiRead: "lu par l'IA", aiBadge: "Admissibilité lue par l'IA", aiH: "À qui s'adresse cette étude (lu par l'IA)", regText: "Texte du registre",
  aiStage: "Stade :", aiPrior: "Traitement antérieur :", aiBrain: "Métastases cérébrales :", aiEcog: "Niveau d'activité :",
  bio: { positive: "doit être positif", negative: "doit être négatif", low: "doit être faible", mutation: "une mutation est exigée", "no-mutation": "ne doit pas avoir cette mutation", high: "doit être élevé", other: "" },
  prior: { none: "aucun traitement antérieur pour ce cancer (ou ce stade)", required: "un traitement antérieur précis est exigé", allowed: "un traitement antérieur est permis" },
  brain: { allowed: "permises", "treated-only": "permises seulement si traitées ou stables", excluded: "non permises", required: "l'étude vise les personnes ayant des métastases cérébrales" },
  ecog: n => `ECOG ${n === 0 ? "0 (pleinement actif)" : `0 à ${n}`}${n === 1 ? " : capable d'activités légères" : n === 2 ? " : debout plus de la moitié de la journée" : n >= 3 ? " : activité limitée acceptée" : ""}`,
  aiNote: "Lu automatiquement par l'IA à partir du texte du registre (en anglais), chaque point étant vérifié par rapport au passage cité. Des erreurs restent possibles. Les critères complets ci-dessous et l'équipe de l'étude font foi.",
  details: "Détails, sites et admissibilité", hide: "Masquer les détails", save: "Ajouter à ma liste", saved: "Ajoutée", loadingD: "Chargement des détails…",
  summaryH: "À propos de cette étude", fromReg: "Selon le registre, dans les mots du promoteur (en anglais) :", treatments: "Ce qui est étudié",
  allSites: "Sites " + COUNTRY.inName[1], siteContact: "Contact du site", noContact: "Aucun contact de site. Contact de l'étude :", noContact2: "Aucun contact indiqué. Consultez la fiche du registre.",
  openMap: "Carte", allN: n => `Afficher les ${n} sites`, copy: "Copier", copied: "Copié", eligH: "Qui peut participer (critères complets du registre, en anglais)",
  registry: "Fiche complète sur ClinicalTrials.gov", recUpd: "Dernière mise à jour de la fiche", started: "Début", sponsor: "Promoteur",
  flagStale: "Statut incertain", flagPcd: d => `La date d'achèvement prévue (${d}) est passée, mais la fiche indique encore que l'étude est ouverte.`, flagOld: "La fiche n'a pas été mise à jour depuis plus de 12 mois.",
  flagSoon: "Pas encore ouverte", flagSoonP: "Aucun site de cette région ne recrute encore. Demandez à l'équipe de l'étude quand il ouvrira.",
  flagClosed: "Aucun site ouvert dans cette région", flagClosedP: "L'étude est ouverte, mais ses sites de cette région ne recrutent pas actuellement.",
  confirm: "Confirmez le statut actuel auprès de l'équipe de l'étude avant d'agir.",
  myList: n => `Ma liste (${n})`, sumH: "Résumé pour votre oncologue", sumP: "Copiez-le dans un courriel ou une application de notes, ou montrez-le à votre rendez-vous.",
  sumEmpty: "Ajoutez des études avec « Ajouter à ma liste » pour les voir ici.", copySum: "Copier le résumé", back: "Retour aux résultats", startOver: "Recommencer",
  fTerms: "Conditions d'utilisation", fPriv: "Confidentialité", fData: "Sources des données", legalBack: "Retour",
  foot: () => `Exploité par ${ORG.name}. Non affilié à ClinicalTrials.gov, à la National Library of Medicine des États-Unis, ni à aucun hôpital ou promoteur mentionné, et non approuvé par eux.`,
  trEn: "Les détails des études (titres, résumés, critères, noms de sites) sont affichés en anglais, comme dans le registre.", km: d => `${Math.round(toUnit(d))} ${UNIT}`, kmAway: d => `à ${Math.round(toUnit(d))} ${UNIT}`
}};

/* area and country wording */
for (const [i, lg] of [[0, "en"], [1, "fr"]]) {
  const x = T[lg];
  x.sub = `${COUNTRY.name[i]} · ${A.short[i]} · ${i ? "Bêta" : "Beta"}`;
  x.band = (n, d) => i ? `Bêta. Ne constitue pas un avis médical. Présente les ${n} ${A.studies[1]} ayant des sites ${COUNTRY.inName[1]} sur ClinicalTrials.gov, mises à jour chaque jour (dernière mise à jour : ${d}).`
                       : `Beta. Not medical advice. Lists all ${n} ${A.studies[0]} with sites ${COUNTRY.inName[0]} on ClinicalTrials.gov, updated daily (last update ${d}).`;
  x.h1 = A.h1(COUNTRY.inName)[i]; x.lede = A.lede[i];
  x.b3 = (i ? "Les détails proviennent de ClinicalTrials.gov et peuvent être dépassés. " : "Study details come from ClinicalTrials.gov and can be out of date. ") + A.tagNote[i];
  x.cat = A.catLabel[i]; x.catAny = A.catAny[i]; x.prov = COUNTRY.region[i]; x.provAny = COUNTRY.regionAny[i];
  x.brand = A.brand[i];
}

/* ---------- state ---------- */
const S = { lang: "en", view: "gate", consent: false, legal: "terms", prev: "gate", sort: "best", shown: 20, city: null,
  saved: new Set(), open: new Set(), showHidden: false,
  f: { cat: "", many: A.many, prov: "", near: "", lat: null, lon: null, loc: false, dist: "100", age: "", sex: "", spread: "", stage: "", kinds: { treat: true, diag: true, support: true, obs: true }, closed: false } };
let ROWS = [], META = null, EIDX = {}, ELIG = new Map(), CITIES = new Map(), PROVS = [], DETAIL = new Map(), LIVE = null;
const t = k => T[S.lang][k];
const LG = pair => pair[S.lang === "fr" ? 1 : 0];
const provName = p => S.lang === "fr" ? (PROV_FR[p] || p) : p;
const fmtDate = d => { if (!d) return ""; const x = new Date((d.length === 7 ? d + "-01" : d) + "T12:00:00");
  return x.toLocaleDateString(COUNTRY.locale[S.lang === "fr" ? 1 : 0], d.length === 7 ? { year: "numeric", month: "long" } : { year: "numeric", month: "short", day: "numeric" }); };
const cityKey = (c, p) => (c || "").trim().toLowerCase() + "|" + (p || "");

/* ---------- data ---------- */
async function load() {
  try {
    const [idx, meta] = await Promise.all([fetch(DATA + "index.json").then(r => { if (!r.ok) throw 0; return r.json(); }),
                                            fetch(DATA + "meta.json").then(r => r.ok ? r.json() : null)]);
    ROWS = idx.rows; META = meta;
    for (const r of ROWS) { r.x = r.x || []; r.s = r.s.map(([fi, ci, st]) => { const c = idx.cities[ci]; return [idx.fac[fi], c[0], c[1], st, c[2], c[3]]; }); }
    try { EIDX = await fetch(ROOTDATA + "e/_index.json").then(r => r.ok ? r.json() : {}); } catch (e) { EIDX = {}; }
    for (const r of ROWS) { const x = EIDX[r.id]; r.ai = x && x.u === r.upd ? x : null; }
    const acc = new Map();
    for (const r of ROWS) for (const s of r.s) {
      if (s[4] == null) continue;
      const k = cityKey(s[1], s[2]); let c = acc.get(k);
      if (!c) acc.set(k, c = { k, name: s[1], prov: s[2], lat: 0, lon: 0, n: 0, ids: new Set() });
      c.lat += s[4]; c.lon += s[5]; c.n++; c.ids.add(r.id);
    }
    for (const c of acc.values()) { c.lat /= c.n; c.lon /= c.n; c.studies = c.ids.size; }
    CITIES = acc;
    PROVS = [...new Set(ROWS.flatMap(r => r.s.map(s => s[2])).filter(Boolean))].sort();
  } catch (e) {
    console.error(e);
    $("app").innerHTML = `<section class="panel"><div class="flag bad"><b>!</b><span>${esc(t("loadErr"))}</span></div></section>`;
    return;
  }
  render();
}

/* ---------- matching ---------- */
function areaSites(r) {
  const f = S.f;
  let sites = r.s.map((s, i) => ({ s, i, d: null }));
  if (S.city) sites = sites.filter(x => cityKey(x.s[1], x.s[2]) === S.city);
  else if (f.lat != null && f.dist !== "any") {
    const lim = fromUnit(+f.dist);
    sites = sites.filter(x => x.s[4] != null && (x.d = km(f.lat, f.lon, x.s[4], x.s[5])) <= lim);
  } else if (f.prov) sites = sites.filter(x => x.s[2] === f.prov);
  if (f.lat != null) for (const x of sites) if (x.d == null && x.s[4] != null) x.d = km(f.lat, f.lon, x.s[4], x.s[5]);
  return sites;
}
function evaluate(r) {
  const f = S.f;
  if (f.cat) {
    const many = f.many && r.c.some(c => c === "general" || (c === "solid" && !BLOOD.has(f.cat)));
    if (!r.c.includes(f.cat) && !many) return null;
  }
  if (!f.kinds[r.k]) return null;
  const age = f.age === "" ? null : +f.age;
  if (age != null && ((r.a0 != null && age < r.a0) || (r.a1 != null && age > r.a1))) return null;
  if (f.sex === "F" && r.sx === "M") return null;
  if (f.sex === "M" && r.sx === "F") return null;
  const sites = areaSites(r);
  const open = sites.filter(x => OPEN(x.s[3]));
  if (!(f.closed ? sites.length : open.length)) return null;
  let hiddenBySpread = false;
  const ext = r.ai && r.ai.x !== "unclear" ? (r.ai.x === "both" ? ["early", "advanced"] : [r.ai.x]) : r.x;
  if (f.spread === "early" && ext.length === 1 && ext[0] === "advanced") hiddenBySpread = true;
  if (f.spread === "advanced" && ext.length === 1 && ext[0] === "early") hiddenBySpread = true;
  if (f.stage && r.ai && r.ai.s.length && !r.ai.s.some(x => stageFits(x, f.stage))) hiddenBySpread = true;
  const rec = open.filter(x => x.s[3] === "R");
  const best = [...(rec.length ? rec : open.length ? open : sites)].sort((a, b) => (a.d ?? 0) - (b.d ?? 0))[0];
  const flags = [];
  if (r.pcd) { const p = new Date((r.pcd.length === 7 ? r.pcd + "-28" : r.pcd) + "T12:00:00"); if (p < today) flags.push(t("flagPcd")(fmtDate(r.pcd))); }
  if (r.upd && (today - new Date(r.upd + "T12:00:00")) / 864e5 > 365) flags.push(t("flagOld"));
  const area = S.city || f.lat != null || f.prov;
  return { r, sites, open, rec, best, flags, hiddenBySpread, area, cat: f.cat && !r.c.includes(f.cat) ? "many" : "" };
}
/* A trial stage x fits a person's stage u when they are the same, when x is the main stage of u
   (trial "II", person "IIA"), or when the person gave only the main stage and x is one of its substages
   (person "II", trial "IIB": it may fit, so the study is not hidden). */
const mainStage = v => v === "0" ? "0" : v.replace(/[ABC]$/, "");
function stageFits(x, u) { return x === u || x === mainStage(u) || (mainStage(x) === u && u !== x); }
function rankKey(e) {
  const ph = /3/.test(e.r.ph) ? 3 : /2/.test(e.r.ph) ? 2 : /1/.test(e.r.ph) ? 1 : 0;
  if (S.sort === "near") return [e.rec.length ? 0 : 1, e.best?.d ?? 0, KIND_ORDER[e.r.k]];
  if (S.sort === "new") return [-(new Date(e.r.upd || 0).getTime())];
  return [KIND_ORDER[e.r.k], e.cat ? 1 : 0, e.rec.length ? 0 : 1, Math.round((e.best?.d ?? 0) / 25), -ph];
}
const cmp = (a, b) => { const x = rankKey(a), y = rankKey(b); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
function results() {
  const all = ROWS.map(evaluate).filter(Boolean);
  const hidden = all.filter(e => e.hiddenBySpread);
  const shown = (S.showHidden ? all : all.filter(e => !e.hiddenBySpread)).sort(cmp);
  return { shown, hidden: S.showHidden ? [] : hidden };
}

/* ---------- render ---------- */
const app = $("app");
function render(keepScroll) {
  document.documentElement.lang = S.lang;
  $("brandName").textContent = t("brand"); document.title = t("brand"); $("brandSub").textContent = t("sub");
  $("langGroup").hidden = COUNTRY.langs.length < 2; if (COUNTRY.langs.length < 2) S.lang = "en"; $("demoPill").textContent = t("pill");
  $("demoBand").textContent = META ? t("band")(META.studies, fmtDate(META.built.slice(0, 10))) : t("loading");
  $("f-terms").textContent = t("fTerms"); $("f-privacy").textContent = t("fPriv"); $("f-data").textContent = t("fData");
  $("footNote").textContent = t("foot")();
  $("lang-en").setAttribute("aria-pressed", S.lang === "en"); $("lang-fr").setAttribute("aria-pressed", S.lang === "fr");
  dropMap();
  if (!ROWS.length && S.view !== "legal") { app.innerHTML = `<section class="panel"><p class="lede">${esc(t("loading"))}</p></section>`; return; }
  ({ gate: vGate, results: vResults, summary: vSummary, legal: vLegal })[S.view]();
  if (!keepScroll) window.scrollTo({ top: 0 });
}

function formHTML(compact) {
  const f = S.f, cats = Object.keys(CAT).filter(k => !MANY.has(k));
  const counts = {}; for (const r of ROWS) for (const c of r.c) counts[c] = (counts[c] || 0) + 1;
  const catOpts = cats.map(k => [k, LG(CAT[k])]).sort((a, b) => a[1].localeCompare(b[1], S.lang))
    .map(([k, l]) => `<option value="${k}" ${f.cat === k ? "selected" : ""}>${esc(l)} (${counts[k] || 0})</option>`).join("");
  const dists = [...COUNTRY.dists.map(String), "any"];
  const cityList = [...CITIES.values()].sort((a, b) => b.studies - a.studies).map(c => `<option value="${esc(c.name)}, ${esc(provName(c.prov))}">`).join("");
  return `<form id="sform" class="sform${compact ? " compact" : ""}" novalidate>
   <fieldset class="grp"><legend>${esc(t("cat"))}</legend>
    <label class="sr" for="f-cat">${esc(t("cat"))}</label>
    <select id="f-cat"><option value="">${esc(t("catAny"))}</option>${catOpts}</select>
    ${A.many ? `<label class="chk" for="f-many"><input type="checkbox" id="f-many" ${f.many ? "checked" : ""}> ${esc(t("many"))}</label>` : ""}</fieldset>
   <fieldset class="grp"><legend>${esc(t("where"))}</legend>
    <div class="two"><div><label for="f-near">${esc(t("near"))}</label>
      <input id="f-near" list="f-cities" autocomplete="off" placeholder="${esc(t("nearPh"))}" value="${esc(f.loc ? t("locOn") : f.near)}"><datalist id="f-cities">${cityList}</datalist></div>
     <div><label for="f-dist">${esc(t("dist"))}</label><select id="f-dist">${dists.map(d => `<option value="${d}" ${f.dist === d ? "selected" : ""}>${d === "any" ? esc(t("distAny")) : d + " " + UNIT}</option>`).join("")}</select></div></div>
    <button type="button" class="linkish" id="f-loc">${esc(t("useLoc"))}</button> <span class="help" id="locMsg" role="status"></span>
    <label for="f-prov">${esc(t("prov"))}</label>
    <select id="f-prov" ${f.lat != null ? "disabled" : ""}><option value="">${esc(t("provAny"))}</option>${PROVS.map(p => `<option value="${esc(p)}" ${f.prov === p ? "selected" : ""}>${esc(provName(p))}</option>`).join("")}</select></fieldset>
   <fieldset class="grp"><legend>${esc(t("about"))}</legend>
    <div class="three"><div><label for="f-age">${esc(t("age"))}</label><input id="f-age" type="number" min="0" max="120" inputmode="numeric" value="${esc(f.age)}"></div>
     <div><label for="f-sex">${esc(t("sex"))}</label><select id="f-sex"><option value="">${esc(t("sexAny"))}</option><option value="F" ${f.sex === "F" ? "selected" : ""}>${esc(t("female"))}</option><option value="M" ${f.sex === "M" ? "selected" : ""}>${esc(t("male"))}</option></select></div>
     ${A.stage ? `<div><label for="f-stage">${esc(t("stage"))}</label><select id="f-stage"><option value="">${esc(t("stageAny"))}</option>${["0", "I", "IA", "IB", "II", "IIA", "IIB", "III", "IIIA", "IIIB", "IIIC", "IV"].map(x => `<option value="${x}" ${f.stage === x ? "selected" : ""}>${esc(t("stageN")(x))}</option>`).join("")}</select></div>
     <div><label for="f-spread">${esc(t("spread"))}</label><select id="f-spread"><option value="">${esc(t("spreadAny"))}</option><option value="early" ${f.spread === "early" ? "selected" : ""}>${esc(t("early"))}</option><option value="advanced" ${f.spread === "advanced" ? "selected" : ""}>${esc(t("advanced"))}</option></select></div>` : ""}</div></fieldset>
   <fieldset class="grp"><legend>${esc(t("types"))}</legend><div class="chips">
    ${Object.keys(KIND).map(k => `<label class="chk" for="f-k-${k}"><input type="checkbox" id="f-k-${k}" ${f.kinds[k] ? "checked" : ""}> ${esc(LG(KIND[k]))}</label>`).join("")}</div>
    <label class="chk" for="f-closed"><input type="checkbox" id="f-closed" ${f.closed ? "checked" : ""}> ${esc(t("closed"))}</label></fieldset>
   ${compact ? "" : `<div class="row"><button class="btn" type="submit" id="f-go" ${S.consent ? "" : "disabled"}>${esc(t("search"))}</button><button class="btn ghost" type="button" id="f-browse" ${S.consent ? "" : "disabled"}>${esc(t("browse"))}</button></div>`}
  </form>`;
}
function readForm() {
  const f = S.f;
  f.cat = $("f-cat").value; f.many = A.many && !!$("f-many")?.checked; f.dist = $("f-dist").value;
  f.age = $("f-age").value; f.sex = $("f-sex").value; f.spread = $("f-spread")?.value || ""; f.stage = $("f-stage")?.value || ""; f.closed = $("f-closed").checked;
  for (const k of Object.keys(KIND)) f.kinds[k] = $("f-k-" + k).checked;
  const near = $("f-near").value.trim();
  if (f.loc && near === t("locOn")) { /* keep device location */ }
  else {
    f.loc = false; f.near = near;
    const c = findCity(near);
    if (c) { f.lat = c.lat; f.lon = c.lon; } else { f.lat = null; f.lon = null; }
  }
  f.prov = f.lat != null ? "" : $("f-prov").value;
}
function findCity(q) {
  if (!q) return null;
  const name = q.split(",")[0].trim().toLowerCase();
  let best = null;
  for (const c of CITIES.values()) if (c.name.toLowerCase() === name && (!best || c.studies > best.studies)) best = c;
  return best;
}
function bindForm(live) {
  const form = $("sform");
  const apply = () => { readForm(); S.shown = 20; S.city = null; if (live) renderResultsBody(); $("f-prov").disabled = S.f.lat != null; };
  form.addEventListener("change", apply);
  $("f-near").addEventListener("input", () => { const c = findCity($("f-near").value); if (c || !$("f-near").value) apply(); });
  $("f-loc").onclick = () => {
    const msg = $("locMsg");
    if (!navigator.geolocation) { msg.textContent = t("locErr"); return; }
    navigator.geolocation.getCurrentPosition(p => {
      Object.assign(S.f, { loc: true, lat: p.coords.latitude, lon: p.coords.longitude, prov: "", near: "" });
      $("f-near").value = t("locOn"); $("f-prov").value = ""; $("f-prov").disabled = true; msg.textContent = "";
      if (live) { S.shown = 20; S.city = null; renderResultsBody(); }
    }, () => { msg.textContent = t("locErr"); }, { timeout: 10000, maximumAge: 600000 });
  };
  form.addEventListener("submit", ev => { ev.preventDefault(); if (!S.consent) return; readForm(); S.shown = 20; S.city = null; S.view = "results"; render(); });
  const br = $("f-browse");
  if (br) br.onclick = () => { if (!S.consent) return;
    Object.assign(S.f, { cat: "", prov: "", near: "", lat: null, lon: null, loc: false, age: "", sex: "", spread: "", stage: "", closed: false });
    for (const k of Object.keys(KIND)) S.f.kinds[k] = true; S.shown = 20; S.city = null; S.view = "results"; render(); };
}

function vGate() {
  app.innerHTML = `<section class="panel">
    <h1>${esc(t("h1"))}</h1><p class="lede">${esc(t("lede"))}</p>
    <p class="eyebrow">${esc(t("before"))}</p>
    <ul class="plain"><li>${esc(t("b1"))}</li><li>${esc(t("b2"))}</li><li>${esc(t("b3"))}</li><li>${esc(t("b4"))}</li><li><b>${esc(t("b5"))}</b></li></ul>
    <label class="consent" for="consent"><input type="checkbox" id="consent" ${S.consent ? "checked" : ""}><span>${esc(t("consent"))} <button class="linkish" type="button" id="readTerms">${esc(t("readTerms"))}</button></span></label>
   </section>
   <section class="panel"><h2>${esc(t("searchH"))}</h2>${formHTML(false)}</section>
   ${mapPanel(ROWS.map(r => ({ r, sites: r.s.map((s, i) => ({ s, i })), open: r.s.filter(s => OPEN(s[3])) })), true)}`;
  $("consent").onchange = e => { S.consent = e.target.checked; $("f-go").disabled = !S.consent; $("f-browse").disabled = !S.consent; };
  $("readTerms").onclick = () => openLegal("terms");
  bindForm(false); bindMap(true); startLiveMap();
}

function vResults() {
  app.innerHTML = `<section class="panel"><details id="refine" ${S.refineOpen ? "open" : ""}><summary>${esc(t("refine"))}</summary>${formHTML(true)}</details>
    <div class="row" style="justify-content:space-between"><div class="row"><button class="btn ghost small" id="myList">${esc(t("myList")(S.saved.size))}</button>
     <button class="linkish" id="overBtn">${esc(t("startOver"))}</button></div>
     <div class="row"><label for="sortSel" class="help">${esc(t("sort"))}</label><select id="sortSel"><option value="best">${esc(t("sBest"))}</option><option value="near" ${S.f.lat == null ? "disabled" : ""}>${esc(t("sNear"))}</option><option value="new">${esc(t("sNew"))}</option></select></div></div>
    ${t("trEn") ? `<p class="help">${esc(t("trEn"))}</p>` : ""}</section>
    <div id="resBody"></div>`;
  $("refine").addEventListener("toggle", e => S.refineOpen = e.target.open);
  $("sortSel").value = S.sort; $("sortSel").onchange = e => { S.sort = e.target.value; S.shown = 20; renderResultsBody(); };
  $("myList").onclick = () => { S.view = "summary"; render(); };
  $("overBtn").onclick = () => { S.view = "gate"; S.city = null; render(); };
  bindForm(true); renderResultsBody();
}
function renderResultsBody() {
  dropMap();
  const { shown, hidden } = results();
  const body = $("resBody");
  const cityName = S.city ? (CITIES.get(S.city)?.name || "") : "";
  const list = shown.slice(0, S.shown);
  body.innerHTML = `<section class="panel"><h2>${esc(t("results")(shown.length))}</h2>
      ${hidden.length ? `<div class="flag info"><span>${esc(t("hidSpread")(hidden.length))} <button class="linkish" id="showHid">${esc(t("showThem"))}</button></span></div>` : ""}
      ${S.city ? `<div class="flag info"><span>${esc(t("atCity")(cityName))} <button class="linkish" id="clearCity">${esc(t("clearCity"))}</button></span></div>` : ""}
      ${shown.length ? "" : `<p>${esc(t("none"))}</p>`}</section>
    ${shown.length && !S.city ? mapPanel(shown, false) : ""}
    <section class="trials">${list.map(card).join("")}</section>
    ${shown.length > S.shown ? `<div class="row" style="justify-content:center"><button class="btn ghost" id="moreBtn">${esc(t("more")(Math.min(20, shown.length - S.shown)))}</button></div>` : ""}`;
  const sh = $("showHid"); if (sh) sh.onclick = () => { S.showHidden = true; renderResultsBody(); };
  const cc = $("clearCity"); if (cc) cc.onclick = () => { S.city = null; S.shown = 20; renderResultsBody(); };
  const mb = $("moreBtn"); if (mb) mb.onclick = () => { S.shown += 20; renderResultsBody(); };
  bindCards(); bindMap(false); startLiveMap();
}

/* ---------- trial card ---------- */
function statusBadge(code) { const s = SITE[code] || SITE.STOP; return `<span class="badge ${s[2]}">${esc(S.lang === "fr" ? s[1] : s[0])}</span>`; }
function card(e) {
  const r = e.r, b = e.best;
  const tags = [`<span class="tag ${r.k === "treat" ? "" : "other"}">${esc(LG(KIND[r.k]))}</span>`];
  if (r.ph) tags.push(`<span class="tag other">${esc((S.lang === "fr" ? "Phase " : "Phase ") + r.ph)}</span>`);
  const cats = r.c.map(c => CAT[c] ? LG(CAT[c]) : c).join(" · ");
  const flags = [];
  if (!e.rec.length && e.open.length) flags.push(`<div class="flag soon"><b>${esc(t("flagSoon"))}.</b><span>${esc(t("flagSoonP"))}</span></div>`);
  else if (!e.open.length) flags.push(`<div class="flag stop"><b>${esc(t("flagClosed"))}.</b><span>${esc(t("flagClosedP"))}</span></div>`);
  if (e.flags.length) flags.push(`<div class="flag"><b>${esc(t("flagStale"))}.</b><span>${esc(e.flags.join(" "))} ${esc(t("confirm"))}</span></div>`);
  const elig = [t("ageRange")(r.a0 != null ? Math.round(r.a0) : null, r.a1 != null ? Math.round(r.a1) : null)];
  if (t("sexOnly")[r.sx]) elig.push(t("sexOnly")[r.sx]);
  if (r.hv) elig.push(t("healthy"));
  const aiExt = r.ai && r.ai.x !== "unclear" ? (r.ai.x === "both" ? ["early", "advanced"] : [r.ai.x]) : null;
  const ext = aiExt ? `${aiExt.map(x => t("extent")[x]).join(" / ")}${r.ai.s.length ? " · " + esc(t("stagesL")(r.ai.s)) : ""} <small>(${esc(t("aiRead"))})</small>`
            : r.x.length ? `${r.x.map(x => t("extent")[x]).join(" / ")} <small>(${esc(t("auto"))})</small>` : "";
  const nRec = r.s.filter(s => s[3] === "R").length;
  const open = S.open.has(r.id), saved = S.saved.has(r.id);
  return `<article class="trial" id="c-${r.id}">
    <div class="meta">${tags.join("")}${r.ai ? `<span class="tag ai">${esc(t("aiBadge"))}</span>` : ""}<span class="nct">${r.id}</span></div>
    <h3>${esc(r.t)}${r.ac ? ` <span class="acr">(${esc(r.ac)})</span>` : ""}</h3>
    <p class="cats">${esc(cats)}</p>
    ${b ? `<div class="nearest">${statusBadge(b.s[3])}<span><b>${esc(b.s[0])}</b>, ${esc(b.s[1])}${b.s[2] ? ", " + esc(provName(b.s[2])) : ""}${b.d != null ? ` · ${esc(t("kmAway")(b.d))}` : ""}</span></div>` : ""}
    <p class="help">${esc(t("sitesCa")(r.s.length, nRec))}</p>
    <p class="elig">${esc(elig.join(" · "))}${ext ? " · " + ext : ""}</p>
    ${flags.join("")}
    <div class="row"><button class="btn ghost small" data-open="${r.id}" aria-expanded="${open}">${esc(open ? t("hide") : t("details"))}</button>
      <button class="btn ${saved ? "" : "ghost "}small" data-save="${r.id}" aria-pressed="${saved}">${esc(saved ? t("saved") : t("save"))}</button></div>
    <div class="detail" id="d-${r.id}" ${open ? "" : "hidden"}>${open ? detailHTML(r.id, e) : ""}</div>
  </article>`;
}
function bindCards() {
  app.querySelectorAll("[data-open]").forEach(b => b.onclick = async () => {
    const id = b.dataset.open, box = $("d-" + id);
    if (S.open.has(id)) { S.open.delete(id); box.hidden = true; box.innerHTML = ""; b.textContent = t("details"); b.setAttribute("aria-expanded", "false"); return; }
    S.open.add(id); box.hidden = false; b.textContent = t("hide"); b.setAttribute("aria-expanded", "true");
    box.innerHTML = `<p class="help">${esc(t("loadingD"))}</p>`;
    const row = ROWS.find(r => r.id === id);
    await Promise.all([getDetail(id), row && row.ai ? getElig(id) : null]);
    const e = evaluate(row) || { sites: [] };
    box.innerHTML = detailHTML(id, e); bindCopy(box);
  });
  app.querySelectorAll("[data-save]").forEach(b => b.onclick = () => {
    const id = b.dataset.save; S.saved.has(id) ? S.saved.delete(id) : S.saved.add(id);
    const on = S.saved.has(id); b.textContent = on ? t("saved") : t("save"); b.setAttribute("aria-pressed", on); b.classList.toggle("ghost", !on);
    const ml = $("myList"); if (ml) ml.textContent = t("myList")(S.saved.size);
  });
  app.querySelectorAll(".detail:not([hidden])").forEach(bindCopy);
}
async function getElig(id) {
  if (ELIG.has(id)) return ELIG.get(id);
  try { const d = await fetch(ROOTDATA + "e/" + id + ".json").then(r => r.json()); ELIG.set(id, d); return d; } catch (e) { return null; }
}
function aiHTML(id) {
  const a = ELIG.get(id); if (!a) return "";
  const q = x => x ? `<details class="q"><summary>${esc(t("regText"))}</summary><q lang="en">${esc(x)}</q></details>` : "";
  const items = [];
  if (a.extent !== "unclear" || a.stages.length) items.push(`<li><b>${esc(t("aiStage"))}</b> ${esc([a.extent !== "unclear" ? (a.extent === "both" ? t("extent").early + " / " + t("extent").advanced : t("extent")[a.extent]) : "", a.stages.length ? t("stagesL")(a.stages) : ""].filter(Boolean).join(" · "))}${q(a.stagesQuote || a.extentQuote)}</li>`);
  for (const b of a.biomarkers) items.push(`<li><b>${esc(b.name)}</b> ${esc(t("bio")[b.need] || "")}${b.detail ? ` <span lang="en">${t("bio")[b.need] ? "– " : ""}${esc(b.detail)}</span>` : ""}${q(b.quote)}</li>`);
  if (a.priorTreatment.need !== "unclear") items.push(`<li><b>${esc(t("aiPrior"))}</b> ${esc(t("prior")[a.priorTreatment.need])}${a.priorTreatment.detail ? ` <span lang="en">– ${esc(a.priorTreatment.detail)}</span>` : ""}${q(a.priorTreatment.quote)}</li>`);
  if (a.brainMets.need !== "unclear") items.push(`<li><b>${esc(t("aiBrain"))}</b> ${esc(t("brain")[a.brainMets.need])}${q(a.brainMets.quote)}</li>`);
  if (a.ecogMax != null) items.push(`<li><b>${esc(t("aiEcog"))}</b> ${esc(t("ecog")(a.ecogMax))}${q(a.ecogQuote)}</li>`);
  for (const o of a.other) items.push(`<li><span lang="en">${esc(o.text)}</span>${q(o.quote)}</li>`);
  return `<div class="dsec ai"><p class="eyebrow">${esc(t("aiH"))}</p>${a.who ? `<p lang="en">${esc(a.who)}</p>` : ""}
    ${items.length ? `<ul class="facts ailist">${items.join("")}</ul>` : ""}<p class="help">${esc(t("aiNote"))}</p></div>`;
}
async function getDetail(id) {
  if (DETAIL.has(id)) return DETAIL.get(id);
  try { const d = await fetch(ROOTDATA + "t/" + id + ".json").then(r => r.json()); DETAIL.set(id, d); return d; } catch (e) { return null; }
}
const mapsURL = (f, c, p) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent([f, c, p, COUNTRY.mapName].filter(Boolean).join(", "));
function critHTML(text) {
  const lines = String(text || "").split(/\n/);
  let html = "", inList = false;
  for (let ln of lines) {
    const raw = ln.trim(); if (!raw) continue;
    const head = /^(inclusion|exclusion|key inclusion|key exclusion)[^:]*:?$/i.test(raw.replace(/\*+/g, "").trim());
    const item = /^([*\-•]|\d+[.)])\s+/.test(raw);
    const txt = esc(raw.replace(/^([*\-•]|\d+[.)])\s+/, "").replace(/\\([\[\]<>*_])/g, "$1"));
    if (head) { if (inList) { html += "</ul>"; inList = false; } html += `<h4>${txt}</h4>`; }
    else if (item) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${txt}</li>`; }
    else { if (inList) { html += "</ul>"; inList = false; } html += `<p>${txt}</p>`; }
  }
  return html + (inList ? "</ul>" : "");
}
function detailHTML(id, e) {
  const d = DETAIL.get(id);
  if (!d) return `<p class="help">${esc(t("loadErr"))}</p>`;
  const inArea = new Set((e.sites || []).map(x => x.i));
  const order = { R: 0, NYR: 1, INV: 2, ANR: 3, SUS: 4, STOP: 5 };
  const sites = d.sites.map((s, i) => ({ s, i, dist: S.f.lat != null && s.lat != null ? km(S.f.lat, S.f.lon, s.lat, s.lon) : null }))
    .sort((a, b) => (inArea.has(b.i) - inArea.has(a.i)) || ((order[a.s.s] ?? 9) - (order[b.s.s] ?? 9)) || ((a.dist ?? 0) - (b.dist ?? 0)));
  const central = (d.central || []).filter(Boolean);
  const siteHTML = x => { const s = x.s; const c = OPEN(s.s) ? (s.c || "") : ""; const showCentral = OPEN(s.s) && central.length;
    return `<div class="site"><div class="site-h">${statusBadge(s.s)}<b>${esc(s.f)}</b></div>
      <small>${esc([s.city, provName(s.pr), s.zip].filter(Boolean).join(", "))}${x.dist != null ? " · " + esc(t("km")(x.dist)) : ""}</small>
      ${c ? `<small>${esc(t("siteContact"))}</small><code>${esc(c)}</code>` : showCentral ? `<small>${esc(t("noContact"))}</small><code>${esc(central[0])}</code>` : OPEN(s.s) ? `<small>${esc(t("noContact2"))}</small>` : ""}
      <div class="row">${c || showCentral ? `<button class="btn ghost small" data-copy="${esc(c || central[0])}">${esc(t("copy"))}</button>` : ""}<a href="${mapsURL(s.f, s.city, s.pr)}" target="_blank" rel="noopener">${esc(t("openMap"))}</a></div></div>`; };
  const iv = (d.interventions || []).map(i => `${esc(i.name)}${i.type ? ` <small>(${esc(i.type.toLowerCase().replace(/_/g, " "))})</small>` : ""}`);
  return `${aiHTML(id)}<div class="dsec"><p class="eyebrow">${esc(t("summaryH"))}</p><p class="help">${esc(t("fromReg"))}</p><p class="regsum" lang="en">${esc(d.summary).replace(/\n+/g, "<br>")}</p>
     ${iv.length ? `<p class="eyebrow">${esc(t("treatments"))}</p><ul class="facts">${iv.map(x => `<li lang="en">${x}</li>`).join("")}</ul>` : ""}</div>
    <div class="dsec"><p class="eyebrow">${esc(t("allSites"))} (${d.sites.length})</p><div class="sites">${sites.slice(0, 6).map(siteHTML).join("")}</div>
      ${sites.length > 6 ? `<details class="moresites"><summary>${esc(t("allN")(sites.length))}</summary><div class="sites">${sites.slice(6).map(siteHTML).join("")}</div></details>` : ""}</div>
    <details class="dsec"><summary>${esc(t("eligH"))}</summary><div class="crit" lang="en">${critHTML(d.criteria)}</div></details>
    <p class="dates">${esc(t("sponsor"))}: ${esc(d.sponsor)} · ${esc(t("started"))}: ${esc(fmtDate(d.start))} · ${esc(t("recUpd"))}: ${esc(fmtDate(d.upd))}</p>
    <p><a href="https://clinicaltrials.gov/study/${esc(id)}" target="_blank" rel="noopener">${esc(t("registry"))}</a></p>`;
}
function bindCopy(root) {
  root.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => {
    const code = b.closest(".site").querySelector("code"), orig = b.textContent;
    const sel = () => { try { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } catch (e) {} };
    try { navigator.clipboard.writeText(b.dataset.copy).then(() => { b.textContent = t("copied"); setTimeout(() => b.textContent = orig, 1500); }, sel); } catch (e) { sel(); }
  });
}

/* ---------- map ---------- */
let PENDING = null;
function dropMap() { if (!LIVE) return; const m = LIVE; LIVE = null; try { m.stop(); m.off(); m.remove(); } catch (e) {} }
function cityStats(list) {
  const acc = new Map();
  for (const e of list) {
    const seen = new Set();
    for (const x of e.sites) {
      const s = x.s; if (s[4] == null) continue;
      const k = cityKey(s[1], s[2]); const c = CITIES.get(k); if (!c) continue;
      let a = acc.get(k); if (!a) acc.set(k, a = { c, ids: new Set(), lvl: 0 });
      a.ids.add(e.r.id); a.lvl = Math.max(a.lvl, s[3] === "R" ? 2 : s[3] === "NYR" ? 1 : 0); seen.add(k);
    }
  }
  return [...acc.values()].map(a => ({ ...a, n: a.ids.size, cls: ["stop", "soon", "rec"][a.lvl] })).sort((a, b) => b.n - a.n);
}
function mapPanel(list, gate) {
  const st = cityStats(list); PENDING = st;
  const top = st.slice(0, 18);
  return `<section class="panel"><div><h2>${esc(t("mapH"))}</h2><p class="help">${esc(t("mapP"))}</p></div>
    <div class="mapstage" id="mapStage"><p class="help" id="mapFallback">${esc(t("mapNoTiles"))}</p></div>
    <div class="sitelist">${top.map(a => `<button class="sitebtn" data-city="${esc(a.c.k)}"><span class="key ${a.cls}"></span><span class="nm">${esc(a.c.name)}<small>${esc(provName(a.c.prov))}</small></span><span class="n">${a.n}</span></button>`).join("")}</div>
    <div class="legend"><span><i style="background:var(--rec)"></i>${esc(t("lgR"))}</span><span><i style="background:var(--soon)"></i>${esc(t("lgS"))}</span><span><i style="background:var(--stop);box-shadow:inset 0 0 0 1px var(--stop-edge)"></i>${esc(t("lgX"))}</span></div>
    <p class="help" id="mapHint" hidden>${esc(gate ? "" : "")}</p></section>`;
}
function pickCity(k, gate) {
  if (gate) {
    if (!S.consent) { const c = $("consent"); c.scrollIntoView({ block: "center" }); c.focus(); c.closest(".consent").classList.add("nudge"); return; }
    S.view = "results"; S.city = k; S.shown = 20; render(); return;
  }
  S.city = k; S.shown = 20; renderResultsBody(); $("resBody").scrollIntoView({ block: "start" });
}
function bindMap(gate) { app.querySelectorAll("[data-city]").forEach(b => b.onclick = () => pickCity(b.dataset.city, gate)); MAPGATE = gate; }
let MAPGATE = false;
app.addEventListener("click", ev => { const b = ev.target.closest("[data-city-go]"); if (b) pickCity(b.dataset.cityGo, MAPGATE); });
const isDark = () => { const r = document.documentElement.dataset.theme; return r === "dark" || (r !== "light" && matchMedia("(prefers-color-scheme: dark)").matches); };
function startLiveMap() {
  const stage = $("mapStage"), st = PENDING; PENDING = null;
  if (!stage || !st || !window.L || !st.length) return;
  const box = document.createElement("div"); box.className = "lmap"; stage.appendChild(box);
  let map; try { map = window.L.map(box, { scrollWheelZoom: false }); } catch (e) { box.remove(); return; }
  LIVE = map;
  const mb = !!MAP.mapboxToken;
  const url = mb ? `https://api.mapbox.com/styles/v1/mapbox/${isDark() ? "dark-v11" : "light-v11"}/tiles/512/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(MAP.mapboxToken)}` : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attr = mb ? '© <a href="https://www.mapbox.com/about/maps/" target="_blank" rel="noopener">Mapbox</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> <a href="https://www.mapbox.com/map-feedback/" target="_blank" rel="noopener">Improve this map</a>'
                  : '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
  if (!mb) box.classList.add("osm");
  const layer = window.L.tileLayer(url, mb ? { tileSize: 512, zoomOffset: -1, maxZoom: 18, attribution: attr } : { maxZoom: 19, attribution: attr });
  let loaded = 0, failed = 0, settled = false;
  const giveUp = () => { if (settled || loaded) return; settled = true; try { map.remove(); } catch (e) {} if (LIVE === map) LIVE = null; box.remove(); };
  layer.on("tileload", () => { loaded++; if (!settled) { settled = true; stage.classList.add("live"); setTimeout(() => { if (LIVE !== map) return; map.invalidateSize(); fit(); }, 0); } });
  layer.on("tileerror", () => { failed++; if (failed >= 4 && !loaded) giveUp(); });
  setTimeout(giveUp, 8000);
  layer.addTo(map);
  const pts = [];
  const lvlOf = { stop: 0, soon: 1, rec: 2 };
  const group = window.L.markerClusterGroup ? window.L.markerClusterGroup({ maxClusterRadius: 38, showCoverageOnHover: false, spiderfyOnMaxZoom: true,
    iconCreateFunction: cl => { const ms = cl.getAllChildMarkers(); const u = new Set(); for (const m of ms) for (const id of m.options.ids) u.add(id); const n = u.size;
      const cls = ["stop", "soon", "rec"][Math.max(...ms.map(m => lvlOf[m.options.cls]))]; const sz = Math.round(Math.min(52, 26 + Math.sqrt(n) * 3));
      return window.L.divIcon({ className: "", html: `<span class="lpin cl ${cls}" style="width:${sz}px;height:${sz}px">${n}</span>`, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2] }); } }) : null;
  for (const a of st) {
    const c = a.c; pts.push([c.lat, c.lon]);
    const sz = Math.round(Math.min(46, 22 + Math.sqrt(a.n) * 3));
    const icon = window.L.divIcon({ className: "", html: `<span class="lpin ${a.cls}" style="width:${sz}px;height:${sz}px">${a.n}</span>`, iconSize: [sz, sz], iconAnchor: [sz / 2, sz / 2], popupAnchor: [0, -sz / 2] });
    window.L.marker([c.lat, c.lon], { icon, n: a.n, ids: [...a.ids], cls: a.cls, title: `${c.name}: ${t("studies")(a.n)}`, alt: c.name, riseOnHover: true }).addTo(group || map)
      .bindPopup(`<div class="lpop"><b>${esc(c.name)}</b><small>${esc(provName(c.prov))}</small><span>${esc(t("studies")(a.n))} · ${esc(t({ rec: "lgR", soon: "lgS", stop: "lgX" }[a.cls]))}</span><button class="btn small" data-city-go="${esc(c.k)}">${esc(t("seeHere"))}</button></div>`);
  }
  if (group) map.addLayer(group);
  map.setView(COUNTRY.center, COUNTRY.zoom);
  let touched = false, lw = 0, lh = 0;
  function fit() { if (LIVE !== map) return; const z = map.getSize(); if (z.x < 50 || z.y < 50) return;
    if (S.f.lat != null && !S.city && S.f.dist !== "any") map.fitBounds(window.L.latLng(S.f.lat, S.f.lon).toBounds(fromUnit(+S.f.dist) * 2000), { padding: [20, 20], animate: false });
    else if (pts.length === 1) map.setView(pts[0], 11, { animate: false }); else map.fitBounds(pts, { padding: [30, 30], maxZoom: 11, animate: false }); }
  ["mousedown", "touchstart", "wheel", "keydown"].forEach(ev => box.addEventListener(ev, () => { touched = true; }, { passive: true }));
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => { if (LIVE !== map) { ro.disconnect(); return; } const w = box.clientWidth, h = box.clientHeight; if (w === lw && h === lh) return; lw = w; lh = h; map.invalidateSize(); if (!touched) fit(); }); ro.observe(box); map.on("unload", () => ro.disconnect()); }
  fit();
}

/* ---------- summary ---------- */
function buildSummary() {
  const fr = S.lang === "fr", lines = [];
  const items = [...S.saved].map(id => ROWS.find(r => r.id === id)).filter(Boolean);
  lines.push(fr ? "ESSAIS CLINIQUES À DISCUTER AVEC MON ÉQUIPE SOIGNANTE" : "CLINICAL TRIALS TO DISCUSS WITH MY CARE TEAM");
  lines.push((fr ? "Préparé avec Cancer Trial Finder (bêta, " : "Prepared with Cancer Trial Finder (beta, ") + ORG.name + (fr ? ") le " : ") on ") + fmtDate(new Date().toISOString().slice(0, 10)) + ".");
  lines.push(fr ? `Ceci n'est pas un avis médical. Données de ClinicalTrials.gov au ${fmtDate(META.built.slice(0, 10))}.` : `This is not medical advice. Data from ClinicalTrials.gov as of ${fmtDate(META.built.slice(0, 10))}.`);
  lines.push("");
  items.forEach((r, i) => {
    const e = evaluate(r) || { open: [], best: null, flags: [] };
    lines.push(`${i + 1}. ${r.t} (${r.id}${r.ph ? ", Phase " + r.ph : ""}, ${LG(KIND[r.k])})`);
    const b = e.best || { s: r.s.find(s => OPEN(s[3])) || r.s[0] };
    if (b.s) lines.push(`   ${fr ? "Site" : "Site"}: ${b.s[0]}, ${b.s[1]} – ${SITE[b.s[3]] ? LG([SITE[b.s[3]][0], SITE[b.s[3]][1]]) : ""}`);
    const d = DETAIL.get(r.id); if (d) { const s = d.sites.find(x => x.f === b.s?.[0] && x.city === b.s?.[1]); const c = s?.c || (d.central || [])[0]; if (c) lines.push(`   Contact: ${c}`); }
    if (e.flags?.length) lines.push(`   ${fr ? "Attention" : "Note"}: ${e.flags.join(" ")}`);
    lines.push(`   https://clinicaltrials.gov/study/${r.id}`);
  });
  lines.push("");
  lines.push(fr ? "QUESTIONS POUR MON ONCOLOGUE" : "QUESTIONS FOR MY ONCOLOGIST");
  (fr ? ["Une de ces études est-elle adaptée à ma situation?", (A.stage ? "Mon type et mon stade de cancer correspondent-ils à leurs critères?" : "Ma situation correspond-elle à leurs critères?"), "Participer retarderait-il mon traitement habituel?", "Pouvez-vous me diriger vers l'équipe de l'étude ou un(e) infirmier(ère) de recherche?", "Y a-t-il d'autres études à envisager?"]
      : ["Is any of these studies a good fit for my situation?", (A.stage ? "Do my cancer type and stage match their criteria?" : "Does my condition match their criteria?"), "Would taking part delay my usual treatment?", "Can you refer me to the study team or a research nurse?", "Are there other studies I should consider?"]).forEach(q => lines.push("- " + q));
  return lines.join("\n");
}
async function vSummary() {
  await Promise.all([...S.saved].map(getDetail));
  app.innerHTML = `<section class="panel"><h2>${esc(t("sumH"))}</h2>${S.saved.size ? `<p class="lede">${esc(t("sumP"))}</p>
    <label class="sr" for="sumText">${esc(t("sumH"))}</label><textarea class="sum" id="sumText" readonly>${esc(buildSummary())}</textarea>
    <div class="row"><button class="btn" id="copySum">${esc(t("copySum"))}</button><span class="toast" id="toast" role="status"></span></div>` : `<p>${esc(t("sumEmpty"))}</p>`}
    <div class="row"><button class="btn ghost" id="backRes">${esc(t("back"))}</button></div></section>`;
  $("backRes").onclick = () => { S.view = "results"; render(); };
  const cs = $("copySum"); if (cs) cs.onclick = () => { const ta = $("sumText"), toast = $("toast");
    try { navigator.clipboard.writeText(ta.value).then(() => { toast.textContent = t("copied"); setTimeout(() => toast.textContent = "", 2000); }, () => { ta.focus(); ta.select(); }); } catch (e) { ta.focus(); ta.select(); } };
}

/* ---------- legal ---------- */
function vLegal() {
  app.innerHTML = `<section class="panel legal"><div class="tabs" role="group">${["terms", "privacy", "data"].map(k => `<button data-tab="${k}" aria-pressed="${S.legal === k}">${esc(t(k === "terms" ? "fTerms" : k === "privacy" ? "fPriv" : "fData"))}</button>`).join("")}</div>
    ${LEGAL[S.lang][S.legal]()}<div class="row"><button class="btn ghost" id="legalBack">${esc(t("legalBack"))}</button></div></section>`;
  app.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { S.legal = b.dataset.tab; render(); });
  $("legalBack").onclick = () => { S.view = S.prev; render(); };
}
function openLegal(k) { if (S.view !== "legal") S.prev = S.view; S.legal = k; S.view = "legal"; render(); }

$("lang-en").onclick = () => { S.lang = "en"; render(true); };
$("lang-fr").onclick = () => { S.lang = "fr"; render(true); };
document.querySelectorAll("[data-legal]").forEach(b => b.onclick = () => openLegal(b.dataset.legal));
render(); load();
