type BatchEmbedResponse = {
  embeddings: { values: number[] }[];
};

export async function embedTexts(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  const allEmbeddings: number[][] = [];
  const BATCH_SIZE = 100; // Gemini API maximum per batch

  // Loop through the texts in chunks of 100 to prevent API rejection
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=" +
      encodeURIComponent(apiKey);

    const body = {
      requests: batch.map((t) => ({
        model: "models/gemini-embedding-001",
        content: { parts: [{ text: t }] },
      })),
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as unknown;

    if (!res.ok) {
      throw new Error(`Embedding error on batch ${i / BATCH_SIZE + 1}: ${JSON.stringify(json)}`);
    }

    const parsed = json as BatchEmbedResponse;
    const batchEmbeddings = parsed.embeddings.map((e) => e.values);
    
    // Merge this batch's results into our main array
    allEmbeddings.push(...batchEmbeddings);
  }

  return allEmbeddings;
}