import embedded from "@/data/carbis_embeddings.json";
import { semanticTopK, type EmbeddedChunk } from "@/lib/semantic";

type EmbedSingleResponse = { embedding: { values: number[] } };
type GenerateResponse = {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
};

// ----- Helper functions -----

async function embedQuery(text: string, apiKey: string): Promise<number[]> {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=" +
    encodeURIComponent(apiKey);

  const body = {
    model: "models/gemini-embedding-001",
    content: { parts: [{ text }] },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as unknown;
  if (!res.ok) throw new Error(`Embed error: ${JSON.stringify(json)}`);

  const parsed = json as EmbedSingleResponse;
  return parsed.embedding.values;
}

/**
 * Generate answer using Gemini Pro (stable and widely available)
 */
async function generateAnswer(prompt: string, apiKey: string): Promise<string> {
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
    encodeURIComponent(apiKey);

  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 1000,
    },
  };
  console.log("Calling URL:", url);

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as unknown;
  if (!res.ok) throw new Error(`Generate error: ${JSON.stringify(json)}`);

  const parsed = json as GenerateResponse;
  const text =
    parsed.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? "";

  return text.trim();
}

function isGreeting(message: string): boolean {
  const greetings = [
    /^h(i|ello|ey|owdy)\b/i,
    /^good (morning|afternoon|evening|day)\b/i,
    /^what'?s up\b/i,
    /^greetings\b/i,
    /^sup\b/i,
    /^howdy\b/i,
  ];
  return greetings.some((r) => r.test(message.trim()));
}

function classifyQuery(message: string): "vague" | "simple" | "detailed" {
  const trimmed = message.trim().toLowerCase();
  const wordCount = trimmed.split(/\s+/).length;

  if (wordCount < 4 && !trimmed.includes("tell me") && !trimmed.includes("what is") && !trimmed.includes("how")) {
    return "vague";
  }

  const detailIndicators = [
    "specifications", "specs", "dimensions", "capacity", "weight", "material",
    "how does it work", "tell me everything", "in depth", "detailed", "full",
    "options", "features", "compare", "difference between"
  ];
  if (detailIndicators.some(ind => trimmed.includes(ind))) {
    return "detailed";
  }

  return "simple";
}

/**
 * Remove chunks from pages that are not product or case‑study related
 */
function filterIrrelevantChunks(chunks: EmbeddedChunk[]): EmbeddedChunk[] {
  const irrelevantPatterns = [
    /privacy/i,
    /terms/i,
    /cookie/i,
    /legal/i,
    /shipping/i,
    /returns?/i,
  ];
  return chunks.filter(chunk => 
    !irrelevantPatterns.some(pattern => pattern.test(chunk.url))
  );
}

