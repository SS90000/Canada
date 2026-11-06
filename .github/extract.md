# Read eligibility criteria into structured fields

You are helping a patient-facing clinical trial finder. For each trial ID listed in
`.github/batch.txt` (one ID per line), read `data/t/<ID>.json` and write
`data/e/<ID>.json` as described below. Do not edit any other file. Do not use the web.

Work through every ID in the list. If a detail file is missing, skip that ID.

## What to read

In `data/t/<ID>.json`, use these fields:
- `criteria`: the full eligibility text (inclusion and exclusion). This is your only source.
- `upd`: copy it unchanged into your output.
- `title`, `conditions`: context only. Never take a requirement from them.

## What to write

`data/e/<ID>.json` must be one JSON object with exactly these keys:

```json
{
  "id": "NCT00000000",
  "upd": "<copy of upd>",
  "who": "One or two short plain-language sentences (about grade 7 reading level) saying who the study is looking for. Describe; never advise.",
  "extent": "early | advanced | both | unclear",
  "extentQuote": "",
  "stages": [],
  "stagesQuote": "",
  "biomarkers": [
    { "name": "HER2", "need": "positive | negative | low | mutation | no-mutation | high | other", "detail": "short plain words", "quote": "" }
  ],
  "priorTreatment": { "need": "none | required | allowed | unclear", "detail": "short plain words", "quote": "" },
  "brainMets": { "need": "allowed | treated-only | excluded | required | unclear", "quote": "" },
  "ecogMax": null,
  "ecogQuote": "",
  "other": [ { "text": "short plain words", "quote": "" } ]
}
```

Rules for each field:
- `extent`: `early` if the study is only for cancer that has not spread to distant organs
  (including after surgery or before surgery), `advanced` if only for metastatic,
  unresectable, recurrent or refractory cancer, `both` if it clearly takes both,
  `unclear` otherwise.
- `stages`: the stages the criteria allow, using only these values: "0", "I", "IA", "IB",
  "II", "IIA", "IIB", "IIC", "III", "IIIA", "IIIB", "IIIC", "IV", "IVA", "IVB".
  Keep substages exactly as stated ("stage IIb or III" becomes ["IIB","III"]; never
  shorten "IIB" to "II"). Expand ranges ("stage II-III" becomes ["II","III"];
  "stage IIB-IIIA" becomes ["IIB","IIC","III","IIIA"] only if the text says so; otherwise
  list just the stages named). Leave empty if no stage is stated.
- `biomarkers`: tumour or blood markers the criteria require or exclude (for example ER,
  PR, HER2, PD-L1, EGFR, ALK, ROS1, KRAS, BRAF, BRCA1/2, PIK3CA, MSI, PSMA, CD19, CD20,
  FLT3, NPM1). At most 6. Leave empty if none.
- `priorTreatment`: `none` if the person must not have had treatment for this cancer
  (or for its advanced stage), `required` if a specific earlier treatment is required
  (say which in `detail`, for example "must have had a CDK4/6 inhibitor"), `allowed` if
  earlier treatment is explicitly allowed, otherwise `unclear`.
- `brainMets`: what the criteria say about brain or central nervous system metastases.
- `ecogMax`: the highest ECOG performance status allowed (0 to 4), or null if not stated.
  If only Karnofsky is given, use null.
- `other`: up to 5 other important requirements a patient could check, such as an age
  limit, a time window since surgery, a required previous surgery, or a common exclusion.
  Plain words only.

## Quotes (very important)

Every `quote`, `extentQuote`, `stagesQuote` and `ecogQuote` must be copied **exactly**
from `criteria`: one continuous piece of the text, character for character, at most
300 characters. Do not fix spelling, do not join two pieces, do not paraphrase.
If you cannot find text that supports a value, set the value to `unclear`, `[]` or
`null` and the quote to `""`. An automatic checker removes every value whose quote is
not found word for word in the criteria.

## Language and tone

- Plain English, short sentences, no jargon where a plain word exists
  (say "has spread to other organs", not "metastatic disease", in `who` and `detail`).
- Describe what the study requires. Never tell the reader what to do, never say whether
  a trial is good, and never give medical advice.
- Write valid JSON (double quotes, no comments, no trailing commas).
