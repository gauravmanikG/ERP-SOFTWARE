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
        className={`px-4 py-1.5 rounded text-sm font-semibold border ${page === "company-master-form" ? "text-white" : "bg-white"}`}
        style={page === "company-master-form" ? { backgroundColor: C.red, borderColor: C.red } : { borderColor: C.line, color: C.ink }}
      >
        Screen 1 · Entry Form
      </button>
      <button
        onClick={() => setPage("company-master-list")}
        className={`px-4 py-1.5 rounded text-sm font-semibold border ${page === "company-master-list" ? "text-white" : "bg-white"}`}
        style={page === "company-master-list" ? { backgroundColor: C.red, borderColor: C.red } : { borderColor: C.line, color: C.ink }}
      >
        Screen 2 · Records ({recordCount})
      </button>
    </div>
  );
}
