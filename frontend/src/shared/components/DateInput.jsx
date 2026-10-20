import React, { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { DATE_FORMAT, isoToDisplayDate, displayDateToIso } from "../utils/dateFormat";

/**
 * Date field used everywhere in the app. It shows and accepts the master format (DATE_FORMAT),
 * so the result does not depend on the browser or operating-system language.
 *
 * Drop-in for <input type="date">: `value` and `min`/`max` are ISO (yyyy-MM-dd), and `onChange`
 * receives an event-like object whose `target.value` is ISO ("" when empty or incomplete).
 */
export default function DateInput({ value, onChange, min, max, style, disabled, title, onBlur, name, ...rest }) {
  const [text, setText] = useState(isoToDisplayDate(value));
  const pickerRef = useRef(null);

  // Keep the visible text in step with the value when it is changed from outside
  useEffect(() => {
    setText(isoToDisplayDate(value));
  }, [value]);

  const emit = (iso) => {
    if (onChange) onChange({ target: { value: iso, name } });
  };

  const handleTextChange = (e) => {
    // Keep digits only and insert the separators as the user types
    const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
    let display = digits.slice(0, 2);
    if (digits.length > 2) display += DATE_FORMAT.separator + digits.slice(2, 4);
    if (digits.length > 4) display += DATE_FORMAT.separator + digits.slice(4, 8);
    setText(display);
    emit(digits.length === 0 ? "" : displayDateToIso(display));
  };

  const handlePickerChange = (e) => {
    setText(isoToDisplayDate(e.target.value));
    emit(e.target.value);
  };

  const handleBlur = (e) => {
    // Drop an incomplete entry back to the last valid value
    setText(isoToDisplayDate(value));
    if (onBlur) onBlur(e);
  };

  const outOfRange = Boolean(value) && ((min && value < min) || (max && value > max));
  const borderColor = outOfRange ? "#ef4444" : style?.border ? undefined : "#cbd5e1";

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
  };

  return (
    <div style={{ position: "relative", width: style?.width || "100%", display: "block" }}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={DATE_FORMAT.placeholder}
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        disabled={disabled}
        title={title || `Format: ${DATE_FORMAT.display}`}
        {...rest}
        style={{
          ...style,
          width: "100%",
          boxSizing: "border-box",
          paddingRight: 28,
          ...(borderColor ? { border: `1px solid ${borderColor}` } : {})
        }}
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={disabled}
        title="Pick from calendar"
        tabIndex={-1}
        style={{
          position: "absolute",
          right: 6,
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          padding: 0,
          cursor: disabled ? "not-allowed" : "pointer",
          color: "#64748b",
          display: "flex",
          alignItems: "center"
        }}
      >
        <Calendar size={13} />
      </button>
      {/* Native picker used only for choosing a date from the calendar; the text field stays in the master format */}
      <input
        ref={pickerRef}
        type="date"
        lang="en-GB"
        value={value || ""}
        min={min}
        max={max}
        onChange={handlePickerChange}
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: "absolute", left: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: "none", border: "none", padding: 0 }}
      />
    </div>
  );
}
