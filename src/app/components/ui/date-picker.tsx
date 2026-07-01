import * as React from "react"
import { format, parseISO, isValid } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "./utils"
import { Button } from "./button"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

export interface DatePickerProps {
  value?: string // format: YYYY-MM-DD
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DatePicker({ value, onChange, placeholder = "Pick a date", className, disabled }: DatePickerProps) {
  const selectedDate = React.useMemo(() => {
    const strVal = String(value || "");
    if (!strVal) return undefined;
    
    // Try standard ISO parsing (YYYY-MM-DD)
    const parsed = parseISO(strVal);
    if (isValid(parsed)) return parsed;
    
    // Try manual parsing of DD-MM-YYYY or DD/MM/YYYY
    const parts = strVal.split(/[-/]/);
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          const d = new Date(p0, p1 - 1, p2);
          if (isValid(d)) return d;
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY
          const d = new Date(p2, p1 - 1, p0);
          if (isValid(d)) return d;
        }
      }
    }
    
    // Fallback to native Date parser
    const nativeParsed = new Date(strVal);
    if (isValid(nativeParsed)) return nativeParsed;
    
    return undefined;
  }, [value])

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      onChange("")
      return
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    onChange(`${year}-${month}-${day}`)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal border border-border rounded-lg bg-background px-3 py-2 h-9 shadow-sm transition-all hover:bg-accent/50",
            !selectedDate && "text-muted-foreground",
            className
          )}
          style={{ fontSize: "0.85rem" }}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          {selectedDate ? format(selectedDate, "dd-MM-yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
