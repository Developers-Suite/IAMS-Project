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

// Convert YYYY-MM-DD -> DD/MM/YYYY
function toDdMmYyyy(yyyyMmDd: string): string {
  if (!yyyyMmDd) return "";
  const parts = yyyyMmDd.split("T")[0].split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts;
    return `${d}/${m}/${y}`;
  }
  return yyyyMmDd;
}

// Parse typed DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or DDMMYYYY -> YYYY-MM-DD
function parseTypedDate(typed: string): string | null {
  const cleaned = typed.trim();
  if (!cleaned) return "";

  // Matches DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const regexSlash = /^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{4})$/;
  const match = cleaned.match(regexSlash);
  if (match) {
    let [, day, month, year] = match;
    day = day.padStart(2, "0");
    month = month.padStart(2, "0");
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${year}-${month}-${day}`;
    }
  }

  // Matches 8 digits: DDMMYYYY
  if (/^\d{8}$/.test(cleaned)) {
    const day = cleaned.slice(0, 2);
    const month = cleaned.slice(2, 4);
    const year = cleaned.slice(4, 8);
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 1900 && y <= 2100) {
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

export function DatePicker({ value, onChange, placeholder = "dd/mm/yyyy", className, disabled }: DatePickerProps) {
  const strVal = String(value || "");
  const [inputText, setInputText] = React.useState(toDdMmYyyy(strVal));
  const dateInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setInputText(toDdMmYyyy(strVal));
  }, [strVal]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    const parsed = parseTypedDate(val);
    if (parsed !== null) {
      onChange(parsed);
    }
  };

  const handleTextBlur = () => {
    if (!inputText.trim()) {
      onChange("");
      return;
    }
    const parsed = parseTypedDate(inputText);
    if (parsed) {
      onChange(parsed);
      setInputText(toDdMmYyyy(parsed));
    }
  };

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setInputText(toDdMmYyyy(val));
  };

  const openCalendar = () => {
    if (dateInputRef.current && !disabled) {
      if ("showPicker" in dateInputRef.current) {
        try {
          (dateInputRef.current as any).showPicker();
        } catch {
          dateInputRef.current.focus();
          dateInputRef.current.click();
        }
      } else {
        dateInputRef.current.focus();
        dateInputRef.current.click();
      }
    }
  };

  return (
    <div className={cn("relative flex items-center w-full", className)}>
      <input
        type="text"
        value={inputText}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full pl-3 pr-9 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
        style={{ fontSize: "0.85rem" }}
      />
      <button
        type="button"
        onClick={openCalendar}
        disabled={disabled}
        tabIndex={-1}
        className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        title="Open calendar picker"
      >
        <CalendarIcon className="w-4 h-4" />
      </button>
      <input
        ref={dateInputRef}
        type="date"
        value={strVal}
        onChange={handleNativePickerChange}
        disabled={disabled}
        tabIndex={-1}
        className="sr-only"
        style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
      />
    </div>
  )
}
