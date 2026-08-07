import { Phone, Mail, MapPin } from "lucide-react";
import { C } from "../constants/constants";

export function TopBar() {
  return (
    <div style={{ backgroundColor: C.steel }} className="hidden sm:flex justify-end gap-6 px-8 py-1.5 text-[12px] text-white/70">
      <span className="flex items-center gap-1.5"><Phone size={12} /> +91 98765 43210</span>
      <span className="flex items-center gap-1.5"><Mail size={12} /> info@silvermullerseals.com</span>
      <span className="flex items-center gap-1.5"><MapPin size={12} /> Kundli Industrial Estate, Sonepat, Haryana</span>
    </div>
  );
}
