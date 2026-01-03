interface GoogleSearchResult {
  title: string;
  link: string;
  snippet?: string;
  displayLink?: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchResult[];
  searchInformation?: {
    totalResults: string;
  };
}

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
}

export async function googleSearch(query: string, limit = 10): Promise<SearchResult[]> {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (!apiKey || !searchEngineId) {
    console.log("Google Search API key or engine ID not set, skipping search");
    return [];
  }

  try {
    console.log(`Google search: "${query}" (limit: ${limit})`);
    
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("cx", searchEngineId);
    url.searchParams.set("q", query);
    url.searchParams.set("num", Math.min(limit, 10).toString()); // Google max is 10 per request
    
    console.log(`Google Search URL: ${url.toString()}`);
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Google search failed with status ${response.status}: ${errorText}`);
      console.error(`Response body: ${errorText}`);
      throw new Error(`Google search failed with status ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as GoogleSearchResponse;
    console.log(`Google API Response:`, JSON.stringify(data, null, 2));
    
    const results = data.items?.map((item) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
    })) ?? [];
    
    console.log(`Google search returned ${results.length} results`);
    return results;
  } catch (error) {
    console.error(`Google search error for query "${query}":`, error);
    return [];
  }
}