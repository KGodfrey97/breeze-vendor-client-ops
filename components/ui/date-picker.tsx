"use client"

import * as React from "react"
import { format, parseISO, isValid } from "date-fns"
import { CalendarIcon, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  value?: string
  onChange: (value?: string) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const date = React.useMemo(() => {
    if (!value) return undefined
    const parsed = parseISO(value)
    return isValid(parsed) ? parsed : undefined
  }, [value])

  function handleSelect(selected?: Date) {
    if (!selected) return
    onChange(format(selected, "yyyy-MM-dd"))
    setOpen(false)
  }

  function clearDate(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(undefined)
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={`w-full justify-between text-left font-normal ${
            !date ? "text-muted-foreground" : ""
          }`}
        >
          <span className="flex items-center">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP") : placeholder}
          </span>

          {date && (
            <X
              className="h-4 w-4 opacity-60 hover:opacity-100"
              onClick={clearDate}
            />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          fromYear={1900}
          toYear={2100}
        />
      </PopoverContent>
    </Popover>
  )
}