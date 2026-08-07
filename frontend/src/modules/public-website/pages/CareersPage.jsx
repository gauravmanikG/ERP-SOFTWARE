import { C } from "../../../shared/constants/constants";
import { PageHero } from "../../../shared/components/PageHero";
import { Section } from "../../../shared/components/Section";

export function CareersPage() {
  const openings = [
    ["Quality Engineer", "Sonepat Plant · Full-time", "20 Aug 2026"],
    ["CNC Machine Operator", "Sonepat Plant · Full-time", "10 Aug 2026"],
    ["Export Documentation Executive", "Head Office · Full-time", "25 Aug 2026"],
  ];
  return (
    <>
      <PageHero title="Careers" subtitle="Build the components that keep industry moving." />
      <Section id="openings" kicker="Join us" title="Current Openings">
        <div className="space-y-3">
          {openings.map(([role, meta, date]) => (
            <div key={role} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border rounded-lg px-5 py-4" style={{ borderColor: C.line }}>
              <div>
                <div className="font-bold" style={{ color: C.ink }}>{role}</div>
                <div className="text-sm text-slate-500">{meta}</div>
              </div>
              <div className="text-xs text-slate-400 mt-2 sm:mt-0">Apply by {date}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section id="life" kicker="Culture" title="Life at SMS">
        <p className="text-slate-600 max-w-3xl leading-relaxed">
          Safety-first shop floors, in-house skill certification and a plant canteen that's genuinely
          fought over at lunchtime — our people stay because the work has visible impact.
        </p>
      </Section>
      <Section id="internships" kicker="Students" title="Internships">
        <p className="text-slate-600 max-w-3xl leading-relaxed">
          We host 6-month internships for mechanical and polymer engineering students in our tool room,
          quality lab and production planning teams.
        </p>
      </Section>
    </>
  );
}
