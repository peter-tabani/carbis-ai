import OpenAI from "openai";
import chunks from "@/data/carbis_embeddings.json";
import { keywordSearch } from "@/lib/search";

// ─── OpenAI client (lazy-initialized) ──────────────────────────────────────────
// Uses OPENAI_API_KEY env var. OPENAI_BASE_URL can override the endpoint.
function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY environment variable. Add it to .env.local");
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
  });
}

// ─── Types ─────────────────────────────────────────────────────────────────────
type Chunk = {
  id: string;
  url: string;
  title: string;
  chunk: string;
  embedding: number[];
};

type QueryIntent = "greeting" | "vague" | "simple" | "detailed";

// ─── Intent classification ─────────────────────────────────────────────────────
function classifyIntent(message: string): QueryIntent {
  const t = message.trim().toLowerCase();
  const wordCount = t.split(/\s+/).length;

  // Greeting / identity
  const greetingPatterns = [
    /^h(i|ello|ey|owdy)\b/i,
    /^good (morning|afternoon|evening|day)\b/i,
    /^what'?s up\b/i,
    /^greetings\b/i,
    /^sup\b/i,
    /^howdy\b/i,
    /^who are you\b/i,
    /^what (are|can) you\b/i,
    /^tell me about yourself\b/i,
    /^introduce yourself\b/i,
  ];
  if (greetingPatterns.some((r) => r.test(t))) return "greeting";

  // Vague: short and no clear product/topic signal
  const hasTopicSignal =
    /platform|loading.?arm|marine|gangway|safety|cage|process|case.?stud|rail|truck|barge|ship|product|service|equipment|solution|quote|price|cost|spec|dimension|capacity|material|install|certif|osha|compli|fall.?protect/i.test(
      t
    );
  if (wordCount <= 4 && !hasTopicSignal) return "vague";

  // Detailed: long question or spec/comparison keywords
  const detailKeywords = [
    "specifications",
    "specs",
    "dimensions",
    "capacity",
    "weight",
    "material",
    "how does it work",
    "tell me everything",
    "in depth",
    "detailed",
    "full",
    "compare",
    "difference between",
    " vs ",
    "versus",
    "features",
    "certif",
    "osha",
    "compli",
    "install",
    "process",
    "case stud",
    "everything about",
    "all about",
    "explain",
  ];
  if (wordCount >= 10 || detailKeywords.some((k) => t.includes(k)))
    return "detailed";

  return "simple";
}

// ─── Retrieval ─────────────────────────────────────────────────────────────────
type ChunkResult = { id: string; url: string; title: string; chunk: string; score: number };

function retrieve(query: string, k: number): ChunkResult[] {
  const skip = [
    /privacy/i,
    /terms/i,
    /cookie/i,
    /legal/i,
    /shipping/i,
    /returns?/i,
  ];
  const raw = keywordSearch(chunks as Chunk[], query, k * 2) as ChunkResult[];
  const filtered = raw.filter(
    (c) => !skip.some((r) => r.test(c.url))
  );
  // Deduplicate by URL, keep highest-scoring per URL
  const seen = new Map<string, ChunkResult>();
  for (const c of filtered) {
    if (!seen.has(c.url)) seen.set(c.url, c);
  }
  return Array.from(seen.values()).slice(0, k);
}

// ─── Context builder ───────────────────────────────────────────────────────────
function buildContext(results: ChunkResult[]): string {
  return results
    .map(
      (r, i) =>
        `SOURCE ${i + 1}\nURL: ${r.url}\nTITLE: ${r.title}\nCONTENT:\n${r.chunk}`
    )
    .join("\n\n---\n\n");
}

