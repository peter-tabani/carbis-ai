import chunks from "@/data/carbis_embeddings.json";
import { keywordSearch } from "@/lib/search";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Chunk = {
  id: string;
  url: string;
  title: string;
  chunk: string;
  embedding: number[];
};

type ChunkResult = {
  id: string;
  url: string;
  title: string;
  chunk: string;
  score: number;
};

type QueryIntent = "greeting" | "vague" | "simple" | "detailed";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

// Gemini API types
type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  error?: { code: number; message: string };
};

// ─── Intent classification ─────────────────────────────────────────────────────
function classifyIntent(message: string, historyLen: number): QueryIntent {
  const t = message.trim().toLowerCase();
  const wordCount = t.split(/\s+/).length;

  // Greeting / identity — only on first message or explicit greeting
  const greetingPatterns = [
    /^h(i|ello|ey|owdy)\b/i,
    /^good (morning|afternoon|evening|day)\b/i,
    /^what'?s up\b/i,
    /^greetings\b/i,
    /^sup\b/i,
    /^who are you\b/i,
    /^what (are|can) you\b/i,
    /^tell me about yourself\b/i,
    /^introduce yourself\b/i,
  ];
  if (historyLen === 0 && greetingPatterns.some((r) => r.test(t)))
    return "greeting";

  // If mid-conversation and they say "hi" again, treat as simple (AI should adapt)
  if (historyLen > 0 && greetingPatterns.some((r) => r.test(t)))
    return "simple";

  // Vague: short and no clear product/topic signal
  const hasTopicSignal =
    /platform|loading.?arm|marine|gangway|safety|cage|process|case.?stud|rail|truck|barge|ship|product|service|equipment|solution|quote|price|cost|spec|dimension|capacity|material|install|certif|osha|compli|fall.?protect|custom|engineer/i.test(
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
    "case stud",
    "everything about",
    "all about",
    "explain how",
    "walk me through",
    "step by step",
  ];
  if (wordCount >= 10 || detailKeywords.some((k) => t.includes(k)))
    return "detailed";

  return "simple";
}

