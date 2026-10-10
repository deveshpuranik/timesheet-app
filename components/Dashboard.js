"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PeriodPicker, { initialPeriod } from "@/components/PeriodPicker";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { useRequireUser } from "@/components/SessionProvider";
import {
  Badge,
  Button,
  Card,
  Empty,
  Loading,
  Notice,
  Page,
  Stat,
  Table,
  Tabs,
  buttonClass,
  inputClass,
  td,
  tdStrong
} from "@/components/ui/kit";
import { fetchJson, postJson } from "@/lib/fetchJson";
import {
  addDays,
  daysBetween,
  departments,
  formatDateForDisplay,
  formatDayShort,
  formatHours,
  formatTime12h,
  isValidDateKey,
  toDateKey,
  todayKey
} from "@/lib/timesheet";

const SELF_DELETE_WINDOW_DAYS = 7;

// ─── Calculations ────────────────────────────────────────────────────────────

function ownerId(entry) {
  return String(entry.userId?._id || entry.userId);
}

function sumHours(entries) {
  return entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
}

function dailyTotals(entries) {
  const totals = new Map();
  for (const entry of entries) {
    const key = toDateKey(entry.date);
    totals.set(key, (totals.get(key) || 0) + Number(entry.hours || 0));
  }
  return totals;
}

function groupHours(entries, keyOf) {
  const totals = new Map();
  for (const entry of entries) {
    const key = keyOf(entry);
    totals.set(key, (totals.get(key) || 0) + Number(entry.hours || 0));
  }
  return [...totals.entries()]
    .map(([label, hours]) => ({ label, hours }))
    .sort((a, b) => b.hours - a.hours);
}

// Days of an approved leave that fall inside the period.
function leaveDaysIn(leave, from, to) {
  const start = toDateKey(leave.fromDate) > from ? toDateKey(leave.fromDate) : from;
  const end = toDateKey(leave.toDate) < to ? toDateKey(leave.toDate) : to;
  if (start > end) return 0;
  return leave.halfDay ? 0.5 : daysBetween(start, end);
}

function isOnLeave(leaves, userId, dateKey) {
  return leaves.some(
    (leave) =>
      String(leave.userId) === String(userId) &&
      toDateKey(leave.fromDate) <= dateKey &&
      toDateKey(leave.toDate) >= dateKey
  );
}

function periodIsValid(period) {
  return isValidDateKey(period.from) && isValidDateKey(period.to) && period.from <= period.to;
}

