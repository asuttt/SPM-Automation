import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const parseDateValue = (value: string) => {
  if (!value) return undefined;

  const parts = value.split("-");
  if (parts.length !== 3) return undefined;

  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return undefined;

  return new Date(year, month - 1, day);
};

const formatDateForDisplay = (value: string) => {
  const parts = value.split("-");
  if (parts.length !== 3) return "MM/DD/YYYY";

  const [year, month, day] = parts;
  if (!year || !month || !day) return "MM/DD/YYYY";

  return `${month}/${day}/${year}`;
};

const formatDateForValue = (date?: Date) => {
  if (!date) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const DateField = ({ id, label, value, onChange }: DateFieldProps) => {
  const [open, setOpen] = useState(false);
  const selectedDate = useMemo(() => parseDateValue(value), [value]);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className={cn(
              "flex w-full items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-left transition-[border-color,box-shadow,color] duration-300 ease-out focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25",
              value ? "text-foreground" : "text-muted-foreground",
            )}
            aria-label={label}
          >
            <span>{formatDateForDisplay(value)}</span>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto border-border p-0"
          collisionPadding={12}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              onChange(formatDateForValue(date));
              setOpen(false);
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
