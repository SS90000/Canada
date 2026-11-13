# Clinical Trial Finder · Canada (beta)

Patient-facing finders for open clinical trials with sites in Canada, by Salish Seven.

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

The landing page shows the same list under "What this finder does not include".
