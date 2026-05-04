"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateHours, departments, getWorkTypes } from "@/lib/timesheet";
import BrandButton from "@/components/ui/BrandButton";
import BrandCard from "@/components/ui/BrandCard";
import FormField from "@/components/ui/FormField";

const inputClass =
  "w-full border-b border-primary/10 bg-transparent px-0 py-4 text-sm text-primary outline-none transition focus:border-secondary";

function createEmptyEntry(department) {
  return {
    id: crypto.randomUUID(),
    workType: getWorkTypes(department)[0],
    fromTime: "",
    toTime: "",
    workDetails: ""
  };
}

// ─── Single Work Entry Row ───────────────────────────────────────────────────

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

        <div className="grid gap-8 sm:grid-cols-2">
          <FormField label="From" required>
            <input
              value={entry.fromTime}
              onChange={(e) => onUpdate(entry.id, "fromTime", e.target.value)}
              className={inputClass}
              type="time"
            />
          </FormField>
          <FormField label="To" required>
            <input
              value={entry.toTime}
              onChange={(e) => onUpdate(entry.id, "toTime", e.target.value)}
              className={inputClass}
              type="time"
            />
          </FormField>
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

// ─── Main Form ───────────────────────────────────────────────────────────────

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

  // When department changes, reset all work types to the new department's first type
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
      // Attach shared department + date to every entry before sending
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

        {/* Shared fields: Department + Date */}
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