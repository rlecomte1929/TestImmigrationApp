import { firecrawlScrape, type ExtractedDocument } from "@/lib/ai/firecrawl";
import { googleSearch } from "@/lib/ai/google-search";
import { weaviateClient, type ImmigrationSource } from "@/lib/ai/weaviate";
import { SCENARIO_DEFINITIONS, type ScenarioDefinition } from "@/lib/data/scenario-config";

const MAX_SECTION_LENGTH = 1800;
const MIN_SECTION_LENGTH = 250;
const SCRAPE_DELAY_MS = 0;
const MAX_SEARCH_RESULTS = 10;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ImmigrationScraper {

  private splitMarkdownIntoSections(markdown: string): Array<{ heading: string; body: string }> {
    const lines = markdown.split(/\r?\n/);
    const sections: Array<{ heading: string; body: string }> = [];

    let currentHeading = "Overview";
    let buffer: string[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const headingMatch = line.match(/^#{2,4}\s+(.*)/);
      if (headingMatch) {
        if (buffer.length > 0) {
          sections.push({ heading: currentHeading, body: buffer.join("\n").trim() });
        }
        currentHeading = headingMatch[1].trim();
        buffer = [];
        continue;
      }

      buffer.push(line);
    }

    if (buffer.length > 0) {
      sections.push({ heading: currentHeading, body: buffer.join("\n").trim() });
    }

    if (sections.length === 0) {
      return [{ heading: "Overview", body: markdown }];
    }

    return sections;
  }

  private chunkSection(section: { heading: string; body: string }): Array<{ heading: string; body: string }> {
    if (section.body.length <= MAX_SECTION_LENGTH) {
      return [section];
    }

    const paragraphs = section.body.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
    const chunks: Array<{ heading: string; body: string }> = [];
    let currentChunk: string[] = [];

    for (const paragraph of paragraphs) {
      const pending = [...currentChunk, paragraph].join("\n\n");
      if (pending.length > MAX_SECTION_LENGTH && currentChunk.length > 0) {
        chunks.push({ heading: section.heading, body: currentChunk.join("\n\n") });
        currentChunk = [paragraph];
      } else {
        currentChunk.push(paragraph);
      }
    }

    if (currentChunk.length > 0) {
      chunks.push({ heading: section.heading, body: currentChunk.join("\n\n") });
    }

    return chunks.flatMap((chunk) => {
      if (chunk.body.length >= MIN_SECTION_LENGTH || chunk.body.length === 0) {
        return [chunk];
      }
      return [];
    });
  }

  private createSourcesFromDocument(
    doc: ExtractedDocument,
    scenario: ScenarioDefinition,
    categoryHint: string,
    fallbackUrl: string
  ): ImmigrationSource[] {
    if (!doc.markdown) {
      return [];
    }

    const sections = this.splitMarkdownIntoSections(doc.markdown)
      .flatMap((section) => this.chunkSection(section));

    if (sections.length === 0) {
      return [];
    }

    const resolvedUrl = doc.url && doc.url.startsWith("http") ? doc.url : fallbackUrl;

    return sections.map((section) => {
      const combinedTitle = section.heading && section.heading !== "Overview"
        ? `${doc.title ?? doc.url} - ${section.heading}`
        : doc.title ?? doc.url;

      const content = section.body;
      const category = this.categorizeContent(content, `${categoryHint} ${section.heading}`.trim());

      return {
        id: crypto.randomUUID(),
        scenarioId: scenario.id,
        title: combinedTitle,
        content,
        url: resolvedUrl,
        countryFrom: scenario.countryFrom,
        countryTo: scenario.countryTo,
        visaType: scenario.visaType,
        category,
        officialWebsite: this.extractOfficialWebsite(resolvedUrl),
        formNumbers: this.extractFormNumbers(content),
        fees: this.extractFees(content),
        processingTime: this.extractProcessingTime(content),
        officeHours: this.extractOfficeHours(content),
        lastUpdated: new Date().toISOString(),
      } satisfies ImmigrationSource;
    });
  }

  async scrapeScenario(scenario: ScenarioDefinition): Promise<ImmigrationSource[]> {
    console.log(`🚀 Starting scrape for ${scenario.countryFrom} → ${scenario.countryTo} (${scenario.visaType})`);
    
    const scenarioSources: ImmigrationSource[] = [];
    const processedUrls = new Set<string>();

    // First, scrape official sites directly
    for (const url of scenario.officialSites) {
      if (processedUrls.has(url)) continue;
      processedUrls.add(url);

      try {
        console.log(`📄 Scraping official site: ${url}`);
        const doc = await firecrawlScrape(url);

        if (doc && doc.markdown) {
          const sourcesFromDoc = this.createSourcesFromDocument(
            doc,
            scenario,
            doc.title || "official",
            url
          );

          scenarioSources.push(...sourcesFromDoc);
          console.log(`✅ Added ${sourcesFromDoc.length} chunks from official source: ${doc.title ?? url}`);
          if (SCRAPE_DELAY_MS > 0) {
            await wait(SCRAPE_DELAY_MS);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to scrape ${url}:`, error);
      }
    }

    // Then search for additional sources
    for (const query of scenario.searchQueries) {
      try {
        console.log(`🔍 Searching: ${query}`);
        const results = await googleSearch(query, MAX_SEARCH_RESULTS);
        
        for (const result of results) {
          // Validate URL before processing
          if (!result.url || result.url === 'undefined' || !result.url.startsWith('http')) {
            console.warn(`⚠️ Skipping invalid URL: ${result.url}`);
            continue;
          }
          
          if (processedUrls.has(result.url)) {
            console.log(`⏭️ Skipping duplicate URL: ${result.url}`);
            continue;
          }
          processedUrls.add(result.url);

          try {
            console.log(`📄 Scraping search result: ${result.url}`);
            const doc = await firecrawlScrape(result.url);

            if (doc && doc.markdown && doc.markdown.length > 100) {
              const sourcesFromDoc = this.createSourcesFromDocument(
                doc,
                scenario,
                doc.title || result.title,
                result.url
              );

              if (sourcesFromDoc.length > 0) {
                scenarioSources.push(...sourcesFromDoc);
                console.log(
                  `✅ Added ${sourcesFromDoc.length} chunks from search source: ${sourcesFromDoc[0]?.title ?? doc.title}`
                );
              } else {
                console.warn(`⚠️ Skipping source with insufficient structured content: ${result.url}`);
              }
            } else {
              console.warn(`⚠️ Skipping source with insufficient content: ${result.url}`);
            }

            if (SCRAPE_DELAY_MS > 0) {
              await wait(SCRAPE_DELAY_MS);
            }
          } catch (error) {
            console.error(`❌ Failed to scrape ${result.url}:`, error);
          }
        }
      } catch (error) {
        console.error(`❌ Failed search for query "${query}":`, error);
      }
    }

    console.log(`📊 Completed scraping for ${scenario.countryFrom} → ${scenario.countryTo}: ${scenarioSources.length} sources`);
    return scenarioSources;
  }

  private categorizeContent(content: string, title: string): string {
    const titleLower = title.toLowerCase();
    const contentLower = content.toLowerCase();

    // Appeals and tribunal-focused categorization first (more specific)
    if (
      /\b(aat|tribunal|migration & refugee division|mrd|review)\b/.test(titleLower) ||
      /\b(aat|tribunal|mrd|review|hearing|lodg(e|ment)|sfic|statement of facts)\b/.test(contentLower)
    ) {
      return 'tribunal_process';
    }
    if (/\b(deadline|time limit|28\s*days?|no extensions)\b/.test(titleLower + ' ' + contentLower)) {
      return 'deadlines';
    }
    if (
      /\b(evidence|bundle|exhibit|financial statements|bas|p&l|payroll|org(ani[sz]ational)? chart|anzsco|labour market testing|lmt|position description)\b/.test(
        titleLower + ' ' + contentLower
      )
    ) {
      return 'evidence';
    }
    if (/\b(case|precedent|decision|aata|distinguish|ratio)\b/.test(titleLower + ' ' + contentLower)) {
      return 'case_law';
    }
    if (/\b(submission|legal argument|contentions|sfic|issues)\b/.test(titleLower + ' ' + contentLower)) {
      return 'legal_arguments';
    }

    if (titleLower.includes('fee') || contentLower.includes('application fee') || contentLower.includes('cost')) {
      return 'fees';
    }
    if (titleLower.includes('processing time') || contentLower.includes('processing time') || contentLower.includes('how long')) {
      return 'processing_times';
    }
    if (titleLower.includes('requirement') || contentLower.includes('eligibility') || contentLower.includes('documents required')) {
      return 'requirements';
    }
    if (titleLower.includes('application') || contentLower.includes('how to apply') || contentLower.includes('application process')) {
      return 'application_process';
    }
    
    return 'general';
  }

  private extractOfficialWebsite(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      return url;
    }
  }

  private extractFormNumbers(content: string): string[] {
    const formRegex = /(?:Form|form)\s+([A-Z0-9-]+)/gi;
    const matches = content.match(formRegex) || [];
    return [...new Set(matches.map(match => match.trim()))];
  }

  private extractFees(content: string): string {
    const feeRegex = /\$[\d,]+(?:\.\d{2})?(?:\s*(?:USD|AUD|EUR|application fee|processing fee|biometric fee))?/gi;
    const matches = content.match(feeRegex) || [];
    return matches.slice(0, 5).join(', '); // Limit to first 5 fee mentions
  }

  private extractProcessingTime(content: string): string {
    const timeRegex = /(?:processing time|takes?|within)\s+(?:approximately\s+)?(\d+(?:-\d+)?\s*(?:days?|weeks?|months?|business days?))/gi;
    const matches = content.match(timeRegex) || [];
    return matches[0] || '';
  }

  private extractOfficeHours(content: string): string {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const dayPattern = /(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)/i;
    const timePattern = /\b\d{1,2}:?\d{0,2}\s?(?:am|pm|a\.m\.|p\.m\.|hrs|h)?\b/i;

    const matches = lines.filter((line) => dayPattern.test(line) && timePattern.test(line));

    if (matches.length === 0) {
      return '';
    }

    return matches.slice(0, 3).join(' | ');
  }

  async scrapeAllScenarios(): Promise<void> {
    console.log('🌍 Starting comprehensive immigration data scraping...');
    
    // Initialize Weaviate schema
    await weaviateClient.initializeSchema();
    
    let totalSources = 0;
    
    for (const scenario of SCENARIO_DEFINITIONS) {
      try {
        const sources = await this.scrapeScenario(scenario);
        
        if (sources.length > 0) {
          await weaviateClient.addSourcesBatch(sources);
          totalSources += sources.length;
          console.log(`💾 Stored ${sources.length} sources for ${scenario.countryFrom} → ${scenario.countryTo}`);
        }
        
        // Small delay between scenarios to be respectful
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to process scenario ${scenario.countryFrom} → ${scenario.countryTo}:`, error);
      }
    }
    
    console.log(`🎉 Scraping complete! Total sources stored: ${totalSources}`);
  }
}

export const immigrationScraper = new ImmigrationScraper();
