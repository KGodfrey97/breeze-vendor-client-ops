"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, CaptionProps } from "react-day-picker"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

interface CustomCaptionProps extends CaptionProps {
  onMonthChange: (date: Date) => void
  month: Date
}

// Custom caption with working arrows and dropdowns
function CustomCaption({ displayMonth, onMonthChange }: CustomCaptionProps) {
  const months = Array.from({ length: 12 }, (_, i) => i)
  const years = Array.from({ length: 2100 - 1900 + 1 }, (_, i) => 1900 + i)

  const prevMonth = () => {
    const d = new Date(displayMonth)
    d.setMonth(d.getMonth() - 1)
    onMonthChange(d)
  }

  const nextMonth = () => {
    const d = new Date(displayMonth)
    d.setMonth(d.getMonth() + 1)
    onMonthChange(d)
  }

  return (
    <div className="flex justify-center items-center space-x-2 pt-1">
      <button
        type="button"
        className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 p-0")}
        onClick={prevMonth}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <select
        value={displayMonth.getMonth()}
        onChange={(e) => {
          const d = new Date(displayMonth)
          d.setMonth(Number(e.target.value))
          onMonthChange(d)
        }}
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {new Date(2000, m).toLocaleString("default", { month: "long" })}
          </option>
        ))}
      </select>

      <select
        value={displayMonth.getFullYear()}
        onChange={(e) => {
          const d = new Date(displayMonth)
          d.setFullYear(Number(e.target.value))
          onMonthChange(d)
        }}
      >
        {years.map((y) => (
          <option key={y}>{y}</option>
        ))}
      </select>

      <button
        type="button"
        className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 p-0")}
        onClick={nextMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  const [month, setMonth] = React.useState<Date>(() => {
    if (props.selected instanceof Date) return props.selected
    return new Date()
  })

  return (
    <DayPicker
      month={month}
      onMonthChange={setMonth}
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        nav: "hidden", // hide default arrows
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell:
          "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Caption: (props) => (
          <CustomCaption
            {...props}
            onMonthChange={setMonth}
            month={month}
          />
        ),
      }}
      {...props}
    />
  )
}

Calendar.displayName = "Calendar"

export { Calendar }