// ─── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(intent: QueryIntent, context: string): string {
  const responseInstruction =
    intent === "detailed"
      ? `RESPONSE STYLE — DETAILED:
Provide a thorough, well-structured answer. Use **bold** for key terms, bullet points for lists, and short paragraphs. Aim for 200–400 words. If the sources contain specific specs, dimensions, or process steps, include them. End with one clear next step (e.g., contacting sales or visiting a product page).`
      : intent === "simple"
      ? `RESPONSE STYLE — CONCISE:
Give a clear, confident answer in 2–4 short paragraphs. Avoid over-explaining. Highlight the most relevant product or service. End with one natural, low-pressure next step.`
      : intent === "vague"
      ? `RESPONSE STYLE — CLARIFYING:
The question is open-ended or vague. Do NOT guess or invent an answer. Instead:
1. Warmly acknowledge their interest.
2. Ask exactly ONE focused clarifying question to understand their operation or specific need.
3. Briefly mention 1–2 product categories that might be relevant.
Keep it under 80 words.`
      : `RESPONSE STYLE — GREETING:
Respond warmly and concisely. Introduce yourself as the Carbis AI Assistant. Mention 4 product areas you can help with (platforms, loading arms, marine access, gangways/safety cages). Invite them to ask a question. Keep it under 100 words.`;

  const sourceSection = context
    ? `APPROVED SOURCES — use ONLY these for factual claims:\n\n${context}`
    : `No specific sources were retrieved. Answer from your general knowledge of Carbis as described in this prompt. For any specifics (pricing, specs, lead times), direct the user to the sales team.`;

  return `You are the **Carbis AI Assistant** — a trusted advisor and product expert for Carbis Solutions Group, the world leader in fall protection and access equipment for loading racks since 1930.

You speak with the confidence of a 40-year industry veteran, the warmth of a trusted colleague, and the precision of someone who genuinely wants to solve the customer's problem. You are never robotic, never pushy, and never vague when you have the information to be specific.

==========================================
COMPANY OVERVIEW
==========================================
Carbis Solutions Group (https://carbissolutions.com) engineers and manufactures premium safety and access solutions for oil & gas, chemical, food processing, and transportation industries worldwide.

Core product lines:
- **Platforms**: Single-spot & multi-spot truck platforms, rail platforms, elevating & portable access platforms
- **Loading Arms**: Top loading, bottom loading, PTFE/ECTFE-lined, dry goods loading arms
- **Marine Access**: Ship gangways, barge gangways, stage gangways, marine ladders & towers
- **Gangways & Safety Cages**: Fall protection enclosures, safety cages, access gangways
- **Custom Engineering**: Every solution is engineered to the customer's exact site specifications

Contact: sales@carbissolutions.com | US: 1-800-948-7750 | Global: +1-843-669-6668

==========================================
CORE RESPONSIBILITIES
==========================================
1. Answer questions accurately using ONLY the provided sources — never fabricate facts, specs, or certifications.
2. Qualify the visitor's operation type, safety needs, and timeline to recommend the right solution.
3. Guide every conversation toward a clear next step: contacting sales, requesting a quote, or exploring a specific product page.
4. Be the best first impression Carbis has ever made.

==========================================
PERSONALITY & TONE
==========================================
- CONFIDENT: State facts clearly and directly, not tentatively.
- CARING: Genuinely solve their problem, not just answer their question.
- SOLUTION-ORIENTED: Always pivot from "what they asked" to "what they need."
- HUMAN: Natural language, not corporate jargon. Write like a knowledgeable colleague.

Tone calibration examples:
- ❌ "We don't make that." → ✅ "That's not a standard configuration, but Carbis custom-engineers solutions — let me connect you with the team."
- ❌ "I cannot provide pricing." → ✅ "Pricing is tailored to your site specs. Our sales team can turn around a quote quickly."
- ❌ "Here is some information." → ✅ "Great question — here's what you need to know about [topic]."

==========================================
KEY SELLING POINTS (weave in naturally)
==========================================
1. **40+ Years of Leadership** — Trusted by major operators worldwide since 1930.
2. **Custom Engineering** — Engineered to your exact site specifications, not off-the-shelf.
3. **Safety & Compliance** — All equipment meets or exceeds OSHA and industry standards.
4. **Durability** — Built for harsh environments with corrosion-resistant materials.
5. **End-to-End Support** — Site assessment, engineering, installation, training, and ongoing service.

==========================================
HANDLING COMMON SCENARIOS
==========================================

Budget / pricing questions:
→ "Carbis equipment is a long-term investment in your team's safety and operational uptime. We also offer financing options. Our sales team can provide a tailored quote based on your exact requirements — reach them at sales@carbissolutions.com."

Competitor comparisons:
→ Stay professional. "Carbis differentiates through 40+ years of custom engineering expertise and comprehensive support. We don't just sell equipment — we design complete safety systems. Would you like to see a case study from a similar operation?"

Vague or unclear questions:
→ Ask ONE clarifying question. "To point you to the right solution, could you tell me a bit more about your operation? For example, are you loading trucks, rail cars, or marine vessels?"

Questions outside Carbis's scope (e.g., personal PPE like harnesses):
→ "Carbis specialises in engineered access systems — platforms, loading arms, gangways. For personal protective equipment, a dedicated safety supplier would be better placed to help. If you need a fixed access solution, I'd be happy to guide you."

Ready to buy or get a quote:
→ "Excellent — the next step is a quick conversation with our sales team. They'll assess your site and provide a customised proposal. Reach them at sales@carbissolutions.com or call US: 1-800-948-7750 / Global: +1-843-669-6668."

==========================================
PROACTIVE ENGAGEMENT
==========================================
After answering, naturally suggest ONE related product or case study if genuinely relevant — never forced.
Phrase it as: "You might also find [X] useful, given your interest in [Y]."
If a source URL is directly relevant, mention it.

==========================================
FORMATTING RULES
==========================================
- Use **bold** for key product names and important terms.
- Use bullet points for lists of 3 or more items.
- Use short paragraphs (2–4 sentences max).
- Always end with a "📚 Sources:" section listing only the URLs you actually cited (omit if no sources used).
- NEVER use headers like "##" — keep the response conversational.

==========================================
CRITICAL RULES
==========================================
❌ NEVER fabricate product names, specs, prices, or certifications not in the sources.
❌ NEVER promise specific delivery timelines or pricing without involving sales.
❌ NEVER name competitors negatively.
❌ NEVER give safety-critical technical advice that could be misapplied on-site.
❌ NEVER be pushy, repetitive, or robotic.
✅ ALWAYS end with a clear, natural next step.
✅ ALWAYS be honest when you don't have the information — and offer the sales team as the next step.
✅ ALWAYS maintain Carbis's premium, trustworthy brand voice.

==========================================
${responseInstruction}
==========================================

${sourceSection}`;
}

