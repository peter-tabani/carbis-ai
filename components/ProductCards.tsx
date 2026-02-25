"use client";

const CARDS = [
  { icon: "🏗️", title: "Platforms", desc: "Truck, rail, elevating & portable access platforms" },
  { icon: "🔧", title: "Loading Arms", desc: "Top, bottom, PTFE/ECTFE & dry goods loading arms" },
  { icon: "⚓", title: "Marine Access", desc: "Ship, barge & stage gangway solutions" },
  { icon: "🛡️", title: "Safety Cages", desc: "Gangways, fall protection & enclosures" },
  { icon: "📋", title: "Our Process", desc: "How Carbis engineers and delivers projects" },
  { icon: "📁", title: "Case Studies", desc: "Real-world safety solutions in action" },
];

export default function ProductCards() {
  return (
    <>
      <style>{`
        .carbis-cards-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(3, 1fr);
        }
        @media (max-width: 640px) {
          .carbis-cards-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }
        @media (max-width: 360px) {
          .carbis-cards-grid {
            grid-template-columns: 1fr;
          }
        }
        .carbis-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 14px;
          padding: 16px 18px;
          transition: box-shadow 0.2s, border-color 0.2s;
          cursor: default;
        }
        .carbis-card:hover {
          border-color: #CE191E;
          box-shadow: 0 4px 16px rgba(206,25,30,0.12);
        }
        @media (max-width: 640px) {
          .carbis-card {
            padding: 12px 14px;
            border-radius: 12px;
          }
        }
      `}</style>
      <div className="carbis-cards-grid">
        {CARDS.map((c) => (
          <div key={c.title} className="carbis-card">
            <div style={{ fontSize: "clamp(18px, 4vw, 22px)", marginBottom: 8 }}>{c.icon}</div>
            <div style={{ fontWeight: 700, color: "#111827", fontSize: "clamp(12.5px, 2.5vw, 14px)", marginBottom: 4 }}>{c.title}</div>
            <div style={{ color: "#6b7280", fontSize: "clamp(11px, 2.2vw, 12.5px)", lineHeight: 1.5 }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}
