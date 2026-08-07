import { Cog, ShieldCheck, Factory, Download } from "lucide-react";
import { C } from "../../../shared/constants/constants";
import { PageHero } from "../../../shared/components/PageHero";
import { Section } from "../../../shared/components/Section";

export function ProductsPage({ setPage }) {
  const groups = [
    { id: "oil-seals", title: "Oil Seals", desc: "Rotary shaft seals in NBR, FKM and silicone for engines, gearboxes and hydraulic pumps.", icon: Cog },
    { id: "gaskets", title: "Rubber Gaskets", desc: "Cut and molded gaskets for engine covers, flanges and industrial enclosures.", icon: ShieldCheck },
    { id: "custom", title: "Custom Molded Parts", desc: "Rubber-to-metal bonded components engineered to customer drawings and tolerances.", icon: Factory },
  ];
  return (
    <>
      <PageHero title="Products" subtitle="Precision-engineered sealing components across three core lines." />
      {groups.map((g) => (
        <Section key={g.id} id={g.id} kicker="Product line" title={g.title}>
          <div className="flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-full sm:w-40 h-28 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: C.redSoft }}>
              <g.icon size={40} style={{ color: C.red }} />
            </div>
            <p className="text-slate-600 max-w-2xl leading-relaxed">{g.desc}</p>
          </div>
        </Section>
      ))}
      <Section id="catalog" kicker="Documentation" title="Product Catalog">
        <button onClick={() => setPage("contact")} className="inline-flex items-center gap-2 px-5 py-2.5 rounded text-white font-semibold text-sm" style={{ backgroundColor: C.red }}>
          <Download size={16} /> Request Full Catalog (PDF)
        </button>
      </Section>
    </>
  );
}
