#!/usr/bin/env tsx

/**
 * Script to populate Weaviate with comprehensive immigration data
 * 
 * Usage: npm run populate-db
 */

import { immigrationScraper } from '../lib/data/immigration-scraper';

async function main() {
  console.log('🚀 Starting immigration database population...');
  
  try {
    await immigrationScraper.scrapeAllScenarios();
    console.log('✅ Database population completed successfully!');
  } catch (error) {
    console.error('❌ Failed to populate database:', error);
    process.exit(1);
  }
}

// Run the script
main();