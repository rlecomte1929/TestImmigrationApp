import weaviate, { WeaviateApi } from 'weaviate-ts-client';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

interface ImmigrationSource {
  id: string;
  scenarioId: string;
  title: string;
  content: string;
  url: string;
  countryFrom: string;
  countryTo: string;
  visaType: string;
  category: string; // e.g., "application_process", "requirements", "fees", "processing_times"
  officialWebsite?: string;
  formNumbers?: string[];
  fees?: string;
  processingTime?: string;
  officeHours?: string;
  lastUpdated: string;
  certainty?: number;
}

class WeaviateClient {
  private client: WeaviateApi;

  private static readonly GRAPHQL_FIELDS = [
    'title',
    'content',
    'url',
    'scenarioId',
    'countryFrom',
    'countryTo',
    'visaType',
    'category',
    'officialWebsite',
    'formNumbers',
    'fees',
    'processingTime',
    'officeHours',
    'lastUpdated',
    '_additional { certainty }',
  ];

  constructor() {
    if (!process.env.WEAVIATE_URL || !process.env.WEAVIATE_API_KEY || !process.env.OPENAI_API_KEY) {
      throw new Error('WEAVIATE_URL, WEAVIATE_API_KEY, and OPENAI_API_KEY must be set');
    }

    this.client = weaviate.client({
      scheme: 'https',
      host: process.env.WEAVIATE_URL.replace('https://', ''),
      apiKey: new weaviate.ApiKey(process.env.WEAVIATE_API_KEY),
      headers: {
        'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY,
      },
    });
  }

  private mapGraphResults(result: any): ImmigrationSource[] {
    const nodes = result?.data?.Get?.ImmigrationSource ?? [];
    return nodes.map((node: any) => ({
      id: node.id || crypto.randomUUID(),
      scenarioId: node.scenarioId,
      title: node.title,
      content: node.content,
      url: node.url,
      countryFrom: node.countryFrom,
      countryTo: node.countryTo,
      visaType: node.visaType,
      category: node.category,
      officialWebsite: node.officialWebsite,
      formNumbers: node.formNumbers,
      fees: node.fees,
      processingTime: node.processingTime,
      officeHours: node.officeHours,
      lastUpdated: node.lastUpdated,
      certainty: node._additional?.certainty,
    }));
  }