// ─── Retrieval ─────────────────────────────────────────────────────────────────
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
  const filtered = raw.filter((c) => !skip.some((r) => r.test(c.url)));
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
function buildSystemPrompt(
  intent: QueryIntent,
  context: string,
  turnCount: number
): string {
  const responseInstruction =
    intent === "detailed"
      ? `RESPONSE STYLE — DETAILED:
Provide a thorough, well-structured answer. Use **bold** for key terms, bullet points for lists, and short paragraphs. Aim for 200–400 words. Include specific specs, dimensions, or process steps from the sources when available. End with one clear next step AND one thoughtful follow-up question about their specific situation.`
      : intent === "simple"
        ? `RESPONSE STYLE — CONCISE:
Give a clear, confident answer in 2–3 short paragraphs. Don't over-explain. Highlight the most relevant product or service. End with a natural follow-up question that helps you understand their needs better (e.g., "Are you looking at this for a new installation or upgrading existing equipment?").`
        : intent === "vague"
          ? `RESPONSE STYLE — CLARIFYING:
The question is open-ended or vague. Do NOT guess or invent an answer. Instead:
1. Warmly acknowledge their interest.
2. Ask exactly ONE focused clarifying question to understand their operation or specific need.
3. Briefly mention 1–2 product categories that might be relevant.
Keep it under 80 words. Make the question feel natural, not interrogative.`
          : `RESPONSE STYLE — GREETING:
Respond warmly and concisely. Introduce yourself as the Carbis AI Assistant. Mention you can help with platforms, loading arms, marine access, and safety equipment. Ask what brings them here today. Keep it under 80 words.`;

  const sourceSection = context
    ? `APPROVED SOURCES — use ONLY these for factual claims:\n\n${context}`
    : `No specific sources were retrieved. Answer from your general knowledge of Carbis as described in this prompt. For any specifics (pricing, specs, lead times), direct the user to the sales team.`;

  const conversationPhase =
    turnCount === 0
      ? `CONVERSATION PHASE: Opening — This is the start of the conversation. Be welcoming and curious about what they need.`
      : turnCount <= 2
        ? `CONVERSATION PHASE: Discovery — You're getting to know their needs. Ask smart questions to understand their operation, what they're loading/unloading, their safety concerns, and timeline.`
        : turnCount <= 5
          ? `CONVERSATION PHASE: Solution — You should have enough context to recommend specific products. Be specific and confident. Start guiding toward a quote or sales call.`
          : `CONVERSATION PHASE: Closing — The conversation has been going for a while. Summarise what you've discussed, recommend a clear next step (call sales, request a quote, schedule a site visit), and make it easy for them to act.`;

  return `You are the **Carbis AI Assistant** — a trusted advisor and product expert for Carbis Solutions Group, the world leader in fall protection and access equipment for loading racks since 1930.

You are having a REAL CONVERSATION with a potential customer. You remember everything they've said. You build on previous messages. You NEVER repeat yourself or give the same answer twice.

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
YOUR PERSONALITY
==========================================
You are:
- **Warm and genuine** — like a knowledgeable friend who happens to be an industry expert
- **Confident but not arrogant** — you know your stuff and share it naturally
- **Curious** — you ask thoughtful questions because you genuinely want to help
- **Solution-focused** — you don't just answer questions, you solve problems
- **Human** — you use natural language, occasional warmth ("That's a great question"), and you vary your phrasing

You are NOT:
- A FAQ bot that gives canned responses
- Pushy or salesy
- Repetitive — NEVER start two messages the same way
- Robotic or corporate-sounding

==========================================
CONVERSATION RULES
==========================================
1. **REMEMBER THE CONVERSATION**: Reference what the user said earlier. Build on it. Say things like "Based on what you mentioned about [X]..." or "Since you're working with [Y]..."
2. **NEVER REPEAT YOURSELF**: If you already explained something, don't explain it again. Instead, add new information or go deeper.
3. **VARY YOUR OPENINGS**: Never start two consecutive messages with the same phrase. Mix it up — sometimes lead with the answer, sometimes with empathy, sometimes with a question.
4. **ASK FOLLOW-UP QUESTIONS**: After answering, ask ONE natural follow-up question that helps you understand their needs better. Make it feel like a conversation, not an interrogation.
5. **QUALIFY THE LEAD**: Gradually learn about their: industry, what they load/unload, current equipment, safety concerns, timeline, and budget range. Don't ask all at once — weave it in naturally.
6. **KNOW WHEN TO SUMMARISE**: For simple factual questions ("What's your phone number?"), give a brief answer. For complex topics, provide structured detail. Match the depth of your answer to the complexity of their question.
7. **PROACTIVE SUGGESTIONS**: When relevant, suggest ONE related product, case study, or page. Frame it as helpful, not pushy: "You might also want to look at [X] — it's popular with companies in similar situations."
8. **GUIDE TOWARD ACTION**: Every 2–3 messages, naturally mention how they can take the next step (call, email, quote request) without being pushy about it.

==========================================
${conversationPhase}
==========================================

==========================================
HANDLING COMMON SCENARIOS
==========================================

Budget / pricing:
→ "Every Carbis solution is custom-engineered, so pricing depends on your specific requirements. The good news is our sales team can usually turn around a ballpark quote pretty quickly. Want me to help you figure out what to ask for?"

Competitor comparisons:
→ Stay professional and confident. Focus on Carbis's strengths (custom engineering, 40+ years, end-to-end support) without naming competitors. Offer a case study if relevant.

"I don't know what I need":
→ "No worries at all — that's exactly what I'm here for. Let me ask you a couple of quick questions to point you in the right direction. What type of vehicles or vessels are you loading or unloading?"

Out of scope:
→ Acknowledge warmly, explain what Carbis does specialise in, and redirect if possible.

Ready to buy:
→ "That's great to hear! The best next step would be a quick call with our sales team — they'll walk you through the site assessment process and get you a customised proposal. You can reach them at sales@carbissolutions.com or 1-800-948-7750."

==========================================
KEY SELLING POINTS (weave in naturally, don't list them)
==========================================
- 40+ years of industry leadership since 1930
- Custom-engineered to exact site specifications
- Meets or exceeds OSHA and industry safety standards
- Built for harsh environments with corrosion-resistant materials
- End-to-end: site assessment → engineering → installation → training → service

==========================================
FORMATTING
==========================================
- Use **bold** for key product names and important terms
- Use bullet points for lists of 3+ items
- Short paragraphs (2–3 sentences max)
- Include a "📚 Sources:" section at the end ONLY if you cited specific URLs from the sources
- NEVER use markdown headers (##) — keep it conversational
- Keep responses focused — don't pad with unnecessary information

==========================================
CRITICAL RULES
==========================================
❌ NEVER fabricate specs, prices, or certifications not in the sources
❌ NEVER promise specific delivery timelines or pricing
❌ NEVER name competitors negatively
❌ NEVER repeat the same opening phrase twice in a conversation
❌ NEVER give the exact same answer to the same question — add new angle or depth
✅ ALWAYS reference previous conversation context when relevant
✅ ALWAYS end with either a follow-up question OR a clear next step (not both every time — vary it)
✅ ALWAYS be honest when you don't know — offer the sales team as backup

==========================================
${responseInstruction}
==========================================

${sourceSection}`;
}

