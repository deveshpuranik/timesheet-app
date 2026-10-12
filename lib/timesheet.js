// Shared, dependency-free helpers used by both the browser and the server.

export const APP_TIMEZONE = "Asia/Kolkata";

export const DEPT_IT = "IT - Marketing - Business Analysis";
export const DEPT_FINANCE = "Finance and Accounting";

export const departments = [
  "Housekeeping",
  "HR",
  DEPT_IT,
  DEPT_FINANCE,
  "Operations"
];

// Old department names that may still be stored on earlier records.
export const legacyDepartmentNames = {
  IT: DEPT_IT,
  Finance: DEPT_FINANCE
};

export function normalizeDepartment(value) {
  if (!value) return "";
  return legacyDepartmentNames[value] || value;
}

export const housekeepingWorkTypes = [
  // Core Cleaning
  "Room Cleaning",
  "Bathroom Cleaning",
  "Dusting",
  "Floor Sweeping & Mopping",
  "Deep Cleaning",

  // Linen & Waste
  "Linen Change",
  "Garbage Disposal",
  "Waste Collection & Segregation",
  "Soiled Linen to Laundry",
  "Fresh Linen from Laundry",

  // Outdoor / Public Area
  "Outdoor Area Cleaning",
  "Lawn & Pathway Cleaning",
  "Public Area Inspection",
  "Outdoor Furniture Cleaning",

  // Special Services
  "Turndown Service",
  "Evening Room Setup"
];

export const financeWorkTypes = [
  "Accounting",
  "Banking",
  "Payments",
  "Cash Handling",
  "Tally",
  "Documentation",
  "Support Work",
  "Other"
];

export const itWorkTypes = [
  // IT
  "Development",
  "Hardware & Software Repair and Maintenance",
  "Website",
  "HMS",
  "Network & Internet",
  "CCTV & Security Systems",
  "IT Support & Troubleshooting",
  "Data Backup & Security",

  // Marketing
  "Social Media & Content",
  "Digital Marketing & Campaigns",
  "Graphic Design",
  "Photography & Videography",

  // Business analysis
  "Analysis",
  "Reporting & MIS",
  "Research",

  // General
  "Documentation",
  "Vendor Coordination",
  "Meeting",
  "Training",
  "Other"
];

export const genericWorkTypes = [
  "Meeting",
  "Reporting",
  "Development",
  "Analysis",
  "Support Work"
];

export function getWorkTypes(department) {
  switch (normalizeDepartment(department)) {
    case "Housekeeping":
      return housekeepingWorkTypes;
    case DEPT_FINANCE:
      return financeWorkTypes;
    case DEPT_IT:
      return itWorkTypes;
    default:
      return genericWorkTypes;
  }
}

// ─── Time ────────────────────────────────────────────────────────────────────

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidTime(value) {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

// "HH:MM" (24h) → minutes since midnight, or null when invalid.
export function timeToMinutes(value) {
  if (!isValidTime(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

export function calculateHours(fromTime, toTime) {
  const start = timeToMinutes(fromTime);
  const end = timeToMinutes(toTime);
  if (start === null || end === null || end <= start) return 0;
  return Number(((end - start) / 60).toFixed(2));
}

// "14:30" → "2:30 PM"
export function formatTime12h(value) {
  const minutes = timeToMinutes(value);
  if (minutes === null) return value || "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export function to24h(hour12, minute, period) {
  let h = Number(hour12) % 12;
  if (period === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function to12hParts(value) {
  const minutes = timeToMinutes(value);
  if (minutes === null) return null;
  const h = Math.floor(minutes / 60);
  return {
    hour: h % 12 === 0 ? 12 : h % 12,
    minute: minutes % 60,
    period: h >= 12 ? "PM" : "AM"
  };
}

/**
 * Picks AM or PM for a clock time the user tapped, so they rarely need the toggle.
 *  - With `afterTime` (the entry's From time) it returns whichever period puts the
 *    time later than From: after 10:00 AM, tapping 2:00 means 2:00 PM.
 *  - Without it, it assumes a normal working day: 6–11 is morning, 12 and 1–5 afternoon.
 */
export function smartPeriod(hour12, minute, afterTime) {
  const base = (Number(hour12) % 12) * 60 + Number(minute);
  const after = timeToMinutes(afterTime);

  if (after !== null) {
    if (base > after) return "AM";
    return "PM";
  }

  const h = Number(hour12);
  return h >= 6 && h <= 11 ? "AM" : "PM";
}

// True when two [from, to) ranges on the same day share any time.
export function timesOverlap(aFrom, aTo, bFrom, bTo) {
  const a1 = timeToMinutes(aFrom);
  const a2 = timeToMinutes(aTo);
  const b1 = timeToMinutes(bFrom);
  const b2 = timeToMinutes(bTo);
  if ([a1, a2, b1, b2].includes(null)) return false;
  return a1 < b2 && b1 < a2;
}

// ─── Dates ───────────────────────────────────────────────────────────────────
// Work dates are stored as midnight UTC of the calendar day and always handled
// as "YYYY-MM-DD" keys, so they never shift with the viewer's or server's timezone.

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value) {
  if (typeof value !== "string" || !DATE_KEY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function dateKeyToDate(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateKey(value) {
  if (!value) return "";
  if (typeof value === "string" && DATE_KEY_PATTERN.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

// Today's calendar date at the resort (India), wherever the code is running.
export function todayKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

export function addDays(dateKey, days) {
  const date = dateKeyToDate(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// Inclusive number of calendar days between two date keys.
export function daysBetween(fromKey, toKey) {
  return Math.round((dateKeyToDate(toKey) - dateKeyToDate(fromKey)) / 86400000) + 1;
}

export function startOfMonth(dateKey) {
  return `${dateKey.slice(0, 7)}-01`;
}

export function endOfMonth(dateKey) {
  const date = dateKeyToDate(startOfMonth(dateKey));
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return date.toISOString().slice(0, 10);
}

// Monday of the week containing the date.
export function startOfWeek(dateKey) {
  const day = dateKeyToDate(dateKey).getUTCDay();
  return addDays(dateKey, day === 0 ? -6 : 1 - day);
}

export function formatDateForDisplay(value) {
  const key = toDateKey(value);
  if (!key) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(dateKeyToDate(key));
}

export function formatDayShort(value) {
  const key = toDateKey(value);
  if (!key) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(dateKeyToDate(key));
}

export function formatHours(value) {
  const number = Number(value || 0);
  return number.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
}

// ─── Leave ───────────────────────────────────────────────────────────────────

export const leaveTypes = [
  "Casual Leave",
  "Sick Leave",
  "Earned Leave",
  "Unpaid Leave",
  "Emergency Leave",
  "Other"
];

export const roles = ["employee", "supervisor", "admin"];
