type ChunkDoc = {
  id: string;
  url: string;
  title: string;
  chunk: string;
};

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function keywordSearch(chunks: ChunkDoc[], query: string, k = 5) {
  const qTokens = tokenize(query);
  const qSet = new Set(qTokens);

  const scored = chunks
    .map((c) => {
      const t = tokenize(`${c.title} ${c.chunk}`);
      let score = 0;

      for (const tok of t) {
        if (qSet.has(tok)) score += 1;
      }

      // small boost if exact phrase appears
      const hay = `${c.title} ${c.chunk}`.toLowerCase();
      const needle = query.toLowerCase();
      if (needle.length >= 4 && hay.includes(needle)) score += 15;

      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  return scored.map((s) => ({ ...s.c, score: s.score }));
}