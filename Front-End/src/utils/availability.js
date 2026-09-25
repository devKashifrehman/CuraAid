// Shared doctor-availability helpers used by SetTime, Appointments,
// Consultations and Virtual Clinic. The weekly_schedule shape is:
// {
//   monday:   { enabled: true,  slots: [{ id, start, end, type }] },
//   tuesday:  { enabled: false, slots: [] },
//   ...
// }
// slot.type: "available" | "break" (matches what SetTime saves to the backend).

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const EMPTY_DAY = { enabled: false, slots: [] };

// Map a "YYYY-MM-DD" (or Date) to the day key.
export const dayKeyFromDate = (val) => {
  const d = val instanceof Date ? val : new Date(`${val}T00:00:00`);
  if (isNaN(d.getTime())) return null;
  return DAY_KEYS[(d.getDay() + 6) % 7]; // Monday-first
};

// Ensure every day key exists; fill gaps with disabled empty days.
export const normalizeWeeklySchedule = (schedule) => {
  const base = {};
  DAY_KEYS.forEach((k) => {
    const day = schedule && schedule[k];
    base[k] = day
      ? {
          enabled: !!day.enabled,
          slots: Array.isArray(day.slots)
            ? day.slots.map((s) => ({
                id: s.id ?? Date.now(),
                start: s.start || "09:00",
                end: s.end || "17:00",
                type: s.type || "available",
              }))
            : [],
        }
      : { ...EMPTY_DAY, slots: [] };
  });
  return base;
};

export const isDayEnabled = (schedule, dayKey) =>
  !!(schedule && schedule[dayKey] && schedule[dayKey].enabled);

// Available [start,end) time windows for a given date, ignoring break slots.
export const windowsForDate = (schedule, dateVal) => {
  const key = dayKeyFromDate(dateVal);
  if (!key || !schedule || !schedule[key] || !schedule[key].enabled) return [];
  return (schedule[key].slots || [])
    .filter((s) => s.type !== "break")
    .map((s) => ({ start: s.start || "09:00", end: s.end || "17:00" }));
};

export const toMinutes = (hhmm) => {
  if (!hhmm || !String(hhmm).includes(":")) return NaN;
  const [h, m] = String(hhmm).split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return NaN;
  return h * 60 + m;
};

// Does timeValue (HH:MM) fall inside any of the windows (HH:MM)?
export const isInWindows = (timeValue, windows) => {
  const mins = toMinutes(timeValue);
  if (Number.isNaN(mins)) return false;
  return windows.some((w) => {
    const s = toMinutes(w.start);
    const e = toMinutes(w.end);
    if (Number.isNaN(s) || Number.isNaN(e)) return false;
    return mins >= s && mins < e;
  });
};

// Keep only the slots whose value (HH:MM) lies within the available windows.
export const filterSlotsByWindows = (slots, windows) => {
  if (!windows.length) return slots;
  return slots.filter((s) => isInWindows(s.value, windows));
};

// Build a display list of "Mon 09:00 - 17:00" style entries for a schedule.
export const weeklyScheduleEntries = (schedule) => {
  const entries = [];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  DAY_KEYS.forEach((k, i) => {
    const day = schedule && schedule[k];
    if (!day || !day.enabled) return;
    (day.slots || []).forEach((s) => {
      if (s.type === "break") return;
      entries.push({
        day: labels[i],
        dayKey: k,
        start: s.start || "09:00",
        end: s.end || "17:00",
      });
    });
  });
  return entries;
};

// ---------------- Cache (instant first paint, like Consultations) ----------------
export const availabilityCacheKey = (userKey) => `doctor_availability_${userKey}`;

export const readAvailabilityCache = (userKey) => {
  try {
    const raw = localStorage.getItem(availabilityCacheKey(userKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

export const writeAvailabilityCache = (userKey, schedule) => {
  try {
    localStorage.setItem(
      availabilityCacheKey(userKey),
      JSON.stringify(schedule),
    );
  } catch {}
};

export const clearAvailabilityCache = (userKey) => {
  try {
    localStorage.removeItem(availabilityCacheKey(userKey));
  } catch {}
};