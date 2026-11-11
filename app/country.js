/* Country settings for this repository's finders. Labels are [English, French]. */
"use strict";
const COUNTRY = {
  code: "CA",
  name: ["Canada", "Canada"],
  inName: ["in Canada", "au Canada"],
  langs: ["en", "fr"],
  unit: "km",
  dists: [25, 50, 100, 250, 500],
  region: ["Province or territory", "Province ou territoire"],
  regionAny: ["Anywhere in Canada", "Partout au Canada"],
  regionFr: { "Quebec": "Québec", "British Columbia": "Colombie-Britannique", "Nova Scotia": "Nouvelle-Écosse", "New Brunswick": "Nouveau-Brunswick",
    "Newfoundland and Labrador": "Terre-Neuve-et-Labrador", "Prince Edward Island": "Île-du-Prince-Édouard", "Northwest Territories": "Territoires du Nord-Ouest" },
  center: [56, -96], zoom: 3,
  privacyLaw: ["Canadian privacy law", "les lois canadiennes sur la protection de la vie privée"],
  support: {
    oncology: ["For cancer information and support, the Canadian Cancer Society's Cancer Information Helpline is 1-888-939-3333.",
               "Service d'information sur le cancer de la Société canadienne du cancer : 1-888-939-3333."],
    other: ["For general health advice, most provinces and territories have a free health line at 811.",
            "Pour des conseils de santé, la plupart des provinces et territoires offrent une ligne santé gratuite au 811."]
  },
  notAffiliated: ["ClinicalTrials.gov, the U.S. National Library of Medicine, Canadian Cancer Trials", "ClinicalTrials.gov, la National Library of Medicine des États-Unis et Essais sur le cancer au Canada"]
};
