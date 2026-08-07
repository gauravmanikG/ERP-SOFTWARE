import { useState, useEffect } from "react";
import { C, NOTICES } from "../constants/constants";

export function Ticker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % NOTICES.length), 4200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex items-stretch text-sm" style={{ backgroundColor: C.gold }}>
      <div className="px-4 py-2 font-bold text-white shrink-0 flex items-center gap-2 uppercase text-xs tracking-wide" style={{ backgroundColor: C.redDark }}>
        Notice
      </div>
      <div className="flex-1 px-4 py-2 overflow-hidden relative h-[34px]">
        {NOTICES.map((n, idx) => (
          <div
            key={idx}
            className="absolute inset-0 px-4 flex items-center transition-opacity duration-500"
            style={{ opacity: idx === i ? 1 : 0, color: C.ink }}
          >
            {n}
          </div>
        ))}
      </div>
    </div>
  );
}
