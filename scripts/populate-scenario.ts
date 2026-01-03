#!/usr/bin/env tsx

import { immigrationScraper } from '../lib/data/immigration-scraper';
import { SCENARIO_DEFINITIONS } from '../lib/data/scenario-config';
import { weaviateClient } from '../lib/ai/weaviate';

async function main() {
  const idArg = process.argv.find((a) => !a.startsWith('-') && a.endsWith('-worker'))
    || process.argv.find((a) => a.includes('au-482') || a.includes('ph-nurse'))
    || process.argv[2];

  const scenarioId = (idArg || '').trim() || process.env.SCENARIO_ID;
  if (!scenarioId) {
    console.error('Usage: npm run populate-scenario -- <scenario-id>');
    console.error('Example: npm run populate-scenario -- ph-nurse-berlin-skilled-worker');
    process.exit(1);
  }

  const scenario = SCENARIO_DEFINITIONS.find((s) => s.id === scenarioId);
  if (!scenario) {
    console.error(`Unknown scenario id: ${scenarioId}`);
    process.exit(1);
  }

  console.log(`Starting targeted scrape for scenario: ${scenario.id} — ${scenario.label}`);

  await weaviateClient.initializeSchema();
  const sources = await (immigrationScraper as any).scrapeScenario(scenario);
  if (sources.length === 0) {
    console.warn('No sources scraped. Check credits and connectivity.');
    return;
  }

  await weaviateClient.addSourcesBatch(sources);
  console.log(`Added ${sources.length} sources for scenario ${scenario.id}`);
}

main().catch((err) => {
  console.error('Failed to populate scenario:', err);
  process.exit(1);
});

