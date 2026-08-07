import {
  Quote, Briefcase, Download, Award, Users, Globe2, Factory, ShieldCheck,
} from "lucide-react";

// ---------------------------------------------------------------- tokens --
export const C = {
  red: "#8F1D24",
  redDark: "#6B171C",
  redSoft: "#FBEAEA",
  gold: "#C9972B",
  ink: "#201E1D",
  steel: "#24272B",
  steelSoft: "#3A3F45",
  bg: "#F7F5F1",
  line: "#E7E2D9",
};

// ---------------------------------------------------------------- content --
export const NAV = [
  { label: "Home", page: "home" },
  {
    label: "Company",
    page: "about",
    items: [
      { label: "About Us", anchor: "about-us" },
      { label: "Leadership", anchor: "leadership" },
      { label: "Infrastructure", anchor: "infrastructure" },
      { label: "CSR", anchor: "csr" },
    ],
  },
  {
    label: "Products",
    page: "products",
    items: [
      { label: "Oil Seals", anchor: "oil-seals" },
      { label: "Rubber Gaskets", anchor: "gaskets" },
      { label: "Custom Molded Parts", anchor: "custom" },
      { label: "Product Catalog", anchor: "catalog" },
    ],
  },
  {
    label: "Quality",
    page: "quality",
    items: [
      { label: "Quality Policy", anchor: "policy" },
      { label: "Certifications", anchor: "certifications" },
      { label: "Testing Lab", anchor: "lab" },
    ],
  },
  {
    label: "Careers",
    page: "careers",
    items: [
      { label: "Current Openings", anchor: "openings" },
      { label: "Life at SMS", anchor: "life" },
      { label: "Internships", anchor: "internships" },
    ],
  },
  {
    label: "Media",
    page: "media",
    items: [
      { label: "News & Notices", anchor: "news" },
      { label: "Gallery", anchor: "gallery" },
      { label: "Events", anchor: "events" },
    ],
  },
  { label: "Contact", page: "contact" },
  {
    label: "Admin",
    page: "company-master-form",
    items: [
      { label: "Entry Form (Screen 1)", page: "company-master-form" },
      { label: "Records (Screen 2)", page: "company-master-list" },
      { label: "Inventory Slips", page: "inventory-transactions" },
    ],
  },
];

export const NOTICES = [
  "Tender for CNC machinery procurement — last date 15 Aug 2026",
  "Recruitment drive for Quality Engineers — apply by 20 Aug 2026",
  "Plant maintenance shutdown scheduled: 10–12 Aug 2026",
  "SMS Seals featured at IMTEX 2026 industrial expo, Bengaluru",
];

export const QUICK_LINKS = [
  { label: "Request a Quote", icon: Quote, page: "contact" },
  { label: "Careers", icon: Briefcase, page: "careers" },
  { label: "Product Catalog", icon: Download, page: "products" },
  { label: "Quality Certifications", icon: Award, page: "quality" },
  { label: "Dealer Login", icon: Users, page: "contact" },
  { label: "Export Enquiry", icon: Globe2, page: "contact" },
  { label: "Plant Tour", icon: Factory, page: "about" },
  { label: "CSR Initiatives", icon: ShieldCheck, page: "about" },
];
