import ChatWidget from "@/components/ChatWidget";
import ProductCards from "@/components/ProductCards";

export default function Page() {
  return (
    <main style={{ minHeight: "100vh", background: "#ffffff", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Hero Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #080202 0%, #1a0404 50%, #0a0202 100%)",
          padding: "clamp(32px, 6vw, 56px) clamp(16px, 4vw, 24px) clamp(28px, 5vw, 48px)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative red glow */}
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(206,25,30,0.25) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 900, margin: "0 auto", position: "relative" }}>
          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(206,25,30,0.15)",
              border: "1px solid rgba(206,25,30,0.3)",
              borderRadius: 999,
              padding: "5px 14px",
              marginBottom: 20,
            }}
          >
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#CE191E" }} />
            <span style={{ color: "#CE191E", fontSize: "clamp(10px, 2.5vw, 12px)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              AI-Powered Product Assistant · Demo
            </span>
          </div>

          <h1
            style={{
              fontSize: "clamp(24px, 5vw, 44px)",
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1.1,
              margin: "0 0 16px",
              letterSpacing: "-0.02em",
            }}
          >
            Instant Answers from{" "}
            <span style={{ color: "#CE191E" }}>Carbis Solutions</span>
          </h1>

          <p style={{
            fontSize: "clamp(14px, 3vw, 17px)",
            color: "rgba(255,255,255,0.65)",
            maxWidth: 640,
            lineHeight: 1.6,
            margin: "0 0 clamp(20px, 4vw, 32px)",
          }}>
            Ask anything about our fall protection equipment, loading arms, marine access systems, or safety platforms — and get a clear, accurate answer instantly.
          </p>

          {/* Contact bar — stacks on mobile */}
          <div
            style={{
              display: "inline-flex",
              flexWrap: "wrap",
              gap: "clamp(8px, 2vw, 12px)",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 14,
              padding: "clamp(10px, 2vw, 14px) clamp(14px, 3vw, 20px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>📧</span>
              <a
                href="mailto:sales@carbissolutions.com"
                style={{ color: "rgba(255,255,255,0.85)", fontSize: "clamp(12px, 2.5vw, 13.5px)", textDecoration: "none", fontWeight: 500 }}
              >
                sales@carbissolutions.com
              </a>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.15)", alignSelf: "stretch", display: "var(--contact-divider-display, block)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>📞</span>
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "clamp(12px, 2.5vw, 13.5px)", fontWeight: 500 }}>
                US: 1-800-948-7750
              </span>
            </div>
            <div style={{ width: 1, background: "rgba(255,255,255,0.15)", alignSelf: "stretch", display: "var(--contact-divider-display, block)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>🌍</span>
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: "clamp(12px, 2.5vw, 13.5px)", fontWeight: 500 }}>
                Global: +1-843-669-6668
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Product category cards */}
      <section style={{ padding: "clamp(24px, 5vw, 40px) clamp(16px, 4vw, 24px)", background: "#f9fafb" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ fontSize: "clamp(11px, 2.5vw, 13px)", fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 16 }}>
            Topics the AI can help with
          </p>
          <ProductCards />
        </div>
      </section>

      {/* About strip */}
      <section style={{ padding: "clamp(20px, 4vw, 32px) clamp(16px, 4vw, 24px)", borderTop: "1px solid #e5e7eb" }}>
        <div style={{
          maxWidth: 900,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          gap: "clamp(10px, 2vw, 16px)",
          flexWrap: "wrap",
        }}>
          <div
            style={{
              background: "#CE191E",
              color: "white",
              fontWeight: 800,
              fontSize: 13,
              borderRadius: 8,
              padding: "6px 14px",
              whiteSpace: "nowrap",
            }}
          >
            Since 1930
          </div>
          <p style={{ color: "#374151", fontSize: "clamp(12.5px, 2.5vw, 14px)", lineHeight: 1.6, margin: 0 }}>
            <strong>Carbis Solutions Group</strong> is the world leader in fall protection at loading racks, offering complete safety solutions — from engineering and equipment to installation and service.
          </p>
        </div>
      </section>

      {/* The chat widget floats in the bottom right */}
      <ChatWidget />
    </main>
  );
}
