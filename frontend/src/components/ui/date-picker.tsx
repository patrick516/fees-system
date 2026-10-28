// frontend/src/components/ui/date-picker.tsx
import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DatePickerProps {
  /** ISO date string (YYYY-MM-DD) */
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  min?: string;
  max?: string;
  /** 🎯 When true, shows Day/Month/Year dropdowns instead of a calendar */
  birthdateMode?: boolean;
}

const toDate = (iso?: string): Date | undefined => {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d);
};

const toIso = (date?: Date): string => {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  clearable = true,
  min,
  max,
  birthdateMode = false,
}) => {
  const [open, setOpen] = React.useState(false);
  const date = toDate(value);

  const disabledDays = React.useMemo(() => {
    const matchers: any[] = [];
    if (min) matchers.push({ before: toDate(min)! });
    if (max) matchers.push({ after: toDate(max)! });
    return matchers.length > 0 ? matchers : undefined;
  }, [min, max]);

  // 🎯 Birthdate mode — three Shadcn selects
  if (birthdateMode) {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
    const [y, m, d] = value ? value.split("-").map(Number) : [0, 0, 0];
    const daysInMonth = y && m ? new Date(y, m, 0).getDate() : 31;
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const setPart = (part: "y" | "m" | "d", val: number) => {
      const year = part === "y" ? val : y || currentYear;
      const month = part === "m" ? val : m || 1;
      const day = part === "d" ? val : d || 1;
      const daysInNewMonth = new Date(year, month, 0).getDate();
      const safeDay = Math.min(day, daysInNewMonth);
      onChange(toIso(new Date(year, month - 1, safeDay)));
    };

    return (
      <div className={cn("flex gap-2", className)}>
        {/* Day Select */}
        <Select
          value={d ? String(d) : "NONE"}
          onValueChange={(v) => setPart("d", v === "NONE" ? 0 : Number(v))}
          disabled={disabled}
        >
          <SelectTrigger className="flex-1 min-w-0 bg-white border-gray-300 rounded-lg text-sm h-[38px]">
            <SelectValue placeholder="Day" />
          </SelectTrigger>
          <SelectContent className="bg-white max-h-[200px]">
            <SelectItem value="NONE">Day</SelectItem>
            {days.map((dd) => (
              <SelectItem key={dd} value={String(dd)}>
                {dd}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Month Select */}
        <Select
          value={m ? String(m) : "NONE"}
          onValueChange={(v) => setPart("m", v === "NONE" ? 0 : Number(v))}
          disabled={disabled}
        >
          <SelectTrigger className="flex-[1.5] min-w-0 bg-white border-gray-300 rounded-lg text-sm h-[38px]">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent className="bg-white max-h-[200px]">
            <SelectItem value="NONE">Month</SelectItem>
            {MONTHS.map((name, i) => (
              <SelectItem key={i} value={String(i + 1)}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Year Select */}
        <Select
          value={y ? String(y) : "NONE"}
          onValueChange={(v) => setPart("y", v === "NONE" ? 0 : Number(v))}
          disabled={disabled}
        >
          <SelectTrigger className="w-[90px] bg-white border-gray-300 rounded-lg text-sm h-[38px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent className="bg-white max-h-[200px]">
            <SelectItem value="NONE">Year</SelectItem>
            {years.map((yy) => (
              <SelectItem key={yy} value={String(yy)}>
                {yy}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Default mode — normal calendar picker
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
            !date && "text-gray-400",
            className,
          )}
        >
          <CalendarIcon
            size={14}
            className={date ? "text-gray-500" : "text-gray-400"}
          />
          <span className="flex-1 truncate">
            {date ? format(date, "dd MMM yyyy") : placeholder}
          </span>
          {clearable && date && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  onChange("");
                }
              }}
              className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
              aria-label="Clear date"
            >
              <X size={12} />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-white" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onChange(toIso(d));
            setOpen(false);
          }}
          disabled={disabledDays}
        />
        <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              onChange(toIso(new Date()));
              setOpen(false);
            }}
            className="text-xs font-medium text-[var(--color-primary)] hover:underline"
          >
            Today
          </button>
          {clearable && date && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
