"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateHours, departments, getWorkTypes } from "@/lib/timesheet";
import BrandButton from "@/components/ui/BrandButton";
import BrandCard from "@/components/ui/BrandCard";
import FormField from "@/components/ui/FormField";

const inputClass =
  "w-full border-b border-primary/10 bg-transparent px-0 py-4 text-sm text-primary outline-none transition focus:border-secondary";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createEmptyEntry(department) {
  return {
    id: crypto.randomUUID(),
    workType: getWorkTypes(department)[0],
    fromTime: "",
    toTime: "",
    workDetails: ""
  };
}

// Convert "HH:MM" 24h → { hour, minute, period }
function parseTo12h(value) {
  if (!value) return { hour: "12", minute: "00", period: "AM" };
  const [h, m] = value.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? "12" : String(h % 12).padStart(2, "0");
  return { hour, minute: String(m).padStart(2, "0"), period };
}

// Convert { hour, minute, period } → "HH:MM" 24h
function formatTo24h({ hour, minute, period }) {
  let h = parseInt(hour, 10);
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${minute}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
const MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

// ─── TimePicker ───────────────────────────────────────────────────────────────

function TimePicker({ value, onChange, label, required }) {
  const [open, setOpen] = useState(false);
  const parsed = parseTo12h(value);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState(parsed.period);

  // Sync internal state when value changes externally
  useEffect(() => {
    const p = parseTo12h(value);
    setHour(p.hour);
    setMinute(p.minute);
    setPeriod(p.period);
  }, [value]);

  function commit(h, m, per) {
    onChange(formatTo24h({ hour: h, minute: m, period: per }));
  }

  function handleHour(h) {
    setHour(h);
    commit(h, minute, period);
  }

  function handleMinute(m) {
    setMinute(m);
    commit(hour, m, period);
  }

  function handlePeriod(per) {
    setPeriod(per);
    commit(hour, minute, per);
  }

  const display = value
    ? `${hour}:${minute} ${period}`
    : "Select time";

  return (
    <div className="relative">
      <FormField label={label} required={required}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between border-b border-primary/10 py-4 text-sm text-primary transition hover:border-secondary focus:outline-none"
        >
          <span className={value ? "text-primary" : "text-primary/40"}>{display}</span>
          <svg
            className={`h-4 w-4 text-primary/40 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </FormField>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-primary/10 bg-white shadow-xl">
          <div className="p-4">

            {/* AM / PM toggle */}
            <div className="mb-4 flex rounded-xl border border-primary/10 p-1">
              {["AM", "PM"].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriod(p)}
                  className={`flex-1 rounded-lg py-2 text-xs font-bold uppercase tracking-[0.22em] transition ${
                    period === p
                      ? "bg-secondary text-white"
                      : "text-primary/50 hover:text-primary"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Hour grid */}
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.32em] text-primary/40">
              Hour
            </p>
            <div className="mb-4 grid grid-cols-6 gap-1">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => handleHour(h)}
                  className={`rounded-lg py-2 text-xs font-medium transition ${
                    hour === h
                      ? "bg-secondary text-white"
                      : "text-primary hover:bg-secondary/10"
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>

            {/* Minute grid */}
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.32em] text-primary/40">
              Minute
            </p>
            <div className="grid grid-cols-6 gap-1">
              {MINUTES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMinute(m)}
                  className={`rounded-lg py-2 text-xs font-medium transition ${
                    minute === m
                      ? "bg-secondary text-white"
                      : "text-primary hover:bg-secondary/10"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-primary/5 px-4 py-3">
            <p className="text-center font-serif text-2xl font-medium text-secondary">
              {hour}:{minute} {period}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-xl bg-secondary py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-primary"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EntryRow ─────────────────────────────────────────────────────────────────

function EntryRow({ entry, index, total, department, onUpdate, onRemove }) {
  const workTypes = useMemo(() => getWorkTypes(department), [department]);
  const hours = useMemo(
    () => calculateHours(entry.fromTime, entry.toTime),
    [entry.fromTime, entry.toTime]
  );

  return (
    <div className="relative rounded-3xl border border-primary/8 bg-white/50 p-6">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-secondary">
          Work Entry {index + 1}
        </p>
        {total > 1 && (
          <button
            type="button"
            onClick={() => onRemove(entry.id)}
            className="text-xs text-primary/40 transition hover:text-red-500"
          >
            Remove
          </button>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <FormField label="Work Type" required>
          <select
            value={entry.workType}
            onChange={(e) => onUpdate(entry.id, "workType", e.target.value)}
            className={`${inputClass} cursor-pointer`}
          >
            {workTypes.map((wt) => (
              <option key={wt} value={wt}>{wt}</option>
            ))}
          </select>
        </FormField>

        {/* ── Custom AM/PM time pickers ── */}
        <div className="grid grid-cols-2 gap-4">
          <TimePicker
            label="From"
            required
            value={entry.fromTime}
            onChange={(val) => onUpdate(entry.id, "fromTime", val)}
          />
          <TimePicker
            label="To"
            required
            value={entry.toTime}
            onChange={(val) => onUpdate(entry.id, "toTime", val)}
          />
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <FormField label="Work Details">
          <textarea
            value={entry.workDetails}
            onChange={(e) => onUpdate(entry.id, "workDetails", e.target.value)}
            className="min-h-24 w-full resize-y rounded-2xl border border-primary/10 bg-white/55 px-5 py-4 text-sm font-light leading-7 text-primary outline-none transition focus:border-secondary focus:bg-white"
            placeholder="Write custom work details"
          />
        </FormField>

        <div className="pb-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/40">Hours</p>
          <p className="mt-1 font-serif text-3xl font-medium text-secondary">
            {hours > 0 ? hours.toFixed(2) : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Form ────────────────────────────────────────────────────────────────

export default function TimesheetForm() {
  const [department, setDepartment] = useState("Housekeeping");
  const [date, setDate] = useState("");
  const [entries, setEntries] = useState([createEmptyEntry("Housekeeping")]);
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const totalHours = entries.reduce(
    (sum, e) => sum + calculateHours(e.fromTime, e.toTime),
    0
  );

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Please login again.");
        setUser(data.user);
      } catch (loadError) {
        setError(loadError.message || "Unable to load logged-in user.");
      }
    }
    loadUser();
  }, []);

  function handleDepartmentChange(value) {
    setMessage("");
    setError("");
    setDepartment(value);
    setEntries((prev) =>
      prev.map((e) => ({ ...e, workType: getWorkTypes(value)[0] }))
    );
  }

  function updateEntry(id, name, value) {
    setMessage("");
    setError("");
    setEntries((prev) =>
      prev.map((e) => (e.id !== id ? e : { ...e, [name]: value }))
    );
  }

  function addEntry() {
    setEntries((prev) => [...prev, createEmptyEntry(department)]);
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!date) {
      setError("Please select a date.");
      return;
    }

    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (!e.fromTime || !e.toTime || !e.workType) {
        setError(`Entry ${i + 1}: Please fill all required fields.`);
        return;
      }
      if (calculateHours(e.fromTime, e.toTime) <= 0) {
        setError(`Entry ${i + 1}: "To" time must be later than "From" time.`);
        return;
      }
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const payload = entries.map((e) => ({
        department,
        date,
        workType: e.workType,
        fromTime: e.fromTime,
        toTime: e.toTime,
        workDetails: e.workDetails
      }));

      const response = await fetch("/api/timesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: payload })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Something went wrong.");

      setMessage(data.message || "Timesheet saved successfully.");
      setDepartment("Housekeeping");
      setDate("");
      setEntries([createEmptyEntry("Housekeeping")]);
    } catch (submitError) {
      setError(submitError.message || "Unable to submit timesheet.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BrandCard className="mx-auto max-w-5xl animate-reveal p-6 sm:p-10 lg:p-12">
      <form onSubmit={handleSubmit} className="grid gap-10">

        {/* Header */}
        <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-secondary">
              Daily Work Log
            </p>
            <h1 className="mt-4 font-serif text-4xl font-medium leading-tight text-primary sm:text-5xl">
              Record the day with intention.
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-light leading-7 text-primary/58">
              Set your department and date once, then add all your work entries for the day.
            </p>
          </div>

          <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-secondary">Employee</p>
            <p className="mt-3 font-serif text-2xl font-medium text-primary">
              {user?.name || "Loading..."}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-primary/50">
              {user?.role || "employee"}
            </p>
          </div>
        </div>

        {/* Shared: Department + Date */}
        <div className="rounded-3xl border border-primary/8 bg-white/50 p-6">
          <p className="mb-5 text-[10px] font-bold uppercase tracking-[0.35em] text-secondary">
            Day Info
          </p>
          <div className="grid gap-8 md:grid-cols-2">
            <FormField label="Department" required>
              <select
                value={department}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                {departments.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Date" required>
              <input
                value={date}
                onChange={(e) => {
                  setMessage("");
                  setError("");
                  setDate(e.target.value);
                }}
                className={inputClass}
                type="date"
              />
            </FormField>
          </div>
        </div>

        {/* Work entries */}
        <div className="grid gap-6">
          {entries.map((entry, index) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              index={index}
              total={entries.length}
              department={department}
              onUpdate={updateEntry}
              onRemove={removeEntry}
            />
          ))}
        </div>

        {/* Add entry */}
        <button
          type="button"
          onClick={addEntry}
          className="flex items-center gap-2 self-start rounded-2xl border border-dashed border-secondary/40 px-5 py-3 text-sm font-medium text-secondary transition hover:bg-secondary/5"
        >
          + Add Another Entry
        </button>

        {/* Footer */}
        <div className="flex flex-col gap-5 rounded-3xl border border-primary/5 bg-white/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/40">
              Total Hours · {entries.length} {entries.length === 1 ? "Entry" : "Entries"}
            </p>
            <p className="mt-1 font-serif text-4xl font-medium text-secondary">
              {totalHours.toFixed(2)}
            </p>
          </div>
          <BrandButton disabled={submitting} type="submit">
            {submitting
              ? "Submitting..."
              : entries.length > 1
              ? `Submit ${entries.length} Entries`
              : "Submit Timesheet"}
          </BrandButton>
        </div>

        {message && (
          <p className="rounded-2xl border border-secondary/20 bg-secondary/10 px-5 py-4 text-sm font-medium text-primary">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
            {error}
          </p>
        )}
      </form>
    </BrandCard>
  );
}