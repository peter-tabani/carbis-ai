import fs from "node:fs";
import path from "node:path";
import { chunkText } from "../lib/chunk";

type PageDoc = { url: string; title: string; text: string };

type ChunkDoc = {
  id: string;
  url: string;
  title: string;
  chunk: string;
};

function run() {
  const pagesPath = path.join(process.cwd(), "data", "carbis_pages.json");
  const pages = JSON.parse(fs.readFileSync(pagesPath, "utf-8")) as PageDoc[];

  const chunks: ChunkDoc[] = [];

  for (const p of pages) {
    const c = chunkText(p.text);
    c.forEach((chunk, idx) => {
      chunks.push({
        id: `${p.url}#${idx}`,
        url: p.url,
        title: p.title,
        chunk,
      });
    });
  }

  const outPath = path.join(process.cwd(), "data", "carbis_chunks.json");
  fs.writeFileSync(outPath, JSON.stringify(chunks, null, 2), "utf-8");

  console.log(`✅ Built ${chunks.length} chunks -> ${outPath}`);
}

run();