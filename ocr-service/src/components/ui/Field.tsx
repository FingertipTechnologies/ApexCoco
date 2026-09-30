"use client";

import type { InputHTMLAttributes, ReactNode } from "react";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  editing: boolean;
  error?: string;
  hint?: ReactNode;
  badge?: ReactNode;
  required?: boolean;
}

/**
 * Lightning-style form field. In read mode it renders as a label/value pair
 * (like a record detail page); in edit mode it becomes an input.
 */
export function Field({ label, value, onChange, editing, error, hint, badge, required, id, className = "", ...rest }: FieldProps) {
  const inputId = id ?? `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className={`min-w-0 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-xs font-semibold text-sf-text-muted">
          {required && <span className="text-sf-error mr-0.5" aria-hidden>*</span>}
          {label}
        </label>
        {badge}
      </div>
      {editing ? (
        <input
          id={inputId}
          {...rest}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`mt-1 block w-full h-11 rounded-sf border bg-white px-3 text-base text-sf-text placeholder:text-sf-text-muted/60 focus:outline-none focus:ring-2 focus:ring-sf-brand-accent focus:border-sf-brand ${error ? "border-sf-error" : "border-sf-border-strong"}`}
        />
      ) : (
        <p className={`mt-1 min-h-6 border-b border-sf-border pb-1 text-base ${value ? "text-sf-text" : "text-sf-text-muted italic"}`}>
          {value || "Not on card"}
        </p>
      )}
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-xs text-sf-error">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-sf-text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
