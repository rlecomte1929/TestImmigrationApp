export interface ScenarioDefinition {
  id: string;
  label: string;
  countryFrom: string;
  countryTo: string;
  fromAliases?: string[];
  toAliases?: string[];
  visaType: string;
  keywords: string[];
  summary: string;
  searchQueries: string[];
  officialSites: string[];
  intakeFocus?: string[];
}

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: "ph-nurse-berlin-skilled-worker",
    label: "Philippines nurse relocating to Berlin (Skilled Worker)",
    countryFrom: "Philippines",
    countryTo: "Germany",
    fromAliases: ["philippines", "filipino", "ph"],
    toAliases: ["germany", "deutschland", "berlin"],
    visaType: "germany_skilled_worker_nursing",
    keywords: [
      "nurse",
      "skilled worker",
      "healthcare professional",
      "berlin",
      "recognition",
      "anerkennung",
      "residence permit",
      "appointment",
      "embassy manila",
      "blocked account",
      "sperrkonto",
    ],
    summary:
      "End-to-end, deadline-first pathway for a Filipino nurse moving to Berlin for employment: embassy application, recognition (Anerkennung), work visa/residence permit, registration (Anmeldung), health insurance.",
    searchQueries: [
      "site:manila.diplo.de national visa work skilled worker nursing",
      "site:vfsglobal.com Germany visa Philippines work",
      "site:berlin.de/einwanderung skilled worker residence permit Berlin",
      "site:make-it-in-germany.com nursing recognition Germany",
      "site:anerkennung-in-deutschland.de nurse recognition",
      "site:berlin.de anmeldung residence registration Berlin",
      "site:gov.de health insurance mandatory Germany employment",
    ],
    officialSites: [
      "https://manila.diplo.de/ph-en/service/05-VisaEinreise/-/2316388", // National Visa Manila overview
      "https://visa.vfsglobal.com/phl/en/deu", // VFS Global Germany Philippines
      "https://www.berlin.de/einwanderung/en/residence/working/skilled-workers/", // Berlin LEA skilled workers
      "https://www.make-it-in-germany.com/en/visa-residence/qualifications/recognition", // Recognition overview
      "https://www.anerkennung-in-deutschland.de/en/profession/finder/profession/3112", // Nursing recognition portal
      "https://service.berlin.de/dienstleistung/120686/", // Anmeldung (residence registration)
      "https://www.krankenkassen.de/gesetzliche-krankenkassen/", // Health insurance overview (statutory)
    ],
    intakeFocus: [
      "Employment contract details and start date",
      "Recognition status (Anerkennung) and German level",
      "Accommodation for Anmeldung",
      "Health insurance arrangements",
    ],
  },
  {
    id: "au-482-nomination-refusal-aat-appeal",
    label: "Employer Nomination Refusal (482) + AAT Appeal",
    countryFrom: "Any",
    countryTo: "Australia",
    fromAliases: ["any"],
    toAliases: ["australia", "aat", "tribunal", "mrd"],
    visaType: "temporary_skill_shortage_482",
    keywords: [
      "482",
      "subclass 482",
      "temporary skill shortage",
      "nomination refusal",
      "genuine position",
      "aat",
      "tribunal",
      "mrd",
      "appeal",
      "review",
      "anzsco",
      "labour market testing",
      "sfic",
    ],
    summary:
      "Appeal a 482 nomination refusal on 'genuine position' grounds at the AAT MRD with dual lodgement, strict deadlines, evidence bundle and legal submissions distinguished from precedent.",
    searchQueries: [
      "site:aat.gov.au \"Migration & Refugee Division\" nomination refusal genuine position",
      "site:aat.gov.au migration time limits 28 days",
      "site:immi.homeaffairs.gov.au nominating a position genuine position 482",
      "site:legislation.gov.au Migration Regulations 1994 subclass 482 nomination",
      "site:austlii.edu.au AAT genuine position 482",
      "site:aat.gov.au Statement of Facts Issues and Contentions",
    ],
    officialSites: [
      "https://www.aat.gov.au/review-tribunals/migration-and-refugee-division",
      "https://www.aat.gov.au/apply-for-a-review/time-limits/migration",
      "https://immi.homeaffairs.gov.au/visas/employing-and-sponsoring-someone/sponsor/nominating-a-position",
      "https://www.legislation.gov.au/Series/F1994B00103",
    ],
    intakeFocus: [
      "Refusal date for time limit",
      "Business size, turnover, staff count",
      "ANZSCO code and duties mapping",
      "Evidence available (BAS, payroll, org chart, LMT)",
    ],
  },
  {
    id: "usa-to-australia-skilled-worker",
    label: "U.S. Citizen moving to Australia for skilled work",
    countryFrom: "USA",
    countryTo: "Australia",
    fromAliases: ["usa", "us", "united states", "american"],
    toAliases: ["australia", "aus", "australian"],
    visaType: "temporary_skill_shortage_482",
    keywords: [
      "temporary skill shortage",
      "tss 482",
      "subclass 482",
      "skilled independent 189",
      "skillselect",
      "immi home affairs",
      "employer sponsored visa",
      "move from us to australia",
    ],
    summary:
      "Employer-sponsored and independent skilled migration pathways for U.S. nationals relocating to Australia.",
    searchQueries: [
      "site:immi.homeaffairs.gov.au \"Temporary Skill Shortage\" 482 requirements",
      "site:immi.homeaffairs.gov.au employer sponsored visa checklist",
      "site:immi.homeaffairs.gov.au skilled independent visa applicant USA",
      "site:immi.homeaffairs.gov.au TSS visa fees and processing time",
    ],
    officialSites: [
      "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-skill-shortage-482",
      "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189",
      "https://immi.homeaffairs.gov.au/visas/working-in-australia/skillselect",
      "https://immi.homeaffairs.gov.au/visas/working-in-australia/employer-sponsored-visas",
    ],
    intakeFocus: [
      "Sponsoring employer and nominated occupation",
      "Skills assessment or licensing requirements",
      "Private health insurance planning",
      "Timeline for relocation and job start",
    ],
  },
  {
    id: "brazil-to-berlin-residence",
    label: "Brazilian professional relocating to Berlin",
    countryFrom: "Brazil",
    countryTo: "Germany",
    fromAliases: ["brazil", "brasil", "brazilian"],
    toAliases: ["germany", "deutschland", "berlin"],
    visaType: "germany_eu_blue_card",
    keywords: [
      "eu blue card",
      "berlin auslanderbehorde",
      "berlin immigration office",
      "skilled worker visa",
      "make it in germany",
      "recognition of qualifications",
      "berlin residence permit",
    ],
    summary:
      "EU Blue Card and Berlin Auslanderbehorde residence permit process for Brazilian professionals.",
    searchQueries: [
      "site:make-it-in-germany.com EU Blue Card salary requirements",
      "site:auswaertiges-amt.de skilled worker visa brazil",
      "site:berlin.de/dienstleistung/ Berlin residence permit EU Blue Card",
      "site:bundesagentur.de recognition foreign qualifications germany",
    ],
    officialSites: [
      "https://www.make-it-in-germany.com/en/visa-residence/types/blue-card",
      "https://www.auswaertiges-amt.de/en/visa-service/visabestimmungen-node",
      "https://service.berlin.de/dienstleistung/324659/en/",
      "https://www.berlin.de/einwanderung/en/service/dienstleistungen/service.871433.php/dienstleistung/329437/en/",
    ],
    intakeFocus: [
      "German job offer details and gross salary",
      "University degree recognition status",
      "Address registration plans in Berlin",
      "German health insurance arrangements",
    ],
  },
  {
    id: "us-graduate-visa-uk",
    label: "U.S. student applying for UK Graduate visa",
    countryFrom: "USA",
    countryTo: "United Kingdom",
    fromAliases: ["usa", "us", "united states", "american"],
    toAliases: ["united kingdom", "uk", "british", "england"],
    visaType: "uk_graduate_route",
    keywords: [
      "graduate visa",
      "graduate route",
      "post study work",
      "ukvi graduate visa",
      "brp expiration",
      "switch from student visa",
      "international student graduate visa",
    ],
    summary:
      "UK Graduate visa (post-study work) process for recent graduates educated in the United Kingdom.",
    searchQueries: [
      "site:gov.uk graduate visa apply",
      "site:gov.uk graduate visa eligibility requirements",
      "site:gov.uk graduate visa fees biometrics",
      "site:gov.uk graduate visa supporting documents",
    ],
    officialSites: [
      "https://www.gov.uk/graduate-visa",
      "https://www.gov.uk/graduate-visa/eligibility",
      "https://www.gov.uk/graduate-visa/how-to-apply",
      "https://www.gov.uk/skilled-worker-visa",
    ],
    intakeFocus: [
      "Degree completion confirmation from UK sponsor",
      "Current BRP or visa expiry date",
      "Budget for application and IHS fees",
      "Dependants planning to apply",
    ],
  },
];

