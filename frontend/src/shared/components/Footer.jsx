import { Phone, Mail } from "lucide-react";
import { C } from "../constants/constants";
import { SealMark } from "./SealMark";

export function Footer({ setPage }) {
  return (
    <footer style={{ backgroundColor: C.steel }} className="text-white/80 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <SealMark size={34} stroke={C.gold} />
            <span className="font-black text-white">SILVER MULLER SEALS LLP</span>
          </div>
          <p className="text-sm leading-relaxed text-white/60">
            Manufacturing precision oil seals, gaskets and custom molded rubber components for the automotive,
            heavy machinery and industrial sectors since 1994.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            {["about", "products", "quality", "careers", "contact"].map((p) => (
              <li key={p}>
                <button onClick={() => setPage(p)} className="hover:text-white capitalize transition">{p}</button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Plant Address</h4>
          <p className="text-sm text-white/60 leading-relaxed">
            Plot No. 52, Sector-53, Phase-V<br />HSIIDC Industrial Estate, Kundli<br />Sonepat, Haryana – 131028, India
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Get in Touch</h4>
          <p className="text-sm text-white/60 flex items-center gap-2 mb-2"><Phone size={14} /> +91 98765 43210</p>
          <p className="text-sm text-white/60 flex items-center gap-2"><Mail size={14} /> info@silvermullerseals.com</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/40">
        © 2026 Silver Muller Seals LLP. All rights reserved.
      </div>
    </footer>
  );
}