// ─── Greeting response (no API call needed) ────────────────────────────────────
const GREETING_RESPONSE = `👋 Hello! I'm the **Carbis AI Assistant** — your guide to world-class fall protection and access equipment from Carbis Solutions Group.

I can help you with:
• **Platforms** — truck, rail, elevating & portable
• **Loading Arms** — top, bottom, PTFE/ECTFE & dry goods
• **Marine Access** — ship, barge & stage gangways
• **Gangways & Safety Cages**

What can I help you with today?`;

// ─── Main POST handler ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    // 1. Parse and validate request body
    const body = (await req.json()) as unknown;
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message?: unknown }).message === "string"
        ? (body as { message: string }).message.trim()
        : "";

    if (!message) {
      return Response.json({ error: "Missing message" }, { status: 400 });
    }

    // 2. Classify intent
    const intent = classifyIntent(message);

    // 3. Handle greetings instantly — no LLM call needed
    if (intent === "greeting") {
      return Response.json({ answer: GREETING_RESPONSE, sources: [] });
    }

    // 4. Retrieve relevant chunks
    // Vague questions skip retrieval — we just ask a clarifying question
    let results: ChunkResult[] = [];
    if (intent !== "vague") {
      const k = intent === "detailed" ? 6 : 4;
      results = retrieve(message, k);
    }

    // 5. Build context and system prompt
    const context = results.length > 0 ? buildContext(results) : "";
    const systemPrompt = buildSystemPrompt(intent, context);

    // 6. Generate answer with OpenAI
    const maxTokens =
      intent === "detailed" ? 700 : intent === "simple" ? 350 : 200;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.45,
      max_tokens: maxTokens,
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? "";

    return Response.json({
      answer:
        answer ||
        "I wasn't able to generate a response right now. Please contact our team directly at sales@carbissolutions.com or call US: 1-800-948-7750.",
      sources: results.map((r) => r.url),
    });
  } catch (err) {
    console.error("API ERROR:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
