import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCompany } from "@/lib/company-context";

/**
 * Returns the active financial year [start, end] for the active company.
 * Falls back to the FY containing today if no company context.
 */
export function useFyRange(): { start: Date; end: Date } {
  const { activeMembership } = useCompany();
  return React.useMemo(() => {
    const fyStartStr = activeMembership?.companies?.financial_year_start;
    let start: Date;
    if (fyStartStr) {
      const parsed = parse(fyStartStr, "yyyy-MM-dd", new Date());
      start = isValid(parsed) ? parsed : fallbackFyStart();
    } else {
      start = fallbackFyStart();
    }
    const end = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate() - 1);
    return { start, end };
  }, [activeMembership?.companies?.financial_year_start]);
}

function fallbackFyStart(): Date {
  const now = new Date();
  const y = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  return new Date(y, 3, 1);
}

/** Default ISO date string clamped into the active FY. */
export function useDefaultFyDate(): string {
  const { start, end } = useFyRange();
  return React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = today < start ? start : today > end ? end : today;
    return format(d, "yyyy-MM-dd");
  }, [start, end]);
}

interface Props {
  value: string; // ISO yyyy-MM-dd
  onChange: (iso: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  /** If true, do not constrain to FY range. */
  unrestricted?: boolean;
}

export function FyDatePicker({
  value,
  onChange,
  disabled,
  className,
  placeholder = "Pick a date",
  unrestricted,
}: Props) {
  const { start, end } = useFyRange();
  const [open, setOpen] = React.useState(false);

  const selected = React.useMemo(() => {
    if (!value) return undefined;
    const d = parse(value, "yyyy-MM-dd", new Date());
    return isValid(d) ? d : undefined;
  }, [value]);

  const defaultMonth = selected ?? start;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start text-left font-normal",
            !selected && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "dd/MM/yyyy") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={defaultMonth}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, "yyyy-MM-dd"));
              setOpen(false);
            }
          }}
          captionLayout="dropdown"
          startMonth={unrestricted ? undefined : start}
          endMonth={unrestricted ? undefined : end}
          disabled={unrestricted ? undefined : { before: start, after: end }}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}
