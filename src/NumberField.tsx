import type { FocusEvent } from "react";

interface NumberFieldProps {
  value: string;
  placeholder?: string;
  step: number;
  className?: string;
  onChange: (value: string) => void;
}

export function NumberField({ value, placeholder, step, className = "", onChange }: NumberFieldProps) {
  // When the field is empty (e.g. an untouched reps input), stepping should
  // start from last week's number — shown as the placeholder — not from 0.
  const baseline = (): number => {
    const current = parseFloat(value);
    if (!isNaN(current)) return current;
    const fallback = parseFloat(placeholder ?? "");
    return isNaN(fallback) ? 0 : fallback;
  };

  const bump = (delta: number) => onChange(String(baseline() + delta));

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    if (value === "" && placeholder) {
      onChange(placeholder);
    }
    // Wait a tick so the input has the filled-in value before selecting it.
    requestAnimationFrame(() => e.target.select());
  };

  return (
    <div className={`number-field ${className}`}>
      <button type="button" className="stepper-btn" onClick={() => bump(-step)} aria-label="decrease">
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
      />
      <button type="button" className="stepper-btn" onClick={() => bump(step)} aria-label="increase">
        +
      </button>
    </div>
  );
}
