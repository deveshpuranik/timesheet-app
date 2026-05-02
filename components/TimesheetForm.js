"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateHours, departments, getWorkTypes } from "@/lib/timesheet";
import BrandButton from "@/components/ui/BrandButton";
import BrandCard from "@/components/ui/BrandCard";
import FormField from "@/components/ui/FormField";

const initialForm = {
  department: "Housekeeping",
  date: "",
  fromTime: "",
  toTime: "",
  workType: "Room Cleaning",
  workDetails: ""
};

const inputClass =
  "w-full border-b border-primary/10 bg-transparent px-0 py-4 text-sm text-primary outline-none transition focus:border-secondary";

export default function TimesheetForm() {
  const [form, setForm] = useState(initialForm);
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const workTypes = useMemo(() => getWorkTypes(form.department), [form.department]);
  const totalHours = useMemo(
    () => calculateHours(form.fromTime, form.toTime),
    [form.fromTime, form.toTime]
  );

  useEffect(() => {
    async function loadUser() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Please login again.");
        }

        setUser(data.user);
      } catch (loadError) {
        setError(loadError.message || "Unable to load logged-in user.");
      }
    }

    loadUser();
  }, []);

  function updateField(name, value) {
    setMessage("");
    setError("");

    if (name === "department") {
      const nextWorkTypes = getWorkTypes(value);
      setForm((current) => ({
        ...current,
        department: value,
        workType: nextWorkTypes[0]
      }));
      return;
    }

    setForm((current) => ({
      ...current,
      [name]: value
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.date || !form.fromTime || !form.toTime || !form.workType) {
      setError("Please fill all required fields.");
      return;
    }

    if (totalHours <= 0) {
      setError("To Time must be later than From Time.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/timesheet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      setMessage(data.message || "Timesheet saved successfully.");
      setForm(initialForm);
    } catch (submitError) {
      setError(submitError.message || "Unable to submit timesheet.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <BrandCard className="mx-auto max-w-5xl animate-reveal p-6 sm:p-10 lg:p-12">
      <form onSubmit={handleSubmit} className="grid gap-10">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px] lg:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.45em] text-secondary">
              Daily Work Log
            </p>
            <h1 className="mt-4 font-serif text-4xl font-medium leading-tight text-primary sm:text-5xl">
              Record the day with intention.
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-light leading-7 text-primary/58">
              Add the work details for Mruda Eco Village. Your employee name is linked automatically through your approved login.
            </p>
          </div>

          <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-secondary">
              Employee
            </p>
            <p className="mt-3 font-serif text-2xl font-medium text-primary">
              {user?.name || "Loading..."}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.24em] text-primary/50">
              {user?.role || "employee"}
            </p>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <FormField label="Department" required>
            <select
              value={form.department}
              onChange={(event) => updateField("department", event.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Work Type" required>
            <select
              value={form.workType}
              onChange={(event) => updateField("workType", event.target.value)}
              className={`${inputClass} cursor-pointer`}
            >
              {workTypes.map((workType) => (
                <option key={workType} value={workType}>
                  {workType}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Date" required>
            <input
              value={form.date}
              onChange={(event) => updateField("date", event.target.value)}
              className={inputClass}
              type="date"
            />
          </FormField>

          <div className="grid gap-8 sm:grid-cols-2">
            <FormField label="From" required>
              <input
                value={form.fromTime}
                onChange={(event) => updateField("fromTime", event.target.value)}
                className={inputClass}
                type="time"
              />
            </FormField>

            <FormField label="To" required>
              <input
                value={form.toTime}
                onChange={(event) => updateField("toTime", event.target.value)}
                className={inputClass}
                type="time"
              />
            </FormField>
          </div>
        </div>

        <FormField label="Work Details">
          <textarea
            value={form.workDetails}
            onChange={(event) => updateField("workDetails", event.target.value)}
            className="min-h-36 w-full resize-y rounded-2xl border border-primary/10 bg-white/55 px-5 py-4 text-sm font-light leading-7 text-primary outline-none transition focus:border-secondary focus:bg-white"
            placeholder="Write custom work details"
          />
        </FormField>

        <div className="flex flex-col gap-5 rounded-3xl border border-primary/5 bg-white/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-primary/40">
              Total Hours
            </p>
            <p className="mt-1 font-serif text-4xl font-medium text-secondary">
              {totalHours.toFixed(2)}
            </p>
          </div>
          <BrandButton disabled={submitting} type="submit">
            {submitting ? "Submitting" : "Submit Timesheet"}
          </BrandButton>
        </div>

        {message ? (
          <p className="rounded-2xl border border-secondary/20 bg-secondary/10 px-5 py-4 text-sm font-medium text-primary">
            {message}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
            {error}
          </p>
        ) : null}
      </form>
    </BrandCard>
  );
}
