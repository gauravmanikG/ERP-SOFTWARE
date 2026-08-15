import { C } from "../../../shared/constants/constants";

// Small switcher shown on both Company Master screens so it's always
// obvious how to get from one to the other.
export function CompanyMasterSubNav({ page, setPage, recordCount, onNew }) {
  const goToForm = () => {
    if (onNew) onNew();
    setPage("company-master-form");
  };

  return (
    <div className="flex gap-2 mb-6">
      <button
        onClick={goToForm}
        className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition ${page === "company-master-form" || page === "entry-forms" ? "text-white shadow-xs" : "bg-white text-slate-700 hover:bg-slate-50"}`}
        style={page === "company-master-form" || page === "entry-forms" ? { backgroundColor: "#0EA5E9", borderColor: "#0EA5E9" } : { borderColor: "#E2E8F0" }}
      >
        Screen 1 · Entry Form
      </button>
      <button
        onClick={() => setPage("company-master-list")}
        className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition ${page === "company-master-list" || page === "entry-forms-list" ? "text-white shadow-xs" : "bg-white text-slate-700 hover:bg-slate-50"}`}
        style={page === "company-master-list" || page === "entry-forms-list" ? { backgroundColor: "#0EA5E9", borderColor: "#0EA5E9" } : { borderColor: "#E2E8F0" }}
      >
        Screen 2 · Records ({recordCount})
      </button>
    </div>
  );
}
