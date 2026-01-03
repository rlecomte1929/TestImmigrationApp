import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  return client;
}

export async function safeParseJson<T>(text: string): Promise<T | null> {
  try {
    return JSON.parse(text) as T;
  } catch (error) {
    console.error("Failed to parse JSON", error);
    return null;
  }
}
