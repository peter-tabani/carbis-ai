"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string };

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return "Unknown error"; }
}

// Lightweight markdown renderer — handles bold, bullets, line breaks, links
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    if (line.trim() === "") {
      nodes.push(<div key={`sp-${lineIdx}`} style={{ height: 6 }} />);
      return;
    }

    const isBullet = /^[•\-*]\s/.test(line.trim());
    const cleanLine = isBullet ? line.trim().replace(/^[•\-*]\s/, "") : line;

    const inlineNodes: React.ReactNode[] = [];
    const parts = cleanLine.split(/(\*\*[^*]+\*\*|\[([^\]]+)\]\((https?:\/\/[^)]+)\)|https?:\/\/[^\s]+)/g);

    let i = 0;
    while (i < parts.length) {
      const part = parts[i];
      if (!part) { i++; continue; }

      if (/^\*\*[^*]+\*\*$/.test(part)) {
        inlineNodes.push(<strong key={i}>{part.slice(2, -2)}</strong>);
        i++;
      } else if (/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/.test(part)) {
        const linkMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
        if (linkMatch) {
          inlineNodes.push(
            <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer"
              style={{ color: "#CE191E", textDecoration: "underline", wordBreak: "break-all" }}>
              {linkMatch[1]}
            </a>
          );
        }
        i += 3; // skip the captured groups
      } else if (/^https?:\/\//.test(part)) {
        inlineNodes.push(
          <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            style={{ color: "#CE191E", textDecoration: "underline", wordBreak: "break-all" }}>
            {part}
          </a>
        );
        i++;
      } else {
        inlineNodes.push(<span key={i}>{part}</span>);
        i++;
      }
    }

    if (isBullet) {
      nodes.push(
        <div key={lineIdx} style={{ display: "flex", gap: 8, marginBottom: 3, alignItems: "flex-start" }}>
          <span style={{ color: "#CE191E", fontWeight: 700, marginTop: 1, flexShrink: 0 }}>•</span>
          <span>{inlineNodes}</span>
        </div>
      );
    } else {
      nodes.push(
        <div key={lineIdx} style={{ marginBottom: 2 }}>
          {inlineNodes}
        </div>
      );
    }
  });

  return nodes;
}

