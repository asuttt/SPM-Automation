import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium",
        nav: "space-x-1 flex items-center",
        nav_button:
          "inline-flex h-7 w-7 items-center justify-center rounded-md bg-transparent p-0 text-muted-foreground opacity-60 transition-colors duration-200 ease-out hover:bg-accent/10 hover:text-accent hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25",
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day:
          "inline-flex h-9 w-9 items-center justify-center rounded-md p-0 text-sm font-normal text-foreground transition-colors duration-200 ease-out aria-selected:opacity-100 hover:bg-accent/10 hover:text-accent focus-visible:bg-accent/10 focus-visible:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25",
        day_range_end: "day-range-end",
        day_selected:
          "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
        day_today: "bg-accent/10 text-accent ring-1 ring-inset ring-accent",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/15 aria-selected:text-muted-foreground aria-selected:opacity-40",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent/15 aria-selected:text-accent",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
