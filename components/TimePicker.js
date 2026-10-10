"use client";

import { useEffect, useRef, useState } from "react";
import {
  formatTime12h,
  smartPeriod,
  timeToMinutes,
  to12hParts,
  to24h
} from "@/lib/timesheet";

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const QUICK_DURATIONS = [
  { label: "+30 min", minutes: 30 },
  { label: "+1 hr", minutes: 60 },
  { label: "+2 hr", minutes: 120 },
  { label: "+4 hr", minutes: 240 }
];

function minutesTo24h(total) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * 12-hour time picker that stores "HH:MM" (24h).
 *
 * AM/PM is chosen automatically when an hour is tapped: for a To time (`after` = the
 * From time) it picks whichever makes the time later than From; otherwise it assumes
 * a normal working day. Tapping AM or PM yourself always wins.
 */
export default function TimePicker({ id, value, onChange, after = "", invalid = false, placeholder = "Select time", alignRight = false }) {
  const wrapperRef = useRef(null);
  const periodChosenByUser = useRef(false);
  const [open, setOpen] = useState(false);
  const parts = to12hParts(value);
  // Remembered between taps while no complete time exists yet.
  const [draftMinute, setDraftMinute] = useState(0);
  const [draftPeriod, setDraftPeriod] = useState(null);

  const hour = parts?.hour ?? null;
  const minute = parts?.minute ?? draftMinute;
  const period = parts?.period ?? draftPeriod;

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function pickPeriod(nextHour, nextMinute) {
    if (periodChosenByUser.current && period) return period;
    return smartPeriod(nextHour, nextMinute, after);
  }

  function handleHour(nextHour) {
    onChange(to24h(nextHour, minute, pickPeriod(nextHour, minute)));
  }

  function handleMinute(nextMinute) {
    setDraftMinute(nextMinute);
    if (hour !== null) onChange(to24h(hour, nextMinute, pickPeriod(hour, nextMinute)));
  }

  function handlePeriod(nextPeriod) {
    periodChosenByUser.current = true;
    setDraftPeriod(nextPeriod);
    if (hour !== null) onChange(to24h(hour, minute, nextPeriod));
  }

  const afterMinutes = timeToMinutes(after);
  const quickOptions =
    afterMinutes === null
      ? []
      : QUICK_DURATIONS.filter((option) => afterMinutes + option.minutes < 24 * 60);

  const cell = (selected) =>
    `rounded-md py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary/40 ${
      selected ? "bg-secondary text-white" : "text-primary hover:bg-secondary/10"
    }`;

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={`flex w-full items-center justify-between rounded-lg border bg-white px-3.5 py-2.5 text-left text-sm outline-none transition focus:border-secondary focus:ring-2 focus:ring-secondary/20 ${
          invalid ? "border-red-300" : "border-primary/15"
        }`}
      >
        <span className={value ? "font-medium text-primary" : "text-primary/35"}>
          {value ? formatTime12h(value) : placeholder}
        </span>
        <svg className="h-4 w-4 text-primary/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M12 7v5l3 2" />
        </svg>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose time"
          className={`absolute left-0 top-full z-30 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-primary/10 bg-white p-4 shadow-luxury ${
            alignRight ? "sm:left-auto sm:right-0" : ""
          }`}
        >
          {quickOptions.length > 0 ? (
            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-primary/50">
                After {formatTime12h(after)}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {quickOptions.map((option) => {
                  const target = minutesTo24h(afterMinutes + option.minutes);
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => {
                        onChange(target);
                        setOpen(false);
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        value === target
                          ? "border-secondary bg-secondary text-white"
                          : "border-primary/15 text-primary hover:border-secondary hover:text-secondary"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <p className="mb-2 text-xs font-medium text-primary/50">Hour</p>
          <div className="mb-4 grid grid-cols-6 gap-1">
            {HOURS.map((option) => (
              <button key={option} type="button" onClick={() => handleHour(option)} className={cell(hour === option)}>
                {option}
              </button>
            ))}
          </div>

          <p className="mb-2 text-xs font-medium text-primary/50">Minute</p>
          <div className="mb-4 grid grid-cols-6 gap-1">
            {MINUTES.map((option) => (
              <button key={option} type="button" onClick={() => handleMinute(option)} className={cell(minute === option)}>
                {String(option).padStart(2, "0")}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-1 rounded-lg border border-primary/15 p-0.5">
              {["AM", "PM"].map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={period === option}
                  onClick={() => handlePeriod(option)}
                  className={`flex-1 rounded-md py-1.5 text-sm font-semibold transition ${
                    period === option ? "bg-primary text-white" : "text-primary/55 hover:text-primary"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
