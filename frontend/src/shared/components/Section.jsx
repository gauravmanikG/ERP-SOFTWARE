import { C } from "../constants/constants";

export function Section({ id, title, kicker, children }) {
  return (
    <section id={id} className="max-w-7xl mx-auto px-6 py-14 scroll-mt-24">
      {kicker && <div className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: C.gold }}>{kicker}</div>}
      {title && <h2 className="text-2xl sm:text-3xl font-black mb-6" style={{ color: C.ink }}>{title}</h2>}
      {children}
    </section>
  );
}
