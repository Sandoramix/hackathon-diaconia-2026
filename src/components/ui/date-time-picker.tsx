import { useState } from "react";
import { format, isValid } from "date-fns";
import { it } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

// ─── TimeSpinner — single HH or MM number input ───────────────────────────────

function TimeSpinner({
  value, min, max, pad, onChange, disabled,
}: {
  value: number | undefined;
  min: number;
  max: number;
  pad: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value !== undefined ? String(value).padStart(pad, "0") : ""}
      placeholder={String(min).padStart(pad, "0")}
      disabled={disabled}
      onChange={(e) => {
        const v = parseInt(e.target.value);
        if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
      }}
      className="w-9 bg-transparent text-center text-sm outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

// ─── DateTimePicker ───────────────────────────────────────────────────────────
// value / onChange: "YYYY-MM-DDTHH:mm" | ""

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DateTimePicker({
  value, onChange, placeholder = "gg/MM/aaaa HH:mm", disabled, className,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  const date = value ? new Date(value) : undefined;
  const hh = value ? parseInt(value.slice(11, 13)) : 0;
  const mm = value ? parseInt(value.slice(14, 16)) : 0;

  function emit(day: Date, h: number, m: number) {
    onChange(
      `${format(day, "yyyy-MM-dd")}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    );
  }

  const display = date && isValid(date)
    ? format(date, "dd/MM/yyyy HH:mm", { locale: it })
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start text-left font-normal",
            !display && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
          {display || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(day) => {
            if (day) emit(day, hh, mm);
          }}
          autoFocus
        />
        <div className="flex items-center justify-center gap-1 border-t px-4 py-2.5">
          <span className="text-xs text-muted-foreground mr-2">Ora</span>
          <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1">
            <TimeSpinner
              value={value ? hh : undefined}
              min={0} max={23} pad={2}
              onChange={(h) => emit(date ?? new Date(), h, mm)}
            />
            <span className="text-sm font-bold text-muted-foreground">:</span>
            <TimeSpinner
              value={value ? mm : undefined}
              min={0} max={59} pad={2}
              onChange={(m) => emit(date ?? new Date(), hh, m)}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── DatePicker ───────────────────────────────────────────────────────────────
// value / onChange: "YYYY-MM-DD" | ""

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  value, onChange, placeholder = "gg/MM/aaaa", disabled, className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  const date = value ? new Date(value + "T00:00") : undefined;
  const display = date && isValid(date)
    ? format(date, "dd/MM/yyyy", { locale: it })
    : "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 justify-start text-left font-normal",
            !display && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" aria-hidden="true" />
          {display || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(day) => {
            if (day) { onChange(format(day, "yyyy-MM-dd")); setOpen(false); }
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}

// ─── TimePicker ───────────────────────────────────────────────────────────────
// value / onChange: "HH:mm" | ""

interface TimePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({ value, onChange, disabled, className }: TimePickerProps) {
  const hh = value ? parseInt(value.slice(0, 2)) : undefined;
  const mm = value ? parseInt(value.slice(3, 5)) : undefined;

  function emit(h: number, m: number) {
    onChange(`${String(Math.max(0, Math.min(23, h))).padStart(2, "0")}:${String(Math.max(0, Math.min(59, m))).padStart(2, "0")}`);
  }

  return (
    <div className={cn(
      "flex h-10 items-center gap-1 rounded-md border border-input bg-background px-3",
      disabled && "opacity-50 cursor-not-allowed",
      className,
    )}>
      <TimeSpinner value={hh} min={0} max={23} pad={2} onChange={(h) => emit(h, mm ?? 0)} disabled={disabled} />
      <span className="text-sm font-bold text-muted-foreground">:</span>
      <TimeSpinner value={mm} min={0} max={59} pad={2} onChange={(m) => emit(hh ?? 0, m)} disabled={disabled} />
    </div>
  );
}
