import { cosine } from "./cosine";

export type EmbeddedChunk = {
  id: string;
  url: string;
  title: string;
  chunk: string;
  embedding: number[];
};

export function semanticTopK(
  embedded: EmbeddedChunk[],
  queryVec: number[],
  k = 4
) {
  return embedded
    .map((d) => ({ d, score: cosine(queryVec, d.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => ({ ...x.d, score: x.score }));
}