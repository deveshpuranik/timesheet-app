"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDateForDisplay } from "@/lib/timesheet";
import BrandCard from "@/components/ui/BrandCard";

export default function EntriesTable() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userActionId, setUserActionId] = useState("");
  const [remarks, setRemarks] = useState({});

  // ── Drill-down state ─────────────────────────────────────────────────────
  const [selectedEmployee, setSelectedEmployee] = useState(null); // { id, name, department }

  const isPrivileged = user?.role === "admin" || user?.role === "supervisor";

  const totalHours = useMemo(
    () => entries.reduce((sum, e) => sum + Number(e.hours || 0), 0),
    [entries]
  );

  const dailyTotals = useMemo(() => {
    return entries.reduce((totals, entry) => {
      const key = formatDateForDisplay(entry.date);
      totals[key] = (totals[key] || 0) + Number(entry.hours || 0);
      return totals;
    }, {});
  }, [entries]);

  // ── Group entries by employee for the summary table ──────────────────────
  const employeeSummaries = useMemo(() => {
    const map = {};
    entries.forEach((entry) => {
      const id = entry.userId?._id || entry.userId || entry.name;
      if (!map[id]) {
        map[id] = {
          id,
          name: entry.userId?.name || entry.name,
          department: entry.department,
          totalHours: 0,
          entryCount: 0,
          latestDate: entry.date
        };
      }
      map[id].totalHours += Number(entry.hours || 0);
      map[id].entryCount += 1;
      if (new Date(entry.date) > new Date(map[id].latestDate)) {
        map[id].latestDate = entry.date;
      }
    });
    return Object.values(map);
  }, [entries]);

  // ── Entries for the selected employee ────────────────────────────────────
  const selectedEntries = useMemo(() => {
    if (!selectedEmployee) return [];
    return entries.filter((e) => {
      const id = e.userId?._id || e.userId || e.name;
      return String(id) === String(selectedEmployee.id);
    });
  }, [entries, selectedEmployee]);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const meResponse = await fetch("/api/auth/me", { cache: "no-store" });
        const meData = await meResponse.json();
        if (!meResponse.ok) throw new Error(meData.message || "Please login again.");
        setUser(meData.user);

        const role = meData.user.role;
        if (role === "admin" || role === "supervisor") {
          const usersResponse = await fetch("/api/admin/users", { cache: "no-store" });
          const usersData = await usersResponse.json();
          if (!usersResponse.ok) throw new Error(usersData.message || "Unable to load employees.");
          setUsers(usersData.users || []);
        }
      } catch (loadError) {
        setError(loadError.message || "Unable to load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  useEffect(() => {
    async function loadEntries() {
      try {
        setLoading(true);
        setError("");
        const query = selectedUserId ? `?userId=${selectedUserId}` : "";
        const response = await fetch(`/api/timesheet${query}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load timesheets.");

        setEntries(data.entries || []);
        setSelectedEmployee(null); // reset drill-down on filter change

        const initial = {};
        (data.entries || []).forEach((e) => {
          initial[e._id] = { text: e.remark || "", saving: false, saved: false };
        });
        setRemarks(initial);
      } catch (loadError) {
        setError(loadError.message || "Unable to load timesheets.");
      } finally {
        setLoading(false);
      }
    }
    if (user) loadEntries();
  }, [selectedUserId, user]);

  async function updateUserStatus(userId, status) {
    try {
      setUserActionId(`${userId}-${status}`);
      setError("");
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to update user status.");
      setUsers((current) =>
        current.map((emp) =>
          emp.id === userId ? { ...emp, status: data.user.status } : emp
        )
      );
    } catch (statusError) {
      setError(statusError.message || "Unable to update user status.");
    } finally {
      setUserActionId("");
    }
  }

  function handleRemarkChange(entryId, value) {
    setRemarks((prev) => ({
      ...prev,
      [entryId]: { ...prev[entryId], text: value, saved: false }
    }));
  }

  async function saveRemark(entryId) {
    setRemarks((prev) => ({
      ...prev,
      [entryId]: { ...prev[entryId], saving: true, saved: false }
    }));
    try {
      const response = await fetch(`/api/timesheet/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remark: remarks[entryId]?.text || "" })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setRemarks((prev) => ({
        ...prev,
        [entryId]: { ...prev[entryId], saving: false, saved: true }
      }));
      setEntries((prev) =>
        prev.map((e) =>
          e._id === entryId
            ? { ...e, remark: data.entry.remark, remarkBy: data.entry.remarkBy }
            : e
        )
      );
    } catch {
      setRemarks((prev) => ({
        ...prev,
        [entryId]: { ...prev[entryId], saving: false, saved: false }
      }));
    }
  }

  return (
    <section className="grid gap-8 animate-reveal">

      {/* Summary cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        <SummaryCard label="Entries" value={entries.length} />
        <SummaryCard label="Total Hours" value={totalHours.toFixed(2)} />
        <SummaryCard label="Days Logged" value={Object.keys(dailyTotals).length} />
      </div>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-800">
          {error}
        </p>
      ) : null}

      {/* Approval panel — admin only */}
      {user?.role === "admin" ? (
        <Panel
          eyebrow="Admin"
          title="Approval Panel"
          description="Review employee registrations before they can access the internal system."
          dark
        >
          <TableShell>
            <thead className="text-left text-[10px] font-bold uppercase tracking-[0.28em] text-primary/45">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {users.length === 0 ? (
                <tr>
                  <td className="px-6 py-6 text-sm text-primary/55" colSpan="5">
                    No registered users found.
                  </td>
                </tr>
              ) : (
                users.map((employee) => (
                  <tr key={employee.id} className="transition hover:bg-secondary/5">
                    <td className="px-6 py-5 font-medium text-primary">{employee.name}</td>
                    <td className="px-6 py-5 text-primary/62">{employee.email}</td>
                    <td className="px-6 py-5"><RoleBadge role={employee.role} /></td>
                    <td className="px-6 py-5"><StatusBadge status={employee.status} /></td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={employee.status === "approved" || userActionId === `${employee.id}-approved`}
                          onClick={() => updateUserStatus(employee.id, "approved")}
                          className="btn-smooth rounded-full bg-secondary px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white hover:bg-primary disabled:cursor-not-allowed disabled:bg-primary/20"
                          type="button"
                        >
                          Approve
                        </button>
                        <button
                          disabled={employee.id === user.id || employee.status === "rejected" || userActionId === `${employee.id}-rejected`}
                          onClick={() => updateUserStatus(employee.id, "rejected")}
                          className="btn-smooth rounded-full border border-primary/10 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary hover:border-secondary/40 hover:bg-secondary/10 disabled:cursor-not-allowed disabled:text-primary/30"
                          type="button"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </TableShell>
        </Panel>
      ) : null}

      {/* Daily hours breakdown */}
      {Object.keys(dailyTotals).length > 0 ? (
        <Panel eyebrow="Rhythm" title="Total Working Hours Per Day">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(dailyTotals).map(([date, hours]) => (
              <div key={date} className="rounded-2xl border border-primary/5 bg-linen p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary/45">{date}</p>
                <p className="mt-3 font-serif text-4xl font-medium text-secondary">
                  {Number(hours).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {/* ── Main timesheet panel ── */}
      <Panel
        eyebrow={
          user?.role === "admin" ? "Operations"
          : user?.role === "supervisor" ? "Supervision"
          : "Personal log"
        }
        title={
          // When drilled in, show employee name in the title
          selectedEmployee
            ? selectedEmployee.name
            : user?.role === "admin" ? "Timesheet Dashboard"
            : user?.role === "supervisor" ? "Employee Timesheets"
            : "Employee Dashboard"
        }
        description={
          selectedEmployee
            ? `${selectedEmployee.department} · ${selectedEntries.length} ${selectedEntries.length === 1 ? "entry" : "entries"} · ${selectedEntries.reduce((s, e) => s + Number(e.hours || 0), 0).toFixed(2)} hrs total`
            : user?.role === "admin" ? "Click an employee row to view their full timesheet."
            : user?.role === "supervisor" ? "Click an employee row to view their full timesheet."
            : "Review your submitted timesheet entries and feedback from your manager."
        }
        action={
          // Back button when drilled in; filter dropdown when at summary level
          selectedEmployee ? (
            <button
              type="button"
              onClick={() => setSelectedEmployee(null)}
              className="flex items-center gap-2 rounded-full border border-primary/10 bg-white px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.22em] text-primary transition hover:border-secondary/40 hover:bg-secondary/10"
            >
              ← Back to All Employees
            </button>
          ) : isPrivileged ? (
            <label className="grid gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-primary/45">
              Filter by Employee
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="min-w-64 border-b border-primary/10 bg-transparent py-3 text-sm normal-case tracking-normal text-primary outline-none transition focus:border-secondary"
              >
                <option value="">All employees</option>
                {users.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.status || "pending"})
                  </option>
                ))}
              </select>
            </label>
          ) : null
        }
      >
        {loading ? (
          <p className="py-8 text-sm text-primary/55">Loading entries...</p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-sm text-primary/55">No timesheet entries found.</p>
        ) : selectedEmployee ? (
          // ── Drill-down: full entries for one employee ──
          <TableShell>
            <thead className="text-left text-[10px] font-bold uppercase tracking-[0.28em] text-primary/45">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Work Type</th>
                <th className="px-6 py-4">From</th>
                <th className="px-6 py-4">To</th>
                <th className="px-6 py-4">Hours</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">{isPrivileged ? "Remark" : "Feedback"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {selectedEntries.map((entry) => (
                <tr key={entry._id} className="align-top transition hover:bg-secondary/5">
                  <td className="px-6 py-5 text-primary/62">{formatDateForDisplay(entry.date)}</td>
                  <td className="px-6 py-5 text-primary/62">{entry.department}</td>
                  <td className="px-6 py-5 text-primary/62">{entry.workType}</td>
                  <td className="px-6 py-5 text-primary/62">{entry.fromTime}</td>
                  <td className="px-6 py-5 text-primary/62">{entry.toTime}</td>
                  <td className="px-6 py-5 font-semibold text-primary">
                    {Number(entry.hours).toFixed(2)}
                  </td>
                  <td className="max-w-sm px-6 py-5 text-primary/62">
                    {entry.workDetails || "-"}
                  </td>
                  <td className="px-6 py-5">
                    {isPrivileged ? (
                      <div className="flex min-w-52 flex-col gap-2">
                        <textarea
                          value={remarks[entry._id]?.text ?? entry.remark ?? ""}
                          onChange={(e) => handleRemarkChange(entry._id, e.target.value)}
                          placeholder="Write a remark..."
                          rows={2}
                          className="w-full resize-y rounded-xl border border-primary/10 bg-white/70 px-3 py-2 text-sm font-light leading-6 text-primary outline-none transition focus:border-secondary focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => saveRemark(entry._id)}
                          disabled={remarks[entry._id]?.saving}
                          className="self-end rounded-full bg-secondary px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-primary disabled:cursor-not-allowed disabled:bg-primary/20"
                        >
                          {remarks[entry._id]?.saving ? "Saving..."
                            : remarks[entry._id]?.saved ? "Saved ✓"
                            : "Save"}
                        </button>
                      </div>
                    ) : entry.remark ? (
                      <div className="min-w-40 rounded-xl border border-secondary/20 bg-secondary/8 px-4 py-3">
                        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.28em] text-secondary">
                          {entry.remarkBy || "Manager Feedback"}
                        </p>
                        <p className="text-sm font-light leading-6 text-primary">{entry.remark}</p>
                      </div>
                    ) : (
                      <span className="text-primary/35">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : isPrivileged ? (
          // ── Summary table: one row per employee ──
          <TableShell>
            <thead className="text-left text-[10px] font-bold uppercase tracking-[0.28em] text-primary/45">
              <tr>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Total Hours</th>
                <th className="px-6 py-4">Entries</th>
                <th className="px-6 py-4">Last Entry</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {employeeSummaries.map((emp) => (
                <tr
                  key={emp.id}
                  className="cursor-pointer align-middle transition hover:bg-secondary/5"
                  onClick={() => setSelectedEmployee(emp)}
                >
                  <td className="px-6 py-5 font-medium text-primary">{emp.name}</td>
                  <td className="px-6 py-5 text-primary/62">{emp.department}</td>
                  <td className="px-6 py-5 font-semibold text-primary">
                    {emp.totalHours.toFixed(2)} hrs
                  </td>
                  <td className="px-6 py-5 text-primary/62">{emp.entryCount}</td>
                  <td className="px-6 py-5 text-primary/62">
                    {formatDateForDisplay(emp.latestDate)}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <span className="rounded-full border border-secondary/30 bg-secondary/10 px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.22em] text-secondary">
                      View →
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : (
          // ── Employee: their own full entries ──
          <TableShell>
            <thead className="text-left text-[10px] font-bold uppercase tracking-[0.28em] text-primary/45">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Department</th>
                <th className="px-6 py-4">Work Type</th>
                <th className="px-6 py-4">From</th>
                <th className="px-6 py-4">To</th>
                <th className="px-6 py-4">Hours</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4">Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {entries.map((entry) => (
                <tr key={entry._id} className="align-top transition hover:bg-secondary/5">
                  <td className="px-6 py-5 text-primary/62">{formatDateForDisplay(entry.date)}</td>
                  <td className="px-6 py-5 text-primary/62">{entry.department}</td>
                  <td className="px-6 py-5 text-primary/62">{entry.workType}</td>
                  <td className="px-6 py-5 text-primary/62">{entry.fromTime}</td>
                  <td className="px-6 py-5 text-primary/62">{entry.toTime}</td>
                  <td className="px-6 py-5 font-semibold text-primary">
                    {Number(entry.hours).toFixed(2)}
                  </td>
                  <td className="max-w-sm px-6 py-5 text-primary/62">
                    {entry.workDetails || "-"}
                  </td>
                  <td className="px-6 py-5">
                    {entry.remark ? (
                      <div className="min-w-40 rounded-xl border border-secondary/20 bg-secondary/8 px-4 py-3">
                        <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.28em] text-secondary">
                          {entry.remarkBy || "Manager Feedback"}
                        </p>
                        <p className="text-sm font-light leading-6 text-primary">{entry.remark}</p>
                      </div>
                    ) : (
                      <span className="text-primary/35">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </Panel>
    </section>
  );
}

function SummaryCard({ label, value }) {
  return (
    <BrandCard className="hover-lift p-7">
      <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-primary/42">{label}</p>
      <p className="mt-5 font-serif text-5xl font-medium text-primary">{value}</p>
    </BrandCard>
  );
}

function Panel({ eyebrow, title, description, action, children, dark = false }) {
  return (
    <BrandCard className="overflow-hidden p-0">
      <div className={`flex flex-col gap-5 border-b px-6 py-6 lg:flex-row lg:items-end lg:justify-between ${dark ? "border-white/10 bg-primary text-white" : "border-primary/5"}`}>
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-[0.42em] ${dark ? "text-white/45" : "text-secondary"}`}>
            {eyebrow}
          </p>
          <h2 className={`mt-3 font-serif text-3xl font-medium ${dark ? "text-white" : "text-primary"}`}>
            {title}
          </h2>
          {description ? (
            <p className={`mt-2 text-sm font-light leading-7 ${dark ? "text-white/65" : "text-primary/55"}`}>
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-2 sm:p-4">{children}</div>
    </BrandCard>
  );
}

function TableShell({ children }) {
  return (
    <div className="overflow-x-auto rounded-[1.2rem] bg-white">
      <table className="min-w-full border-separate border-spacing-y-1 text-sm">{children}</table>
    </div>
  );
}

function RoleBadge({ role }) {
  const styles = {
    admin: "border-purple-200 bg-purple-50 text-purple-800",
    supervisor: "border-blue-200 bg-blue-50 text-blue-800",
    employee: "border-primary/20 bg-primary/5 text-primary/70"
  };
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${styles[role] || styles.employee}`}>
      {role}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: "border-amber-200 bg-amber-50 text-amber-800",
    approved: "border-secondary/30 bg-secondary/10 text-secondary",
    rejected: "border-red-200 bg-red-50 text-red-800"
  };
  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${styles[status] || styles.pending}`}>
      {status || "pending"}
    </span>
  );
}