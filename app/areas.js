/* Wording and category lists for the three finder areas (oncology, neurology, other).
   Each label is [English, French]. */
"use strict";
const AREAS = {
  oncology: {
    brand: ["Cancer Trial Finder", "Essais cliniques sur le cancer"],
    short: ["All cancers", "Tous les cancers"],
    studies: ["open cancer studies", "études sur le cancer ouvertes"],
    h1: c => [`Find cancer clinical trials ${c[0]}`, `Trouver des essais cliniques sur le cancer ${c[1]}`],
    lede: ["Search open clinical trials and studies for any type of cancer, near you or anywhere in the country. See each site's status and contact, and read the full eligibility criteria, so you can raise the right studies with your care team.",
           "Cherchez des essais et des études ouverts pour tout type de cancer, près de chez vous ou partout au pays. Consultez le statut et le contact de chaque site et les critères d'admissibilité complets, pour en parler avec votre équipe soignante."],
    tagNote: ["Cancer type and disease stage are detected automatically and can be wrong.", "Le type de cancer et le stade sont détectés automatiquement et peuvent être erronés."],
    catLabel: ["Type of cancer", "Type de cancer"], catAny: ["Any type of cancer", "Tout type de cancer"],
    about: ["about cancer", "portant sur le cancer"], tagged: ["Each study's cancer type, and whether it appears to be for early-stage or advanced cancer, are detected", "Le type de cancer de chaque étude, et le fait qu'elle semble viser un cancer précoce ou avancé, sont détectés"],
    many: true, stage: true,
    cats: {
      breast: ["Breast", "Sein"], lung: ["Lung", "Poumon"], prostate: ["Prostate", "Prostate"],
      colorectal: ["Colorectal and anal", "Colorectal et anal"], upperGI: ["Stomach and esophagus", "Estomac et œsophage"],
      pancreas: ["Pancreas", "Pancréas"], liver: ["Liver and bile duct", "Foie et voies biliaires"], kidney: ["Kidney", "Rein"],
      bladder: ["Bladder and urinary tract", "Vessie et voies urinaires"], gyn: ["Gynecologic (ovary, uterus, cervix)", "Gynécologique (ovaire, utérus, col)"],
      headneck: ["Head and neck", "Tête et cou"], thyroid: ["Thyroid", "Thyroïde"], brain: ["Brain and spinal cord", "Cerveau et moelle épinière"],
      skin: ["Skin and melanoma", "Peau et mélanome"], leukemia: ["Leukemia and MDS", "Leucémie et SMD"], lymphoma: ["Lymphoma", "Lymphome"],
      myeloma: ["Myeloma and plasma cell", "Myélome et plasmocytes"], sarcoma: ["Sarcoma and GIST", "Sarcome et GIST"],
      neuroendocrine: ["Neuroendocrine", "Neuroendocrine"], germcell: ["Testicular and germ cell", "Testicule et cellules germinales"],
      mesothelioma: ["Mesothelioma", "Mésothéliome"], childhood: ["Childhood cancers", "Cancers de l'enfant"],
      solid: ["Open to many solid tumour types", "Ouvert à plusieurs types de tumeurs solides"], general: ["Any cancer, survivorship and supportive care", "Tout cancer, survie et soins de soutien"]
    }
  },
  neurology: {
    brand: ["Neurology Trial Finder", "Essais cliniques en neurologie"],
    short: ["Neurological conditions", "Affections neurologiques"],
    studies: ["open studies on neurological conditions", "études ouvertes sur les affections neurologiques"],
    h1: c => [`Find clinical trials for neurological conditions ${c[0]}`, `Trouver des essais cliniques sur les affections neurologiques ${c[1]}`],
    lede: ["Search open clinical trials and studies for stroke, epilepsy, multiple sclerosis, Parkinson's, dementia, migraine, ALS and other neurological conditions. See each site's status and contact, and read the full eligibility criteria, so you can raise the right studies with your care team.",
           "Cherchez des essais et des études ouverts sur l'AVC, l'épilepsie, la sclérose en plaques, la maladie de Parkinson, la démence, la migraine, la SLA et d'autres affections neurologiques. Consultez le statut et le contact de chaque site et les critères d'admissibilité complets."],
    tagNote: ["The condition each study is for is detected automatically and can be wrong.", "L'affection visée par chaque étude est détectée automatiquement et peut être erronée."],
    catLabel: ["Condition", "Affection"], catAny: ["Any neurological condition", "Toute affection neurologique"],
    about: ["about a neurological condition", "portant sur une affection neurologique"], tagged: ["The condition each study is for is detected", "L'affection visée par chaque étude est détectée"],
    many: false, stage: false,
    cats: {
      stroke: ["Stroke and blood vessels of the brain", "AVC et vaisseaux du cerveau"], epilepsy: ["Epilepsy and seizures", "Épilepsie et convulsions"],
      ms: ["Multiple sclerosis and related conditions", "Sclérose en plaques et affections apparentées"], movement: ["Parkinson's and movement disorders", "Parkinson et troubles du mouvement"],
      dementia: ["Alzheimer's, dementia and memory", "Alzheimer, démence et mémoire"], headache: ["Migraine and headache", "Migraine et céphalées"],
      als: ["ALS and motor neuron diseases", "SLA et maladies du motoneurone"], neuromuscular: ["Nerve and muscle conditions (neuropathy, myasthenia)", "Nerfs et muscles (neuropathie, myasthénie)"],
      injury: ["Brain and spinal cord injury", "Lésions du cerveau et de la moelle épinière"], braintumour: ["Brain and spinal tumours", "Tumeurs du cerveau et de la moelle"],
      sleep: ["Sleep disorders", "Troubles du sommeil"], childneuro: ["Childhood neurological conditions", "Affections neurologiques de l'enfant"],
      neuroinfect: ["Brain inflammation and infection", "Inflammation et infection du cerveau"], generalneuro: ["Other neurological conditions", "Autres affections neurologiques"]
    }
  },
  other: {
    brand: ["Clinical Trial Finder", "Essais cliniques"],
    short: ["Other conditions", "Autres affections"],
    studies: ["open studies on other health conditions", "études ouvertes sur d'autres affections"],
    h1: c => [`Find clinical trials for other health conditions ${c[0]}`, `Trouver des essais cliniques sur d'autres affections ${c[1]}`],
    lede: ["Search open clinical trials and studies for heart and lung conditions, diabetes, mental health, infections, pregnancy, rare diseases and many other conditions, including studies for healthy volunteers. Cancer and neurological conditions have their own finders.",
           "Cherchez des essais et des études ouverts sur le cœur et les poumons, le diabète, la santé mentale, les infections, la grossesse, les maladies rares et bien d'autres affections, y compris des études pour volontaires en santé. Le cancer et les affections neurologiques ont leurs propres outils."],
    tagNote: ["The condition each study is for is detected automatically and can be wrong.", "L'affection visée par chaque étude est détectée automatiquement et peut être erronée."],
    catLabel: ["Condition area", "Domaine"], catAny: ["Any condition", "Toute affection"],
    about: ["about a health condition other than cancer or a neurological condition", "portant sur une affection autre que le cancer ou une affection neurologique"], tagged: ["The condition area each study is for is detected", "Le domaine visé par chaque étude est détecté"],
    many: false, stage: false,
    cats: {
      heart: ["Heart and blood vessels", "Cœur et vaisseaux sanguins"], mental: ["Mental health and addiction", "Santé mentale et dépendances"],
      lung: ["Lungs and breathing", "Poumons et respiration"], metabolic: ["Diabetes, weight and hormones", "Diabète, poids et hormones"],
      digestive: ["Digestion and liver", "Digestion et foie"], kidney: ["Kidney and urinary", "Reins et voies urinaires"],
      women: ["Women's health and pregnancy", "Santé des femmes et grossesse"], immune: ["Immune system, arthritis and allergy", "Système immunitaire, arthrite et allergies"],
      skin: ["Skin and wounds", "Peau et plaies"], blood: ["Blood disorders", "Troubles du sang"], infection: ["Infections and vaccines", "Infections et vaccins"],
      musculoskeletal: ["Bones, joints and injuries", "Os, articulations et blessures"], eyeent: ["Eyes, ears, nose, throat and mouth", "Yeux, oreilles, nez, gorge et bouche"],
      genetic: ["Genetic, rare and newborn conditions", "Affections génétiques, rares et néonatales"], pain: ["Pain, surgery and intensive care", "Douleur, chirurgie et soins intensifs"],
      healthy: ["Studies for healthy volunteers", "Études pour volontaires en santé"], general: ["Other conditions", "Autres affections"]
    }
  },
  rare: {
    brand: ["Rare Disease Trial Finder", "Essais cliniques sur les maladies rares"],
    short: ["Rare diseases", "Maladies rares"],
    studies: ["open studies on rare diseases", "études ouvertes sur les maladies rares"],
    h1: c => [`Find clinical trials for rare diseases ${c[0]}`, `Trouver des essais cliniques sur les maladies rares ${c[1]}`],
    lede: ["Search open clinical trials and studies for rare diseases, including rare cancers and rare neurological, genetic, blood and metabolic conditions. These studies also appear in the cancer, neurology and other finders. See each site's status and contact, and read the full eligibility criteria.",
           "Cherchez des essais et des études ouverts sur les maladies rares, y compris les cancers rares et les affections neurologiques, génétiques, sanguines et métaboliques rares. Ces études figurent aussi dans les autres outils. Consultez le statut et le contact de chaque site et les critères d'admissibilité complets."],
    tagNote: ["Rare diseases are detected automatically by matching each study's conditions to Orphanet's list of rare diseases, and can be wrong.", "Les maladies rares sont détectées automatiquement en comparant les affections de chaque étude à la liste d'Orphanet, et peuvent être erronées."],
    catLabel: ["Type of rare disease", "Type de maladie rare"], catAny: ["Any rare disease", "Toute maladie rare"],
    about: ["about a rare disease", "portant sur une maladie rare"], tagged: ["Whether a study is about a rare disease, and its type, are detected", "Le fait qu'une étude porte sur une maladie rare, et son type, sont détectés"],
    many: false, stage: false,
    cats: {
      rarecancer: ["Rare cancers", "Cancers rares"], rareneuro: ["Rare neurological and neuromuscular conditions", "Affections neurologiques et neuromusculaires rares"],
      genetic: ["Rare genetic, metabolic and newborn conditions", "Affections génétiques, métaboliques et néonatales rares"], blood: ["Rare blood disorders", "Troubles sanguins rares"],
      metabolic: ["Rare hormone and metabolic conditions", "Affections hormonales et métaboliques rares"], immune: ["Rare immune and inflammatory conditions", "Affections immunitaires et inflammatoires rares"],
      lung: ["Rare lung conditions", "Affections pulmonaires rares"], heart: ["Rare heart and blood vessel conditions", "Affections rares du cœur et des vaisseaux"],
      kidney: ["Rare kidney conditions", "Affections rénales rares"], digestive: ["Rare digestive and liver conditions", "Affections digestives et hépatiques rares"],
      skin: ["Rare skin and connective tissue conditions", "Affections rares de la peau et du tissu conjonctif"], musculoskeletal: ["Rare bone and muscle conditions", "Affections rares des os et des muscles"],
      eyeent: ["Rare eye and ear conditions", "Affections rares des yeux et des oreilles"], infection: ["Rare infections", "Infections rares"],
      raregeneral: ["Other rare diseases", "Autres maladies rares"]
    }
  }
};
