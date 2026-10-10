"use client";

import { useCallback, useEffect, useState } from "react";
import TimePicker from "@/components/TimePicker";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { useRequireUser } from "@/components/SessionProvider";
import {
  Button,
  Card,
  Empty,
  Field,
  Loading,
  Notice,
  Page,
  Table,
  inputClass,
  td,
  tdStrong
} from "@/components/ui/kit";
import { fetchJson, postJson } from "@/lib/fetchJson";
import {
  calculateHours,
  departments,
  formatDateForDisplay,
  formatHours,
  formatTime12h,
  getWorkTypes,
  smartPeriod,
  timeToMinutes,
  timesOverlap,
  to12hParts,
  to24h,
  todayKey
} from "@/lib/timesheet";

let nextEntryId = 1;

function createEntry(fromTime = "") {
  return { id: nextEntryId++, workType: "", fromTime, toTime: "", workDetails: "" };
}

// What is wrong with this entry, if anything (shown under the entry).
function entryProblem(entry, index, entries, savedEntries) {
  if (!entry.fromTime || !entry.toTime) return "";
  if (timeToMinutes(entry.toTime) <= timeToMinutes(entry.fromTime)) {
    return "The To time must be later than the From time.";
  }
  const clash = entries.findIndex(
    (other, otherIndex) =>
      otherIndex < index &&
      timesOverlap(entry.fromTime, entry.toTime, other.fromTime, other.toTime)
  );
  if (clash !== -1) return `These times overlap with entry ${clash + 1}.`;

  const saved = savedEntries.find((other) =>
    timesOverlap(entry.fromTime, entry.toTime, other.fromTime, other.toTime)
  );
  if (saved) {
    return `These times overlap with work already saved for this day (${saved.workType}, ${formatTime12h(
      saved.fromTime
    )} – ${formatTime12h(saved.toTime)}).`;
  }
  return "";
}

