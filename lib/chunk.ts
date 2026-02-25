export function chunkText(text: string, maxChars = 1200, overlap = 150): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  let i = 0;

  while (i < clean.length) {
    let end = Math.min(i + maxChars, clean.length);
    
    // NEW: If we aren't at the very end of the document, snap back to the nearest space
    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(" ", end);
      // Ensure we don't accidentally snap backward past our starting point
      if (lastSpace > i) {
        end = lastSpace;
      }
    }

    chunks.push(clean.slice(i, end).trim());
    
    i = end - overlap;
    if (i < 0) i = 0;
    if (end === clean.length) break;
  }

  return chunks;
}