const SCENARIO_INDEX = new Map(SCENARIO_DEFINITIONS.map((scenario) => [scenario.id, scenario]));

export function getScenarioById(id: string): ScenarioDefinition | undefined {
  return SCENARIO_INDEX.get(id);
}

function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function containsToken(text: string, token: string): boolean {
  const normalized = normalizeForSearch(token);
  if (!normalized) return false;
  const paddedText = ` ${text} `;
  const paddedToken = ` ${normalized} `;
  return paddedText.includes(paddedToken);
}

function buildSearchText(prompt: string, answers?: Record<string, string | undefined>): string {
  const pieces: string[] = [prompt];
  if (answers) {
    for (const value of Object.values(answers)) {
      if (value) {
        pieces.push(value);
      }
    }
  }
  return normalizeForSearch(pieces.join(' '));
}

export interface ScenarioDetectionInput {
  prompt: string;
  answers?: Record<string, string | undefined>;
}

export function detectScenario({ prompt, answers }: ScenarioDetectionInput): ScenarioDefinition | undefined {
  const haystack = buildSearchText(prompt, answers);
  if (!haystack) {
    return undefined;
  }

  let bestScore = 0;
  let bestScenario: ScenarioDefinition | undefined;

  for (const scenario of SCENARIO_DEFINITIONS) {
    let score = 0;

    if (containsToken(haystack, scenario.countryFrom)) {
      score += 2;
    }
    if (containsToken(haystack, scenario.countryTo)) {
      score += 2;
    }

    if (scenario.fromAliases?.some((alias) => containsToken(haystack, alias))) {
      score += 2;
    }

    if (scenario.toAliases?.some((alias) => containsToken(haystack, alias))) {
      score += 2;
    }

    let keywordMatches = 0;
    for (const keyword of scenario.keywords) {
      if (containsToken(haystack, keyword)) {
        keywordMatches += 1;
      }
    }

    if (keywordMatches > 0) {
      score += keywordMatches * 2;
    }

    if (score > bestScore && score >= 4) {
      bestScore = score;
      bestScenario = scenario;
    }
  }

  return bestScenario;
}
