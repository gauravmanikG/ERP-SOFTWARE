import { Factory } from "lucide-react";
import { C } from "../../../shared/constants/constants";
import { PageHero } from "../../../shared/components/PageHero";
import { Section } from "../../../shared/components/Section";

export function AboutPage() {
  return (
    <>
      <PageHero title="Company" subtitle="Three decades of sealing solutions, built on precision and trust." />
      <Section id="about-us" kicker="Who we are" title="About Us">
        <p className="text-slate-600 max-w-3xl leading-relaxed mb-4">
          Founded in 1994, Silver Muller Seals LLP began as a small precision-molding workshop in Sonepat
          and has grown into one of North India's leading manufacturers of industrial oil seals, gaskets
          and custom rubber-to-metal bonded components. Our components are engineered into transmissions,
          hydraulic pumps and engine assemblies used by OEMs across India, the Middle East and Southeast Asia.
        </p>
        <p className="text-slate-600 max-w-3xl leading-relaxed">
          Every seal that leaves our plant carries the same principle we started with: a component is only
          as good as its weakest tolerance. That discipline is why our rejection rate has stayed under 0.3%
          for six consecutive years.
        </p>
      </Section>
      <Section id="leadership" kicker="Governance" title="Leadership">
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            ["R. K. Muller", "Managing Director"],
            ["Anita Verma", "Director, Operations"],
            ["Sanjay Bhatia", "Director, Quality & Compliance"],
          ].map(([name, role]) => (
            <div key={name} className="bg-white rounded-lg border p-6 text-center" style={{ borderColor: C.line }}>
              <div className="w-16 h-16 mx-auto rounded-full mb-3" style={{ backgroundColor: C.redSoft }} />
              <div className="font-bold" style={{ color: C.ink }}>{name}</div>
              <div className="text-sm text-slate-500">{role}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section id="infrastructure" kicker="Facilities" title="Infrastructure">
        <div className="grid sm:grid-cols-2 gap-6">
          {[
            ["Plant I — Molding & Extrusion", "40,000 sq. ft. facility housing 32 injection and compression molding presses."],
            ["Plant II — Precision Machining", "CNC turning and grinding lines for metal seal casings and inserts."],
            ["In-house Tool Room", "Design and fabrication of molds and dies, cutting external tooling lead time by 60%."],
            ["Testing & R&D Lab", "Environmental, pressure and endurance testing to IATF 16949 standards."],
          ].map(([t, d]) => (
            <div key={t} className="flex gap-3">
              <Factory size={20} className="shrink-0 mt-1" style={{ color: C.red }} />
              <div>
                <div className="font-semibold" style={{ color: C.ink }}>{t}</div>
                <div className="text-sm text-slate-500">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section id="csr" kicker="Community" title="CSR Initiatives">
        <p className="text-slate-600 max-w-3xl leading-relaxed">
          Through the Silver Muller Foundation, we run vocational training programs for ITI graduates in
          Sonepat district, and fund a scholarship for engineering students from families of our plant workers.
        </p>
      </Section>
    </>
  );
}
