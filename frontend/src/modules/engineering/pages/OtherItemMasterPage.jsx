

import { useResizableColumns, ResizableColGroup, ColumnResizeHandle } from "../../../shared/components/ResizableTable";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Eye,
  Pencil,
  Trash2,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Plus,
  FolderPlus,
  Layers,
  Tag,
  RefreshCw,
  FolderTree,
  Box,
  FileSpreadsheet,
  Printer
} from "lucide-react";

export const OTHER_ITEM_GROUPS_CONFIG = [
  {
    group: "Assets",
    code: "AST",
    subgroups: [
      { name: "High Valued Assets", code: "AST01" },
      { name: "Die", code: "AST02" },
      { name: "Low Valued Assets - Material Handling Objects", code: "AST03" },
      { name: "Low Valued Assets - Equipment", code: "AST04" }
    ]
  },
  {
    group: "Bought-Out Parts",
    code: "BOP",
    subgroups: [
      { name: "Mechanical Assemblies", code: "BOP01" },
      { name: "Electrical Components", code: "BOP02" },
      { name: "Electronic Modules", code: "BOP03" },
      { name: "Supporting/Accessory for FG/SFG", code: "BOP04" }
    ]
  },
  {
    group: "Consumables",
    code: "CON",
    subgroups: [
      { name: "Production Consumables", code: "CON01" },
      { name: "Maintenance Consumables", code: "CON02" },
      { name: "Quality & Lab Consumables", code: "CON03" },
      { name: "Tool Room Consumables", code: "CON04" },
      { name: "Office Consumables / Furniture & Fixture", code: "CON05" }
    ]
  },
  {
    group: "IT & Communication",
    code: "IT",
    subgroups: [
      { name: "Fresh IT Gadgets", code: "IT01" },
      { name: "Used IT Gadgets", code: "IT02" },
      { name: "Networking Devices", code: "IT03" },
      { name: "Repaired Items", code: "IT04" }
    ]
  },
  {
    group: "Maintenance, Repair & Operations",
    code: "MR",
    subgroups: [
      { name: "Mechanical Items", code: "MR01" },
      { name: "Electrical Maintenance Items", code: "MR03" },
      { name: "General Maintenance Item/Assets", code: "MR04" },
      { name: "HVAC & Air Handling Components / Air Conditioning Components", code: "MR06" },
      { name: "Utilities Spares", code: "MR08" }
    ]
  },
  {
    group: "Office & Administration",
    code: "OS",
    subgroups: [
      { name: "Housekeeping Supplies", code: "HK01" },
      { name: "Office Stationery", code: "OS01" },
      { name: "Pantry & Refreshment Items", code: "PN01" }
    ]
  },
  {
    group: "Packing Materials",
    code: "PM",
    subgroups: [
      { name: "Primary Packaging", code: "PM01" },
      { name: "Secondary Packaging", code: "PM02" },
      { name: "Packaging Raw Materials", code: "PM03" },
      { name: "Used Packaging", code: "PM04" }
    ]
  },
  {
    group: "Production",
    code: "PROD",
    subgroups: [
      { name: "Die Export", code: "PROD-01" },
      { name: "Die Domestic", code: "PROD-02" }
    ]
  },
  {
    group: "Raw Material",
    code: "RM",
    subgroups: [
      { name: "Primary Raw Materials - Tool Room", code: "RM01" },
      { name: "Primary Raw Material Compound Chemical", code: "RM02" },
      { name: "Primary Raw Material Compound Rubber", code: "RM03" },
      { name: "Primary Raw Material Finishing Spring", code: "RM04" },
      { name: "Primary Raw Material Final Part Paint", code: "RM05" },
      { name: "Primary Raw Material", code: "RM06" },
      { name: "Primary Raw Material - Sand", code: "RM07" },
      { name: "Secondary Raw Materials", code: "RM09" },
      { name: "Imported Raw Materials", code: "RM10" },
      { name: "Processed Raw Materials", code: "RM11" },
      { name: "Hazardous Raw Materials", code: "RM12" },
      { name: "Recycled Raw Materials", code: "RM13" },
      { name: "Seasonal / Project-Specific Raw Materials", code: "RM14" },
      { name: "Customer Supplied Materials", code: "RM15" }
    ]
  },
  {
    group: "Safety & PPE",
    code: "PPE",
    subgroups: [
      { name: "Personal Protective Equipment", code: "PPE01" }
    ]
  },
  {
    group: "Services",
    code: "SRV",
    subgroups: [
      { name: "Contractual/Facility Services", code: "SRV01" },
      { name: "Technical Services", code: "SRV02" },
      { name: "Professional Services", code: "SRV03" }
    ]
  },
  {
    group: "SFG",
    code: "SFG",
    subgroups: [
      { name: "OUTER METAL SHELL", code: "B01" },
      { name: "INNER METAL SHELL", code: "B02" },
      { name: "SPRING", code: "B03" },
      { name: "MIDDLE METAL SHELL", code: "B04" },
      { name: "FELT", code: "B05" },
      { name: "PTFE", code: "B06" },
      { name: "TPU/PU", code: "B07" },
      { name: "Brass Washer", code: "B08" },
      { name: "Silver Washer", code: "B09" },
      { name: "Big Washer", code: "B10" },
      { name: "Gasket", code: "B11" },
      { name: "O-Ring", code: "B12" },
      { name: "OUTER MOULDED", code: "M01" },
      { name: "INNER MOULDED", code: "M02" },
      { name: "OTHER", code: "M04" },
      { name: "SFG-TOOL ROOM", code: "SF01" }
    ]
  },
  {
    group: "Uniforms & Linen",
    code: "UNI",
    subgroups: [
      { name: "Uniforms & Textiles", code: "UNI01" }
    ]
  }
];

export const INITIAL_GROUPS_DATA = OTHER_ITEM_GROUPS_CONFIG.map((g, idx) => ({
  id: idx + 1,
  name: g.group,
  code: g.code,
  description: `${g.group} items and inventory categories`,
  subgroups: g.subgroups.map((sg, sIdx) => ({
    id: (idx + 1) * 100 + sIdx + 1,
    name: sg.name,
    code: sg.code,
    description: `${sg.name} (${sg.code})`
  }))
}));

// Bump when the sub-group configuration changes so saved browser copies are refreshed once
const GROUPS_DATA_VERSION = 2;
const GROUPS_DATA_VERSION_KEY = "SMS_OTHER_ITEM_GROUPS_DATA_VERSION";

// Sets each saved group's sub-groups from the configuration (matched by group name).
// Sub-groups the user added on this screen are kept after the configured ones.
function mergeSubgroupsFromConfig(savedGroups) {
  return savedGroups.map((g) => {
    const configured = INITIAL_GROUPS_DATA.find((d) => d.name === g.name);
    if (!configured) return g;
    const configuredNames = new Set(configured.subgroups.map((sg) => sg.name.toLowerCase()));
    const userAdded = (Array.isArray(g.subgroups) ? g.subgroups : []).filter(
      (sg) => !configuredNames.has(String(sg.name || "").toLowerCase())
    );
    return { ...g, code: g.code || configured.code, subgroups: [...configured.subgroups, ...userAdded] };
  });
}

export const DEFAULT_PROCESS_OPTIONS = [
  { code: "PR-1", label: "PR-1 : 1 : Metal Open Type : In-house" },
  { code: "PR-2", label: "PR-2 : 2 : Metal Close Type : In-house" },
  { code: "PR-3", label: "PR-3 : 5 : Half Rubber : Open" },
  { code: "PR-4", label: "PR-4 : 6 : Half Rubber : Close" },
  { code: "PR-5", label: "PR-5 : 7 : Full Rubber : Open" },
  { code: "PR-7", label: "PR-7 : 8 : Full Rubber : Close" },
  { code: "PR-8", label: "PR-8 : 9 : Cassette Seal" },
  { code: "PR-9", label: "PR-9 : 10 : Combi Seal" },
  { code: "PR-10", label: "PR-10 : 11 : PTFE Moulded (no inner shell)" },
  { code: "PR-11", label: "PR-11 : 12 : PTFE Moulded (with inner shell)" },
  { code: "PR-12", label: "PR-12 : 13 : PTFE Fitted" },
  { code: "PR-13", label: "PR-13 : 14 : Hub Seal SKF" },
  { code: "PR-14", label: "PR-14 : 15 : Hub Seal National" },
  { code: "PR-15", label: "PR-15 : 3: ABS SEAL" },
  { code: "PR-51", label: "PR-51 : 16 : PTFE Moulded (no inner shell ) Half Rubber" },
  { code: "PR-16", label: "PR-16 : NA" }
];

export const DEFAULT_HSN_OPTIONS = [
  // Rubber Products & Seals (Chapter 40)
  { code: "40169320", desc: "Rubber seals, oil seals, gaskets, washers" },
  { code: "40169330", desc: "Rubber O-rings & moulded rubber components" },
  { code: "40169340", desc: "Gaskets, washers and other seals of vulcanised rubber" },
  { code: "40169990", desc: "Other articles of vulcanised rubber (bellows, grommets, boots)" },
  { code: "40021990", desc: "Synthetic rubber compound (NBR, SBR, EPDM, FKM Viton)" },
  { code: "40051000", desc: "Compounded rubber with carbon black or silica, unvulcanised" },
  { code: "40027000", desc: "Ethylene-propylene-non-conjugated diene rubber (EPDM)" },
  { code: "40029990", desc: "Fluorocarbon elastomers (FKM Viton, FFKM)" },
  { code: "40082110", desc: "Non-cellular rubber sheets for gasket cutting" },
  { code: "4016", desc: "Vulcanised rubber articles" },

  // Plastics & PTFE / Teflon (Chapter 39)
  { code: "39269099", desc: "PTFE backup rings, guide rings, wear strips, plastic seals" },
  { code: "39046100", desc: "Polytetrafluoroethylene (PTFE) raw resin powder" },
  { code: "39232990", desc: "Packaging polythene bags & packing wraps for seals" },
  { code: "3926", desc: "Plastics articles" },

  // Iron, Steel, Springs & Fasteners (Chapters 72 & 73)
  { code: "73202000", desc: "Helical & garter springs for rotary shaft oil seals" },
  { code: "73209090", desc: "Flat springs, Belleville washers, wave springs" },
  { code: "73182100", desc: "Spring washers and other lock washers" },
  { code: "73181500", desc: "Screws, bolts, nuts, rivets, studs for tooling & assemblies" },
  { code: "73269099", desc: "Deep draw outer metal shells & metal casing inserts" },
  { code: "72283000", desc: "Alloy steel bars / rods (EN8, EN24, EN31) for tooling" },
  { code: "72091600", desc: "Cold-rolled steel coils / sheets for stamping outer casings" },
  { code: "72104900", desc: "Galvanized / zinc coated steel sheets for corrosion resistance" },
  { code: "7318", desc: "Screws, bolts, nuts, washers" },

  // Tooling, Moulds, Dies & Machinery Spares (Chapter 84)
  { code: "84807100", desc: "Injection moulds for rubber or plastics" },
  { code: "84807900", desc: "Compression moulding dies & transfer moulds for seals" },
  { code: "84841000", desc: "Gaskets of metal sheeting combined with other material" },
  { code: "84842000", desc: "Mechanical face seals for pumps and agitators" },
  { code: "84821011", desc: "Ball bearings & roller bearings for CNC & hydraulic presses" },
  { code: "84669390", desc: "Parts and accessories for machine tools / CNC chucks & collets" },
  { code: "82073000", desc: "Press tools, punches, blanking dies for power presses" },
  { code: "8484", desc: "Gaskets and joints of metal sheeting" },
  { code: "8487", desc: "Machinery parts without electrical connectors" },
  { code: "8482", desc: "Ball or roller bearings" },

  // Industrial Chemicals, Lubricants & Consumables (Chapters 27, 34, 38)
  { code: "34039900", desc: "Mould release agents, silicone sprays & anti-stick sprays" },
  { code: "27101980", desc: "Hydraulic oils (VG 68, VG 46), spindle oils, turbine oils" },
  { code: "27101990", desc: "Industrial lubricating greases (Lithium, synthetic high-temp)" },
  { code: "38249990", desc: "Rubber bonding agents (Chemlok / Megum adhesive primers)" },
  { code: "28030010", desc: "Carbon black for rubber compounding" },
  { code: "28170010", desc: "Zinc oxide (rubber grade vulcanizing activator)" },
  { code: "28020010", desc: "Sulphur powder (rubber vulcanization agent)" },

  // Services & Subcontracting (SAC Chapter 99)
  { code: "998821", desc: "Job work / Subcontracting (rubber moulding & trimming services)" },
  { code: "998822", desc: "Job work (metal stamping, casing phosphating, zinc plating)" },
  { code: "998719", desc: "Maintenance, calibration and repair of production machinery" },
  { code: "998314", desc: "Testing, lab analysis & metallurgical inspection services" }
];

