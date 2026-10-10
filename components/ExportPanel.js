"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import PeriodPicker, { initialPeriod } from "@/components/PeriodPicker";
import { useRequireUser } from "@/components/SessionProvider";
import { Button, Card, Field, Loading, Notice, Page, Stat, inputClass } from "@/components/ui/kit";
import { fetchJson } from "@/lib/fetchJson";
import { departments, formatDateForDisplay, formatHours, isValidDateKey } from "@/lib/timesheet";

export default function ExportPanel() {
  const { user, ready } = useRequireUser();
  const searchParams = useSearchParams();
  const leadsTeam = user?.role === "admin" || user?.role === "supervisor";

  const [people, setPeople] = useState([]);
  const [person, setPerson] = useState(() => searchParams.get("userId") || "");
  const [department, setDepartment] = useState("");
  const [period, setPeriod] = useState(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    return isValidDateKey(from) && isValidDateKey(to) ? { preset: "custom", from, to } : initialPeriod("month");
  });
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!ready || !leadsTeam) return;
    fetchJson("/api/users")
      .then((data) => setPeople(data.users || []))
      .catch((loadError) => setError(loadError.message));
  }, [ready, leadsTeam]);

  const periodValid = isValidDateKey(period.from) && isValidDateKey(period.to) && period.from <= period.to;

  // The same filters are used for the preview and for the Excel file.
  const query = useMemo(() => {
    const params = new URLSearchParams({ from: period.from, to: period.to });
    if (!leadsTeam || person === "me") params.set("scope", "mine");
    else if (person) params.set("userId", person);
    if (leadsTeam && department && !person) params.set("department", department);
    return params.toString();
  }, [period.from, period.to, person, department, leadsTeam]);

  useEffect(() => {
    if (!ready || !periodValid) {
      setPreview(null);
      return undefined;
    }

    let current = true;
    setLoadingPreview(true);
    setError("");
    setMessage("");

    fetchJson(`/api/timesheet?${query}`)
      .then((data) => {
        if (!current) return;
        const entries = data.entries || [];
        setPreview({
          entries: entries.length,
          hours: entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0),
          people: new Set(entries.map((entry) => String(entry.userId?._id || entry.userId))).size
        });
      })
      .catch((loadError) => current && setError(loadError.message))
      .finally(() => current && setLoadingPreview(false));

    return () => {
      current = false;
    };
  }, [ready, periodValid, query]);

  async function download() {
    setDownloading(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/export?${query}`, { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || "Unable to create the Excel file. Please try again.");
      }

      const fileName =
        /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") || "")?.[1] || "timesheet.xlsx";
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage(`Downloaded ${fileName}`);
    } catch (downloadError) {
      setError(downloadError.message);
    } finally {
      setDownloading(false);
    }
  }

  if (!ready) {
    return (
      <Page title="Export to Excel" width="max-w-4xl">
        <Loading />
      </Page>
    );
  }

  const selectablePeople = people.filter((item) => item.id !== user.id);
  const personName =
    !leadsTeam || person === "me"
      ? user.name
      : person
        ? people.find((item) => item.id === person)?.name || "Selected person"
        : department
          ? `Everyone in ${department}`
          : "Everyone";

  return (
    <Page
      title="Export to Excel"
      description={
        leadsTeam
          ? "Choose whose timesheet and which dates you need. The file contains only what you choose."
          : "Download your own timesheet for the dates you choose."
      }
      width="max-w-4xl"
    >
      <Card title="What to export">
        <div className="grid gap-5">
          {leadsTeam ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Person">
                <select className={inputClass} value={person} onChange={(event) => setPerson(event.target.value)}>
                  <option value="">Everyone</option>
                  <option value="me">Me ({user.name})</option>
                  {selectablePeople.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {item.status !== "approved" ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Department" hint={person ? "Not used when one person is selected." : undefined}>
                <select
                  className={inputClass}
                  value={person ? "" : department}
                  disabled={Boolean(person)}
                  onChange={(event) => setDepartment(event.target.value)}
                >
                  <option value="">All departments</option>
                  {departments.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          ) : null}

          <div>
            <p className="mb-1.5 text-sm font-medium text-primary/75">Dates</p>
            <PeriodPicker value={period} onChange={setPeriod} />
          </div>
        </div>
      </Card>

      {!periodValid ? (
        <Notice tone="warning">Choose a From date that is on or before the To date.</Notice>
      ) : (
        <Card
          title={personName}
          description={`${formatDateForDisplay(period.from)} – ${formatDateForDisplay(period.to)}`}
        >
          {loadingPreview || !preview ? (
            <Loading>Checking what is available…</Loading>
          ) : (
            <div className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat label="Entries" value={preview.entries} />
                <Stat label="Hours" value={formatHours(preview.hours)} />
                <Stat label="People" value={preview.people} />
              </div>

              {preview.entries === 0 ? (
                <Notice tone="info">
                  There are no timesheet entries for this choice. Try other dates or another person.
                </Notice>
              ) : (
                <p className="text-sm text-primary/60">
                  The Excel file has four sheets: every entry, hours per day, totals per person, and approved leave.
                </p>
              )}

              <Button size="lg" className="w-fit" disabled={downloading || preview.entries === 0} onClick={download}>
                {downloading ? "Preparing file…" : "Download Excel file"}
              </Button>
            </div>
          )}
        </Card>
      )}

      <Notice tone="success">{message}</Notice>
      <Notice tone="error">{error}</Notice>
    </Page>
  );
}
