import { useId } from "react";

const LOGO_SRC = "/silver-brain-icon.png?v=4"; // same real brand asset used in GlobalTopHeader

// Approximate position (in % of the logo's own box) of the four circuit "nodes" on the
// red half of the mark, and the central hub where both halves meet. Read off the actual
// artwork so the sparks travel along the printed circuit lines, not just float randomly.
const NODES = [
  { x: 38.5, y: 20.9 },
  { x: 21.8, y: 37.4 },
  { x: 21.8, y: 61.9 },
  { x: 30.6, y: 78.4 }
];
const HUB = { x: 62.6, y: 49.6 };

const RING_DOTS = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2;
  return { x: 50 + Math.cos(angle) * 50, y: 50 + Math.sin(angle) * 50, red: i % 3 === 0 };
});

/**
 * The real Silver Brain mark, lit up: a soft pulsing halo, a slow orbiting ring, a light
 * sweep masked to the logo's own silhouette, and small sparks that travel along the
 * artwork's own circuit lines into the central hub — built from the brand PNG (so it
 * reads as the real logo), not a redrawn icon.
 */
export function BrainLogoMark({ size = 112 }) {
  const uid = useId().replace(/[:]/g, "");

  return (
    <div style={{ position: "relative", width: size, height: size, animation: "sbLogoIn 0.7s ease forwards" }}>
      {/* ambient pulsing halo */}
      <div
        style={{
          position: "absolute", inset: -size * 0.22, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(197,31,40,0.32), rgba(197,31,40,0) 70%)",
          filter: "blur(2px)", animation: "sbGlowPulse 2.6s ease-in-out infinite"
        }}
      />

      {/* slow orbiting ring of dots */}
      <div style={{ position: "absolute", inset: -size * 0.16, animation: "sbSpin 14s linear infinite" }}>
        {RING_DOTS.map((d, i) => (
          <span
            key={i}
            style={{
              position: "absolute", left: `${d.x}%`, top: `${d.y}%`, width: 4, height: 4,
              borderRadius: "50%", transform: "translate(-50%, -50%)",
              background: d.red ? "#c51f28" : "#94a3b8", opacity: 0.55,
              animation: "sbDotPulse 2.4s ease-in-out infinite", animationDelay: `${i * 0.18}s`
            }}
          />
        ))}
      </div>

      {/* the real logo artwork */}
      <img
        src={LOGO_SRC} alt="Silver Brain"
        style={{ position: "relative", zIndex: 2, width: "100%", height: "100%", objectFit: "contain", display: "block", filter: "drop-shadow(0 10px 22px rgba(15,23,42,0.22))" }}
      />

      {/* light sweep, masked to the logo's own silhouette so it only shines where the mark is */}
      <div
        style={{
          position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
          WebkitMaskImage: `url(${LOGO_SRC})`, maskImage: `url(${LOGO_SRC})`,
          WebkitMaskSize: "contain", maskSize: "contain",
          WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
          WebkitMaskPosition: "center", maskPosition: "center",
          background: "linear-gradient(115deg, transparent 32%, rgba(255,255,255,0.85) 48%, rgba(255,255,255,0.85) 52%, transparent 68%)",
          backgroundSize: "260% 260%", animation: "sbShimmer 3.4s ease-in-out infinite"
        }}
      />

      {/* hub glow — the point where the circuit lines converge */}
      <div
        style={{
          position: "absolute", zIndex: 4, left: `${HUB.x}%`, top: `${HUB.y}%`, width: size * 0.16, height: size * 0.16,
          transform: "translate(-50%, -50%)", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.9), rgba(197,31,40,0.55) 55%, rgba(197,31,40,0) 75%)",
          animation: "sbHubPulse 1.8s ease-in-out infinite"
        }}
      />

      {/* sparks travelling from each circuit node into the hub */}
      {NODES.map((n, i) => (
        <span
          key={i}
          style={{
            position: "absolute", zIndex: 4, width: 6, height: 6, borderRadius: "50%",
            background: "#fff", boxShadow: "0 0 8px 2px rgba(197,31,40,0.85)",
            animation: `sbSpark${uid}${i} 3.6s ease-in-out infinite`, animationDelay: `${i * 0.85}s`
          }}
        />
      ))}

      <style>{`
        @keyframes sbLogoIn { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes sbGlowPulse { 0%, 100% { opacity: 0.55; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1.08); } }
        @keyframes sbSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes sbDotPulse { 0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 0.9; transform: translate(-50%, -50%) scale(1.6); } }
        @keyframes sbShimmer { 0% { background-position: -140% -140%; } 55%, 100% { background-position: 140% 140%; } }
        @keyframes sbHubPulse { 0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(0.85); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.15); } }
        ${NODES.map((n, i) => `
          @keyframes sbSpark${uid}${i} {
            0% { left: ${n.x}%; top: ${n.y}%; opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
            12% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            78% { left: ${HUB.x}%; top: ${HUB.y}%; opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { left: ${HUB.x}%; top: ${HUB.y}%; opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          }
        `).join("\n")}
      `}</style>
    </div>
  );
}
