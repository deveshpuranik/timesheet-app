export const departments = [
  "Housekeeping",
  "HR",
  "IT",
  "Finance",
  "Operations"
];

export const housekeepingWorkTypes = [
  "Room Cleaning",
  "Bathroom Cleaning",
  "Dusting",
  "Floor Mopping",
  "Garbage Disposal",
  "Linen Change",
  "Deep Cleaning"
];

export const genericWorkTypes = [
  "Meeting",
  "Reporting",
  "Development",
  "Analysis",
  "Support Work"
];

export function getWorkTypes(department) {
  return department === "Housekeeping" ? housekeepingWorkTypes : genericWorkTypes;
}

export function calculateHours(fromTime, toTime) {
  if (!fromTime || !toTime) return 0;

  const [fromHour, fromMinute] = fromTime.split(":").map(Number);
  const [toHour, toMinute] = toTime.split(":").map(Number);

  if (
    Number.isNaN(fromHour) ||
    Number.isNaN(fromMinute) ||
    Number.isNaN(toHour) ||
    Number.isNaN(toMinute)
  ) {
    return 0;
  }

  const start = fromHour * 60 + fromMinute;
  const end = toHour * 60 + toMinute;

  if (end <= start) return 0;

  return Number(((end - start) / 60).toFixed(2));
}

export function formatDateForDisplay(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  }).format(new Date(value));
}