export default function TimesheetForm() {
  const { user, ready, refresh } = useRequireUser();
  const [date, setDate] = useState(() => todayKey());
  const [entries, setEntries] = useState(() => [createEntry()]);
  const [savedEntries, setSavedEntries] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const department = user?.department || "";
  const workTypes = getWorkTypes(department);
  const today = todayKey();

  const loadSaved = useCallback(async (forDate) => {
    if (!forDate) return;
    setLoadingSaved(true);
    try {
      const data = await fetchJson(`/api/timesheet?scope=mine&from=${forDate}&to=${forDate}`);
      setSavedEntries(data.entries || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    if (ready && department) loadSaved(date);
  }, [ready, department, date, loadSaved]);

  function clearMessages() {
    setMessage("");
    setError("");
  }

  function updateEntry(id, name, value) {
    clearMessages();
    setEntries((current) =>
      current.map((entry) => {
        if (entry.id !== id) return entry;
        const next = { ...entry, [name]: value };

        // If From moves past To, flip To's AM/PM so it is later again (10 AM → 2 means 2 PM).
        if (name === "fromTime" && next.toTime) {
          const to = to12hParts(next.toTime);
          if (timeToMinutes(next.toTime) <= timeToMinutes(value)) {
            next.toTime = to24h(to.hour, to.minute, smartPeriod(to.hour, to.minute, value));
          }
        }
        return next;
      })
    );
  }

  function addEntry() {
    clearMessages();
    // The next piece of work usually starts when the last one ended.
    setEntries((current) => [...current, createEntry(current[current.length - 1]?.toTime || "")]);
  }

  function removeEntry(id) {
    clearMessages();
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearMessages();

    if (!date) return setError("Please select the date.");
    if (date > today) return setError("You cannot fill in a timesheet for a future date.");

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry.workType) return setError(`Entry ${i + 1}: please select the work type.`);
      if (!entry.fromTime || !entry.toTime) {
        return setError(`Entry ${i + 1}: please select both the From and To time.`);
      }
      const problem = entryProblem(entry, i, entries, savedEntries);
      if (problem) return setError(`Entry ${i + 1}: ${problem}`);
    }

    setSubmitting(true);
    try {
      const data = await postJson("/api/timesheet", {
        date,
        entries: entries.map(({ workType, fromTime, toTime, workDetails }) => ({
          workType,
          fromTime,
          toTime,
          workDetails
        }))
      });
      setMessage(`${data.message} You can add more work for this day below.`);
      setEntries([createEntry(entries[entries.length - 1].toTime)]);
      await loadSaved(date);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteSaved(entry) {
    clearMessages();
    setDeletingId(entry._id);
    try {
      await fetchJson(`/api/timesheet/${entry._id}`, { method: "DELETE" });
      setSavedEntries((current) => current.filter((item) => item._id !== entry._id));
      setMessage("Entry deleted.");
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId("");
    }
  }

  if (!ready) {
    return (
      <Page title="Timesheet" width="max-w-4xl">
        <Loading />
      </Page>
    );
  }

  if (!department) {
    return (
      <Page title="Timesheet" width="max-w-4xl">
        <ChooseDepartment onSaved={refresh} />
      </Page>
    );
  }

  const newHours = entries.reduce((sum, entry) => sum + calculateHours(entry.fromTime, entry.toTime), 0);
  const savedHours = savedEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);

  return (
    <Page
      title="Timesheet"
      description="Choose the day, then add each piece of work with its start and end time."
      width="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="grid gap-6" noValidate>
        <Card>
          <div className="grid gap-5 sm:grid-cols-[1fr_1.5fr_1fr]">
            <Field label="Name">
              <input className={inputClass} value={user.name} disabled readOnly />
            </Field>
            <Field label="Department">
              <input className={inputClass} value={department} disabled readOnly />
            </Field>
            <Field label="Date" required>
              <input
                className={inputClass}
                type="date"
                value={date}
                max={today}
                onChange={(event) => {
                  clearMessages();
                  setDate(event.target.value);
                }}
                required
              />
            </Field>
          </div>
        </Card>

        {entries.map((entry, index) => {
          const hours = calculateHours(entry.fromTime, entry.toTime);
          const problem = entryProblem(entry, index, entries, savedEntries);

          return (
            <Card key={entry.id}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-serif text-lg font-medium text-primary">Work entry {index + 1}</h2>
                <div className="flex items-center gap-4">
                  <p className="text-sm text-primary/55">
                    {hours > 0 ? (
                      <>
                        <span className="font-serif text-xl font-medium text-secondary">{formatHours(hours)}</span>{" "}
                        {hours === 1 ? "hour" : "hours"}
                      </>
                    ) : (
                      "0 hours"
                    )}
                  </p>
                  {entries.length > 1 ? (
                    <Button variant="ghost" size="sm" onClick={() => removeEntry(entry.id)}>
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-[1.4fr_1fr_1fr]">
                <Field label="Work type" required>
                  <select
                    className={inputClass}
                    value={entry.workType}
                    onChange={(event) => updateEntry(entry.id, "workType", event.target.value)}
                    required
                  >
                    <option value="">Select work type</option>
                    {workTypes.map((workType) => (
                      <option key={workType} value={workType}>
                        {workType}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Not wrapped in <label>: a label would forward every tap to the first button. */}
                <div className="grid content-start gap-1.5">
                  <span className="text-sm font-medium text-primary/75">
                    From <span className="text-secondary">*</span>
                  </span>
                  <TimePicker
                    value={entry.fromTime}
                    onChange={(value) => updateEntry(entry.id, "fromTime", value)}
                    placeholder="Start time"
                  />
                </div>

                <div className="grid content-start gap-1.5">
                  <span className="text-sm font-medium text-primary/75">
                    To <span className="text-secondary">*</span>
                  </span>
                  <TimePicker
                    value={entry.toTime}
                    after={entry.fromTime}
                    invalid={Boolean(problem)}
                    alignRight
                    onChange={(value) => updateEntry(entry.id, "toTime", value)}
                    placeholder="End time"
                  />
                </div>
              </div>

              {problem ? <p className="mt-3 text-sm text-red-700">{problem}</p> : null}

              <Field label="Work details" className="mt-5">
                <textarea
                  className={`${inputClass} min-h-20 resize-y`}
                  value={entry.workDetails}
                  maxLength={1000}
                  onChange={(event) => updateEntry(entry.id, "workDetails", event.target.value)}
                  placeholder="What did you do? (optional)"
                />
              </Field>
            </Card>
          );
        })}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="outline" onClick={addEntry}>
            + Add another entry
          </Button>
          <div className="flex items-center gap-5">
            <p className="text-sm text-primary/60">
              Adding{" "}
              <span className="font-serif text-2xl font-medium text-primary">{formatHours(newHours)}</span>{" "}
              {newHours === 1 ? "hour" : "hours"}
            </p>
            <Button type="submit" size="lg" disabled={submitting}>
              {submitting ? "Saving…" : entries.length > 1 ? `Save ${entries.length} entries` : "Save entry"}
            </Button>
          </div>
        </div>

        <Notice tone="success">{message}</Notice>
        <Notice tone="error">{error}</Notice>
      </form>

      <Card
        flush
        title={`Saved for ${formatDateForDisplay(date)}`}
        description={
          savedEntries.length > 0
            ? `${savedEntries.length} ${savedEntries.length === 1 ? "entry" : "entries"}, ${formatHours(savedHours)} hours in total`
            : undefined
        }
      >
        {loadingSaved ? (
          <Loading />
        ) : savedEntries.length === 0 ? (
          <Empty>Nothing saved for this day yet.</Empty>
        ) : (
          <Table head={["From", "To", { label: "Hours", right: true }, "Work type", "Details", ""]}>
            {savedEntries.map((entry) => (
              <tr key={entry._id}>
                <td className={`${td} whitespace-nowrap`}>{formatTime12h(entry.fromTime)}</td>
                <td className={`${td} whitespace-nowrap`}>{formatTime12h(entry.toTime)}</td>
                <td className={`${tdStrong} text-right`}>{formatHours(entry.hours)}</td>
                <td className={td}>{entry.workType}</td>
                <td className={`${td} max-w-xs`}>{entry.workDetails || "–"}</td>
                <td className={`${td} text-right`}>
                  <ConfirmButton
                    confirmLabel="Yes, delete"
                    busy={deletingId === entry._id}
                    busyLabel="Deleting…"
                    onConfirm={() => deleteSaved(entry)}
                  >
                    Delete
                  </ConfirmButton>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </Page>
  );
}

// Shown once to people whose account was created before departments were fixed per person.
function ChooseDepartment({ onSaved }) {
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event) {
    event.preventDefault();
    if (!department) return setError("Please select your department.");
    setSaving(true);
    setError("");
    try {
      await postJson("/api/auth/me", { department }, "PATCH");
      await onSaved();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card
      title="Choose your department"
      description="This is asked only once. Your timesheet will show the work types of this department. Only the admin can change it later."
    >
      <form onSubmit={save} className="grid gap-4 sm:max-w-md">
        <Field label="Department" required>
          <select className={inputClass} value={department} onChange={(event) => setDepartment(event.target.value)}>
            <option value="">Select your department</option>
            {departments.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </Field>
        <Notice tone="error">{error}</Notice>
        <Button type="submit" disabled={saving} className="w-fit">
          {saving ? "Saving…" : "Save department"}
        </Button>
      </form>
    </Card>
  );
}
