# Find My Trial™ · Canada (pilot)

Find My Trial™: patient-facing search for open clinical trials with sites in Canada, by Salish Seven.

- Landing page: https://ss90000.github.io/Canada/
- Cancer: https://ss90000.github.io/Canada/oncology/
- Neurological conditions: https://ss90000.github.io/Canada/neurology/
- Other conditions: https://ss90000.github.io/Canada/other/
- Rare diseases: https://ss90000.github.io/Canada/rare/

Data comes from ClinicalTrials.gov and is rebuilt daily by `.github/workflows/update-trials.yml`.
Not medical advice.

## Sections

Cancer (`oncology/`), neurological conditions (`neurology/`), other conditions (`other/`) and rare diseases (`rare/`).
Rare-disease studies are found by matching each study's conditions to Orphanet's list of rare diseases, so they also appear in the other three sections.

## What is included

- Every study on ClinicalTrials.gov that is **recruiting** or **not yet recruiting** and lists at least one site in the country.
- Canada only: open trials that Health Canada's [clinical trial search portal](https://clinical-trials-search.canada.ca/) lists as authorized, whose ClinicalTrials.gov record does not list a Canadian site yet. They are labelled "Authorized by Health Canada".

## What is not included

- Studies not open to new participants: active but not recruiting, enrolling by invitation, suspended, completed, terminated or withdrawn. Today's counts are in `data/meta.json` under `notIncluded`.
- Trials registered only outside ClinicalTrials.gov (for example ISRCTN or the EU Clinical Trials Register).
- Canada only: Health Canada-authorized trials with no public registry record. They have no sites, contacts or eligibility details. The count is in `data/meta.json` under `hcNoRegistry`.
- Changes a sponsor has not yet made in the registry.

The landing page shows the same list under "What Find My Trial does not include".

## Quality checks

- **Coverage (November 2026).** The list was compared with ClinicalTrials.gov in both directions: all 4,128 open studies with a Canadian site were present and nothing extra was listed. 240 fields (status, sites, ages, contacts) were checked against the registry records and all matched.
- **Health Canada.** The Health Canada clinical trial portal was compared too. 279 authorized trials that are open on ClinicalTrials.gov but list no Canadian site were added, labelled "Authorized by Health Canada". 383 portal trials with no registry record are counted under "What Find My Trial does not include".
- **Human review (November 2026).** A person checked a random sample from each section against the registry record. Canada: 24 studies, 2 in the wrong section (both neurology). US: 21 studies, 2 in the wrong section (both other conditions). No intervention type was wrong. All four errors were fixed. A later review of 30 European trials found 4 more patterns (stop-smoking studies at cancer screening, autoimmune muscle inflammation filed under neurology, spinal muscular atrophy not marked rare, small cell lung and liver cancer marked rare); these were fixed here too.

The sorting into sections and categories is automatic (text matching), so some studies will still be in the wrong place. Each pattern found in a review is fixed in `.github/build_trials.py` so that every similar study moves too, not just the one reviewed.