export const DEFAULT_PROCUREMENT_OPTIONS = [
  "IN HOUSE",
  "OUTSOURCE",
  "BUY/INHOUSE",
  "IMPORTED"
];

export const UOM_OPTIONS = ["PCS", "NOS", "SET", "MTR", "KGS", "KG", "LTR", "BOX", "ROLL", "DRUM"];
export const STYLE_OPTIONS = ["1. Rubber", "2. Metal", "3. Other"];
export const CLASS_OPTIONS = ["High", "Medium", "Low"];

export function generateOtherItemCode(subGroupCode, mainGroupCode, existingItems = []) {
  const prefix = subGroupCode || mainGroupCode || "ITM";
  let maxSeq = 0;
  const regex = new RegExp(`^${prefix}[-_]?(\\d+)`, "i");
  if (Array.isArray(existingItems)) {
    existingItems.forEach((it) => {
      const code = it.item_code || it.sms_new_part_no || "";
      const m = code.match(regex);
      if (m && m[1]) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    });
  }
  const nextSeq = maxSeq + 1;
  return `${prefix}-${String(nextSeq).padStart(4, "0")}`;
}

const INITIAL_ITEM_FORM = {
  // Classification (Row 1) - left blank so the user picks each value
  group: "",
  subgroup: "",
  sub_subgroup: "",

  // Code Hierarchy (Row 2) - filled only after the user picks a group / sub-group
  main_group_code: "",
  group_code: "",
  sub_group_code: "",
  sub_sub_group_code: "",

  // Core Identification (Row 3)
  item_code: "",
  old_code: "",
  item_name: "",
  item_description: "",

  // Physical Dimensions (Row 4)
  inner_diameter: "",
  outer_diameter: "",
  height: "",
  thickness: "",

  // Physical & Style (Row 5)
  color: "",
  material: "",
  material_grade: "",
  style: "",

  // Technical Media (Row 6)
  drawing_no: "",
  drawing_image: null,
  image: null,

  // Lead Times (Row 7)
  safety_lead_time: "",
  procurement_lead_time: "",
  total_lead_time: "",

  // UOM & Opening Stock (Row 8)
  purchased_uom: "",
  consumption_uom: "",
  uom: "",
  opening_balance: "",
  current_stock: "",

  // Weights & Quality (Row 9)
  gross_wt: "",
  net_wt: "",
  item_class: "",
  rej_tolerance: "",

  // Procurement & Process (Row 10)
  procurement_type: "",
  process_type: "",
  hsn_code: "",

  // Stock Inventory Levels (Row 11)
  min_stock_lvl: "",
  max_stock_lvl: "",
  reorder_stock_lvl: "",
  min_stock: "",
  reorder_qty: "",

  // Commercials (Row 12)
  mrp: "",
  rate: "",
  unit_price: "",

  // Compatibility & Status
  category: "",
  sub_category: "",
  status: "",
  notes: "",
  default_supplier: "",
  storage_location: ""
};

const OTHER_ITEM_MASTER_PAGE_1_COLUMNS = [
  { key: "select", width: 40, min: 32 },
  { key: "handlesort_sno_s_no", width: 200 },
  { key: "handlesort_item_code_ite", width: 200 },
  { key: "handlesort_item_name_ite", width: 200 },
  { key: "handlesort_category_grou", width: 200 },
  { key: "sub_group", width: 103 },
  { key: "grade", width: 80 },
  { key: "hsn", width: 80 },
  { key: "uom", width: 80 },
  { key: "handlesort_current_stock", width: 200 },
  { key: "rate", width: 96 },
  { key: "supplier", width: 96 },
  { key: "location", width: 96 },
  { key: "status", width: 82 },
  { key: "actions", width: 100 },
];

const OTHER_ITEM_MASTER_PAGE_2_COLUMNS = [
  { key: "sr", width: 45 },
  { key: "group_name", width: 240 },
  { key: "group_code_abbr", width: 140 },
  { key: "sub_groups_count", width: 130 },
  { key: "sub_groups_list_amp_abbr", width: 200 },
  { key: "actions", width: 160 },
];