function periodLabel(period) {
  return period.from === period.to
    ? formatDateForDisplay(period.from)
    : `${formatDateForDisplay(period.from)} – ${formatDateForDisplay(period.to)}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user, ready } = useRequireUser();
  const [tab, setTab] = useState("");
  const [period, setPeriod] = useState(() => initialPeriod("month"));

  if (!ready) {
    return (
      <Page title="Dashboard">
        <Loading />
      </Page>
    );
  }

  const leadsTeam = user.role === "admin" || user.role === "supervisor";
  const activeTab = leadsTeam ? tab || "team" : "mine";

  return (
    <Page
      title="Dashboard"
      description={
        leadsTeam
          ? "Team hours are kept separate from your own timesheet."
          : "Your hours, entries and feedback for the period you choose."
      }
      actions={
        <Link href="/timesheet" className={buttonClass("primary")}>
          Fill in timesheet
        </Link>
      }
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        {leadsTeam ? (
          <Tabs
            value={activeTab}
            onChange={setTab}
            tabs={[
              { value: "team", label: user.role === "admin" ? "Team" : "My employees" },
              { value: "mine", label: "My timesheet" }
            ]}
          />
        ) : (
          <span />
        )}
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      {!periodIsValid(period) ? (
        <Notice tone="warning">Choose a From date that is on or before the To date.</Notice>
      ) : activeTab === "team" ? (
        <TeamView user={user} period={period} />
      ) : (
        <MyView user={user} period={period} />
      )}
    </Page>
  );
}

// ─── My timesheet ────────────────────────────────────────────────────────────

function MyView({ user, period }) {
  const [entries, setEntries] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const range = `from=${period.from}&to=${period.to}`;
      const [entryData, leaveData] = await Promise.all([
        fetchJson(`/api/timesheet?scope=mine&${range}`),
        fetchJson(`/api/leave?scope=mine&status=approved&${range}`)
      ]);
      setEntries(entryData.entries || []);
      setLeaves(leaveData.requests || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [period.from, period.to]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Loading />;
  if (error) return <Notice tone="error">{error}</Notice>;

  const total = sumHours(entries);
  const days = dailyTotals(entries);
  const leaveDays = leaves.reduce((sum, leave) => sum + leaveDaysIn(leave, period.from, period.to), 0);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Hours worked" value={formatHours(total)} note={periodLabel(period)} />
        <Stat label="Days worked" value={days.size} />
        <Stat label="Average per day" value={days.size ? formatHours(total / days.size) : "0"} note="hours on days worked" />
        <Stat label="Approved leave" value={formatHours(leaveDays)} note={leaveDays === 1 ? "day" : "days"} />
      </div>

      <Card title="Hours per day">
        <DailyBars totals={days} period={period} />
      </Card>

      <Card flush title="My entries" description={`${entries.length} ${entries.length === 1 ? "entry" : "entries"}`}>
        <EntriesTable entries={entries} viewer={user} onChanged={load} />
      </Card>
    </>
  );
}

// ─── Team ────────────────────────────────────────────────────────────────────

function TeamView({ user, period }) {
  const [entries, setEntries] = useState([]);
  const [people, setPeople] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [department, setDepartment] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const range = `from=${period.from}&to=${period.to}`;
      const [entryData, peopleData, leaveData] = await Promise.all([
        fetchJson(`/api/timesheet?scope=team&${range}`),
        fetchJson("/api/users"),
        fetchJson(`/api/leave?scope=team&${range}`)
      ]);
      setEntries(entryData.entries || []);
      setPeople(peopleData.users || []);
      setLeaves(leaveData.requests || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [period.from, period.to]);

  useEffect(() => {
    load();
  }, [load]);

  const approvedLeaves = useMemo(() => leaves.filter((leave) => leave.status === "approved"), [leaves]);
  const pendingLeaveCount = leaves.filter(
    (leave) => leave.status === "pending" && String(leave.userId) !== user.id
  ).length;

  // One row per person: everyone active (even with no hours) plus anyone with entries.
  const rows = useMemo(() => {
    const byId = new Map();

    for (const person of people) {
      if (person.id === user.id || person.status !== "approved") continue;
      byId.set(person.id, { id: person.id, name: person.name, department: person.department || "", role: person.role, entries: [] });
    }

    for (const entry of entries) {
      const id = ownerId(entry);
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          name: entry.userId?.name || entry.name,
          department: entry.userId?.department || entry.department,
          role: entry.userId?.role || "employee",
          entries: []
        });
      }
      byId.get(id).entries.push(entry);
    }

    return [...byId.values()]
      .filter((row) => !department || row.department === department)
      .map((row) => {
        const days = dailyTotals(row.entries);
        const hours = sumHours(row.entries);
        return {
          ...row,
          hours,
          daysWorked: days.size,
          average: days.size ? hours / days.size : 0,
          lastDate: row.entries.reduce((latest, entry) => (toDateKey(entry.date) > latest ? toDateKey(entry.date) : latest), ""),
          leaveDays: approvedLeaves
            .filter((leave) => String(leave.userId) === row.id)
            .reduce((sum, leave) => sum + leaveDaysIn(leave, period.from, period.to), 0)
        };
      })
      .sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name));
  }, [people, entries, approvedLeaves, department, period.from, period.to, user.id]);

  if (loading) return <Loading />;
  if (error) return <Notice tone="error">{error}</Notice>;

  const selected = rows.find((row) => row.id === selectedId);
  if (selected) {
    return (
      <PersonDetail
        person={selected}
        period={period}
        viewer={user}
        onBack={() => setSelectedId("")}
        onChanged={load}
      />
    );
  }

  const visibleEntries = rows.flatMap((row) => row.entries);
  const totalHours = sumHours(visibleEntries);
  const personDays = rows.reduce((sum, row) => sum + row.daysWorked, 0);
  const withHours = rows.filter((row) => row.hours > 0).length;
  const maxHours = Math.max(1, ...rows.map((row) => row.hours));
  const totalLeave = rows.reduce((sum, row) => sum + row.leaveDays, 0);

  const today = todayKey();
  const showToday = period.from <= today && period.to >= today;
  const missingToday = showToday
    ? rows.filter(
        (row) =>
          !row.entries.some((entry) => toDateKey(entry.date) === today) &&
          !isOnLeave(approvedLeaves, row.id, today)
      )
    : [];
  const onLeaveToday = showToday ? rows.filter((row) => isOnLeave(approvedLeaves, row.id, today)) : [];

  return (
    <>
      {pendingLeaveCount > 0 ? (
        <Notice tone="warning">
          {pendingLeaveCount} leave {pendingLeaveCount === 1 ? "request is" : "requests are"} waiting for a decision.{" "}
          <Link href="/leave" className="font-semibold underline">
            Review leave requests
          </Link>
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Team hours" value={formatHours(totalHours)} note={periodLabel(period)} />
        <Stat label="People with entries" value={`${withHours} of ${rows.length}`} />
        <Stat label="Average per person per day" value={personDays ? formatHours(totalHours / personDays) : "0"} note="hours on days worked" />
        <Stat label="Approved leave" value={formatHours(totalLeave)} note={totalLeave === 1 ? "day" : "days"} />
      </div>

      <Card
        flush
        title="Hours by person"
        description="Select a person to see their days, work types and entries."
        actions={
          <select
            className={`${inputClass} w-64 py-2`}
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            aria-label="Filter by department"
          >
            <option value="">All departments</option>
            {departments.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        }
      >
        {rows.length === 0 ? (
          <Empty>No active people{department ? " in this department" : ""} yet.</Empty>
        ) : (
          <Table
            head={[
              "Name",
              "Hours",
              { label: "Days worked", right: true },
              { label: "Average / day", right: true },
              { label: "Leave days", right: true },
              "Last entry",
              ""
            ]}
          >
            {rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-primary/[0.03]">
                <td className={tdStrong}>
                  <button type="button" onClick={() => setSelectedId(row.id)} className="text-left hover:text-secondary">
                    {row.name}
                  </button>
                  <p className="text-xs font-normal text-primary/50">
                    {row.department || "No department"}
                    {row.role !== "employee" ? `, ${row.role}` : ""}
                  </p>
                </td>
                <td className={`${td} min-w-56`}>
                  <div className="flex items-center gap-3">
                    <div className="h-2 flex-1 rounded-full bg-primary/5">
                      <div
                        className="h-2 rounded-full bg-secondary"
                        style={{ width: `${(row.hours / maxHours) * 100}%` }}
                      />
                    </div>
                    <span className="w-14 text-right font-medium text-primary">{formatHours(row.hours)}</span>
                  </div>
                </td>
                <td className={`${td} text-right`}>{row.daysWorked}</td>
                <td className={`${td} text-right`}>{row.daysWorked ? formatHours(row.average) : "–"}</td>
                <td className={`${td} text-right`}>{row.leaveDays ? formatHours(row.leaveDays) : "–"}</td>
                <td className={`${td} whitespace-nowrap`}>
                  {row.lastDate ? formatDateForDisplay(row.lastDate) : <span className="text-primary/40">No entries</span>}
                </td>
                <td className={`${td} text-right`}>
                  <Button variant="outline" size="sm" onClick={() => setSelectedId(row.id)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Hours by department">
          <BarList items={groupHours(visibleEntries, (entry) => entry.department)} empty="No hours in this period." />
        </Card>

        {showToday ? (
          <Card title="Today" description={formatDayShort(today)}>
            <NameList label="No timesheet entry yet" people={missingToday} empty="Everyone has logged work today." />
            {onLeaveToday.length > 0 ? (
              <div className="mt-5">
                <NameList label="On approved leave" people={onLeaveToday} />
              </div>
            ) : null}
          </Card>
        ) : (
          <Card title="Hours by work type">
            <BarList items={groupHours(visibleEntries, (entry) => entry.workType).slice(0, 8)} empty="No hours in this period." />
          </Card>
        )}
      </div>
    </>
  );
}

function NameList({ label, people, empty }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-primary/70">
        {label}
        {people.length > 0 ? ` (${people.length})` : ""}
      </p>
      {people.length === 0 ? (
        <p className="text-sm text-primary/50">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {people.map((person) => (
            <Badge key={person.id}>{person.name}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── One person ──────────────────────────────────────────────────────────────

function PersonDetail({ person, period, viewer, onBack, onChanged }) {
  const days = dailyTotals(person.entries);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-medium text-primary">{person.name}</h2>
          <p className="text-sm text-primary/55">
            {person.department || "No department"}, {periodLabel(period)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/export?userId=${person.id}&from=${period.from}&to=${period.to}`}
            className={buttonClass("outline")}
          >
            Export to Excel
          </Link>
          <Button variant="dark" onClick={onBack}>
            Back to team
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Hours worked" value={formatHours(person.hours)} />
        <Stat label="Days worked" value={person.daysWorked} />
        <Stat label="Average per day" value={person.daysWorked ? formatHours(person.average) : "0"} note="hours on days worked" />
        <Stat label="Approved leave" value={formatHours(person.leaveDays)} note={person.leaveDays === 1 ? "day" : "days"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card title="Hours per day">
          <DailyBars totals={days} period={period} />
        </Card>
        <Card title="Hours by work type">
          <BarList items={groupHours(person.entries, (entry) => entry.workType)} empty="No hours in this period." />
        </Card>
      </div>

      <Card flush title="Entries" description={`${person.entries.length} ${person.entries.length === 1 ? "entry" : "entries"}`}>
        <EntriesTable entries={person.entries} viewer={viewer} canRemark onChanged={onChanged} />
      </Card>
    </>
  );
}

