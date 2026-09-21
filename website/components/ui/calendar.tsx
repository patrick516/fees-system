"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "../../lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center h-9",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          "h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-200 bg-transparent p-0 opacity-60 hover:opacity-100 absolute left-1",
        ),
        button_next: cn(
          "h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-200 bg-transparent p-0 opacity-60 hover:opacity-100 absolute right-1",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday:
          "w-9 h-9 flex items-center justify-center text-gray-500 font-normal text-[0.8rem] select-none",
        week: "flex w-full mt-1",
        day: "w-9 h-9 p-0 text-center text-sm",
        day_button: cn(
          "w-9 h-9 p-0 font-normal rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0B1F44]/30 transition-colors",
        ),
        selected:
          "[&_button]:bg-[#0B1F44] [&_button]:text-white [&_button]:hover:bg-[#0B1F44] [&_button]:hover:text-white",
        today: "[&_button]:bg-gray-100 [&_button]:text-gray-900",
        outside: "[&_button]:text-gray-300 [&_button]:opacity-60",
        disabled: "[&_button]:text-gray-300 [&_button]:opacity-40",
        hidden: "invisible",
        dropdowns: "flex justify-center gap-1.5 items-center",
        dropdown_root: "relative",
        dropdown: "absolute inset-0 opacity-0 pointer-events-none",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className="h-4 w-4" />;
        },
        Dropdown: ({ value, onChange, options, "aria-label": ariaLabel }) => {
          return (
            <Select
              value={value !== undefined ? String(value) : undefined}
              onValueChange={(v) => {
                if (!onChange) return;
                // rdp expects a ChangeEvent-like object with target.value
                const fakeEvent = {
                  target: { value: v },
                } as unknown as React.ChangeEvent<HTMLSelectElement>;
                onChange(fakeEvent);
              }}
            >
              <SelectTrigger
                aria-label={ariaLabel}
                className="h-8 w-auto min-w-[72px] gap-1 px-2.5 py-0 text-sm font-medium border border-gray-200 rounded-md bg-white text-gray-800 hover:bg-gray-50 focus:ring-2 focus:ring-[#0B1F44]/30 focus:ring-offset-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                position="popper"
                sideOffset={4}
                className="max-h-64 z-[60] bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto"
              >
                {options?.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={String(opt.value)}
                    disabled={opt.disabled}
                    className="text-sm rounded-md cursor-pointer focus:bg-gray-100 focus:text-gray-900 data-[state=checked]:bg-[#0B1F44]/10 data-[state=checked]:text-[#0B1F44] data-[state=checked]:font-medium"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