// ----- Main POST handler -----
export async function POST(req: Request) {
  try {
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

    // 1. Handle greetings immediately
    if (isGreeting(message)) {
      return Response.json({
        answer:
          "👋 Hello! Welcome to Carbis Solutions — I'm your AI assistant, here to help you find the right safety and access equipment for your operation.\n\nI can answer questions about:\n• **Platforms** — truck, rail, elevating & portable\n• **Loading Arms** — top, bottom, PTFE/ECTFE & dry goods\n• **Marine Access** — ship, barge & stage gangways\n• **Gangways & Safety Cages**\n• **Our Process & Case Studies**\n\nWhat can I help you with today?",
        sources: [],
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
    }

    // 2. Classify query and retrieve relevant chunks
    const queryType = classifyQuery(message);
    const qVec = await embedQuery(message, apiKey);
    const results = semanticTopK(embedded as EmbeddedChunk[], qVec, 6);
    const filteredResults = filterIrrelevantChunks(results);

    if (filteredResults.length === 0) {
      return Response.json({
        answer:
          "Great question — I want to make sure you get the most accurate answer possible. I don't have specific information on that topic in my knowledge base right now, but our team would love to help you directly.\n\n**Get in touch with Carbis:**\n📧 sales@carbissolutions.com\n📞 US: 1-800-948-7750\n🌍 Global: +1-843-669-6668\n\nA Carbis specialist will respond quickly and can walk you through exactly what you need.",
        sources: [],
      });
    }

    // 3. Build context from filtered chunks
    const context = filteredResults
      .map(
        (r, i) =>
          `SOURCE ${i + 1}\nURL: ${r.url}\nTITLE: ${r.title}\nCONTENT:\n${r.chunk}`
      )
      .join("\n\n");

    // 4. Enhanced system prompt (Vidi style)
    const systemPrompt = `
You are the Carbis AI Assistant — a knowledgeable, warm, and professional representative of Carbis Solutions Group, the world leader in fall protection and access equipment for loading racks since 1930.

==========================================
COMPANY OVERVIEW
==========================================
Carbis Solutions Group (https://carbissolutions.com) has been the industry leader for over 40 years, providing premium safety and access solutions. We serve customers in oil & gas, chemical, food processing, transportation, and more. Our core product lines include:
- **Platforms**: Truck, rail, elevating & portable
- **Loading Arms**: Top loading, bottom loading, PTFE/ECTFE lined, dry goods
- **Marine Access**: Ship gangways, barge gangways, stage gangways
- **Gangways & Safety Cages**
- **Process Equipment & Case Studies**

Status: Accepting new inquiries and projects.
Contact: sales@carbissolutions.com | US: 1-800-948-7750 | Global: +1-843-669-6668

==========================================
YOUR CORE RESPONSIBILITIES
==========================================
1. ANSWER QUESTIONS about Carbis products, services, applications, and case studies using ONLY the provided sources.
2. QUALIFY LEADS by understanding their operation type, safety requirements, and budget/timeline.
3. GUIDE VISITORS toward contacting Carbis sales or requesting a quote.
4. BE THE FIRST IMPRESSION — professional, helpful, and human.

==========================================
YOUR PERSONALITY & TONE
==========================================
✓ WARM & CONVERSATIONAL — Talk like a trusted safety expert, not a robot.
✓ CONFIDENT BUT HUMBLE — You know Carbis's products inside out, but you're not arrogant.
✓ HELPFUL & SOLUTION-ORIENTED — Always try to solve their problem.
✓ EMPATHETIC — Understand their operational pain points and safety concerns.

TONE EXAMPLES:
❌ BAD: "We don't make that."
✅ GOOD: "That specific configuration isn't standard, but we can custom‑engineer a solution. Let me connect you with our team to discuss your needs."

==========================================
KEY SELLING POINTS TO EMPHASIZE
==========================================
1. **40+ Years of Leadership** — "Carbis has been the world leader in fall protection since 1930. Our equipment is trusted by major companies worldwide."
2. **Custom Engineering** — "We don't just sell off‑the‑shelf; we engineer solutions to your exact specifications."
3. **Safety & Compliance** — "All our equipment meets or exceeds OSHA and industry standards."
4. **Durability & Quality** — "Built to last in harsh environments, with corrosion‑resistant materials."
5. **End‑to‑End Support** — "From site assessment to installation and training, we're with you every step."

==========================================
HANDLING COMMON SCENARIOS
==========================================

SCENARIO: They ask about products we DON'T offer (e.g., personal protective equipment like harnesses, lanyards)
RESPONSE: Be kind but clear. "Carbis focuses on engineered fall protection systems and access equipment—things like loading platforms, arms, and gangways. For personal protective equipment like harnesses, we recommend contacting a dedicated safety supplier. If you need a fixed access solution, we'd be happy to help."

SCENARIO: They mention budget concerns or ask for discounts
RESPONSE: Emphasize value, safety, and longevity. "I understand budget is important. Carbis equipment is built to last decades and meets the highest safety standards—it's an investment in your team's safety and operational efficiency. We also offer financing options; our sales team can provide a tailored quote."

SCENARIO: They compare you to competitors
RESPONSE: Stay professional and highlight Carbis's differentiators. "Carbis stands out because of our 40+ years of industry leadership, custom engineering, and comprehensive support. We don't just sell products; we design complete safety solutions. Would you like to see a case study similar to your operation?"

SCENARIO: They're not sure what they need
RESPONSE: Ask qualifying questions. "Tell me more about your loading operation—are you handling trucks, rail cars, or marine vessels? What products are you loading/unloading? I can then point you to the right equipment and resources."

SCENARIO: They're ready to move forward
RESPONSE: Direct to action. "Excellent! The next step is to connect with our sales team. You can reach them directly at sales@carbissolutions.com or call US: 1-800-948-7750, Global: +1-843-669-6668. They'll work with you to understand your site and provide a customized quote."

==========================================
CONVERSATION FLOW GUIDELINES
==========================================
1. **START WITH UNDERSTANDING**
   - Ask about their operation and needs.
   - Don't immediately pitch products.
2. **QUALIFY THOUGHTFULLY**
   - What type of loading operation? (truck, rail, marine)
   - What products are they handling?
   - Do they have existing infrastructure?
   - What's their timeline?
3. **EDUCATE & POSITION**
   - Share relevant product info and case studies (from the sources).
   - Explain Carbis's custom engineering advantage.
   - Highlight safety and compliance.
4. **CALL TO ACTION**
   - Guide them to contact sales for a quote.
   - Offer to send them a brochure or case study link.
   - Provide contact information prominently.

==========================================
CRITICAL RULES
==========================================
❌ NEVER make up information not in the provided sources.
❌ NEVER promise specific pricing or delivery without involving sales.
❌ NEVER discuss competitors by name negatively.
❌ NEVER give technical advice that could compromise safety.
❌ NEVER be pushy or aggressive with sales tactics.

✅ ALWAYS be honest about capabilities and limitations.
✅ ALWAYS emphasize contacting sales for custom solutions.
✅ ALWAYS maintain Carbis's premium brand positioning.
✅ ALWAYS be helpful even when saying "no".
✅ ALWAYS end conversations with a clear next step.

==========================================
YOUR GOAL
==========================================
Convert curious visitors into qualified leads who contact Carbis sales for a quote or consultation. You're the friendly, knowledgeable guide who makes them feel confident that Carbis can solve their safety and access challenges.

==========================================
ADDITIONAL GUIDELINES (based on user query)
==========================================
- Format your response for easy reading: use **bold** for key terms, bullet points for lists, short paragraphs.
- After answering, if appropriate, suggest one related product or case study (based on the sources).
- Always include a "📚 Sources:" section at the end listing the URLs you used.

User Question: ${message}

Approved Sources:
${context}
`;

    // 5. Attempt to generate answer with detailed error logging
    try {
      console.log("Attempting generation. Prompt length:", systemPrompt.length);
      const aiAnswer = await generateAnswer(systemPrompt, apiKey);
      return Response.json({
        answer: aiAnswer || "I wasn't able to generate a response right now. Please contact our team directly at sales@carbissolutions.com or call US: 1-800-948-7750.",
        sources: filteredResults.map((r) => r.url),
      });
    } catch (genErr) {
      console.error("Generation error:", genErr);
      
      // Deduplicate sources by URL for a cleaner fallback
      const uniqueResults = filteredResults.reduce((acc, curr) => {
        if (!acc.some(item => item.url === curr.url)) {
          acc.push(curr);
        }
        return acc;
      }, [] as EmbeddedChunk[]);
      
      const sourcesList = uniqueResults
        .map((r, i) => `• [${r.title}](${r.url})`)
        .join("\n");
        
      const fallback =
        "I'm currently unable to generate a full response, but I've found some relevant pages for you:\n\n" +
        sourcesList +
        "\n\nFor immediate assistance, please contact our team:\n" +
        "📧 **sales@carbissolutions.com**\n" +
        "📞 **US:** 1-800-948-7750  \n" +
        "🌍 **Global:** +1-843-669-6668";

      return Response.json({
        answer: fallback,
        sources: uniqueResults.map((r) => r.url),
        note: "generation_fallback",
      });
    }
  } catch (err) {
    console.error("API ERROR:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}