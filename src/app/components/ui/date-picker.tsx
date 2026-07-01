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

export function DatePicker({ value, onChange, placeholder = "Pick a date", className, disabled }: DatePickerProps) {
  const strVal = String(value || "");

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <CalendarIcon className="absolute left-3 w-4 h-4 text-muted-foreground pointer-events-none" />
      <input
        type="date"
        value={strVal}
        onChange={handleNativeChange}
        disabled={disabled}
        className="w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
        style={{ fontSize: "0.85rem" }}
      />
    </div>
  )
}