// ─── Gemini API call with conversation history ─────────────────────────────────
async function generateWithGemini(
  systemPrompt: string,
  history: ChatMessage[],
  userMessage: string,
  maxTokens: number
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable");
  }

  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Build multi-turn conversation for Gemini
  const contents: GeminiContent[] = [];

  // Add conversation history (last 10 turns max to stay within token limits)
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    });
  }

  // Add the current user message
  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.65,
      },
    }),
  });

  const json = (await res.json()) as GeminiResponse;

  if (!res.ok || json.error) {
    const errMsg = json.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`Gemini API error: ${errMsg}`);
  }

  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  return text.trim();
}

// ─── Greeting responses (varied, no API call needed) ───────────────────────────
const GREETINGS = [
  `👋 Hey there! I'm the **Carbis AI Assistant** — think of me as your guide to world-class safety and access equipment.

I can help you explore:
• **Platforms** for truck, rail, and marine loading
• **Loading Arms** — top, bottom, lined, and dry goods
• **Marine Access** — gangways, ladders, and towers
• **Safety Cages & Gangways**

What brings you here today?`,

  `👋 Welcome! I'm the **Carbis AI Assistant**, here to help you find the right safety and access solution for your operation.

Whether you're looking at **loading platforms**, **loading arms**, **marine gangways**, or **fall protection systems** — I've got you covered.

What are you working on? I'd love to help point you in the right direction.`,

  `👋 Hi! Great to have you here. I'm the **Carbis AI Assistant** — your go-to for everything related to safe loading access equipment.

From **truck platforms** to **marine gangways** to **custom-engineered solutions**, I can help you find exactly what you need.

What can I help you with today?`,
];

// ─── Main POST handler ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as unknown;

    // Parse message
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

    // Parse conversation history
    const history: ChatMessage[] =
      typeof body === "object" &&
      body !== null &&
      "history" in body &&
      Array.isArray((body as { history?: unknown }).history)
        ? ((body as { history: unknown[] }).history.filter(
            (m): m is ChatMessage =>
              typeof m === "object" &&
              m !== null &&
              "role" in m &&
              "text" in m &&
              typeof (m as ChatMessage).role === "string" &&
              typeof (m as ChatMessage).text === "string"
          ))
        : [];

    const turnCount = history.filter((m) => m.role === "user").length;

    // Classify intent
    const intent = classifyIntent(message, turnCount);

    // Handle greetings — pick a random one for variety
    if (intent === "greeting") {
      const greeting = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
      return Response.json({ answer: greeting, sources: [] });
    }

    // Retrieve relevant chunks
    let results: ChunkResult[] = [];
    if (intent !== "vague") {
      const k = intent === "detailed" ? 6 : 4;
      results = retrieve(message, k);
    }

    // Build context and system prompt
    const context = results.length > 0 ? buildContext(results) : "";
    const systemPrompt = buildSystemPrompt(intent, context, turnCount);

    // Generate answer with Gemini (with conversation history)
    const maxTokens =
      intent === "detailed" ? 1024 : intent === "simple" ? 512 : 300;

    const answer = await generateWithGemini(
      systemPrompt,
      history,
      message,
      maxTokens
    );

    return Response.json({
      answer:
        answer ||
        "I wasn't able to generate a response right now. Please contact our team directly at sales@carbissolutions.com or call US: 1-800-948-7750.",
      sources: results.map((r) => r.url),
    });
  } catch (err) {
    console.error("API ERROR:", err);
    const errMsg = err instanceof Error ? err.message : "Server error";
    return Response.json({
      answer: `I ran into a brief issue. Please try again or reach us directly at sales@carbissolutions.com | US: 1-800-948-7750\n\n_${errMsg}_`,
      sources: [],
    });
  }
}
