"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
        i += 3;
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

// Hook to detect mobile viewport
function useIsMobile(breakpoint = 480) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth <= breakpoint);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

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
  const isMobile = useIsMobile();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  // Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (open && isMobile) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open, isMobile]);

  const send = useCallback(async (messageOverride?: string) => {
    const text = (messageOverride ?? input).trim();
    if (!text || loading) return;

    setInput("");
    setShowSuggestions(false);

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
  }, [input, loading, msgs]);

  // ─── Styles ──────────────────────────────────────────────────────────────────

  const bubbleStyle: React.CSSProperties = {
    position: "fixed",
    bottom: isMobile ? 16 : 24,
    right: isMobile ? 16 : 24,
    width: isMobile ? 52 : 60,
    height: isMobile ? 52 : 60,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #CE191E, #a01217)",
    border: "none",
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(206,25,30,0.45)",
    display: open && isMobile ? "none" : "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
  };

  const panelStyle: React.CSSProperties = isMobile
    ? {
        position: "fixed",
        inset: 0,
        borderRadius: 0,
        boxShadow: "none",
        border: "none",
        overflow: "hidden",
        background: "#fff",
        zIndex: 9998,
        display: "flex",
        flexDirection: "column",
        animation: "slideUp 0.2s ease",
      }
    : {
        position: "fixed",
        bottom: 100,
        right: 24,
        width: 400,
        maxWidth: "calc(100vw - 48px)",
        maxHeight: "calc(100vh - 140px)",
        borderRadius: 20,
        boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.1)",
        border: "1px solid rgba(0,0,0,0.08)",
        overflow: "hidden",
        background: "#fff",
        zIndex: 9998,
        display: "flex",
        flexDirection: "column",
        animation: "slideUp 0.25s ease",
      };

  const messagesStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: isMobile ? "12px 12px 8px" : "14px 14px 8px",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    background: "#FAFAFA",
    WebkitOverflowScrolling: "touch",
  };

  return (
    <>
      {/* Global responsive styles */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        .carbis-input:focus {
          outline: none;
          border-color: #CE191E !important;
          box-shadow: 0 0 0 3px rgba(206,25,30,0.12);
        }
        .carbis-send:hover:not(:disabled) {
          background: linear-gradient(135deg, #b01419, #8a0f13) !important;
        }
        .carbis-suggestion:hover {
          background: #fff0f0 !important;
          border-color: #CE191E !important;
          color: #CE191E !important;
        }
        /* Smooth scrollbar for desktop */
        .carbis-messages::-webkit-scrollbar {
          width: 5px;
        }
        .carbis-messages::-webkit-scrollbar-track {
          background: transparent;
        }
        .carbis-messages::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.15);
          border-radius: 10px;
        }
        .carbis-messages::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.25);
        }
      `}</style>

      {/* Floating bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Carbis chat"
        style={bubbleStyle}
        onMouseEnter={(e) => {
          if (!isMobile) {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(206,25,30,0.6)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isMobile) {
            (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(206,25,30,0.45)";
          }
        }}
      >
        {open ? (
          <svg width={isMobile ? 18 : 20} height={isMobile ? 18 : 20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width={isMobile ? 22 : 24} height={isMobile ? 22 : 24} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={panelStyle}>
          {/* Header */}
          <div
            style={{
              background: "linear-gradient(135deg, #0a0202, #1a0404)",
              padding: isMobile ? "14px 16px" : "16px 18px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: isMobile ? 36 : 40,
                height: isMobile ? 36 : 40,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #CE191E, #a01217)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <svg width={isMobile ? 16 : 18} height={isMobile ? 16 : 18} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "white", fontWeight: 700, fontSize: isMobile ? 14 : 15, lineHeight: 1.2 }}>
                Carbis AI Assistant
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: isMobile ? 11 : 12 }}>Online · Carbis Solutions Group</span>
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
                width: isMobile ? 32 : 28,
                height: isMobile ? 32 : 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isMobile ? 16 : 14,
                transition: "background 0.15s",
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="carbis-messages" style={messagesStyle}>
            {msgs.map((m, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: isMobile ? 6 : 8,
                }}
              >
                {/* Avatar for assistant */}
                {m.role === "assistant" && (
                  <div
                    style={{
                      width: isMobile ? 24 : 28,
                      height: isMobile ? 24 : 28,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #CE191E, #a01217)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginBottom: 2,
                    }}
                  >
                    <svg width={isMobile ? 11 : 13} height={isMobile ? 11 : 13} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                )}

                <div
                  style={{
                    maxWidth: isMobile ? "85%" : "80%",
                    borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    padding: isMobile ? "10px 12px" : "10px 14px",
                    fontSize: isMobile ? 13 : 13.5,
                    lineHeight: 1.55,
                    background: m.role === "user"
                      ? "linear-gradient(135deg, #CE191E, #a01217)"
                      : "white",
                    color: m.role === "user" ? "white" : "#1a1a1a",
                    boxShadow: m.role === "user"
                      ? "0 2px 12px rgba(206,25,30,0.3)"
                      : "0 1px 6px rgba(0,0,0,0.08)",
                    border: m.role === "assistant" ? "1px solid rgba(0,0,0,0.06)" : "none",
                    wordBreak: "break-word",
                  }}
                >
                  {m.role === "assistant" ? renderMarkdown(m.text) : m.text}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: isMobile ? 6 : 8 }}>
                <div
                  style={{
                    width: isMobile ? 24 : 28,
                    height: isMobile ? 24 : 28,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #CE191E, #a01217)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <svg width={isMobile ? 11 : 13} height={isMobile ? 11 : 13} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                padding: isMobile ? "8px 12px" : "8px 14px",
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                borderTop: "1px solid #f0f0f0",
                background: "#FAFAFA",
                flexShrink: 0,
              }}
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="carbis-suggestion"
                  onClick={() => send(s)}
                  style={{
                    fontSize: isMobile ? 11 : 11.5,
                    padding: isMobile ? "6px 12px" : "5px 11px",
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
              padding: isMobile ? "10px 12px env(safe-area-inset-bottom, 10px)" : "10px 12px",
              borderTop: "1px solid #f0f0f0",
              display: "flex",
              gap: 8,
              alignItems: "center",
              background: "white",
              flexShrink: 0,
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
                padding: isMobile ? "10px 12px" : "9px 14px",
                fontSize: isMobile ? 14 : 13.5,
                color: "#111",
                background: "#f9fafb",
                transition: "border-color 0.2s, box-shadow 0.2s",
                WebkitAppearance: "none",
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
                width: isMobile ? 42 : 40,
                height: isMobile ? 42 : 40,
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
              padding: isMobile ? "6px 12px 8px" : "6px 14px 10px",
              textAlign: "center",
              fontSize: isMobile ? 10 : 11,
              color: "#9ca3af",
              background: "white",
              borderTop: "1px solid #f5f5f5",
              flexShrink: 0,
            }}
          >
            Powered by Carbis AI · <a href="mailto:sales@carbissolutions.com" style={{ color: "#CE191E", textDecoration: "none" }}>sales@carbissolutions.com</a>
          </div>
        </div>
      )}
    </>
  );
}
