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
  inputClass,
  td,
  tdStrong
} from "@/components/ui/kit";
import { fetchJson, postJson } from "@/lib/fetchJson";
import { departments, formatDateForDisplay, roles, toDateKey } from "@/lib/timesheet";

const statusLabels = { approved: "Active", pending: "Waiting", rejected: "Inactive" };
const emptyPerson = { name: "", email: "", password: "", department: "", role: "employee" };
const selectClass = `${inputClass} py-1.5`;

export default function PeopleAdmin() {
  const { user, ready } = useRequireUser({ roles: ["admin"] });
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [resetting, setResetting] = useState({ id: "", password: "" });

  const load = useCallback(async () => {
    try {
      const data = await fetchJson("/api/users");
      setPeople(data.users || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  async function update(person, changes) {
    setBusyId(person.id);
    setMessage("");
    setError("");
    try {
      const data = await postJson(`/api/users/${person.id}`, changes, "PATCH");
      setPeople((current) => current.map((item) => (item.id === person.id ? data.user : item)));
      setMessage(data.message);
      return true;
    } catch (updateError) {
      setError(updateError.message);
      return false;
    } finally {
      setBusyId("");
    }
  }

  if (!ready) {
    return (
      <Page title="People">
        <Loading />
      </Page>
    );
  }

  const waiting = people.filter((person) => person.status === "pending");
  const term = search.trim().toLowerCase();
  const others = people
    .filter((person) => person.status !== "pending")
    .filter(
      (person) =>
        !term ||
        person.name.toLowerCase().includes(term) ||
        person.email.toLowerCase().includes(term) ||
        (person.department || "").toLowerCase().includes(term)
    );

  return (
    <Page
      title="People"
      description="Approve new signups, and set each person's department and role. Only active people can log in."
      actions={
        <Button onClick={() => setAdding((current) => !current)} variant={adding ? "outline" : "primary"}>
          {adding ? "Close" : "Add a person"}
        </Button>
      }
    >
      <Notice tone="success">{message}</Notice>
      <Notice tone="error">{error}</Notice>

      {adding ? (
        <AddPerson
          onAdded={(text) => {
            setAdding(false);
            setMessage(text);
            load();
          }}
        />
      ) : null}

      <Card
        flush
        title="Waiting for approval"
        description={waiting.length > 0 ? "These people registered and cannot log in until you approve them." : undefined}
      >
        {loading ? (
          <Loading />
        ) : waiting.length === 0 ? (
          <Empty>No signups are waiting.</Empty>
        ) : (
          <ul className="divide-y divide-primary/5">
            {waiting.map((person) => (
              <li key={person.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-primary">{person.name}</p>
                  <p className="text-sm text-primary/60">
                    {person.email}
                    {person.department ? `, ${person.department}` : ""}
                  </p>
                  {person.createdAt ? (
                    <p className="mt-0.5 text-xs text-primary/40">
                      Registered {formatDateForDisplay(toDateKey(person.createdAt))}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" disabled={busyId === person.id} onClick={() => update(person, { status: "approved" })}>
                    Approve
                  </Button>
                  <Button variant="danger" size="sm" disabled={busyId === person.id} onClick={() => update(person, { status: "rejected" })}>
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        flush
        title="Everyone"
        actions={
          <input
            type="search"
            className={`${inputClass} w-56 py-2`}
            placeholder="Search name or department"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search people"
          />
        }
      >
        {loading ? (
          <Loading />
        ) : others.length === 0 ? (
          <Empty>{term ? "Nobody matches that search." : "No people yet."}</Empty>
        ) : (
          <Table head={["Name", "Department", "Role", "Status", ""]}>
            {others.map((person) => {
              const isSelf = person.id === user.id;
              const busy = busyId === person.id;

              return (
                <tr key={person.id}>
                  <td className={tdStrong}>
                    {person.name}
                    {isSelf ? <span className="ml-2 text-xs font-normal text-primary/45">(you)</span> : null}
                    <p className="text-xs font-normal text-primary/50">{person.email}</p>
                  </td>
                  <td className={td}>
                    <select
                      className={`${selectClass} min-w-52`}
                      value={person.department || ""}
                      disabled={busy}
                      aria-label={`Department of ${person.name}`}
                      onChange={(event) => update(person, { department: event.target.value })}
                    >
                      {person.department ? null : <option value="">Not set</option>}
                      {departments.map((department) => (
                        <option key={department} value={department}>
                          {department}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <select
                      className={`${selectClass} min-w-32 capitalize`}
                      value={person.role}
                      disabled={busy || isSelf}
                      aria-label={`Role of ${person.name}`}
                      onChange={(event) => update(person, { role: event.target.value })}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={td}>
                    <Badge tone={person.status}>{statusLabels[person.status] || person.status}</Badge>
                  </td>
                  <td className={`${td} text-right`}>
                    {resetting.id === person.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <input
                          autoFocus
                          type="text"
                          className={`${inputClass} w-44 py-1.5`}
                          placeholder="New password"
                          value={resetting.password}
                          onChange={(event) => setResetting({ id: person.id, password: event.target.value })}
                        />
                        <Button
                          size="sm"
                          disabled={busy || resetting.password.length < 6}
                          onClick={async () => {
                            if (await update(person, { password: resetting.password })) {
                              setResetting({ id: "", password: "" });
                            }
                          }}
                        >
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setResetting({ id: "", password: "" })}>
                          Back
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setResetting({ id: person.id, password: "" })}>
                          Reset password
                        </Button>
                        {person.status === "rejected" ? (
                          <Button variant="outline" size="sm" disabled={busy} onClick={() => update(person, { status: "approved" })}>
                            Activate
                          </Button>
                        ) : isSelf || person.role === "admin" ? null : (
                          <ConfirmButton
                            confirmLabel="Yes, deactivate"
                            busy={busy}
                            onConfirm={() => update(person, { status: "rejected" })}
                          >
                            Deactivate
                          </ConfirmButton>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </Page>
  );
}

function AddPerson({ onAdded }) {
  const [form, setForm] = useState(emptyPerson);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(name, value) {
    setError("");
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = await postJson("/api/users", form);
      setForm(emptyPerson);
      onAdded(data.message);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Add a person" description="The account is active straight away. Share the email and password with them.">
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Full name" required>
            <input className={inputClass} value={form.name} onChange={(event) => update("name", event.target.value)} />
          </Field>
          <Field label="Email" required>
            <input type="email" className={inputClass} value={form.email} onChange={(event) => update("email", event.target.value)} />
          </Field>
          <Field label="Password" required hint="At least 6 characters.">
            <input type="text" className={inputClass} value={form.password} onChange={(event) => update("password", event.target.value)} />
          </Field>
          <Field label="Department" required>
            <select className={inputClass} value={form.department} onChange={(event) => update("department", event.target.value)}>
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Role" required>
            <select className={`${inputClass} capitalize`} value={form.role} onChange={(event) => update("role", event.target.value)}>
              {roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Notice tone="error">{error}</Notice>
        <Button type="submit" disabled={saving} className="w-fit">
          {saving ? "Adding…" : "Add person"}
        </Button>
      </form>
    </Card>
  );
}
