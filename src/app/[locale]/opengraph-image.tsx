import { ImageResponse } from "next/og";

export const alt = "Chameleon Engine — revenue & automation web apps";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLORS = ["#C8F45A", "#FF8A4C", "#4FD8F0", "#B49CFF"];

/** Social preview (Telegram, Slack, LinkedIn, X…) for every locale. */
export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0A0B0A", color: "#F2F1EA" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 600 }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, background: "#C8F45A" }} />
          Chameleon<span style={{ color: "#C8F45A", fontWeight: 800 }}>Engine</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 78, fontWeight: 800, letterSpacing: -3, lineHeight: 1.02 }}>
          <span>Don’t just launch a website.</span>
          <span style={{ color: "#C8F45A" }}>Deploy a 24/7 revenue engine.</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 28, color: "#9C9E95" }}>
          <span>Calculator · Checkout · Lead alerts · Dashboard · EN / RU / UZ</span>
          <div style={{ display: "flex", gap: 10 }}>
            {COLORS.map(c => <div key={c} style={{ width: 28, height: 28, borderRadius: 14, background: c }} />)}
          </div>
        </div>
      </div>
    ),
    size
  );
}
