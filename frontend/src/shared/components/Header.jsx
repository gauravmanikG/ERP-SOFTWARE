import { C } from "../constants/constants";
import { SealMark } from "./SealMark";

export function Header({ page, setPage }) {
  return (
    <div className="bg-white border-b" style={{ borderColor: C.line }}>
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        <button onClick={() => setPage("home")} className="flex items-center gap-3 text-left">
          <SealMark size={46} stroke={C.red} />
          <div>
            <div className="font-black text-xl tracking-tight" style={{ color: C.ink }}>
              SILVER MULLER SEALS <span style={{ color: C.red }}>LLP</span>
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Precision Sealing Solutions Since 1994
            </div>
          </div>
        </button>
        <div className="hidden lg:block text-right text-sm text-slate-500 max-w-xs">
          An ISO 9001:2015 &amp; IATF 16949 certified manufacturer of industrial oil seals, gaskets &amp; molded rubber components
        </div>
      </div>
    </div>
  );
}
