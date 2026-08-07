import { CheckCircle2, FlaskConical } from "lucide-react";
import { C } from "../../../shared/constants/constants";
import { PageHero } from "../../../shared/components/PageHero";
import { Section } from "../../../shared/components/Section";

export function QualityPage() {
  return (
    <>
      <PageHero title="Quality" subtitle="Certified processes, tested to destruction before they ever ship." />
      <Section id="policy" kicker="Commitment" title="Quality Policy">
        <p className="text-slate-600 max-w-3xl leading-relaxed">
          Silver Muller Seals LLP is committed to delivering zero-defect sealing solutions through
          statistical process control, continuous training and supplier qualification at every tier
          of our value chain.
        </p>
      </Section>
      <Section id="certifications" kicker="Standards" title="Certifications">
        <div className="grid sm:grid-cols-3 gap-4">
          {["ISO 9001:2015", "IATF 16949:2016", "ISO 14001:2015"].map((c) => (
            <div key={c} className="flex items-center gap-2 bg-white border rounded-lg px-4 py-3" style={{ borderColor: C.line }}>
              <CheckCircle2 size={18} style={{ color: C.gold }} />
              <span className="font-semibold text-sm" style={{ color: C.ink }}>{c}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section id="lab" kicker="Validation" title="Testing Lab">
        <div className="flex gap-3">
          <FlaskConical size={20} className="shrink-0 mt-1" style={{ color: C.red }} />
          <p className="text-slate-600 max-w-2xl">
            Every batch is validated for compression set, hardness, thermal aging and pressure endurance
            before release to production lines.
          </p>
        </div>
      </Section>
    </>
  );
}
