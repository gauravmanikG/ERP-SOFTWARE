import { C } from "../constants/constants";

// seal-ring motif, the visual signature tying every page back to the
// company's core product: a mechanical seal cross-section
export function SealMark({ size = 120, stroke = C.gold, opacity = 1, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" className={className} style={{ opacity }}>
      <circle cx="60" cy="60" r="56" fill="none" stroke={stroke} strokeWidth="2" />
      <circle cx="60" cy="60" r="44" fill="none" stroke={stroke} strokeWidth="1.5" strokeDasharray="4 5" />
      <circle cx="60" cy="60" r="30" fill="none" stroke={stroke} strokeWidth="4" />
      <circle cx="60" cy="60" r="8" fill={stroke} />
    </svg>
  );
}