export function OtherItemMasterPage({ onBackToHome, onOpenSidebar, sidebarOpen, onNavigate }) {
  const otherItemMasterPage2Resize = useResizableColumns("other-item-master-page-2", OTHER_ITEM_MASTER_PAGE_2_COLUMNS);
  const otherItemMasterPage1Resize = useResizableColumns("other-item-master-page-1", OTHER_ITEM_MASTER_PAGE_1_COLUMNS);
  // Main Tab State: "items" (Non-FG Items List) vs "groups" (Groups & Subgroups Master)
  const [activeTab, setActiveTab] = useState("items");

  // Master item dataset stored in state directly from PostgreSQL database (no localStorage)
  const [items, setItems] = useState([]);

  // Purge any stale localStorage cached items
  useEffect(() => {
    try {
      localStorage.removeItem("SMS_OTHER_ITEM_MASTER_DATA_REAL");
    } catch {}
  }, []);

  // Fetch all existing Non-FG/Other items directly from backend PostgreSQL database
  const fetchOtherFromApi = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/inventory/items?type=OTHER");
      if (res.ok) {
        const apiItems = await res.json();
        if (Array.isArray(apiItems)) {
          const list = apiItems.map((apiIt, idx) => ({
            id: apiIt.id,
            sNo: idx + 1,
            item_code: apiIt.item_code || apiIt.sms_new_part_no || `ITM-${apiIt.id}`,
            item_name: apiIt.item_name || apiIt.description_size || "",
            description: apiIt.description_size || apiIt.item_name || "",
            category: apiIt.category || "Raw Material",
            sub_category: apiIt.subgroup || "",
            material_grade: apiIt.material || "",
            uom: apiIt.purchased_uom || apiIt.uom || "PCS",
            current_stock: 0,
            min_stock: 10,
            reorder_qty: 20,
            unit_price: Number(apiIt.price || apiIt.est_rate || 0),
            hsn_code: apiIt.hsn_code || "",
            status: "Active"
          }));
          setItems(list);
        }
      }
    } catch (err) {
      console.warn("Could not load other items from backend:", err);
    }
  };

  useEffect(() => {
    fetchOtherFromApi();
  }, []);

  // Master lists loaded dynamically from PostgreSQL / APIs with comprehensive fallback
  const [procurementList, setProcurementList] = useState(DEFAULT_PROCUREMENT_OPTIONS);
  const [processList, setProcessList] = useState(DEFAULT_PROCESS_OPTIONS);
  const [hsnList, setHsnList] = useState(DEFAULT_HSN_OPTIONS);

  useEffect(() => {
    fetch("http://localhost:4000/api/inventory/procurement-master")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const list = data.map((d) => d.procurementType || d.procurementName).filter(Boolean);
          if (list.length > 0) setProcurementList(Array.from(new Set(list)));
        }
      })
      .catch((err) => console.warn("Could not fetch procurement master:", err));

    fetch("http://localhost:4000/api/inventory/process-master")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const list = data.map((p) => ({
            code: p.processCode,
            label: `${p.processCode} : ${p.processDescription || ""}`
          }));
          if (list.length > 0) setProcessList(list);
        }
      })
      .catch((err) => console.warn("Could not fetch process master:", err));

    fetch("http://localhost:4000/api/purchase/hsn-master")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const list = data
            .map((h) => ({
              code: String(h.hsnSacCode || h.hsnCode || h.code || "").trim(),
              desc: String(h.description || h.desc || "").trim()
            }))
            .filter((h) => Boolean(h.code));
          if (list.length > 0) {
            // Merge with default list to guarantee nothing is missing
            const seen = new Set();
            const merged = [];
            list.concat(DEFAULT_HSN_OPTIONS).forEach((item) => {
              if (!seen.has(item.code)) {
                seen.add(item.code);
                merged.push(item);
              }
            });
            setHsnList(merged);
          }
        }
      })
      .catch((err) => console.warn("Could not fetch HSN master:", err));
  }, []);

  // Master Groups & Subgroups dataset state (with localStorage persistence)
  const [groups, setGroups] = useState(() => {
    try {
      const saved = localStorage.getItem("SMS_OTHER_ITEM_GROUPS_DATA_USER");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Older saved copies were stored without sub-groups; refill them once from the sheet configuration
          const savedVersion = Number(localStorage.getItem(GROUPS_DATA_VERSION_KEY) || 0);
          return savedVersion < GROUPS_DATA_VERSION ? mergeSubgroupsFromConfig(parsed) : parsed;
        }
      }
    } catch {
      // ignore
    }
    return INITIAL_GROUPS_DATA;
  });

  // Groups whose sub-group list is expanded in the Groups tab (sub-groups beyond the first few are hidden)
  const [expandedSubgroupGroups, setExpandedSubgroupGroups] = useState({});
  const SUBGROUP_PREVIEW_COUNT = 6;

  // Save groups to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("SMS_OTHER_ITEM_GROUPS_DATA_USER", JSON.stringify(groups));
      localStorage.setItem(GROUPS_DATA_VERSION_KEY, String(GROUPS_DATA_VERSION));
    } catch {
      // ignore
    }
  }, [groups]);

  // Group search term
  const [groupSearchTerm, setGroupSearchTerm] = useState("");

  // Group & Subgroup Modals State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupFormData, setGroupFormData] = useState({ name: "", code: "", description: "" });
  const [groupFormErrors, setGroupFormErrors] = useState({});

  const [isSubgroupModalOpen, setIsSubgroupModalOpen] = useState(false);
  const [editingSubgroup, setEditingSubgroup] = useState(null); // { group, subgroup }
  const [subgroupFormData, setSubgroupFormData] = useState({ groupId: "", name: "", code: "", description: "" });
  // True when the sub-group is being added from a specific group row, so the parent group is fixed
  const [subgroupParentLocked, setSubgroupParentLocked] = useState(false);
  const [subgroupFormErrors, setSubgroupFormErrors] = useState({});

  const [deleteGroupTarget, setDeleteGroupTarget] = useState(null);
  const [deleteSubgroupTarget, setDeleteSubgroupTarget] = useState(null); // { group, subgroup }

  // Selected Row IDs for bulk selection in items tab
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Global search input for items
  const [searchTerm, setSearchTerm] = useState("");

  // Category Filter Pill selection
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");

  // Per-column filter inputs
  const [colFilters, setColFilters] = useState({
    item_code: "",
    item_name: "",
    category: "",
    material_grade: "",
    hsn_code: "",
    uom: "",
    stock: "",
    unit_price: "",
    default_supplier: "",
    storage_location: ""
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Sorting state
  const [sortField, setSortField] = useState("id");
  const [sortDirection, setSortDirection] = useState("asc");

  // Item Modal Dialogs state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState(INITIAL_ITEM_FORM);
  const [formErrors, setFormErrors] = useState({});

  const drawingFileInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleDrawingImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setFormData((prev) => ({
        ...prev,
        drawing_image: uploadEvent.target.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveDrawingImage = () => {
    setFormData((prev) => ({ ...prev, drawing_image: null }));
    if (drawingFileInputRef.current) drawingFileInputRef.current.value = "";
  };

  const handleImageUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setFormData((prev) => ({
        ...prev,
        image: uploadEvent.target.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image: null }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ---------------------------------------------------------------------------
  // GROUP & SUBGROUP MANAGEMENT HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenNewGroupModal = () => {
    setEditingGroup(null);
    setGroupFormData({ name: "", code: "", description: "" });
    setGroupFormErrors({});
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroupModal = (group) => {
    setEditingGroup(group);
    setGroupFormData({ name: group.name, code: group.code || "", description: group.description || "" });
    setGroupFormErrors({});
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = (e) => {
    e.preventDefault();
    const errors = {};
    if (!groupFormData.name.trim()) errors.name = "Group Name is required";
    if (!groupFormData.code.trim()) errors.code = "Group Code (Abbreviation) is required";

    if (Object.keys(errors).length > 0) {
      setGroupFormErrors(errors);
      return;
    }

    const formattedCode = groupFormData.code.trim().toUpperCase();

    if (editingGroup) {
      // Edit Group
      setGroups((prev) =>
        prev.map((g) =>
          g.id === editingGroup.id
            ? { ...g, name: groupFormData.name.trim(), code: formattedCode, description: groupFormData.description.trim() }
            : g
        )
      );
      showToast(`Group "${groupFormData.name}" (${formattedCode}) updated successfully.`);
    } else {
      // Create New Group
      const newId = groups.length ? Math.max(...groups.map((g) => g.id)) + 1 : 1;
      const newGroup = {
        id: newId,
        name: groupFormData.name.trim(),
        code: formattedCode,
        description: groupFormData.description.trim(),
        subgroups: []
      };
      setGroups((prev) => [...prev, newGroup]);
      showToast(`Group "${newGroup.name}" (${formattedCode}) created successfully.`);
    }

    setIsGroupModalOpen(false);
  };

  const handleConfirmDeleteGroup = () => {
    if (!deleteGroupTarget) return;
    setGroups((prev) => prev.filter((g) => g.id !== deleteGroupTarget.id));
    showToast(`Group "${deleteGroupTarget.name}" deleted.`);
    setDeleteGroupTarget(null);
  };

  // Subgroup Handlers
  const handleOpenNewSubgroupModal = (parentGroupId = "") => {
    setEditingSubgroup(null);
    setSubgroupParentLocked(Boolean(parentGroupId));
    setSubgroupFormData({
      groupId: parentGroupId || (groups[0]?.id ? String(groups[0].id) : ""),
      name: "",
      code: "",
      description: ""
    });
    setSubgroupFormErrors({});
    setIsSubgroupModalOpen(true);
  };

  const handleOpenEditSubgroupModal = (group, subgroup) => {
    setEditingSubgroup({ group, subgroup });
    setSubgroupParentLocked(false);
    setSubgroupFormData({
      groupId: String(group.id),
      name: subgroup.name,
      code: subgroup.code || "",
      description: subgroup.description || ""
    });
    setSubgroupFormErrors({});
    setIsSubgroupModalOpen(true);
  };

  const handleSaveSubgroup = (e) => {
    e.preventDefault();
    const errors = {};
    if (!subgroupFormData.groupId) errors.groupId = "Parent Group is required";
    if (!subgroupFormData.name.trim()) errors.name = "Sub-Group Name is required";

    if (Object.keys(errors).length > 0) {
      setSubgroupFormErrors(errors);
      return;
    }

    const targetGroupId = Number(subgroupFormData.groupId);
    const formattedCode = subgroupFormData.code.trim().toUpperCase();

    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== targetGroupId) {
          // If editing and changed group, remove from old group
          if (editingSubgroup && editingSubgroup.group.id === g.id && editingSubgroup.group.id !== targetGroupId) {
            return {
              ...g,
              subgroups: g.subgroups.filter((sg) => sg.id !== editingSubgroup.subgroup.id)
            };
          }
          return g;
        }

        // Target group update
        let updatedSubgroups = [...g.subgroups];
        if (editingSubgroup && editingSubgroup.group.id === targetGroupId) {
          // Update existing subgroup inside same group
          updatedSubgroups = updatedSubgroups.map((sg) =>
            sg.id === editingSubgroup.subgroup.id
              ? { ...sg, name: subgroupFormData.name.trim(), code: formattedCode }
              : sg
          );
        } else {
          // Add new subgroup to target group
          const newSgId = Math.floor(Math.random() * 90000) + 10000;
          updatedSubgroups.push({
            id: newSgId,
            name: subgroupFormData.name.trim(),
            code: formattedCode
          });
        }

        return { ...g, subgroups: updatedSubgroups };
      })
    );

    showToast(`Sub-Group "${subgroupFormData.name}" saved successfully.`);
    setIsSubgroupModalOpen(false);
  };

  const handleConfirmDeleteSubgroup = () => {
    if (!deleteSubgroupTarget) return;
    const { group, subgroup } = deleteSubgroupTarget;
    setGroups((prev) =>
      prev.map((g) =>
        g.id === group.id
          ? { ...g, subgroups: g.subgroups.filter((sg) => sg.id !== subgroup.id) }
          : g
      )
    );
    showToast(`Sub-Group "${subgroup.name}" removed from ${group.name}.`);
    setDeleteSubgroupTarget(null);
  };

  const handleResetDefaultGroups = () => {
    if (window.confirm("Are you sure you want to reset all groups & subgroups to system defaults?")) {
      setGroups(INITIAL_GROUPS_DATA);
      showToast("Groups & Subgroups reset to system default configuration.");
    }
  };

  // Filtered Groups list
  const filteredGroups = useMemo(() => {
    if (!groupSearchTerm.trim()) return groups;
    const q = groupSearchTerm.toLowerCase();
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        (g.code && g.code.toLowerCase().includes(q)) ||
        g.subgroups.some((sg) => sg.name.toLowerCase().includes(q) || (sg.code && sg.code.toLowerCase().includes(q)))
    );
  }, [groups, groupSearchTerm]);

  // Group stats calculations
  const totalSubgroupsCount = useMemo(() => {
    return groups.reduce((acc, g) => acc + (g.subgroups ? g.subgroups.length : 0), 0);
  }, [groups]);

  // Dynamic category options for item forms derived from groups
  const dynamicCategoryOptions = useMemo(() => {
    return groups.map((g) => g.name);
  }, [groups]);

  // Dynamic subgroups derived from currently selected category in item form
  const availableSubgroupsForForm = useMemo(() => {
    const foundGroup = groups.find((g) => g.name === formData.category);
    return foundGroup && foundGroup.subgroups ? foundGroup.subgroups : [];
  }, [groups, formData.category]);

  // Filter items based on global search, category pill, and per-column filters
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Category pill filter
      if (selectedCategoryFilter !== "ALL") {
        if (selectedCategoryFilter === "RAW" && item.category !== "Raw Material") return false;
        if (selectedCategoryFilter === "CONS" && item.category !== "Consumables") return false;
        if (selectedCategoryFilter === "PKG" && item.category !== "Packaging Material" && item.category !== "Packing Materials 📦") return false;
        if (selectedCategoryFilter === "BOP" && item.category !== "Bought-Out Component" && item.category !== "Bought-Out Parts 🛠") return false;
        if (selectedCategoryFilter === "TOOL" && item.category !== "Tooling & Dies" && item.category !== "Production") return false;
      }

      // 2. Global search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesGlobal =
          (item.item_code && item.item_code.toLowerCase().includes(q)) ||
          (item.item_name && item.item_name.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q)) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.sub_category && item.sub_category.toLowerCase().includes(q)) ||
          (item.material_grade && item.material_grade.toLowerCase().includes(q)) ||
          (item.hsn_code && String(item.hsn_code).includes(q)) ||
          (item.default_supplier && item.default_supplier.toLowerCase().includes(q)) ||
          (item.storage_location && item.storage_location.toLowerCase().includes(q));

        if (!matchesGlobal) return false;
      }

      // 3. Per-column filters
      if (colFilters.item_code && !item.item_code?.toLowerCase().includes(colFilters.item_code.toLowerCase())) {
        return false;
      }
      if (colFilters.item_name && !item.item_name?.toLowerCase().includes(colFilters.item_name.toLowerCase()) && !item.description?.toLowerCase().includes(colFilters.item_name.toLowerCase())) {
        return false;
      }
      if (colFilters.category && !item.category?.toLowerCase().includes(colFilters.category.toLowerCase())) {
        return false;
      }
      if (colFilters.material_grade && !item.material_grade?.toLowerCase().includes(colFilters.material_grade.toLowerCase())) {
        return false;
      }
      if (colFilters.hsn_code && !String(item.hsn_code || "").toLowerCase().includes(colFilters.hsn_code.toLowerCase())) {
        return false;
      }
      if (colFilters.uom && !item.uom?.toLowerCase().includes(colFilters.uom.toLowerCase())) {
        return false;
      }
      if (colFilters.stock && !String(item.current_stock || "").includes(colFilters.stock)) {
        return false;
      }
      if (colFilters.unit_price && !String(item.unit_price || "").includes(colFilters.unit_price)) {
        return false;
      }
      if (colFilters.default_supplier && !item.default_supplier?.toLowerCase().includes(colFilters.default_supplier.toLowerCase())) {
        return false;
      }
      if (colFilters.storage_location && !item.storage_location?.toLowerCase().includes(colFilters.storage_location.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [items, selectedCategoryFilter, searchTerm, colFilters]);

  // Sort items
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toLowerCase();
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortField, sortDirection]);

  // Paginated slice
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / rowsPerPage));
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedItems = sortedItems.slice(startIndex, startIndex + rowsPerPage);

  // Summary counts
  const totalCount = items.length;
  const rawMaterialsCount = items.filter((i) => i.category === "Raw Material").length;
  const consumablesCount = items.filter((i) => i.category === "Consumables" || i.category === "Consumables 🧪").length;
  const packagingCount = items.filter((i) => i.category === "Packaging Material" || i.category === "Packing Materials 📦").length;
  const minStockAlertsCount = items.filter((i) => Number(i.current_stock) <= Number(i.min_stock)).length;

  // Toggle selection
  const toggleSelectRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedItems.length && paginatedItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedItems.map((item) => item.id)));
    }
  };

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Cascading Selection Handlers
  const handleGroupChange = (newGroupName) => {
    const groupObj = OTHER_ITEM_GROUPS_CONFIG.find((g) => g.group === newGroupName);
    // Sub-group and item code stay blank until the user picks a sub-group
    setFormData((prev) => ({
      ...prev,
      group: groupObj ? groupObj.group : "",
      subgroup: "",
      sub_subgroup: "",
      main_group_code: groupObj ? groupObj.code : "",
      group_code: groupObj ? groupObj.code : "",
      sub_group_code: "",
      sub_sub_group_code: "",
      category: groupObj ? groupObj.group : "",
      sub_category: "",
      item_code: ""
    }));
  };

  const handleSubGroupChange = (newSubName) => {
    if (!newSubName) {
      setFormData((prev) => ({ ...prev, subgroup: "", sub_subgroup: "", sub_group_code: "", sub_sub_group_code: "", sub_category: "", item_code: "" }));
      return;
    }
    const groupObj = OTHER_ITEM_GROUPS_CONFIG.find((g) => g.group === formData.group) || OTHER_ITEM_GROUPS_CONFIG[0];
    const subObj = (groupObj.subgroups && groupObj.subgroups.find((s) => s.name === newSubName)) || { name: newSubName, code: groupObj.code };
    const newCode = generateOtherItemCode(subObj.code, groupObj.code, items);

    setFormData((prev) => ({
      ...prev,
      subgroup: subObj.name,
      sub_subgroup: subObj.name,
      sub_group_code: subObj.code,
      sub_sub_group_code: subObj.code,
      sub_category: subObj.name,
      item_code: newCode
    }));
  };

  const handleSubSubGroupChange = (newSubSubName) => {
    const groupObj = OTHER_ITEM_GROUPS_CONFIG.find((g) => g.group === formData.group) || OTHER_ITEM_GROUPS_CONFIG[0];
    const subObj = (groupObj.subgroups && groupObj.subgroups.find((s) => s.name === newSubSubName)) || { name: newSubSubName, code: groupObj.code };

    setFormData((prev) => ({
      ...prev,
      sub_subgroup: subObj.name,
      sub_sub_group_code: subObj.code
    }));
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "item_description") {
        updated.item_name = value;
      }
      if (field === "rate") {
        updated.unit_price = value;
        updated.price = value;
      }
      if (field === "safety_lead_time" || field === "procurement_lead_time") {
        const s = Number(field === "safety_lead_time" ? value : prev.safety_lead_time) || 0;
        const p = Number(field === "procurement_lead_time" ? value : prev.procurement_lead_time) || 0;
        updated.total_lead_time = s + p;
      }
      return updated;
    });
  };

  // Open "New Item" Modal
  const handleOpenNewModal = () => {
    setEditingId(null);
    setFormData({ ...INITIAL_ITEM_FORM });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open "Edit Item" Modal
  const handleOpenEditModal = (item) => {
    setEditingId(item.id);
    const groupName = item.group || item.category || "Raw Material";
    const foundGroup =
      OTHER_ITEM_GROUPS_CONFIG.find((g) => g.group.toLowerCase() === groupName.toLowerCase()) ||
      OTHER_ITEM_GROUPS_CONFIG[0];
    const subName = item.subgroup || item.sub_category || (foundGroup.subgroups[0]?.name || "");
    const foundSub =
      (foundGroup.subgroups && foundGroup.subgroups.find((sg) => sg.name.toLowerCase() === subName.toLowerCase())) ||
      foundGroup.subgroups[0] || { code: foundGroup.code };

    setFormData({
      ...INITIAL_ITEM_FORM,
      ...item,
      group: foundGroup.group,
      subgroup: subName,
      sub_subgroup: item.sub_subgroup || subName,
      main_group_code: foundGroup.code,
      group_code: foundGroup.code,
      sub_group_code: foundSub.code,
      sub_sub_group_code: foundSub.code,
      item_code: item.item_code || "",
      old_code: item.old_code || "",
      item_description: item.item_description || item.description || item.item_name || "",
      item_name: item.item_name || item.item_description || item.description || "",
      category: foundGroup.group,
      sub_category: subName,
      purchased_uom: item.purchased_uom || item.uom || "PCS",
      consumption_uom: item.consumption_uom || item.purchased_uom || item.uom || "PCS",
      rate: item.rate || item.unit_price || item.price || "0.00",
      unit_price: item.unit_price || item.rate || item.price || "0.00",
      total_lead_time: (Number(item.safety_lead_time) || 0) + (Number(item.procurement_lead_time) || 0)
    });
    setFormErrors({});
    if (detailItem) setDetailItem(null);
    setIsModalOpen(true);
  };

  // Edit selected item
  const handleEditSelected = () => {
    if (selectedIds.size === 0) {
      alert("Please select an item to edit.");
      return;
    }
    const firstSelectedId = Array.from(selectedIds)[0];
    const item = items.find((i) => i.id === firstSelectedId);
    if (item) handleOpenEditModal(item);
  };

  // View selected item
  const handleViewSelected = () => {
    if (selectedIds.size === 0) {
      alert("Please select an item to view.");
      return;
    }
    const firstSelectedId = Array.from(selectedIds)[0];
    const item = items.find((i) => i.id === firstSelectedId);
    if (item) setDetailItem(item);
  };

  // Delete selected item(s)
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      alert("Please select at least one item to delete.");
      return;
    }
    const firstSelectedId = Array.from(selectedIds)[0];
    const item = items.find((i) => i.id === firstSelectedId);
    if (item) setDeleteTarget(item);
  };

  // Confirm delete (persists to PostgreSQL item_master)
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const code = deleteTarget.item_code;
      if (code) {
        await fetch(`http://localhost:4000/api/inventory/items/by-code/${encodeURIComponent(code)}`, {
          method: "DELETE"
        });
      }
    } catch (e) {
      console.warn("Delete item error:", e);
    }
    fetchOtherFromApi();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(deleteTarget.id);
      return next;
    });
    if (detailItem?.id === deleteTarget.id) setDetailItem(null);
    showToast(`Item "${deleteTarget.item_code}" deleted successfully from PostgreSQL database.`);
    setDeleteTarget(null);
  };

  // Form submit (Create or Update persists directly to PostgreSQL item_master)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.item_code.trim()) errors.item_code = "Item Code is required";
    const desc = formData.item_description || formData.item_name;
    if (!desc || !desc.trim()) errors.item_description = "Item Description is required";
    if (!formData.group) errors.group = "Group is required";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const payload = {
      id: editingId || undefined,
      item_code: formData.item_code,
      item_name: desc,
      description_size: desc,
      category: formData.group,
      subgroup: formData.subgroup,
      sub_category: formData.subgroup,
      sub_subgroup: formData.sub_subgroup,
      uom: formData.purchased_uom || formData.uom || "PCS",
      purchased_uom: formData.purchased_uom || formData.uom || "PCS",
      consumption_uom: formData.consumption_uom || formData.purchased_uom || formData.uom || "PCS",
      unit_price: Number(formData.rate || formData.unit_price) || 0,
      price: Number(formData.rate || formData.unit_price) || 0,
      rate: Number(formData.rate || formData.unit_price) || 0,
      mrp: Number(formData.mrp) || 0,
      material: formData.material,
      material_grade: formData.material,
      color: formData.color,
      style: formData.style,
      drawing_no: formData.drawing_no,
      drawing_image: formData.drawing_image,
      image: formData.image,
      inner_diameter: formData.inner_diameter,
      outer_diameter: formData.outer_diameter,
      height: formData.height,
      thickness: formData.thickness,
      safety_lead_time: formData.safety_lead_time,
      procurement_lead_time: formData.procurement_lead_time,
      total_lead_time: (Number(formData.safety_lead_time) || 0) + (Number(formData.procurement_lead_time) || 0),
      opening_balance: formData.opening_balance,
      gross_wt: formData.gross_wt,
      net_wt: formData.net_wt,
      item_class: formData.item_class,
      rej_tolerance: formData.rej_tolerance,
      procurement_type: formData.procurement_type,
      process_type: formData.process_type,
      min_stock_lvl: formData.min_stock_lvl,
      max_stock_lvl: formData.max_stock_lvl,
      reorder_stock_lvl: formData.reorder_stock_lvl,
      hsn_code: formData.hsn_code,
      old_code: formData.old_code,
      status: formData.status || "Active"
    };

    try {
      const res = await fetch("http://localhost:4000/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved = await res.json();
        window.dispatchEvent(new CustomEvent("SMS_ITEM_MASTER_UPDATED", { detail: saved || payload }));
        fetchOtherFromApi();
        showToast(`Item "${formData.item_code}" saved successfully to PostgreSQL database.`);
      } else {
        fetchOtherFromApi();
        showToast(`Item "${formData.item_code}" saved.`);
      }
    } catch (err) {
      console.warn("Error calling item master api:", err);
      // Optimistic update
      setItems((prev) => {
        if (editingId) {
          return prev.map((it) => (it.id === editingId ? { ...it, ...payload } : it));
        } else {
          return [{ id: Date.now(), sNo: prev.length + 1, ...payload }, ...prev];
        }
      });
      showToast(`Item "${formData.item_code}" saved.`);
    }

    setIsModalOpen(false);
  };

  // Export to CSV
  const handleExportData = () => {
    const headers = [
      "Sr No",
      "Item Code",
      "Item Name",
      "Description",
      "Category",
      "Sub Category",
      "Material Grade",
      "HSN Code",
      "UOM",
      "Current Stock",
      "Min Stock",
      "Unit Price",
      "Default Supplier",
      "Storage Location",
      "Status"
    ];

    const rows = sortedItems.map((item, idx) => [
      idx + 1,
      `"${item.item_code || ""}"`,
      `"${(item.item_name || "").replace(/"/g, '""')}"`,
      `"${(item.description || "").replace(/"/g, '""')}"`,
      `"${item.category || ""}"`,
      `"${item.sub_category || ""}"`,
      `"${item.material_grade || ""}"`,
      `"${item.hsn_code || ""}"`,
      `"${item.uom || ""}"`,
      item.current_stock ?? 0,
      item.min_stock ?? 0,
      item.unit_price ?? 0,
      `"${(item.default_supplier || "").replace(/"/g, '""')}"`,
      `"${(item.storage_location || "").replace(/"/g, '""')}"`,
      `"${item.status || "Active"}"`
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SMS_Other_Item_Master_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Exported Other Item Master dataset to CSV successfully.");
  };

  // Print
  const handlePrint = () => {
    window.print();
  };

  // Refresh
  const handleRefresh = () => {
    setColFilters({
      item_code: "",
      item_name: "",
      category: "",
      material_grade: "",
      hsn_code: "",
      uom: "",
      stock: "",
      unit_price: "",
      default_supplier: "",
      storage_location: ""
    });
    setSearchTerm("");
    setSelectedCategoryFilter("ALL");
    setSelectedIds(new Set());
    showToast("Filters reset and table refreshed.");
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
        padding: "12px 16px",
        boxSizing: "border-box",
        overflow: "hidden",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}
    >
      {/* Toast Alert */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            top: 24,
            right: 24,
            zIndex: 99999,
            background: "#10b981",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(16, 185, 129, 0.4)",
            fontWeight: 700,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 10,
            animation: "fadeIn 0.2s ease"
          }}
        >
          <span style={{ fontSize: 16 }}>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Card Container */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px rgba(0,0,0,0.06)",
          background: "#ffffff"
        }}
      >
        {/* ========================================================================= */}
        {/* ROW 1: TOP TOOLBAR WITH TAB SWITCHER (ITEMS LIST vs GROUPS & SUBGROUPS)    */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            background: "#ffffff",
            borderBottom: "1px solid #e2e8f0",
            padding: "8px 18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12
          }}
        >
          {/* Left: Tab Switcher (Non-FG Items vs Item Groups & Subgroups) */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                display: "inline-flex",
                background: "#f1f5f9",
                borderRadius: 8,
                padding: 3,
                border: "1px solid #cbd5e1"
              }}
            >
              <button
                onClick={() => setActiveTab("items")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "none",
                  background: activeTab === "items" ? "#1e293b" : "transparent",
                  color: activeTab === "items" ? "#ffffff" : "#475569",
                  fontSize: 12.5,
                  fontWeight: activeTab === "items" ? 700 : 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: activeTab === "items" ? "0 2px 6px rgba(30,41,59,0.3)" : "none"
                }}
              >
                <Box size={14} />
                <span>Other Items Master</span>
                <span
                  style={{
                    fontSize: 10,
                    background: activeTab === "items" ? "#c51f28" : "#cbd5e1",
                    color: "#ffffff",
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontWeight: 800
                  }}
                >
                  {items.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab("groups")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 6,
                  border: "none",
                  background: activeTab === "groups" ? "#1e293b" : "transparent",
                  color: activeTab === "groups" ? "#ffffff" : "#475569",
                  fontSize: 12.5,
                  fontWeight: activeTab === "groups" ? 700 : 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: activeTab === "groups" ? "0 2px 6px rgba(30,41,59,0.3)" : "none"
                }}
              >
                <FolderTree size={14} />
                <span>Item Groups & Sub-groups</span>
                <span
                  style={{
                    fontSize: 10,
                    background: activeTab === "groups" ? "#c51f28" : "#cbd5e1",
                    color: "#ffffff",
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontWeight: 800
                  }}
                >
                  {groups.length}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Actions depending on Active Tab */}
          {activeTab === "items" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={handleOpenNewModal}
                id="btn-new-other-item"
                style={{
                  background: "#1e293b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 16px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 4px rgba(30, 41, 59, 0.25)"
                }}
              >
                <Plus size={15} />
                <span>New Item Master</span>
              </button>

              <button
                onClick={handleEditSelected}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  borderRadius: 6,
                  padding: "7px 14px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Edit Item
              </button>

              <button
                onClick={handleDeleteSelected}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  borderRadius: 6,
                  padding: "7px 14px",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Delete Item
              </button>

              <span style={{ color: "#e2e8f0", margin: "0 2px" }}>|</span>

              <button
                onClick={handleExportData}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  borderRadius: 6,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
                title="Export CSV"
              >
                Export CSV
              </button>

              <button
                onClick={handlePrint}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  borderRadius: 6,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
                title="Print View"
              >
                Print
              </button>

              <button
                onClick={handleRefresh}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  borderRadius: 6,
                  padding: "7px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
                title="Refresh Filters"
              >
                Refresh
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <button
                onClick={handleOpenNewGroupModal}
                style={{
                  background: "#1e293b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 16px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 4px rgba(30, 41, 59, 0.25)"
                }}
              >
                <FolderPlus size={15} />
                <span>+ New Group</span>
              </button>

              <button
                onClick={() => handleOpenNewSubgroupModal()}
                style={{
                  background: "#059669",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "7px 16px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 4px rgba(5, 150, 105, 0.25)"
                }}
              >
                <Plus size={15} />
                <span>+ New Sub-Group</span>
              </button>

              <button
                onClick={handleResetDefaultGroups}
                style={{
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#334155",
                  borderRadius: 6,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Reset System Defaults
              </button>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: NON-FG ITEMS MASTER VIEW                                           */}
        {/* ========================================================================= */}
        {activeTab === "items" && (
          <>
            {/* ROW 2: STATS SUMMARY CARDS */}
            <div
              style={{
                flexShrink: 0,
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                padding: "8px 18px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12
              }}
            >
              <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Items</p>
                  <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{totalCount}</p>
                </div>
                <span style={{ fontSize: 11, background: "rgba(30,41,59,0.1)", color: "#1e293b", padding: "2px 8px", borderRadius: 4, fontWeight: 800 }}>Master</span>
              </div>

              <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Raw Materials</p>
                  <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 900, color: "#2563eb" }}>{rawMaterialsCount}</p>
                </div>
                <span style={{ fontSize: 11, background: "rgba(37,99,235,0.1)", color: "#2563eb", padding: "2px 8px", borderRadius: 4, fontWeight: 800 }}>RM</span>
              </div>

              <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Consumables</p>
                  <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 900, color: "#059669" }}>{consumablesCount}</p>
                </div>
                <span style={{ fontSize: 11, background: "rgba(5,150,105,0.1)", color: "#059669", padding: "2px 8px", borderRadius: 4, fontWeight: 800 }}>CON</span>
              </div>

              <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Packaging</p>
                  <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 900, color: "#d97706" }}>{packagingCount}</p>
                </div>
                <span style={{ fontSize: 11, background: "rgba(217,119,6,0.1)", color: "#d97706", padding: "2px 8px", borderRadius: 4, fontWeight: 800 }}>PKG</span>
              </div>

              <div style={{ background: "#ffffff", padding: "8px 12px", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Min Stock Alerts</p>
                  <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 900, color: minStockAlertsCount > 0 ? "#dc2626" : "#059669" }}>{minStockAlertsCount}</p>
                </div>
                <span style={{ fontSize: 11, background: minStockAlertsCount > 0 ? "rgba(220,38,38,0.1)" : "rgba(5,150,105,0.1)", color: minStockAlertsCount > 0 ? "#dc2626" : "#059669", padding: "2px 8px", borderRadius: 4, fontWeight: 800 }}>
                  {minStockAlertsCount > 0 ? "Reorder" : "Healthy"}
                </span>
              </div>
            </div>

            {/* SEARCH AND FILTER BAR */}
            <div
              style={{
                flexShrink: 0,
                background: "#ffffff",
                borderBottom: "1px solid #e2e8f0",
                padding: "8px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                <div style={{ position: "relative", width: 320, maxWidth: "100%" }}>
                  <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} size={15} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by code, name, category, supplier..."
                    style={{
                      width: "100%",
                      padding: "6px 12px 6px 32px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      fontSize: 12.5,
                      outline: "none"
                    }}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter Pills */}
                <div style={{ display: "flex", gap: 4 }}>
                  {[
                    { id: "ALL", label: "All Items" },
                    { id: "RAW", label: "Raw Material" },
                    { id: "CONS", label: "Consumables" },
                    { id: "PKG", label: "Packaging" },
                    { id: "BOP", label: "Bought-Out" }
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedCategoryFilter(p.id)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        border: selectedCategoryFilter === p.id ? "1px solid #1e293b" : "1px solid #e2e8f0",
                        background: selectedCategoryFilter === p.id ? "#1e293b" : "#f8fafc",
                        color: selectedCategoryFilter === p.id ? "#ffffff" : "#475569",
                        fontSize: 11.5,
                        fontWeight: selectedCategoryFilter === p.id ? 700 : 500,
                        cursor: "pointer"
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* TABLE CONTAINER */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", position: "relative" }}>
              <table className="resizable-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12, ...otherItemMasterPage1Resize.tableStyle }}>
                <ResizableColGroup columns={OTHER_ITEM_MASTER_PAGE_1_COLUMNS} widths={otherItemMasterPage1Resize.widths} />
                <thead>
                  <tr style={{ background: "#1e293b", color: "#ffffff", position: "sticky", top: 0, zIndex: 10 }}>
                    <th style={{ padding: "10px 12px", width: 40, textAlign: "center", borderBottom: "2px solid #cbd5e1" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                        onChange={toggleSelectAll}
                        style={{ cursor: "pointer" }}
                      />
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11, cursor: "pointer" }} onClick={() => handleSort("sNo")}>
                      S.No {sortField === "sNo" && (sortDirection === "asc" ? "↑" : "↓")}
                      <ColumnResizeHandle colKey="handlesort_sno_s_no" resize={otherItemMasterPage1Resize} />
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11, cursor: "pointer" }} onClick={() => handleSort("item_code")}>
                      Item Code {sortField === "item_code" && (sortDirection === "asc" ? "↑" : "↓")}
                      <ColumnResizeHandle colKey="handlesort_item_code_ite" resize={otherItemMasterPage1Resize} />
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11, cursor: "pointer" }} onClick={() => handleSort("item_name")}>
                      Item Description {sortField === "item_name" && (sortDirection === "asc" ? "↑" : "↓")}
                      <ColumnResizeHandle colKey="handlesort_item_name_ite" resize={otherItemMasterPage1Resize} />
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11, cursor: "pointer" }} onClick={() => handleSort("category")}>
                      Group / Category {sortField === "category" && (sortDirection === "asc" ? "↑" : "↓")}
                      <ColumnResizeHandle colKey="handlesort_category_grou" resize={otherItemMasterPage1Resize} />
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>Sub-Group<ColumnResizeHandle colKey="sub_group" resize={otherItemMasterPage1Resize} /></th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>Grade<ColumnResizeHandle colKey="grade" resize={otherItemMasterPage1Resize} /></th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>HSN<ColumnResizeHandle colKey="hsn" resize={otherItemMasterPage1Resize} /></th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>UOM<ColumnResizeHandle colKey="uom" resize={otherItemMasterPage1Resize} /></th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11, cursor: "pointer" }} onClick={() => handleSort("current_stock")}>
                      Stock {sortField === "current_stock" && (sortDirection === "asc" ? "↑" : "↓")}
                      <ColumnResizeHandle colKey="handlesort_current_stock" resize={otherItemMasterPage1Resize} />
                    </th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>Rate (₹)<ColumnResizeHandle colKey="rate" resize={otherItemMasterPage1Resize} /></th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>Supplier<ColumnResizeHandle colKey="supplier" resize={otherItemMasterPage1Resize} /></th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>Location<ColumnResizeHandle colKey="location" resize={otherItemMasterPage1Resize} /></th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>Status<ColumnResizeHandle colKey="status" resize={otherItemMasterPage1Resize} /></th>
                    <th style={{ padding: "10px 12px", textAlign: "center", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11, width: 100 }}>Actions<ColumnResizeHandle colKey="actions" resize={otherItemMasterPage1Resize} /></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={15} style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: 13 }}>
                        No items found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item, idx) => {
                      const isSelected = selectedIds.has(item.id);
                      const isStockLow = Number(item.current_stock) <= Number(item.min_stock);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => toggleSelectRow(item.id)}
                          style={{
                            background: isSelected ? "rgba(197, 31, 40, 0.05)" : idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                            borderBottom: "1px solid #e2e8f0",
                            cursor: "pointer",
                            transition: "background 0.12s ease"
                          }}
                        >
                          <td style={{ padding: "10px 12px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRow(item.id)} style={{ cursor: "pointer" }} />
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: "#64748b" }}>{startIndex + idx + 1}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 800, color: "#c51f28", whiteSpace: "nowrap" }}>{item.item_code}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>
                            <div>{item.item_name}</div>
                            {item.description && <div style={{ fontSize: 11, color: "#64748b", fontWeight: 400, marginTop: 2 }}>{item.description}</div>}
                          </td>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                            <span style={{ background: "#f1f5f9", color: "#1e293b", padding: "3px 8px", borderRadius: 4, fontWeight: 700, fontSize: 11, border: "1px solid #cbd5e1" }}>
                              {item.category}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", color: "#475569", fontWeight: 600 }}>{item.sub_category || "-"}</td>
                          <td style={{ padding: "10px 12px", color: "#334155", fontWeight: 600 }}>{item.material_grade || "-"}</td>
                          <td style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600 }}>{item.hsn_code || "-"}</td>
                          <td style={{ padding: "10px 12px", color: "#0f172a", fontWeight: 700 }}>{item.uom}</td>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                            <span style={{ fontWeight: 800, color: isStockLow ? "#dc2626" : "#0f172a" }}>
                              {item.current_stock ?? 0} {item.uom}
                            </span>
                            <span style={{ fontSize: 10.5, color: "#64748b", marginLeft: 4 }}>(Min: {item.min_stock ?? 0})</span>
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: "#0f172a" }}>
                            ₹{Number(item.unit_price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: "10px 12px", color: "#334155", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }} title={item.default_supplier}>
                            {item.default_supplier || "-"}
                          </td>
                          <td style={{ padding: "10px 12px", color: "#64748b", fontSize: 11.5 }}>{item.storage_location || "-"}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ padding: "2px 7px", borderRadius: 4, fontSize: 10.5, fontWeight: 700, background: item.status === "Active" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: item.status === "Active" ? "#059669" : "#dc2626" }}>
                              {item.status || "Active"}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                              <button onClick={() => setDetailItem(item)} title="View Item Details" style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#334155", borderRadius: 4, width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                <Eye size={13} />
                              </button>
                              <button onClick={() => handleOpenEditModal(item)} title="Edit Item" style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#1e293b", borderRadius: 4, width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setDeleteTarget(item)} title="Delete Item" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", borderRadius: 4, width: 26, height: 26, display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION TOOLBAR */}
            <div style={{ flexShrink: 0, background: "#ffffff", borderTop: "1px solid #e2e8f0", padding: "8px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#64748b" }}>
                <span>Showing {sortedItems.length > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + rowsPerPage, sortedItems.length)} of {sortedItems.length} entries</span>
                <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #cbd5e1", fontSize: 12 }}>
                  <option value={10}>10 per page</option>
                  <option value={15}>15 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.4 : 1, display: "flex", alignItems: "center" }}>
                  <ChevronsLeft size={14} />
                </button>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", cursor: currentPage === 1 ? "not-allowed" : "pointer", opacity: currentPage === 1 ? 0.4 : 1, display: "flex", alignItems: "center" }}>
                  <ChevronLeft size={14} />
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", margin: "0 8px" }}>Page {currentPage} of {totalPages}</span>
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.4 : 1, display: "flex", alignItems: "center" }}>
                  <ChevronRight size={14} />
                </button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", cursor: currentPage === totalPages ? "not-allowed" : "pointer", opacity: currentPage === totalPages ? 0.4 : 1, display: "flex", alignItems: "center" }}>
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ITEM GROUPS & SUB-GROUPS MASTER VIEW                               */}
        {/* ========================================================================= */}
        {activeTab === "groups" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
            {/* GROUPS STAT CARDS */}
            <div
              style={{
                flexShrink: 0,
                background: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                padding: "8px 18px",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12
              }}
            >
              <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Item Groups</p>
                  <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 900, color: "#0f172a" }}>{groups.length}</p>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(30,41,59,0.1)", color: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FolderTree size={18} />
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Total Sub-Groups</p>
                  <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 900, color: "#059669" }}>{totalSubgroupsCount}</p>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(5,150,105,0.1)", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Layers size={18} />
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Group Codes Active</p>
                  <p style={{ margin: "2px 0 0", fontSize: 20, fontWeight: 900, color: "#c51f28" }}>{groups.filter((g) => g.code).length} / {groups.length}</p>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: "rgba(197,31,40,0.1)", color: "#c51f28", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Tag size={18} />
                </div>
              </div>

              <div style={{ background: "#ffffff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Category Mapping</p>
                  <p style={{ margin: "2px 0 0", fontSize: 14, fontWeight: 800, color: "#059669" }}>Active & Linked</p>
                </div>
                <span style={{ fontSize: 11, background: "rgba(16,185,129,0.15)", color: "#059669", padding: "3px 8px", borderRadius: 4, fontWeight: 800 }}>LIVE</span>
              </div>
            </div>

            {/* GROUP SEARCH BAR */}
            <div
              style={{
                flexShrink: 0,
                background: "#ffffff",
                borderBottom: "1px solid #e2e8f0",
                padding: "8px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12
              }}
            >
              <div style={{ position: "relative", width: 360, maxWidth: "100%" }}>
                <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#64748b" }} size={15} />
                <input
                  type="text"
                  value={groupSearchTerm}
                  onChange={(e) => setGroupSearchTerm(e.target.value)}
                  placeholder="Search Group Name, Code (e.g. BOP, CON) or Sub-groups..."
                  style={{
                    width: "100%",
                    padding: "6px 12px 6px 32px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    fontSize: 12.5,
                    outline: "none"
                  }}
                />
                {groupSearchTerm && (
                  <button
                    onClick={() => setGroupSearchTerm("")}
                    style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", cursor: "pointer", color: "#64748b" }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                Showing {filteredGroups.length} of {groups.length} groups
              </div>
            </div>

            {/* GROUPS & SUBGROUPS TABLE */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", position: "relative" }}>
              <table className="resizable-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 12, ...otherItemMasterPage2Resize.tableStyle }}>
                <ResizableColGroup columns={OTHER_ITEM_MASTER_PAGE_2_COLUMNS} widths={otherItemMasterPage2Resize.widths} />
                <thead>
                  <tr style={{ background: "#1e293b", color: "#ffffff", position: "sticky", top: 0, zIndex: 10 }}>
                    <th style={{ padding: "10px 14px", width: 45, textAlign: "center", borderBottom: "2px solid #cbd5e1" }}>#<ColumnResizeHandle colKey="sr" resize={otherItemMasterPage2Resize} /></th>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11, width: 240 }}>
                      Group Name
                      <ColumnResizeHandle colKey="group_name" resize={otherItemMasterPage2Resize} />
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11, width: 140 }}>
                      Group Code (Abbr)
                      <ColumnResizeHandle colKey="group_code_abbr" resize={otherItemMasterPage2Resize} />
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11, width: 130 }}>
                      Sub-Groups Count
                      <ColumnResizeHandle colKey="sub_groups_count" resize={otherItemMasterPage2Resize} />
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11 }}>
                      Sub-Groups List &amp; Abbreviation Tags
                      <ColumnResizeHandle colKey="sub_groups_list_amp_abbr" resize={otherItemMasterPage2Resize} />
                    </th>
                    <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", fontSize: 11, width: 160 }}>
                      Actions
                      <ColumnResizeHandle colKey="actions" resize={otherItemMasterPage2Resize} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontSize: 13 }}>
                        No groups or sub-groups found.
                      </td>
                    </tr>
                  ) : (
                    filteredGroups.map((group, idx) => {
                      const sgCount = group.subgroups ? group.subgroups.length : 0;
                      return (
                        <tr
                          key={group.id}
                          style={{
                            background: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                            borderBottom: "1px solid #e2e8f0"
                          }}
                        >
                          <td style={{ padding: "12px 14px", textAlign: "center", fontWeight: 700, color: "#64748b" }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: "12px 14px", fontWeight: 800, color: "#0f172a" }}>
                            <div style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                              <span>{group.name}</span>
                            </div>
                            {group.description && (
                              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 400, marginTop: 2 }}>
                                {group.description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                display: "inline-block",
                                background: "#c51f28",
                                color: "#ffffff",
                                padding: "3px 10px",
                                borderRadius: 5,
                                fontWeight: 900,
                                fontSize: 11.5,
                                letterSpacing: "0.06em",
                                boxShadow: "0 1px 3px rgba(197,31,40,0.3)"
                              }}
                            >
                              {group.code || "N/A"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                background: "rgba(16,185,129,0.12)",
                                color: "#059669",
                                padding: "3px 10px",
                                borderRadius: 12,
                                fontWeight: 800,
                                fontSize: 11.5
                              }}
                            >
                              {sgCount} Sub-groups
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", minWidth: 420 }}>
                            {sgCount === 0 ? (
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>No sub-groups created yet.</span>
                            ) : (
                              <div>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                                    gap: 6
                                  }}
                                >
                                  {(expandedSubgroupGroups[group.id]
                                    ? group.subgroups
                                    : group.subgroups.slice(0, SUBGROUP_PREVIEW_COUNT)
                                  ).map((sg) => (
                                    <div
                                      key={sg.id}
                                      title={sg.name}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                        background: "#ffffff",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: 6,
                                        padding: "3px 6px",
                                        fontSize: 11,
                                        color: "#1e293b",
                                        minWidth: 0
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontWeight: 600,
                                          flex: 1,
                                          minWidth: 0,
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                          whiteSpace: "nowrap"
                                        }}
                                      >
                                        {sg.name}
                                      </span>
                                      {sg.code && (
                                        <span style={{ fontSize: 9, background: "#f1f5f9", color: "#475569", padding: "0 4px", borderRadius: 3, fontWeight: 800, border: "1px solid #e2e8f0", flexShrink: 0 }}>
                                          {sg.code}
                                        </span>
                                      )}
                                      <button
                                        onClick={() => handleOpenEditSubgroupModal(group, sg)}
                                        title="Edit Subgroup"
                                        style={{ border: "none", background: "none", cursor: "pointer", color: "#64748b", padding: 0, display: "inline-flex", flexShrink: 0 }}
                                      >
                                        <Pencil size={11} />
                                      </button>
                                      <button
                                        onClick={() => setDeleteSubgroupTarget({ group, subgroup: sg })}
                                        title="Delete Subgroup"
                                        style={{ border: "none", background: "none", cursor: "pointer", color: "#ef4444", padding: 0, display: "inline-flex", flexShrink: 0 }}
                                      >
                                        <X size={11} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                {sgCount > SUBGROUP_PREVIEW_COUNT && (
                                  <button
                                    onClick={() =>
                                      setExpandedSubgroupGroups((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                                    }
                                    style={{ marginTop: 6, border: "none", background: "none", cursor: "pointer", color: "#c51f28", fontSize: 11, fontWeight: 700, padding: 0 }}
                                  >
                                    {expandedSubgroupGroups[group.id] ? "Show less" : `Show all ${sgCount} sub-groups`}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "12px 14px", textAlign: "center" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                              <button
                                onClick={() => handleOpenNewSubgroupModal(String(group.id))}
                                title="Add Sub-Group to this Group"
                                style={{
                                  background: "#f0fdf4",
                                  border: "1px solid #bbf7d0",
                                  color: "#166534",
                                  borderRadius: 5,
                                  padding: "4px 8px",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 3
                                }}
                              >
                                <Plus size={12} />
                                <span>Sub-Group</span>
                              </button>

                              <button
                                onClick={() => handleOpenEditGroupModal(group)}
                                title="Edit Group"
                                style={{
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  color: "#1e293b",
                                  borderRadius: 5,
                                  width: 28,
                                  height: 28,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer"
                                }}
                              >
                                <Pencil size={13} />
                              </button>

                              <button
                                onClick={() => setDeleteGroupTarget(group)}
                                title="Delete Group"
                                style={{
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  color: "#dc2626",
                                  borderRadius: 5,
                                  width: 28,
                                  height: 28,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: "pointer"
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT GROUP                                                */}
      {/* ========================================================================= */}
      {isGroupModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setIsGroupModalOpen(false)}
        >
          <div
            style={{
              width: 480,
              maxWidth: "100%",
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "16px 22px", background: "#1e293b", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                {editingGroup ? "Edit Item Group" : "Create New Item Group"}
              </h3>
              <button onClick={() => setIsGroupModalOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            <form onSubmit={handleSaveGroup} style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                  placeholder="e.g. Bought-Out Parts 🛠 or Raw Material"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: groupFormErrors.name ? "1px solid #ef4444" : "1px solid #cbd5e1", fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                />
                {groupFormErrors.name && <span style={{ fontSize: 11, color: "#ef4444", marginTop: 3, display: "block" }}>{groupFormErrors.name}</span>}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Group Code / Abbreviation *
                </label>
                <input
                  type="text"
                  value={groupFormData.code}
                  onChange={(e) => setGroupFormData({ ...groupFormData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. BOP, RM, CON, PM, AST"
                  maxLength={6}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: groupFormErrors.code ? "1px solid #ef4444" : "1px solid #cbd5e1", fontSize: 12.5, fontWeight: 800, letterSpacing: "0.05em", outline: "none", boxSizing: "border-box" }}
                />
                {groupFormErrors.code && <span style={{ fontSize: 11, color: "#ef4444", marginTop: 3, display: "block" }}>{groupFormErrors.code}</span>}
                <span style={{ fontSize: 10.5, color: "#64748b", marginTop: 3, display: "block" }}>
                  Standard short abbreviation code used in item prefixes and inventory reporting.
                </span>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Description (Optional)
                </label>
                <textarea
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                  placeholder="Brief description of this group..."
                  rows={2}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
                <button type="button" onClick={() => setIsGroupModalOpen(false)} style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", borderRadius: 6, padding: "7px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" style={{ background: "#1e293b", color: "#ffffff", border: "none", borderRadius: 6, padding: "7px 20px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT SUBGROUP                                             */}
      {/* ========================================================================= */}
      {isSubgroupModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16
          }}
          onClick={() => setIsSubgroupModalOpen(false)}
        >
          <div
            style={{
              width: 480,
              maxWidth: "100%",
              background: "#ffffff",
              borderRadius: 14,
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              overflow: "hidden"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "16px 22px", background: "#059669", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>
                {editingSubgroup ? "Edit Sub-Group" : "Add New Sub-Group"}
              </h3>
              <button onClick={() => setIsSubgroupModalOpen(false)} style={{ background: "none", border: "none", color: "#e2e8f0", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>

            <form onSubmit={handleSaveSubgroup} style={{ padding: "20px 24px" }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Parent Group *
                </label>
                {subgroupParentLocked ? (
                  <div style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 12.5, fontWeight: 700, color: "#0f172a", boxSizing: "border-box" }}>
                    {groups.find((g) => String(g.id) === String(subgroupFormData.groupId))?.name || "—"}
                    {groups.find((g) => String(g.id) === String(subgroupFormData.groupId))?.code && (
                      <span style={{ marginLeft: 6, fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                        ({groups.find((g) => String(g.id) === String(subgroupFormData.groupId)).code})
                      </span>
                    )}
                  </div>
                ) : (
                  <select
                    value={subgroupFormData.groupId}
                    onChange={(e) => setSubgroupFormData({ ...subgroupFormData, groupId: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: subgroupFormErrors.groupId ? "1px solid #ef4444" : "1px solid #cbd5e1", fontSize: 12.5, outline: "none", background: "#fff", boxSizing: "border-box" }}
                  >
                    <option value="">-- Select Parent Group --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.code || "NO CODE"})
                      </option>
                    ))}
                  </select>
                )}
                {subgroupFormErrors.groupId && <span style={{ fontSize: 11, color: "#ef4444", marginTop: 3, display: "block" }}>{subgroupFormErrors.groupId}</span>}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Sub-Group Name *
                </label>
                <input
                  type="text"
                  value={subgroupFormData.name}
                  onChange={(e) => setSubgroupFormData({ ...subgroupFormData, name: e.target.value })}
                  placeholder="e.g. Garter Springs, Rubber Compounds, Solvents"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: subgroupFormErrors.name ? "1px solid #ef4444" : "1px solid #cbd5e1", fontSize: 12.5, outline: "none", boxSizing: "border-box" }}
                />
                {subgroupFormErrors.name && <span style={{ fontSize: 11, color: "#ef4444", marginTop: 3, display: "block" }}>{subgroupFormErrors.name}</span>}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 5 }}>
                  Sub-Group Code / Abbreviation
                </label>
                <input
                  type="text"
                  value={subgroupFormData.code}
                  onChange={(e) => setSubgroupFormData({ ...subgroupFormData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. GSP, RBC, SOL, MRA"
                  maxLength={6}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: 12.5, fontWeight: 800, letterSpacing: "0.05em", outline: "none", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 10, borderTop: "1px solid #e2e8f0" }}>
                <button type="button" onClick={() => setIsSubgroupModalOpen(false)} style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", borderRadius: 6, padding: "7px 16px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
                <button type="submit" style={{ background: "#059669", color: "#ffffff", border: "none", borderRadius: 6, padding: "7px 20px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                  Save Sub-Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE GROUP CONFIRMATION */}
      {deleteGroupTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: 400, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}>
            <h4 style={{ margin: 0, color: "#dc2626", fontSize: 16, fontWeight: 800 }}>Confirm Group Deletion</h4>
            <p style={{ fontSize: 13, color: "#475569", margin: "10px 0 20px" }}>
              Are you sure you want to delete group <strong>"{deleteGroupTarget.name}" ({deleteGroupTarget.code})</strong> and its sub-groups?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteGroupTarget(null)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
              <button onClick={handleConfirmDeleteGroup} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Delete Group</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE SUBGROUP CONFIRMATION */}
      {deleteSubgroupTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: 400, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}>
            <h4 style={{ margin: 0, color: "#dc2626", fontSize: 16, fontWeight: 800 }}>Confirm Sub-Group Deletion</h4>
            <p style={{ fontSize: 13, color: "#475569", margin: "10px 0 20px" }}>
              Are you sure you want to remove sub-group <strong>"{deleteSubgroupTarget.subgroup.name}"</strong> from <strong>{deleteSubgroupTarget.group.name}</strong>?
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteSubgroupTarget(null)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
              <button onClick={handleConfirmDeleteSubgroup} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Remove Sub-Group</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW / EDIT ITEM MASTER */}
      {/* MODAL 1: ADD NEW / EDIT ITEM MASTER (SINGLE TAB WITH GROUPED ATTRIBUTES) */}
      {isModalOpen && (() => {
        const currentGroupObj =
          OTHER_ITEM_GROUPS_CONFIG.find((g) => g.group === formData.group) || OTHER_ITEM_GROUPS_CONFIG[0];
        const currentSubgroups = currentGroupObj ? currentGroupObj.subgroups : [];

        const fieldInputStyle = {
          width: "100%",
          height: 28,
          padding: "2px 8px",
          borderRadius: 6,
          border: "1px solid #cbd5e1",
          background: "#ffffff",
          color: "#0f172a",
          fontSize: 11,
          fontWeight: 600,
          outline: "none",
          boxSizing: "border-box"
        };

        const fieldLabelStyle = {
          fontSize: 10,
          fontWeight: 700,
          color: "#475569",
          textTransform: "uppercase",
          display: "block",
          marginBottom: 2,
          letterSpacing: "0.2px"
        };

        const readOnlyCodeBoxStyle = {
          height: 28,
          display: "flex",
          alignItems: "center",
          padding: "0 10px",
          background: "#f1f5f9",
          border: "1px solid #cbd5e1",
          borderRadius: 6,
          fontWeight: 800,
          fontSize: 11,
          color: "#0f172a"
        };

        return (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(15, 23, 42, 0.7)",
              backdropFilter: "blur(5px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px 20px"
            }}
            /* Close only when the press AND release both happen on the backdrop,
               so dragging a selection out of the form does not close it */
            onMouseDown={(e) => {
              e.currentTarget.dataset.pressedBackdrop = String(e.target === e.currentTarget);
            }}
            onClick={(e) => {
              if (e.currentTarget.dataset.pressedBackdrop === "true" && e.target === e.currentTarget) setIsModalOpen(false);
            }}
          >
            <div
              style={{
                width: 1080,
                maxWidth: "96vw",
                maxHeight: "92vh",
                background: "#ffffff",
                borderRadius: 14,
                boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.4)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                border: "1px solid #e2e8f0"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* MODAL HEADER */}
              <div
                style={{
                  padding: "10px 18px",
                  borderBottom: "1px solid #e2e8f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#ffffff"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      background: editingId ? "#059669" : "#c51f28",
                      color: "#ffffff",
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px"
                    }}
                  >
                    {editingId ? "Edit Item" : "New Item Creation"}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                    Item Master &bull; Other (Non-FG)
                  </span>
                  <span style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>
                    ({formData.item_code || "New Record"})
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 20,
                    color: "#64748b",
                    cursor: "pointer",
                    padding: "2px 6px",
                    lineHeight: 1
                  }}
                >
                  &times;
                </button>
              </div>

              {/* SINGLE TAB SELECTOR HEADER */}
              <div
                style={{
                  display: "flex",
                  borderBottom: "1px solid #e2e8f0",
                  background: "#f8fafc"
                }}
              >
                <div
                  style={{
                    padding: "8px 20px",
                    borderBottom: "3px solid #c51f28",
                    background: "#ffffff",
                    color: "#c51f28",
                    fontWeight: 800,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6
                  }}
                >
                  <span>1. Primary Specifications</span>
                </div>
              </div>

              {/* FORM BODY */}
              <form
                onSubmit={handleFormSubmit}
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "12px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 7
                }}
              >
                {/* ========================================================================= */}
                {/* ROW 1: GROUP CLASSIFICATION (All 3 cascading dropdowns in 1 row)          */}
                {/* ========================================================================= */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={fieldLabelStyle}>Group *</label>
                    <select
                      value={formData.group}
                      onChange={(e) => handleGroupChange(e.target.value)}
                      style={fieldInputStyle}
                    >
                      <option value="">-- Select Group --</option>
                      {OTHER_ITEM_GROUPS_CONFIG.map((g) => (
                        <option key={g.group} value={g.group}>
                          {g.group}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Sub-Group *</label>
                    <select
                      value={formData.subgroup}
                      onChange={(e) => handleSubGroupChange(e.target.value)}
                      style={fieldInputStyle}
                    >
                      <option value="">-- Select Sub-Group --</option>
                      {currentSubgroups.map((sg) => (
                        <option key={sg.code + sg.name} value={sg.name}>
                          {sg.name} {sg.code ? `(${sg.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Sub-SubGroup *</label>
                    <select
                      value={formData.sub_subgroup}
                      onChange={(e) => handleSubSubGroupChange(e.target.value)}
                      style={fieldInputStyle}
                    >
                      <option value="">-- Select Sub-SubGroup --</option>
                      {currentSubgroups.map((sg) => (
                        <option key={"subsub-" + sg.code + sg.name} value={sg.name}>
                          {sg.name} {sg.code ? `(${sg.code})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* ROW 2: CODE HIERARCHY (All 4 codes in 1 row)                              */}
                {/* ========================================================================= */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                  <div>
                    <label style={fieldLabelStyle}>Main Group Code</label>
                    <div style={readOnlyCodeBoxStyle}>{formData.main_group_code || "-"}</div>
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Group Code</label>
                    <div style={readOnlyCodeBoxStyle}>{formData.group_code || "-"}</div>
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Sub Group Code</label>
                    <div style={readOnlyCodeBoxStyle}>{formData.sub_group_code || "-"}</div>
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Sub Sub Group Code</label>
                    <div style={readOnlyCodeBoxStyle}>{formData.sub_sub_group_code || "-"}</div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* ROW 3: CORE IDENTIFICATION (All core item identity in 1 row)              */}
                {/* ========================================================================= */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px 12px" }}>
                  <div>
                    <label style={fieldLabelStyle}>ITEM Code *</label>
                    <input
                      type="text"
                      value={formData.item_code}
                      readOnly
                      style={{
                        ...fieldInputStyle,
                        background: "#f1f5f9",
                        fontWeight: 800,
                        cursor: "not-allowed"
                      }}
                    />
                    {formErrors.item_code && (
                      <span style={{ fontSize: 10, color: "#ef4444", marginTop: 2, display: "block" }}>
                        {formErrors.item_code}
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Old Code</label>
                    <input
                      type="text"
                      value={formData.old_code}
                      onChange={(e) => handleInputChange("old_code", e.target.value)}
                      placeholder="e.g. 12015"
                      style={fieldInputStyle}
                    />
                  </div>

                  <div style={{ gridColumn: "span 2" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <label style={fieldLabelStyle}>Item Description *</label>
                      {formErrors.item_description && (
                        <span style={{ fontSize: 10, color: "#ef4444", fontWeight: 700 }}>
                          {formErrors.item_description}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={formData.item_description || formData.item_name}
                      onChange={(e) => handleInputChange("item_description", e.target.value)}
                      placeholder="e.g. OIL SEAL 35*50*8 NBR"
                      style={{
                        ...fieldInputStyle,
                        borderColor: formErrors.item_description ? "#ef4444" : "#cbd5e1"
                      }}
                    />
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* ROW 4: PHYSICAL DIMENSIONS (All 4 dimensions in 1 row)                    */}
                {/* ========================================================================= */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px 12px" }}>
                  <div>
                    <label style={fieldLabelStyle}>ID (in mm)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.inner_diameter}
                      onChange={(e) => handleInputChange("inner_diameter", e.target.value)}
                      placeholder="35"
                      style={fieldInputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>OD (in mm)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.outer_diameter}
                      onChange={(e) => handleInputChange("outer_diameter", e.target.value)}
                      placeholder="50"
                      style={fieldInputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Height (in mm)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.height}
                      onChange={(e) => handleInputChange("height", e.target.value)}
                      placeholder="8"
                      style={fieldInputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Thickness (in mm)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.thickness}
                      onChange={(e) => handleInputChange("thickness", e.target.value)}
                      placeholder="0"
                      style={fieldInputStyle}
                    />
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* ROW 5: PHYSICAL ATTRIBUTES & STYLE (All material/style in 1 row)           */}
                {/* ========================================================================= */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px" }}>
                  <div>
                    <label style={fieldLabelStyle}>Color</label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => handleInputChange("color", e.target.value)}
                      placeholder="Black"
                      style={fieldInputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Mtrl</label>
                    <input
                      type="text"
                      value={formData.material || formData.material_grade}
                      onChange={(e) => {
                        handleInputChange("material", e.target.value);
                        handleInputChange("material_grade", e.target.value);
                      }}
                      placeholder="NBR"
                      style={fieldInputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Style</label>
                    <select
                      value={formData.style}
                      onChange={(e) => handleInputChange("style", e.target.value)}
                      style={fieldInputStyle}
                    >
                      <option value="">-- Select Style --</option>
                      {STYLE_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* ROW 6: ENGINEERING DRAWINGS & MEDIA (All drawing & images in 1 row)       */}
                {/* ========================================================================= */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px" }}>
                  <div>
                    <label style={fieldLabelStyle}>Drawing No.</label>
                    <input
                      type="text"
                      value={formData.drawing_no}
                      onChange={(e) => handleInputChange("drawing_no", e.target.value)}
                      placeholder="DWG-001"
                      style={fieldInputStyle}
                    />
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Drawing Image</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, height: 28 }}>
                      <input
                        ref={drawingFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleDrawingImageUpload}
                        style={{ display: "none" }}
                        id="other-drawing-file-upload-input"
                      />
                      <label
                        htmlFor="other-drawing-file-upload-input"
                        style={{
                          cursor: "pointer",
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#1e293b",
                          whiteSpace: "nowrap"
                        }}
                      >
                        &#128247; {formData.drawing_image ? "Change" : "Browse File"}
                      </label>
                      {formData.drawing_image && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <img
                            src={formData.drawing_image}
                            alt="drawing thumb"
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              objectFit: "cover",
                              border: "1px solid #10b981"
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleRemoveDrawingImage}
                            title="Remove drawing image"
                            style={{
                              background: "#ef4444",
                              color: "#fff",
                              border: "none",
                              borderRadius: "50%",
                              width: 16,
                              height: 16,
                              fontSize: 10,
                              cursor: "pointer",
                              lineHeight: 1
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={fieldLabelStyle}>Image</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, height: 28 }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: "none" }}
                        id="other-item-file-upload-input"
                      />
                      <label
                        htmlFor="other-item-file-upload-input"
                        style={{
                          cursor: "pointer",
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: "#f1f5f9",
                          border: "1px solid #cbd5e1",
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#1e293b",
                          whiteSpace: "nowrap"
                        }}
                      >
                        &#128247; {formData.image ? "Change" : "Browse File"}
                      </label>
                      {formData.image && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <img
                            src={formData.image}
                            alt="item thumb"
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              objectFit: "cover",
                              border: "1px solid #10b981"
                            }}
                          />
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            title="Remove image"
                            style={{
                              background: "#ef4444",
                              color: "#fff",
                              border: "none",
                              borderRadius: "50%",
                              width: 16,
                              height: 16,
                              fontSize: 10,
                              cursor: "pointer",
                              lineHeight: 1
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* ROW 7: LEAD TIMES (Safety, Procurement, Total lead times in 1 row)        */}
                {/* ========================================================================= */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px" }}>
                  <div>
                    <label style={fieldLabelStyle}>Safety Lead Time</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.safety_lead_time}
                      onChange={(e) => handleInputChange("safety_lead_time", e.target.value)}
                      placeholder="0"
                      style={fieldInputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Procurement Lead Time</label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={formData.procurement_lead_time}
                      onChange={(e) => handleInputChange("procurement_lead_time", e.target.value)}
                      placeholder="0"
                      style={fieldInputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Total Lead Time</label>
                    <input
                      type="number"
                      readOnly
                      value={(Number(formData.safety_lead_time) || 0) + (Number(formData.procurement_lead_time) || 0)}
                      style={{
                        ...fieldInputStyle,
                        background: "#f1f5f9",
                        cursor: "not-allowed",
                        fontWeight: 800
                      }}
                    />
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* ROW 8: UOM & OPENING STOCK (All inventory units & balance in 1 row)       */}
                {/* ========================================================================= */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px" }}>
                  <div>
                    <label style={fieldLabelStyle}>Purchase UOM</label>
                    <select
                      value={formData.purchased_uom}
                      onChange={(e) => handleInputChange("purchased_uom", e.target.value)}
                      style={fieldInputStyle}
                    >
                      <option value="">-- Select UOM --</option>
                      {UOM_OPTIONS.map((u) => (
                        <option key={"puom-" + u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Consumed UOM</label>
                    <select
                      value={formData.consumption_uom}
                      onChange={(e) => handleInputChange("consumption_uom", e.target.value)}
                      style={fieldInputStyle}
                    >
                      <option value="">-- Select UOM --</option>
                      {UOM_OPTIONS.map((u) => (
                        <option key={"cuom-" + u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Opening Balance</label>
                    <input
                      type="number"
                      value={formData.opening_balance}
                      onChange={(e) => handleInputChange("opening_balance", e.target.value)}
                      placeholder="0"
                      style={fieldInputStyle}
                    />
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* ROW 9: WEIGHT & QUALITY SPECS (Gross, Net, Class, Rejection in 1 row)     */}
                {/* ========================================================================= */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px 12px" }}>
                  <div>
                    <label style={fieldLabelStyle}>Gross Wt (in gram)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.gross_wt}
                      onChange={(e) => handleInputChange("gross_wt", e.target.value)}
                      placeholder="0.00"
                      style={fieldInputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Net Wt (in gram)</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.net_wt}
                      onChange={(e) => handleInputChange("net_wt", e.target.value)}
                      placeholder="0.00"
                      style={fieldInputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Class</label>
                    <select
                      value={formData.item_class}
                      onChange={(e) => handleInputChange("item_class", e.target.value)}
                      style={fieldInputStyle}
                    >
                      <option value="">-- Select Class --</option>
                      {CLASS_OPTIONS.map((cl) => (
                        <option key={cl} value={cl}>
                          {cl}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Rej % Tolerance</label>
                    <input
                      type="text"
                      value={formData.rej_tolerance}
                      onChange={(e) => handleInputChange("rej_tolerance", e.target.value)}
                      placeholder="0%"
                      style={fieldInputStyle}
                    />
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* ROW 10: PROCUREMENT & PROCESS (Procurement, Process, HSN in 1 row)        */}
                {/* ========================================================================= */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr 1.4fr", gap: "6px 12px" }}>
                  <div>
                    <label style={fieldLabelStyle}>Procurement Type</label>
                    <select
                      value={formData.procurement_type}
                      onChange={(e) => handleInputChange("procurement_type", e.target.value)}
                      style={fieldInputStyle}
                    >
                      <option value="">-- Select Procurement --</option>
                      {procurementList.map((pt, idx) => (
                        <option key={pt || idx} value={pt}>
                          {pt}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Process Type</label>
                    <select
                      value={formData.process_type}
                      onChange={(e) => handleInputChange("process_type", e.target.value)}
                      style={fieldInputStyle}
                    >
                      <option value="">-- Select Process --</option>
                      {processList.map((proc, idx) => (
                        <option key={proc.code || idx} value={proc.code || proc.label}>
                          {proc.label || proc.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>HSN / SAC Code</label>
                    <select
                      value={formData.hsn_code}
                      onChange={(e) => handleInputChange("hsn_code", e.target.value)}
                      style={fieldInputStyle}
                    >
                      <option value="">-- Select HSN / SAC Code --</option>
                      {formData.hsn_code && !hsnList.some((h) => h.code === formData.hsn_code) && (
                        <option value={formData.hsn_code}>{formData.hsn_code}</option>
                      )}
                      {hsnList.map((h) => (
                        <option key={h.code} value={h.code}>
                          {h.code} {h.desc ? `- ${h.desc}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* ROW 11: INVENTORY STOCK LEVELS (Min, Max, Reorder levels in 1 row)        */}
                {/* ========================================================================= */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px" }}>
                  <div>
                    <label style={fieldLabelStyle}>Min Stock Lvl</label>
                    <input
                      type="number"
                      value={formData.min_stock_lvl}
                      onChange={(e) => handleInputChange("min_stock_lvl", e.target.value)}
                      placeholder="100"
                      style={fieldInputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Max Stock Lvl</label>
                    <input
                      type="number"
                      value={formData.max_stock_lvl}
                      onChange={(e) => handleInputChange("max_stock_lvl", e.target.value)}
                      placeholder="1000"
                      style={fieldInputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Reorder Stock Lvl</label>
                    <input
                      type="number"
                      value={formData.reorder_stock_lvl}
                      onChange={(e) => handleInputChange("reorder_stock_lvl", e.target.value)}
                      placeholder="200"
                      style={fieldInputStyle}
                    />
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* ROW 12: FINANCIALS & COMMERCIALS (MRP, Rate in 1 row)                     */}
                {/* ========================================================================= */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
                  <div>
                    <label style={fieldLabelStyle}>MRP</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.mrp}
                      onChange={(e) => handleInputChange("mrp", e.target.value)}
                      placeholder="0.00"
                      style={fieldInputStyle}
                    />
                  </div>
                  <div>
                    <label style={fieldLabelStyle}>Rate</label>
                    <input
                      type="number"
                      step="any"
                      value={formData.rate}
                      onChange={(e) => handleInputChange("rate", e.target.value)}
                      placeholder="0.00"
                      style={fieldInputStyle}
                    />
                  </div>
                </div>

                {/* FOOTER ACTIONS */}
                <div
                  style={{
                    marginTop: 6,
                    paddingTop: 10,
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                    * Specifications automatically sync to Engineering &amp; Inventory Master
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        padding: "5px 14px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#475569",
                        cursor: "pointer"
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const defaultGroup =
                          OTHER_ITEM_GROUPS_CONFIG.find((g) => g.group === "Raw Material") ||
                          OTHER_ITEM_GROUPS_CONFIG[0];
                        const defaultSub = defaultGroup.subgroups[0];
                        const newCode = generateOtherItemCode(defaultSub.code, defaultGroup.code, items);
                        setFormData({
                          ...INITIAL_ITEM_FORM,
                          group: defaultGroup.group,
                          subgroup: defaultSub.name,
                          sub_subgroup: defaultSub.name,
                          main_group_code: defaultGroup.code,
                          group_code: defaultGroup.code,
                          sub_group_code: defaultSub.code,
                          sub_sub_group_code: defaultSub.code,
                          category: defaultGroup.group,
                          sub_category: defaultSub.name,
                          item_code: newCode
                        });
                      }}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        padding: "5px 14px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#475569",
                        cursor: "pointer"
                      }}
                    >
                      Clear
                    </button>

                    <button
                      type="submit"
                      style={{
                        background: editingId
                          ? "linear-gradient(135deg, #059669 0%, #047857 100%)"
                          : "linear-gradient(135deg, #c51f28 0%, #991b1b 100%)",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 18px",
                        fontSize: 11.5,
                        fontWeight: 800,
                        cursor: "pointer",
                        boxShadow: editingId
                          ? "0 2px 8px rgba(5, 150, 105, 0.35)"
                          : "0 2px 8px rgba(197, 31, 40, 0.35)",
                        display: "flex",
                        alignItems: "center",
                        gap: 6
                      }}
                    >
                      &#10003; {editingId ? "Update Item" : "Save Item"}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ITEM DETAIL VIEW MODAL */}
      {detailItem && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setDetailItem(null)}>
          <div style={{ width: 600, maxWidth: "100%", background: "#ffffff", borderRadius: 14, boxShadow: "0 20px 50px rgba(0,0,0,0.3)", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "16px 22px", background: "#1e293b", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{detailItem.item_code}</h3>
                <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "#94a3b8" }}>{detailItem.item_name}</p>
              </div>
              <button onClick={() => setDetailItem(null)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ padding: 24, fontSize: 12.5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div><strong style={{ color: "#64748b" }}>Category / Group:</strong> <div style={{ color: "#0f172a", fontWeight: 700 }}>{detailItem.category}</div></div>
              <div><strong style={{ color: "#64748b" }}>Sub-Group:</strong> <div style={{ color: "#0f172a", fontWeight: 700 }}>{detailItem.sub_category || "-"}</div></div>
              <div><strong style={{ color: "#64748b" }}>Material Grade:</strong> <div style={{ color: "#0f172a", fontWeight: 700 }}>{detailItem.material_grade || "-"}</div></div>
              <div><strong style={{ color: "#64748b" }}>HSN Code:</strong> <div style={{ color: "#0f172a", fontWeight: 700 }}>{detailItem.hsn_code || "-"}</div></div>
              <div><strong style={{ color: "#64748b" }}>UOM:</strong> <div style={{ color: "#0f172a", fontWeight: 700 }}>{detailItem.uom}</div></div>
              <div><strong style={{ color: "#64748b" }}>Current Stock:</strong> <div style={{ color: "#059669", fontWeight: 800 }}>{detailItem.current_stock} {detailItem.uom}</div></div>
              <div><strong style={{ color: "#64748b" }}>Min Stock Level:</strong> <div style={{ color: "#dc2626", fontWeight: 800 }}>{detailItem.min_stock} {detailItem.uom}</div></div>
              <div><strong style={{ color: "#64748b" }}>Unit Rate:</strong> <div style={{ color: "#0f172a", fontWeight: 800 }}>₹{Number(detailItem.unit_price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div></div>
              <div><strong style={{ color: "#64748b" }}>Default Supplier:</strong> <div style={{ color: "#0f172a", fontWeight: 600 }}>{detailItem.default_supplier || "-"}</div></div>
              <div><strong style={{ color: "#64748b" }}>Storage Location:</strong> <div style={{ color: "#0f172a", fontWeight: 600 }}>{detailItem.storage_location || "-"}</div></div>
              <div style={{ gridColumn: "span 2" }}><strong style={{ color: "#64748b" }}>Notes / Specifications:</strong> <div style={{ color: "#334155", background: "#f8fafc", padding: 10, borderRadius: 6, marginTop: 4, border: "1px solid #e2e8f0" }}>{detailItem.notes || "No extra technical notes specified."}</div></div>
            </div>
            <div style={{ padding: "12px 22px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => { setDetailItem(null); handleOpenEditModal(detailItem); }} style={{ background: "#1e293b", color: "#ffffff", border: "none", borderRadius: 6, padding: "7px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Edit Item</button>
              <button onClick={() => setDetailItem(null)} style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#334155", borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ITEM CONFIRMATION */}
      {deleteTarget && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ width: 400, background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.25)" }}>
            <h4 style={{ margin: 0, color: "#dc2626", fontSize: 16, fontWeight: 800 }}>Confirm Deletion</h4>
            <p style={{ fontSize: 13, color: "#475569", margin: "10px 0 20px" }}>Are you sure you want to delete item <strong>"{deleteTarget.item_code}"</strong>? This action cannot be undone.</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Cancel</button>
              <button onClick={handleConfirmDelete} style={{ padding: "6px 16px", borderRadius: 6, border: "none", background: "#dc2626", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Delete Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
