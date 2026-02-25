import fs from "node:fs";
import path from "node:path";
import * as cheerio from "cheerio";
import { SEEDS, allowed, normalize } from "../lib/allowlist";

type PageDoc = {
  url: string;
  title: string;
  text: string;
};

async function fetchHtml(url: string) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  return res.text();
}

function extractText(html: string) {
  const $ = cheerio.load(html);

  // Remove obvious noise
  $("script, style, noscript, nav, footer, header, svg").remove();

  const title = ($("title").text() || "").trim();
  const main = $("main").text().trim() || $("body").text().trim();
  const text = main.replace(/\s+/g, " ").trim();

  return { title, text };
}

function extractLinks(html: string) {
  const $ = cheerio.load(html);
  const links = new Set<string>();

  $("a[href]").each((_, a) => {
    const href = String($(a).attr("href") || "");
    const abs = normalize(href);
    if (!abs) return;
    if (allowed(abs)) links.add(abs);
  });

  return Array.from(links);
}

async function run() {
  const queue = [...SEEDS];
  const seen = new Set<string>();
  const docs: PageDoc[] = [];

  while (queue.length) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);

    if (!allowed(url)) continue;

    console.log("Crawling:", url);
    const html = await fetchHtml(url);
    const { title, text } = extractText(html);

    // Keep only pages with meaningful content
    if (text.length > 600) {
      docs.push({ url, title, text });
    }

    // Add discovered allowed links
    const links = extractLinks(html);
    for (const link of links) {
      if (!seen.has(link)) queue.push(link);
    }
  }

  const outDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const outPath = path.join(outDir, "carbis_pages.json");
  fs.writeFileSync(outPath, JSON.stringify(docs, null, 2), "utf-8");

  console.log(`✅ Saved ${docs.length} pages to ${outPath}`);
}

run().catch((e) => {
  console.error("❌ Crawl failed:", e);
  process.exit(1);
});