// Suggested quick questions
const SUGGESTIONS = [
  "What platforms do you offer?",
  "Tell me about loading arms",
  "Marine access solutions",
  "How does your process work?",
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "assistant",
      text: "👋 Hello! I'm the **Carbis AI Assistant** — your guide to world-class fall protection and access equipment.\n\nI can help you with:\n• Platforms (truck, rail, marine)\n• Loading Arms\n• Gangways & Safety Cages\n• Case Studies & Our Process\n\nWhat can I help you with today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  async function send(messageOverride?: string) {
    const text = (messageOverride ?? input).trim();
    if (!text || loading) return;

    setInput("");
    setShowSuggestions(false);

    // Build history from existing messages (excluding the initial greeting)
    const history = msgs.slice(1).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    setMsgs((m) => [...m, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });

      const json: unknown = await res.json();

      const answer =
        typeof json === "object" &&
        json !== null &&
        "answer" in json &&
        typeof (json as { answer?: unknown }).answer === "string"
          ? (json as { answer: string }).answer
          : null;

      const error =
        typeof json === "object" &&
        json !== null &&
        "error" in json &&
        typeof (json as { error?: unknown }).error === "string"
          ? (json as { error: string }).error
          : "Request failed";

      if (!res.ok) throw new Error(error);

      setMsgs((m) => [
        ...m,
        { role: "assistant", text: answer ?? "No answer returned." },
      ]);
    } catch (err: unknown) {
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          text: `I ran into a brief issue. Please try again or reach us directly at **sales@carbissolutions.com** | US: **1-800-948-7750**\n\n_Error: ${getErrorMessage(err)}_`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Carbis chat"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #CE191E, #a01217)",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(206,25,30,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(206,25,30,0.6)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(206,25,30,0.45)";
        }}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 100,
            right: 24,
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            borderRadius: 20,
            boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)",
            border: "1px solid rgba(0,0,0,0.08)",
            overflow: "hidden",
            background: "#fff",
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            animation: "slideUp 0.25s ease",
          }}
        >
          <style>{`
            @keyframes slideUp {
              from { opacity: 0; transform: translateY(16px); }
              to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes pulse {
              0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
              40% { transform: scale(1); opacity: 1; }
            }
            .carbis-input:focus { outline: none; border-color: #CE191E !important; box-shadow: 0 0 0 3px rgba(206,25,30,0.12); }
            .carbis-send:hover:not(:disabled) { background: linear-gradient(135deg, #b01419, #8a0f13) !important; }
            .carbis-suggestion:hover { background: #fff0f0 !important; border-color: #CE191E !important; color: #CE191E !important; }
          `}</style>

          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #0a0202, #1a0404)",
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #CE191E, #a01217)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "white", fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                Carbis AI Assistant
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>Online · Carbis Solutions Group</span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "rgba(255,255,255,0.8)",
                cursor: "pointer",
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                transition: "background 0.15s",
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              height: 390,
              overflowY: "auto",
              padding: "14px 14px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              background: "#FAFAFA",
            }}
          >
            {msgs.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: 8,
                }}
              >
                {/* Avatar for assistant */}
                {m.role === "assistant" && (
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #CE191E, #a01217)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginBottom: 2,
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                )}

                <div
                  style={{
                    maxWidth: "80%",
                    borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    padding: "10px 14px",
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    background: m.role === "user"
                      ? "linear-gradient(135deg, #CE191E, #a01217)"
                      : "white",
                    color: m.role === "user" ? "white" : "#1a1a1a",
                    boxShadow: m.role === "user"
                      ? "0 2px 12px rgba(206,25,30,0.3)"
                      : "0 1px 6px rgba(0,0,0,0.08)",
                    border: m.role === "assistant" ? "1px solid rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  {m.role === "assistant" ? renderMarkdown(m.text) : m.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div
                  style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: "linear-gradient(135deg, #CE191E, #a01217)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div
                  style={{
                    background: "white",
                    borderRadius: "18px 18px 18px 4px",
                    padding: "12px 16px",
                    boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
                    border: "1px solid rgba(0,0,0,0.06)",
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((d) => (
                    <div
                      key={d}
                      style={{
                        width: 7, height: 7, borderRadius: "50%",
                        background: "#CE191E",
                        animation: "pulse 1.2s ease-in-out infinite",
                        animationDelay: `${d * 0.2}s`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Quick suggestion chips */}
          {showSuggestions && msgs.length <= 1 && (
            <div
              style={{
                padding: "8px 14px",
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                borderTop: "1px solid #f0f0f0",
                background: "#FAFAFA",
              }}
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="carbis-suggestion"
                  onClick={() => send(s)}
                  style={{
                    fontSize: 11.5,
                    padding: "5px 11px",
                    borderRadius: 20,
                    border: "1px solid #e5e7eb",
                    background: "white",
                    color: "#374151",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontWeight: 500,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div
            style={{
              padding: "10px 12px",
              borderTop: "1px solid #f0f0f0",
              display: "flex",
              gap: 8,
              alignItems: "center",
              background: "white",
            }}
          >
            <input
              className="carbis-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask about our products or services…"
              style={{
                flex: 1,
                borderRadius: 12,
                border: "1.5px solid #e5e7eb",
                padding: "9px 14px",
                fontSize: 13.5,
                color: "#111",
                background: "#f9fafb",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
            />
            <button
              className="carbis-send"
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                background: "linear-gradient(135deg, #CE191E, #a01217)",
                border: "none",
                borderRadius: 12,
                width: 40,
                height: 40,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                opacity: loading || !input.trim() ? 0.55 : 1,
                flexShrink: 0,
                transition: "all 0.2s",
                boxShadow: "0 2px 8px rgba(206,25,30,0.3)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>

          {/* Footer */}
          <div
            style={{
              padding: "6px 14px 10px",
              textAlign: "center",
              fontSize: 11,
              color: "#9ca3af",
              background: "white",
              borderTop: "1px solid #f5f5f5",
            }}
          >
            Powered by Carbis AI · <a href="mailto:sales@carbissolutions.com" style={{ color: "#CE191E", textDecoration: "none" }}>sales@carbissolutions.com</a>
          </div>
        </div>
      )}
    </>
  );
}
