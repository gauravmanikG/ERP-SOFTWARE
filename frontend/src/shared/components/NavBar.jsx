import { useState, useEffect, useRef } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { C, NAV } from "../constants/constants";

export function NavBar({ page, setPage }) {
  const [open, setOpen] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const go = (p, anchor) => {
    setPage(p);
    setOpen(null);
    setMobileOpen(false);
    if (anchor) {
      setTimeout(() => {
        document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 60);
    } else {
      window.scrollTo({ top: 0 });
    }
  };

  return (
    <nav ref={ref} style={{ backgroundColor: C.red }} className="relative z-30 shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6">
        <div className="hidden md:flex">
          {NAV.map((item) => (
            <div key={item.label} className="relative">
              <button
                onClick={() => (item.items ? setOpen(open === item.label ? null : item.label) : go(item.page))}
                className="flex items-center gap-1 px-4 py-3.5 text-sm font-semibold text-white/90 hover:bg-black/10 transition whitespace-nowrap"
              >
                {item.label}
                {item.items && <ChevronDown size={14} className={`transition ${open === item.label ? "rotate-180" : ""}`} />}
              </button>
              {item.items && open === item.label && (
                <div className="absolute left-0 top-full bg-white shadow-lg rounded-b-md overflow-hidden min-w-[220px] border-t-2" style={{ borderColor: C.gold }}>
                  {item.items.map((sub) => (
                    <button
                      key={sub.label}
                      onClick={() => go(sub.page || item.page, sub.anchor)}
                      className="block w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-[color:var(--r)] transition"
                      style={{ "--r": C.red }}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        <button className="md:hidden text-white py-3" onClick={() => setMobileOpen((v) => !v)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
      {mobileOpen && (
        <div className="md:hidden bg-white border-t" style={{ borderColor: C.line }}>
          {NAV.map((item) => (
            <div key={item.label} className="border-b" style={{ borderColor: C.line }}>
              <button onClick={() => go(item.page)} className="w-full text-left px-5 py-3 font-semibold text-sm" style={{ color: C.ink }}>
                {item.label}
              </button>
              {item.items && (
                <div className="pb-2">
                  {item.items.map((sub) => (
                    <button key={sub.label} onClick={() => go(sub.page || item.page, sub.anchor)} className="block w-full text-left px-8 py-1.5 text-sm text-slate-500">
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </nav>
  );
}
