export function getNextCompanyCode(records = []) {
  let maxSeq = 0;
  (records || []).forEach((r) => {
    if (r && r.companyCode) {
      const match = String(r.companyCode).match(/CMP-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  });
  const nextSeq = maxSeq + 1;
  return `CMP-${String(nextSeq).padStart(3, "0")}`;
}

export const CM_BASIC_FIELDS = [
  { key: "companyCode", label: "Company Code", type: "text", placeholder: "CMP-001", required: true, readOnly: true },
  { key: "companyName", label: "Company Name", type: "text", placeholder: "Silver Muller Seals LLP", required: true },
  { key: "legalName", label: "Legal Name", type: "text", placeholder: "Silver Muller Seals LLP" },
  { key: "shortName", label: "Short Name", type: "text", placeholder: "SMS" },
  { key: "businessType", label: "Business Type", type: "text", placeholder: "Manufacturing" },
  { key: "industry", label: "Industry", type: "text", placeholder: "Rubber/Oil Seal Manufacturing" },
];

export const CM_LEGAL_FIELDS = [
  { key: "panNo", label: "PAN No.", type: "text", required: true },
  { key: "gstin", label: "GSTIN", type: "text", required: true },
  { key: "cinLlpin", label: "CIN / LLPIN", type: "text" },
  { key: "tan", label: "TAN", type: "text" },
  { key: "msmeRegistration", label: "MSME Registration", type: "text" },
  { key: "factoryLicenseNo", label: "Factory License No.", type: "text" },
  { key: "iec", label: "Import Export Code (IEC)", type: "text" },
  { key: "pfEstablishmentCode", label: "PF Establishment Code", type: "text" },
  { key: "esiCode", label: "ESI Code", type: "text" },
  { key: "professionalTaxNo", label: "Professional Tax No.", type: "text" },
  { key: "pollutionCertificateNo", label: "Pollution Certificate No.", type: "text" },
];

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

export const CM_ADDRESS_FIELDS = [
  { key: "registeredOffice", label: "Registered Office", type: "textarea", required: true },
  { key: "factoryAddress", label: "Factory Address", type: "textarea" },
  { key: "branchAddress", label: "Branch Address", type: "textarea" },
  {
    key: "country",
    label: "Country",
    type: "select",
    required: true,
    options: ["India", "Other"],
  },
  {
    key: "otherCountry",
    label: "Specify Country Name",
    type: "text",
    required: true,
    placeholder: "e.g. United States, Germany, Japan",
  },
  {
    key: "state",
    label: "State",
    type: "select",
    required: true,
    options: INDIAN_STATES,
  },
  { key: "city", label: "City", type: "text", required: true },
  { key: "pinCode", label: "PIN Code", type: "text" },
];

export const CM_TABS = [
  { id: "legal", label: "Legal Information", fields: CM_LEGAL_FIELDS },
  { id: "address", label: "Address Details", fields: CM_ADDRESS_FIELDS },
];

export const cmEmptyRecord = (records = []) => {
  const rec = { status: "Active", logo: "" };
  CM_BASIC_FIELDS.forEach((f) => (rec[f.key] = f.key === "businessType" ? "Manufacturing" : ""));
  CM_LEGAL_FIELDS.forEach((f) => (rec[f.key] = ""));
  CM_ADDRESS_FIELDS.forEach((f) => (rec[f.key] = f.key === "country" ? "India" : ""));
  rec.otherCountry = "";
  rec.companyCode = getNextCompanyCode(records);
  return rec;
};

