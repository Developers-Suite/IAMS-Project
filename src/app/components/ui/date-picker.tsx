import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "./utils"

export interface DatePickerProps {
  value?: string // format: YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

function toDdMmYyyy(yyyyMmDd: string): string {
  if (!yyyyMmDd) return "";
  const parts = yyyyMmDd.split("T")[0].split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return yyyyMmDd;
}

export function DatePicker({ value, onChange, placeholder = "dd/mm/yyyy", className, disabled }: DatePickerProps) {
  const strVal = String(value || "");
  const displayVal = toDdMmYyyy(strVal);

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <CalendarIcon className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
      <div className="relative w-full flex items-center">
        <input
          type="text"
          readOnly
          value={displayVal}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all pointer-events-none"
          style={{ fontSize: "0.85rem" }}
        />
        <input
          type="date"
          value={strVal}
          onChange={handleNativeChange}
          disabled={disabled}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed z-20"
        />
      </div>
    </div>
  )
}