// ─── Charts ──────────────────────────────────────────────────────────────────

// One labelled horizontal bar per item; values are printed, so no axis is needed.
function BarList({ items, empty }) {
  if (items.length === 0) return <p className="text-sm text-primary/50">{empty}</p>;
  const max = Math.max(...items.map((item) => item.hours), 1);

  return (
    <ul className="grid gap-3">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="text-primary/75">{item.label}</span>
            <span className="font-medium text-primary">{formatHours(item.hours)} h</span>
          </div>
          <div className="h-2 rounded-full bg-primary/5">
            <div className="h-2 rounded-full bg-secondary" style={{ width: `${(item.hours / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// A column per calendar day. For long periods only days with hours are drawn.
function DailyBars({ totals, period }) {
  if (totals.size === 0) return <p className="text-sm text-primary/50">No hours in this period.</p>;

  const span = daysBetween(period.from, period.to);
  const keys =
    span <= 31
      ? Array.from({ length: span }, (_, index) => addDays(period.from, index))
      : [...totals.keys()].sort();
  const max = Math.max(...totals.values(), 1);
  const showValues = keys.length <= 16;

  return (
    <div className="overflow-x-auto">
      <div className="flex h-44 min-w-fit items-end gap-1.5">
        {keys.map((key) => {
          const hours = totals.get(key) || 0;
          return (
            <div
              key={key}
              className="flex h-full min-w-[18px] flex-1 flex-col items-center justify-end gap-1"
              title={`${formatDayShort(key)}: ${formatHours(hours)} hours`}
            >
              {showValues && hours > 0 ? (
                <span className="text-[11px] font-medium text-primary/70">{formatHours(hours)}</span>
              ) : null}
              <div
                className={`w-full max-w-10 rounded-t ${hours > 0 ? "bg-secondary" : "bg-primary/10"}`}
                style={{ height: hours > 0 ? `${Math.max((hours / max) * 80, 3)}%` : "2px" }}
              />
              <span className="text-[11px] text-primary/45">{Number(key.slice(8))}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-primary/45">
        Day of the month. Tallest day: {formatHours(max)} hours.
      </p>
    </div>
  );
}

// ─── Entries ─────────────────────────────────────────────────────────────────

function EntriesTable({ entries, viewer, canRemark = false, onChanged }) {
  const [drafts, setDrafts] = useState({});
  const [savingId, setSavingId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState("");

  if (entries.length === 0) return <Empty>No timesheet entries in this period.</Empty>;

  const oldestSelfDelete = addDays(todayKey(), -SELF_DELETE_WINDOW_DAYS);

  function canDelete(entry) {
    if (viewer.role === "admin") return true;
    return ownerId(entry) === viewer.id && toDateKey(entry.date) >= oldestSelfDelete;
  }

  async function saveRemark(entry) {
    setSavingId(entry._id);
    setError("");
    try {
      await postJson(`/api/timesheet/${entry._id}`, { remark: drafts[entry._id] ?? "" }, "PATCH");
      setEditingId("");
      await onChanged();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingId("");
    }
  }

  async function remove(entry) {
    setDeletingId(entry._id);
    setError("");
    try {
      await fetchJson(`/api/timesheet/${entry._id}`, { method: "DELETE" });
      await onChanged();
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId("");
    }
  }

  return (
    <>
      {error ? (
        <div className="px-5 pt-4">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : null}
      <Table head={["Date", "Time", { label: "Hours", right: true }, "Work type", "Details", "Remark", ""]}>
        {entries.map((entry) => (
          <tr key={entry._id}>
            <td className={`${tdStrong} whitespace-nowrap`}>{formatDayShort(entry.date)}</td>
            <td className={`${td} whitespace-nowrap`}>
              {formatTime12h(entry.fromTime)} – {formatTime12h(entry.toTime)}
            </td>
            <td className={`${tdStrong} text-right`}>{formatHours(entry.hours)}</td>
            <td className={td}>{entry.workType}</td>
            <td className={`${td} max-w-xs`}>{entry.workDetails || "–"}</td>
            <td className={`${td} min-w-52 max-w-xs`}>
              {canRemark && editingId === entry._id ? (
                <div className="grid gap-2">
                  <textarea
                    autoFocus
                    className={`${inputClass} min-h-16`}
                    value={drafts[entry._id] ?? entry.remark ?? ""}
                    maxLength={1000}
                    placeholder="Write a remark for this person"
                    onChange={(event) => setDrafts((current) => ({ ...current, [entry._id]: event.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={savingId === entry._id} onClick={() => saveRemark(entry)}>
                      {savingId === entry._id ? "Saving…" : "Save remark"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingId("")}>
                      Back
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {entry.remark ? (
                    <div>
                      <p className="text-primary">{entry.remark}</p>
                      <p className="mt-0.5 text-xs text-primary/45">{entry.remarkBy}</p>
                    </div>
                  ) : canRemark ? null : (
                    "–"
                  )}
                  {canRemark ? (
                    <button
                      type="button"
                      className="mt-1 text-xs font-semibold text-secondary hover:text-primary"
                      onClick={() => {
                        setDrafts((current) => ({ ...current, [entry._id]: entry.remark || "" }));
                        setEditingId(entry._id);
                      }}
                    >
                      {entry.remark ? "Edit remark" : "Add remark"}
                    </button>
                  ) : null}
                </>
              )}
            </td>
            <td className={`${td} text-right`}>
              {canDelete(entry) ? (
                <ConfirmButton
                  confirmLabel="Yes, delete"
                  busy={deletingId === entry._id}
                  busyLabel="Deleting…"
                  onConfirm={() => remove(entry)}
                >
                  Delete
                </ConfirmButton>
              ) : null}
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
