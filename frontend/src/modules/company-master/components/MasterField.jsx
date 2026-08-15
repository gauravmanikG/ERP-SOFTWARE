export function MasterField({ f, value, onChange, error, disabled = false }) {
  const isFieldDisabled = disabled || f.readOnly;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
          {f.label}{f.required && <span className="text-red-500 font-bold ml-0.5">*</span>}
        </label>
        {f.readOnly && (
          <span className="text-[10px] font-extrabold text-sky-700 dark:text-sky-300 uppercase tracking-wider bg-sky-100 dark:bg-sky-950/70 dark:border dark:border-sky-800/60 px-2 py-0.5 rounded">
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
          className={`border rounded-lg px-3 py-2 text-sm transition ${
            isFieldDisabled
              ? "bg-slate-100/90 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800 font-semibold"
              : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
          } ${error ? "border-red-400 ring-2 ring-red-400/20" : ""}`}
        />
      ) : f.type === "select" ? (
        <select
          value={value || ""}
          disabled={isFieldDisabled}
          onChange={(e) => onChange(f.key, e.target.value)}
          className={`border rounded-lg px-3 py-2 text-sm transition ${
            isFieldDisabled
              ? "bg-slate-100/90 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800 font-semibold"
              : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
          } ${error ? "border-red-400 ring-2 ring-red-400/20" : ""}`}
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
          className={`border rounded-lg px-3 py-2 text-sm transition ${
            isFieldDisabled
              ? "bg-slate-100/90 dark:bg-slate-950/70 text-slate-600 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800 font-semibold"
              : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-sky-500 dark:focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
          } ${error ? "border-red-400 ring-2 ring-red-400/20" : ""}`}
        />
      )}
      {error && <div className="text-[12px] text-red-600 dark:text-red-400 font-semibold mt-0.5">{error}</div>}
    </div>
  );
}
