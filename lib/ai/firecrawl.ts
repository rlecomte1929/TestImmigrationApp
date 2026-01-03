interface FirecrawlScrapeResponse {
  data?: {
    title?: string;
    url: string;
    markdown?: string;
    html?: string;
  };
}

export interface ExtractedDocument {
  title?: string;
  url: string;
  markdown?: string;
  html?: string;
}

const BASE_URL = process.env.FIRECRAWL_BASE_URL ?? "https://api.firecrawl.dev";

function getHeaders() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not set");
  }

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  } satisfies Record<string, string>;
}

const MAX_RETRIES = 4;
const BASE_RETRY_DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractRetryDelay(message: string | undefined): number {
  if (!message) return BASE_RETRY_DELAY_MS;
  const match = message.match(/retry after (\d+)s/i);
  if (match && match[1]) {
    const seconds = Number.parseInt(match[1], 10);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }
  }
  return BASE_RETRY_DELAY_MS;
}

export async function firecrawlScrape(url: string, attempt = 1): Promise<ExtractedDocument | null> {
  if (!process.env.FIRECRAWL_API_KEY) {
    console.log("FIRECRAWL_API_KEY not set, skipping scrape");
    return null;
  }

  console.log(`Firecrawl scrape (attempt ${attempt}): ${url}`);

  try {
    const response = await fetch(`${BASE_URL}/v1/scrape`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        url,
        formats: ["markdown"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Firecrawl scrape failed with status ${response.status}: ${errorText}`);

      if (response.status === 429 && attempt < MAX_RETRIES) {
        const delay = extractRetryDelay(errorText);
        console.log(`⏳ Firecrawl rate limit hit. Waiting ${delay / 1000}s before retry (${attempt}/${MAX_RETRIES}).`);
        await sleep(delay);
        return firecrawlScrape(url, attempt + 1);
      }

      if (response.status >= 500 && attempt < MAX_RETRIES) {
        const jitter = Math.round(BASE_RETRY_DELAY_MS * attempt * 0.5);
        const delay = BASE_RETRY_DELAY_MS + jitter;
        console.log(`⏳ Firecrawl server error. Waiting ${delay / 1000}s before retry (${attempt}/${MAX_RETRIES}).`);
        await sleep(delay);
        return firecrawlScrape(url, attempt + 1);
      }

      throw new Error(`Firecrawl scrape failed with status ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as FirecrawlScrapeResponse;
    if (!data.data) {
      console.log(`Firecrawl scrape returned no data for ${url}`);
      return null;
    }

    console.log(`Firecrawl scrape successful for ${url}, markdown length: ${data.data.markdown?.length || 0}`);
    return {
      title: data.data.title ?? url,
      url: data.data.url ?? url,
      markdown: data.data.markdown,
      html: data.data.html,
    };
  } catch (error) {
    console.error(`Firecrawl scrape error for ${url}:`, error);

    if (attempt < MAX_RETRIES) {
      const delay = BASE_RETRY_DELAY_MS * attempt;
      console.log(`⏳ Retrying after ${delay / 1000}s (attempt ${attempt}/${MAX_RETRIES})...`);
      await sleep(delay);
      return firecrawlScrape(url, attempt + 1);
    }

    throw error;
  }
}
