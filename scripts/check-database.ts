#!/usr/bin/env tsx

import { weaviateClient } from '../lib/ai/weaviate';

async function checkDatabase() {
  try {
    console.log('🔍 Checking Weaviate database status...');
    
    // Search for all immigration sources
    const allSources = await weaviateClient.searchSimilar('immigration visa work', 50, 0.1);
    
    console.log(`📊 Total sources in database: ${allSources.length}`);
    
    if (allSources.length > 0) {
      // Group by scenario
      const scenarios = allSources.reduce((acc: any, source) => {
        const key = `${source.countryFrom} → ${source.countryTo} (${source.visaType})`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(source);
        return acc;
      }, {});
      
      console.log('\n📋 Scenarios in database:');
      Object.entries(scenarios).forEach(([scenario, sources]: [string, any]) => {
        console.log(`  ${scenario}: ${sources.length} sources`);
        
        // Show categories for each scenario
        const categories = sources.reduce((acc: any, source: any) => {
          acc[source.category] = (acc[source.category] || 0) + 1;
          return acc;
        }, {});
        
        console.log(`    Categories:`, categories);
      });
      
      console.log('\n📝 Sample sources:');
      allSources.slice(0, 3).forEach((source, i) => {
        console.log(`  ${i + 1}. ${source.title}`);
        console.log(`     ${source.countryFrom} → ${source.countryTo} (${source.category})`);
        console.log(`     URL: ${source.url}`);
        console.log(`     Content length: ${source.content?.length || 0} chars`);
        if (source.fees) console.log(`     Fees: ${source.fees}`);
        if (source.processingTime) console.log(`     Processing: ${source.processingTime}`);
        console.log('');
      });
    } else {
      console.log('❌ No sources found in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
}

checkDatabase();