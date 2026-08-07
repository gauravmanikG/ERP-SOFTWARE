import { useState } from "react";
import { MapPin, Phone, Mail, CheckCircle2 } from "lucide-react";
import { C } from "../../../shared/constants/constants";
import { PageHero } from "../../../shared/components/PageHero";
import { Section } from "../../../shared/components/Section";

export function ContactPage() {
  const [sent, setSent] = useState(false);
  return (
    <>
      <PageHero title="Contact" subtitle="Get a quote, request a catalog, or just say hello." />
      <Section>
        <div className="grid md:grid-cols-2 gap-10">
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <MapPin size={20} style={{ color: C.red }} className="mt-0.5" />
              <div className="text-sm text-slate-600">
                Plot No. 52, Sector-53, Phase-V<br />HSIIDC Industrial Estate, Kundli<br />Sonepat, Haryana – 131028, India
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={20} style={{ color: C.red }} />
              <span className="text-sm text-slate-600">+91 98765 43210</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail size={20} style={{ color: C.red }} />
              <span className="text-sm text-slate-600">info@silvermullerseals.com</span>
            </div>
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); setSent(true); }}
            className="bg-white border rounded-lg p-6 space-y-4"
            style={{ borderColor: C.line }}
          >
            {sent ? (
              <div className="text-sm font-semibold flex items-center gap-2" style={{ color: C.red }}>
                <CheckCircle2 size={18} /> Thanks — your enquiry has been noted. We'll get back within 2 business days.
              </div>
            ) : (
              <>
                <input required placeholder="Your name" className="w-full border rounded px-3 py-2 text-sm" style={{ borderColor: C.line }} />
                <input required type="email" placeholder="Email address" className="w-full border rounded px-3 py-2 text-sm" style={{ borderColor: C.line }} />
                <textarea required rows={4} placeholder="Tell us what you need" className="w-full border rounded px-3 py-2 text-sm" style={{ borderColor: C.line }} />
                <button type="submit" className="px-5 py-2.5 rounded text-white font-semibold text-sm" style={{ backgroundColor: C.red }}>
                  Send Enquiry
                </button>
              </>
            )}
          </form>
        </div>
      </Section>
    </>
  );
}
