import fs from "node:fs";
import path from "node:path";
import { embedTexts } from "../lib/embed";

type ChunkDoc = { id: string; url: string; title: string; chunk: string };
type EmbeddedChunk = ChunkDoc & { embedding: number[] };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimitError(err: unknown) {
  if (!(err instanceof Error)) return false;
  return err.message.includes('"code":429') || err.message.includes("RESOURCE_EXHAUSTED");
}

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in .env.local");

  const chunksPath = path.join(process.cwd(), "data", "carbis_chunks.json");
  const chunks = JSON.parse(fs.readFileSync(chunksPath, "utf-8")) as ChunkDoc[];

  // Resume support: if partial file exists, continue from there
  const outPath = path.join(process.cwd(), "data", "carbis_embeddings.json");
  let out: EmbeddedChunk[] = [];
  const doneIds = new Set<string>();

  if (fs.existsSync(outPath)) {
    out = JSON.parse(fs.readFileSync(outPath, "utf-8")) as EmbeddedChunk[];
    out.forEach((x) => doneIds.add(x.id));
    console.log(`↩️ Resuming: already embedded ${out.length} chunks`);
  }

  const remaining = chunks.filter((c) => !doneIds.has(c.id));
  console.log(`📌 Remaining chunks to embed: ${remaining.length}`);

  // Keep batches small to stay under free-tier burst limits
  const batchSize = 8;

  for (let i = 0; i < remaining.length; i += batchSize) {
    const batch = remaining.slice(i, i + batchSize);
    const label = `batch ${i}..${i + batch.length - 1}`;

    let attempts = 0;
    while (true) {
      attempts += 1;
      try {
        console.log(`Embedding ${label} (attempt ${attempts})`);

        const vecs = await embedTexts(
          batch.map((b) => `${b.title}\n\n${b.chunk}`),
          apiKey
        );

        batch.forEach((b, idx) => {
          out.push({ ...b, embedding: vecs[idx] });
        });

        // Save progress every batch so it never “dies on the way”
        fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf-8");
        console.log(`✅ Saved progress: ${out.length} total embedded chunks`);

        // Gentle pacing (prevents hitting per-minute limits)
        await sleep(1200);
        break;
      } catch (e: unknown) {
        if (isRateLimitError(e)) {
          console.log("⏳ Rate limit hit. Waiting 25 seconds then retrying...");
          await sleep(25000);
          continue;
        }
        console.error("❌ Non-rate-limit error:", e);
        process.exit(1);
      }
    }
  }

  console.log(`🎉 Done. Total embedded chunks: ${out.length}`);
}

run().catch((e) => {
  console.error("❌", e);
  process.exit(1);
});