  async initializeSchema() {
    const schema = {
      class: 'ImmigrationSource',
      description: 'Immigration guidance sources for various country-to-country scenarios',
      properties: [
        {
          name: 'scenarioId',
          dataType: ['text'],
          description: 'Identifier for the curated immigration scenario',
        },
        {
          name: 'title',
          dataType: ['text'],
          description: 'Title of the source document or section',
        },
        {
          name: 'content',
          dataType: ['text'],
          description: 'Detailed content including instructions, requirements, and guidance',
        },
        {
          name: 'url',
          dataType: ['text'],
          description: 'Source URL of the official document',
        },
        {
          name: 'countryFrom',
          dataType: ['text'],
          description: 'Origin country of the applicant (e.g., "USA", "Brazil", "UK")',
        },
        {
          name: 'countryTo',
          dataType: ['text'],
          description: 'Destination country for immigration (e.g., "Australia", "Germany", "USA")',
        },
        {
          name: 'visaType',
          dataType: ['text'],
          description: 'Type of visa or immigration process (e.g., "work_visa", "student_visa", "graduate_visa")',
        },
        {
          name: 'category',
          dataType: ['text'],
          description: 'Content category (e.g., "application_process", "requirements", "fees", "processing_times")',
        },
        {
          name: 'officialWebsite',
          dataType: ['text'],
          description: 'Main official government website for this process',
        },
        {
          name: 'formNumbers',
          dataType: ['text[]'],
          description: 'Specific form numbers required (e.g., ["Form 485", "Form I-20"])',
        },
        {
          name: 'fees',
          dataType: ['text'],
          description: 'Specific fees and costs (e.g., "$370 application fee, $85 biometric fee")',
        },
        {
          name: 'processingTime',
          dataType: ['text'],
          description: 'Official processing times (e.g., "4-6 weeks", "3-5 months")',
        },
        {
          name: 'officeHours',
          dataType: ['text'],
          description: 'Office or appointment hours referenced in the source',
        },
        {
          name: 'lastUpdated',
          dataType: ['date'],
          description: 'When this information was last verified/updated',
        },
      ],
      vectorizer: 'text2vec-openai',
      moduleConfig: {
        'text2vec-openai': {
          model: 'ada',
          modelVersion: '002',
          type: 'text',
        },
      },
    };

    try {
      // Check if schema already exists
      const existingSchema = await this.client.schema.getter().do();
      const classExists = existingSchema.classes?.some((cls: any) => cls.class === 'ImmigrationSource');
      
      if (!classExists) {
        await this.client.schema.classCreator().withClass(schema).do();
        console.log('✅ Weaviate schema created successfully');
      } else {
        console.log('✅ Weaviate schema already exists');

        const existingClass = existingSchema.classes?.find((cls: any) => cls.class === 'ImmigrationSource');
        const existingProperties = new Set(
          (existingClass?.properties || []).map((prop: any) => prop.name)
        );

        for (const property of schema.properties) {
          if (!existingProperties.has(property.name)) {
            await this.client.schema
              .propertyCreator()
              .withClassName('ImmigrationSource')
              .withProperty(property)
              .do();
            console.log(`✅ Added missing schema property: ${property.name}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Failed to create Weaviate schema:', error);
      throw error;
    }
  }

  async addSource(source: ImmigrationSource) {
    try {
      const result = await this.client.data
        .creator()
        .withClassName('ImmigrationSource')
        .withProperties({
          scenarioId: source.scenarioId,
          title: source.title,
          content: source.content,
          url: source.url,
          countryFrom: source.countryFrom,
          countryTo: source.countryTo,
          visaType: source.visaType,
          category: source.category,
          officialWebsite: source.officialWebsite,
          formNumbers: source.formNumbers,
          fees: source.fees,
          processingTime: source.processingTime,
          officeHours: source.officeHours,
          lastUpdated: source.lastUpdated,
        })
        .do();

      console.log(`✅ Added source: ${source.title}`);
      return result;
    } catch (error) {
      console.error(`❌ Failed to add source ${source.title}:`, error);
      throw error;
    }
  }

  async addSourcesBatch(sources: ImmigrationSource[]) {
    try {
      console.log(`🔄 Attempting to add ${sources.length} sources to Weaviate...`);
      
      const batcher = this.client.batch.objectsBatcher();
      
      for (const source of sources) {
        console.log(`📝 Adding source: ${source.title.substring(0, 50)}...`);
        batcher.withObject({
          class: 'ImmigrationSource',
          properties: {
            scenarioId: source.scenarioId,
            title: source.title,
            content: source.content,
            url: source.url,
            countryFrom: source.countryFrom,
            countryTo: source.countryTo,
            visaType: source.visaType,
            category: source.category,
            officialWebsite: source.officialWebsite,
            formNumbers: source.formNumbers,
            fees: source.fees,
            processingTime: source.processingTime,
            officeHours: source.officeHours,
            lastUpdated: source.lastUpdated,
          },
        });
      }

      console.log(`🚀 Executing batch insert for ${sources.length} sources...`);
      const result = await batcher.do();
      console.log(`✅ Batch insert result:`, result);
      console.log(`✅ Successfully added ${sources.length} sources in batch`);
      return result;
    } catch (error) {
      console.error('❌ Failed to add sources batch:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      throw error;
    }
  }

  async searchSimilar(query: string, limit = 10, threshold = 0.7) {
    try {
      const result = await this.client.graphql
        .get()
        .withClassName('ImmigrationSource')
        .withFields(WeaviateClient.GRAPHQL_FIELDS.join(' '))
        .withNearText({ concepts: [query] })
        .withLimit(limit)
        .do();

      const mapped = this.mapGraphResults(result);

      const filteredSources = mapped.filter((source) => (source.certainty ?? 0) >= threshold);

      console.log(`🔍 Found ${filteredSources.length} similar sources for query: "${query}"`);

      return filteredSources;
    } catch (error) {
      console.error('❌ Failed to search Weaviate:', error);
      throw error;
    }
  }

  async searchByScenario(scenarioId: string, limit = 20) {
    try {
      const result = await this.client.graphql
        .get()
        .withClassName('ImmigrationSource')
        .withFields(WeaviateClient.GRAPHQL_FIELDS.join(' '))
        .withWhere({
          path: ['scenarioId'],
          operator: 'Equal',
          valueText: scenarioId,
        })
        .withLimit(limit)
        .do();

      const mapped = this.mapGraphResults(result);
      console.log(`🔍 Retrieved ${mapped.length} curated sources for scenario ${scenarioId}`);
      return mapped;
    } catch (error) {
      console.error(`❌ Failed to search Weaviate for scenario ${scenarioId}:`, error);
      throw error;
    }
  }

  async deleteAll() {
    try {
      await this.client.schema.classDeleter().withClassName('ImmigrationSource').do();
      console.log('✅ Deleted all ImmigrationSource data');
    } catch (error) {
      console.error('❌ Failed to delete data:', error);
      throw error;
    }
  }
}

export const weaviateClient = new WeaviateClient();
export type { ImmigrationSource };
