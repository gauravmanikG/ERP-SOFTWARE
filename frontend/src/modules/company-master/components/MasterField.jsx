import { C } from "../../../shared/constants/constants";

export function MasterField({ f, value, onChange, error, disabled = false }) {
  const isFieldDisabled = disabled || f.readOnly;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
          {f.label}{f.required && <span className="text-red-500 font-bold ml-0.5">*</span>}
        </label>
        {f.readOnly && (
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
            Auto-Generated
          </span>
        )}
      </div>
      {f.type === "textarea" ? (
        <textarea
          rows={2}
          value={value || ""}
          disabled={isFieldDisabled}
          readOnly={f.readOnly}
          placeholder={f.placeholder}
          onChange={(e) => onChange(f.key, e.target.value)}
          className={`border rounded px-2.5 py-1.5 text-sm ${isFieldDisabled ? 'bg-slate-100 text-slate-700 cursor-not-allowed border-slate-200 font-medium' : 'bg-white focus:outline-none focus:ring-2'} ${error ? 'ring-2 ring-red-300' : ''}`}
          style={{ borderColor: error ? '#f87171' : C.line }}
        />
      ) : f.type === "select" ? (
        <select
          value={value || ""}
          disabled={isFieldDisabled}
          onChange={(e) => onChange(f.key, e.target.value)}
          className={`border rounded px-2.5 py-1.5 text-sm ${isFieldDisabled ? 'bg-slate-100 text-slate-700 cursor-not-allowed border-slate-200 font-medium' : 'bg-white focus:outline-none focus:ring-2'} ${error ? 'ring-2 ring-red-300' : ''}`}
          style={{ borderColor: error ? '#f87171' : C.line }}
        >
          <option value="">Select...</option>
          {(f.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : (
        <input
          type="text"
          value={value || ""}
          disabled={isFieldDisabled}
          readOnly={f.readOnly}
          placeholder={f.placeholder}
          onChange={(e) => onChange(f.key, e.target.value)}
          className={`border rounded px-2.5 py-1.5 text-sm ${isFieldDisabled ? 'bg-slate-100 text-slate-700 cursor-not-allowed border-slate-200 font-medium' : 'bg-white focus:outline-none focus:ring-2'} ${error ? 'ring-2 ring-red-300' : ''}`}
          style={{ borderColor: error ? '#f87171' : C.line }}
        />
      )}
      {error && <div className="text-[12px] text-red-600 mt-1">{error}</div>}
    </div>
  );
}
