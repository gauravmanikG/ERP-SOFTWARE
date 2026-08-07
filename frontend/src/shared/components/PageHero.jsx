import { C } from "../constants/constants";
import { SealMark } from "./SealMark";

export function PageHero({ title, subtitle }) {
  return (
    <div className="relative overflow-hidden" style={{ backgroundColor: C.steel }}>
      <SealMark size={220} stroke={C.gold} opacity={0.12} className="absolute -right-10 -top-10" />
      <div className="relative max-w-7xl mx-auto px-6 py-14">
        <h1 className="text-3xl sm:text-4xl font-black text-white">{title}</h1>
        <p className="text-white/60 mt-2 max-w-lg">{subtitle}</p>
      </div>
    </div>
  );
}
