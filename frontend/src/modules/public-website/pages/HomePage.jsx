import { ArrowRight, Newspaper, Award, Globe2 } from "lucide-react";
import { C, NOTICES, QUICK_LINKS } from "../../../shared/constants/constants";
import { SealMark } from "../../../shared/components/SealMark";
import { Ticker } from "../../../shared/components/Ticker";

export function HomePage({ setPage }) {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden" style={{ backgroundColor: C.redSoft }}>
        <SealMark size={340} stroke={C.red} opacity={0.08} className="absolute -right-20 -top-20" />
        <SealMark size={220} stroke={C.gold} opacity={0.12} className="absolute left-[-60px] bottom-[-60px]" />
        <div className="relative max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: C.red }}>
              ISO 9001:2015 · IATF 16949 Certified
            </div>
            <h1 className="text-4xl sm:text-5xl font-black leading-tight mb-4" style={{ color: C.ink }}>
              Engineering the seal <br /> that holds everything together.
            </h1>
            <p className="text-slate-600 mb-8 max-w-md">
              Three decades of precision oil seals, gaskets and custom-molded rubber components,
              trusted by automotive and heavy-machinery manufacturers across 20+ countries.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setPage("products")} className="px-5 py-2.5 rounded text-white font-semibold text-sm flex items-center gap-2" style={{ backgroundColor: C.red }}>
                Explore Products <ArrowRight size={16} />
              </button>
              <button onClick={() => setPage("contact")} className="px-5 py-2.5 rounded font-semibold text-sm border-2" style={{ borderColor: C.red, color: C.red }}>
                Request a Quote
              </button>
            </div>
          </div>
          <div className="hidden md:flex justify-center">
            <SealMark size={280} stroke={C.red} />
          </div>
        </div>
      </section>

      <Ticker />

      {/* Quick links */}
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 sm:grid-cols-4 gap-5">
        {QUICK_LINKS.map(({ label, icon: Icon, page }) => (
          <button
            key={label}
            onClick={() => setPage(page)}
            className="group flex flex-col items-center justify-center gap-3 py-8 rounded-lg text-white text-center font-semibold text-sm transition hover:-translate-y-0.5"
            style={{ backgroundColor: C.red }}
          >
            <Icon size={30} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      {/* Stats strip */}
      <div style={{ backgroundColor: C.steel }} className="text-white">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[["30+", "Years in operation"], ["1,200+", "SKUs manufactured"], ["20+", "Export countries"], ["450", "Employees"]].map(([n, l]) => (
            <div key={l}>
              <div className="text-3xl font-black" style={{ color: C.gold }}>{n}</div>
              <div className="text-xs uppercase tracking-wide text-white/60 mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Notice / Events / Media three-up, echoing the reference layout */}
      <div className="max-w-7xl mx-auto px-6 py-14 grid md:grid-cols-3 gap-6">
        {[
          { title: "Notice", icon: Newspaper, items: NOTICES.slice(0, 3) },
          {
            title: "Events",
            icon: Award,
            items: ["IMTEX 2026 Industrial Expo — 27–31 Jul, Bengaluru", "Annual Vendor Meet — 14 Aug, Plant Auditorium", "Safety Week Observance — 4–10 Sep"],
          },
          {
            title: "Media",
            icon: Globe2,
            items: ["SMS Seals wins Export Excellence Award 2026", "New molding line commissioned at Plant II", "Featured in Industrial Manufacturing Weekly"],
          },
        ].map(({ title, icon: Icon, items }) => (
          <div key={title} className="bg-white rounded-lg border p-6" style={{ borderColor: C.line }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-lg flex items-center gap-2" style={{ color: C.ink }}>
                <Icon size={18} style={{ color: C.red }} /> {title}
              </h3>
              <button onClick={() => setPage("media")} className="text-xs font-semibold" style={{ color: C.red }}>View all</button>
            </div>
            <ul className="space-y-3">
              {items.map((it) => (
                <li key={it} className="text-sm text-slate-600 border-b pb-3 last:border-0" style={{ borderColor: C.line }}>{it}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}
