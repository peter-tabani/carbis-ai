export const ORIGIN = "https://carbissolutions.com";

// Only crawl pages that match these patterns:
export const ALLOW_PATTERNS: RegExp[] = [
  // Products
  /^https:\/\/carbissolutions\.com\/products\/platforms\/.*$/i,
  /^https:\/\/carbissolutions\.com\/products\/loading-arms\/.*$/i,

  // Truck / Rail / Marine (site may use different slugs, we allow common ones)
  /^https:\/\/carbissolutions\.com\/truck\/.*$/i,
  /^https:\/\/carbissolutions\.com\/rail\/.*$/i,
  /^https:\/\/carbissolutions\.com\/marine\/.*$/i,
  /^https:\/\/carbissolutions\.com\/marine-ladders-towers-loading-arms\/.*$/i,

  // About / Process
  /^https:\/\/carbissolutions\.com\/about-us\/.*$/i,
  /^https:\/\/carbissolutions\.com\/our-process\/.*$/i,

  // Case studies
  /^https:\/\/carbissolutions\.com\/category\/case-study\/.*$/i,
  /^https:\/\/carbissolutions\.com\/white-papers-case-studies\/.*$/i,
];

// Seed pages to start crawling from:
export const SEEDS: string[] = [
  `${ORIGIN}/products/platforms/`,
  `${ORIGIN}/products/loading-arms/`,
  `${ORIGIN}/marine-ladders-towers-loading-arms/`,
  `${ORIGIN}/our-process/`,
  `${ORIGIN}/about-us/`,
  `${ORIGIN}/category/case-study/`,
  `${ORIGIN}/white-papers-case-studies/`,
];

export function normalize(url: string): string | null {
  try {
    const u = new URL(url, ORIGIN);
    u.hash = "";
    if (u.origin !== ORIGIN) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function allowed(url: string): boolean {
  return ALLOW_PATTERNS.some((r) => r.test(url));
}