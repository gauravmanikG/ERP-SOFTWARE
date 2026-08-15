import { C } from "../constants/constants";
import { SealMark } from "./SealMark";

export function PageHero({ title, subtitle }) {
  return (
    <div className="relative overflow-hidden shadow-md" style={{ background: "linear-gradient(135deg, #0369a1 0%, #0ea5e9 50%, #38bdf8 100%)" }}>
      <SealMark size={220} stroke="#e0f2fe" opacity={0.2} className="absolute -right-10 -top-10" />
      <div className="relative max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{title}</h1>
        <p className="text-sky-100 mt-2 max-w-lg text-sm font-medium">{subtitle}</p>
      </div>
    </div>
  );
}
