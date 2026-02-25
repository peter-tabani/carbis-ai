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
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      }}
    >
      {CARDS.map((c) => (
        <div
          key={c.title}
          style={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: 14,
            padding: "16px 18px",
            transition: "box-shadow 0.2s, border-color 0.2s",
            cursor: "default",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "#CE191E";
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(206,25,30,0.12)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb";
            (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
          }}
        >
          <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
          <div style={{ fontWeight: 700, color: "#111827", fontSize: 14, marginBottom: 4 }}>{c.title}</div>
          <div style={{ color: "#6b7280", fontSize: 12.5, lineHeight: 1.5 }}>{c.desc}</div>
        </div>
      ))}
    </div>
  );
}
