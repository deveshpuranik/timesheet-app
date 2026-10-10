"use client";

import { useCallback, useEffect, useState } from "react";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { useRequireUser } from "@/components/SessionProvider";
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Loading,
  Notice,
  Page,
  Table,
  Tabs,
  inputClass,
  td,
  tdStrong
} from "@/components/ui/kit";
import { fetchJson, postJson } from "@/lib/fetchJson";
import {
  daysBetween,
  formatDateForDisplay,
  formatHours,
  leaveTypes,
  toDateKey,
  todayKey
} from "@/lib/timesheet";

function dateRange(leave) {
  const from = formatDateForDisplay(leave.fromDate);
  const to = formatDateForDisplay(leave.toDate);
  return from === to ? from : `${from} – ${to}`;
}

function dayCount(days) {
  if (days === 0.5) return "Half day";
  return `${formatHours(days)} ${days === 1 ? "day" : "days"}`;
}

const emptyForm = { leaveType: "", fromDate: "", toDate: "", halfDay: false, reason: "" };

export default function LeaveCenter() {
  const { user, ready } = useRequireUser();
  const canApprove = user?.role === "admin" || user?.role === "supervisor";
  const [tab, setTab] = useState("mine");
  const [mine, setMine] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const [mineData, teamData] = await Promise.all([
        fetchJson("/api/leave?scope=mine"),
        canApprove ? fetchJson("/api/leave?scope=team") : Promise.resolve({ requests: [] })
      ]);
      setMine(mineData.requests || []);
      setTeam(teamData.requests || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [canApprove]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  // Requests waiting for this person's decision (a supervisor never decides their own).
  const waiting = team.filter(
    (leave) => leave.status === "pending" && !(user?.role === "supervisor" && leave.userId === user.id)
  );

  // Open the approvals tab first when something is waiting.
  const [autoSwitched, setAutoSwitched] = useState(false);
  useEffect(() => {
    if (!autoSwitched && !loading && canApprove) {
      setAutoSwitched(true);
      if (waiting.length > 0) setTab("approvals");
    }
  }, [autoSwitched, loading, canApprove, waiting.length]);

  if (!ready) {
    return (
      <Page title="Leave">
        <Loading />
      </Page>
    );
  }

  function report(text) {
    setError("");
    setMessage(text);
  }

  return (
    <Page
      title="Leave"
      description={
        canApprove
          ? "Request your own leave, and approve or reject requests from the team."
          : "Request leave and follow the status of your requests."
      }
    >
      {canApprove ? (
        <Tabs
          value={tab}
          onChange={(value) => {
            setTab(value);
            setMessage("");
            setError("");
          }}
          tabs={[
            { value: "approvals", label: "Approvals", count: waiting.length },
            { value: "mine", label: "My leave" }
          ]}
        />
      ) : null}

      <Notice tone="success">{message}</Notice>
      <Notice tone="error">{error}</Notice>

      {loading ? (
        <Loading />
      ) : tab === "approvals" && canApprove ? (
        <Approvals
          user={user}
          waiting={waiting}
          decided={team.filter((leave) => leave.status !== "pending")}
          onDone={(text) => {
            report(text);
            load();
          }}
          onError={setError}
        />
      ) : (
        <MyLeave
          requests={mine}
          onDone={(text) => {
            report(text);
            load();
          }}
          onError={setError}
        />
      )}
    </Page>
  );
}

function MyLeave({ requests, onDone, onError }) {
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState("");
  const [cancellingId, setCancellingId] = useState("");
  const today = todayKey();

  const singleDay = form.fromDate && (!form.toDate || form.toDate === form.fromDate);
  const totalDays =
    form.fromDate && form.toDate && form.toDate >= form.fromDate
      ? form.halfDay && singleDay
        ? 0.5
        : daysBetween(form.fromDate, form.toDate)
      : 0;

  function update(name, value) {
    setFormError("");
    setForm((current) => {
      const next = { ...current, [name]: value };
      // Picking the first day fills the last day too; most leave is a single day.
      if (name === "fromDate" && (!current.toDate || current.toDate < value)) next.toDate = value;
      if (next.fromDate !== next.toDate) next.halfDay = false;
      return next;
    });
  }

  async function submit(event) {
    event.preventDefault();
    if (!form.leaveType) return setFormError("Please select the type of leave.");
    if (!form.fromDate || !form.toDate) return setFormError("Please select the leave dates.");
    if (form.toDate < form.fromDate) return setFormError("The To date must be on or after the From date.");
    if (form.reason.trim().length < 3) return setFormError("Please write the reason for your leave.");

    setSending(true);
    setFormError("");
    try {
      const data = await postJson("/api/leave", form);
      setForm(emptyForm);
      onDone(data.message);
    } catch (submitError) {
      setFormError(submitError.message);
    } finally {
      setSending(false);
    }
  }

  async function cancel(leave) {
    setCancellingId(leave._id);
    try {
      const data = await postJson(`/api/leave/${leave._id}`, { action: "cancel" }, "PATCH");
      onDone(data.message);
    } catch (cancelError) {
      onError(cancelError.message);
    } finally {
      setCancellingId("");
    }
  }

  function canCancel(leave) {
    return leave.status === "pending" || (leave.status === "approved" && toDateKey(leave.fromDate) > today);
  }

  return (
    <>
      <Card title="Request leave">
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Type of leave" required>
              <select className={inputClass} value={form.leaveType} onChange={(event) => update("leaveType", event.target.value)}>
                <option value="">Select type</option>
                {leaveTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="From" required>
              <input type="date" className={inputClass} value={form.fromDate} onChange={(event) => update("fromDate", event.target.value)} />
            </Field>
            <Field label="To" required>
              <input type="date" className={inputClass} value={form.toDate} min={form.fromDate || undefined} onChange={(event) => update("toDate", event.target.value)} />
            </Field>
          </div>

          {singleDay ? (
            <label className="flex w-fit items-center gap-2 text-sm text-primary/75">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#a65f44]"
                checked={form.halfDay}
                onChange={(event) => update("halfDay", event.target.checked)}
              />
              Half day only
            </label>
          ) : null}

          <Field label="Reason" required>
            <textarea
              className={`${inputClass} min-h-20 resize-y`}
              value={form.reason}
              maxLength={1000}
              onChange={(event) => update("reason", event.target.value)}
              placeholder="Why do you need this leave?"
            />
          </Field>

          <Notice tone="error">{formError}</Notice>

          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={sending}>
              {sending ? "Sending…" : "Send request"}
            </Button>
            {totalDays > 0 ? <p className="text-sm text-primary/60">{dayCount(totalDays)} of leave</p> : null}
          </div>
        </form>
      </Card>

      <Card flush title="My requests">
        {requests.length === 0 ? (
          <Empty>You have not requested any leave yet.</Empty>
        ) : (
          <Table head={["Dates", "Type", "Days", "Reason", "Status", ""]}>
            {requests.map((leave) => (
              <tr key={leave._id}>
                <td className={`${tdStrong} whitespace-nowrap`}>{dateRange(leave)}</td>
                <td className={`${td} whitespace-nowrap`}>{leave.leaveType}</td>
                <td className={`${td} whitespace-nowrap`}>{dayCount(leave.days)}</td>
                <td className={`${td} max-w-xs`}>{leave.reason}</td>
                <td className={td}>
                  <Badge tone={leave.status}>{leave.status}</Badge>
                  {leave.decidedByName ? (
                    <p className="mt-1 text-xs text-primary/50">
                      by {leave.decidedByName}
                      {leave.decisionNote ? `: ${leave.decisionNote}` : ""}
                    </p>
                  ) : null}
                </td>
                <td className={`${td} text-right`}>
                  {canCancel(leave) ? (
                    <ConfirmButton
                      confirmLabel="Yes, cancel"
                      busy={cancellingId === leave._id}
                      busyLabel="Cancelling…"
                      onConfirm={() => cancel(leave)}
                    >
                      Cancel request
                    </ConfirmButton>
                  ) : null}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}

function Approvals({ user, waiting, decided, onDone, onError }) {
  const [busyId, setBusyId] = useState("");
  const [rejecting, setRejecting] = useState({ id: "", note: "" });

  async function decide(leave, action, note = "") {
    setBusyId(leave._id);
    onError("");
    try {
      const data = await postJson(`/api/leave/${leave._id}`, { action, note }, "PATCH");
      setRejecting({ id: "", note: "" });
      onDone(data.message);
    } catch (decideError) {
      onError(decideError.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <>
      <Card
        flush
        title="Waiting for your decision"
        description={
          user.role === "supervisor"
            ? "Leave requests from employees. Requests from supervisors go to the admin."
            : undefined
        }
      >
        {waiting.length === 0 ? (
          <Empty>No leave requests are waiting.</Empty>
        ) : (
          <ul className="divide-y divide-primary/5">
            {waiting.map((leave) => (
              <li key={leave._id} className="grid gap-4 px-5 py-4 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <p className="font-medium text-primary">
                    {leave.name}
                    <span className="ml-2 text-sm font-normal text-primary/50">{leave.department}</span>
                  </p>
                  <p className="mt-1 text-sm text-primary/75">
                    {leave.leaveType}, {dateRange(leave)} ({dayCount(leave.days)})
                  </p>
                  <p className="mt-1 text-sm text-primary/60">{leave.reason}</p>
                  <p className="mt-1 text-xs text-primary/40">Requested {formatDateForDisplay(toDateKey(leave.createdAt))}</p>
                </div>

                {rejecting.id === leave._id ? (
                  <div className="grid gap-2 lg:w-80">
                    <textarea
                      autoFocus
                      className={`${inputClass} min-h-16`}
                      placeholder="Reason for rejecting (the person will see this)"
                      value={rejecting.note}
                      maxLength={500}
                      onChange={(event) => setRejecting({ id: leave._id, note: event.target.value })}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="dark"
                        size="sm"
                        disabled={busyId === leave._id || !rejecting.note.trim()}
                        onClick={() => decide(leave, "reject", rejecting.note)}
                      >
                        {busyId === leave._id ? "Rejecting…" : "Reject leave"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setRejecting({ id: "", note: "" })}>
                        Back
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busyId === leave._id} onClick={() => decide(leave, "approve")}>
                      {busyId === leave._id ? "Approving…" : "Approve"}
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={busyId === leave._id}
                      onClick={() => setRejecting({ id: leave._id, note: "" })}
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card flush title="Earlier requests">
        {decided.length === 0 ? (
          <Empty>Approved, rejected and cancelled requests are listed here.</Empty>
        ) : (
          <Table head={["Name", "Dates", "Type", "Days", "Reason", "Status"]}>
            {decided.map((leave) => (
              <tr key={leave._id}>
                <td className={tdStrong}>
                  {leave.name}
                  <p className="text-xs font-normal text-primary/50">{leave.department}</p>
                </td>
                <td className={`${td} whitespace-nowrap`}>{dateRange(leave)}</td>
                <td className={`${td} whitespace-nowrap`}>{leave.leaveType}</td>
                <td className={`${td} whitespace-nowrap`}>{dayCount(leave.days)}</td>
                <td className={`${td} max-w-xs`}>{leave.reason}</td>
                <td className={td}>
                  <Badge tone={leave.status}>{leave.status}</Badge>
                  {leave.decidedByName ? (
                    <p className="mt-1 text-xs text-primary/50">
                      by {leave.decidedByName}
                      {leave.decisionNote ? `: ${leave.decisionNote}` : ""}
                    </p>
                  ) : null}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}
