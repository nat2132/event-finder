import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  date: Date
  onDateChange: (date: Date) => void
}

export function DatePicker({ date, onDateChange }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant={"outline"} className={cn("w-[240px] justify-start text-left font-normal  hover:bg-slate-100 cursor-pointer", !date && "text-gray-300")}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(date, "PPP")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 " align="start">
        <Calendar mode="single" selected={date} onSelect={(date) => date && onDateChange(date)} initialFocus />
      </PopoverContent>
    </Popover>
  )
}
