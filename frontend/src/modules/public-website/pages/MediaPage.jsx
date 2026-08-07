import { C, NOTICES } from "../../../shared/constants/constants";
import { PageHero } from "../../../shared/components/PageHero";
import { Section } from "../../../shared/components/Section";
import { SealMark } from "../../../shared/components/SealMark";

export function MediaPage() {
  return (
    <>
      <PageHero title="Media" subtitle="News, notices and moments from the plant floor." />
      <Section id="news" kicker="Latest" title="News & Notices">
        <ul className="space-y-3">
          {NOTICES.map((n) => (
            <li key={n} className="bg-white border rounded-lg px-5 py-3 text-sm text-slate-600" style={{ borderColor: C.line }}>{n}</li>
          ))}
        </ul>
      </Section>
      <Section id="gallery" kicker="On site" title="Gallery">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg flex items-center justify-center" style={{ backgroundColor: C.redSoft }}>
              <SealMark size={60} stroke={C.red} opacity={0.5} />
            </div>
          ))}
        </div>
      </Section>
      <Section id="events" kicker="Calendar" title="Events">
        <p className="text-slate-600">IMTEX 2026 Industrial Expo, Annual Vendor Meet, and Safety Week — see Home for dates.</p>
      </Section>
    </>
  );
}
