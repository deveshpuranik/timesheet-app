"use client";

import { inputClass } from "@/components/ui/kit";
import { addDays, endOfMonth, startOfMonth, startOfWeek, todayKey } from "@/lib/timesheet";

export function periodFor(preset) {
  const today = todayKey();
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "week":
      return { from: startOfWeek(today), to: today };
    case "lastMonth": {
      const lastDayOfLastMonth = addDays(startOfMonth(today), -1);
      return { from: startOfMonth(lastDayOfLastMonth), to: endOfMonth(lastDayOfLastMonth) };
    }
    case "month":
    default:
      return { from: startOfMonth(today), to: today };
  }
}

const presets = [
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "lastMonth", label: "Last month" }
];

// Quick period buttons plus exact From / To dates. `value` is { preset, from, to }.
export default function PeriodPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-1 rounded-lg border border-primary/10 bg-white p-1">
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            aria-pressed={value.preset === preset.value}
            onClick={() => onChange({ preset: preset.value, ...periodFor(preset.value) })}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              value.preset === preset.value
                ? "bg-secondary text-white"
                : "text-primary/65 hover:bg-primary/5 hover:text-primary"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <label className="grid gap-1 text-xs font-medium text-primary/55">
        From
        <input
          type="date"
          className={`${inputClass} py-2`}
          value={value.from}
          max={value.to || undefined}
          onChange={(event) => onChange({ preset: "custom", from: event.target.value, to: value.to })}
        />
      </label>
      <label className="grid gap-1 text-xs font-medium text-primary/55">
        To
        <input
          type="date"
          className={`${inputClass} py-2`}
          value={value.to}
          min={value.from || undefined}
          onChange={(event) => onChange({ preset: "custom", from: value.from, to: event.target.value })}
        />
      </label>
    </div>
  );
}

export function initialPeriod(preset = "month") {
  return { preset, ...periodFor(preset) };
}
