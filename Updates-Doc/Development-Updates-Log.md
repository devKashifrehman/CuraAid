# CuraAid — Development Updates & Logic Documentation

> Session-based changelog covering Backend, Frontend and Database logic implemented
> during this development session. Updated: 25 Sep 2026
>
> **Project root:** `D:\Uni-Records\Fyp-Project`
> **Backend:** Laravel — `\backend` (dev server `http://127.0.0.1:8000`)
> **Frontend:** React (Create React App) — `\Front-End`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database Migrations](#2-database-migrations)
3. [Backend Logic](#3-backend-logic)
4. [Frontend Logic](#4-frontend-logic)
5. [Key Flows (End-to-End)](#5-key-flows-end-to-end)
6. [Fixed Bugs](#6-fixed-bugs)
7. [API Reference Summary](#7-api-reference-summary)
8. [Files Changed](#8-files-changed)

---

## 1. Overview

This session repaired and enhanced the **Appointment ↔ Consultation** workflow of the
CuraAid telemedicine platform. The main work items were:

| # | Area | What was done |
|---|------|---------------|
| 1 | Consultation list | Hide consultations that have been converted into an appointment |
| 2 | Prescription save | Persist the appointment's prescription + diagnosis via the appointments API |
| 3 | Returning patient data | Prefill a new appointment's prescription with the patient's previous prescription/diagnosis |
| 4 | Map coordinates | Auto-geocode doctor & patient locations and return `lat`/`lng` from the API |
| 5 | Examination report | Decouple the examination report from the diagnosis (no more auto-writing diagnosis) |
| 6 | Visit page parity | Appointment visit page now shows consultation data (notes, exam report, diagnosis) immediately |
| 7 | Cache behavior | Appointment list cache now works instantly like Consultations & Prescriptions |
| 8 | Clinical examination | Appointment examination report now feeds the "Clinical & Physical Examination" field of the E-Prescription |
| 9 | Custom time slot | Time picker now supports a free-typed custom time (AM/PM or 24h) |
| 10 | Complaints | "File a Complaint" on appointments now follows the same logic/UI as consultations |
| 11 | Patients Records | Live `/api/doctor/patients` data replaces mock data — including consultation-only patients, avatars, and instant cache-first load (no loader) |
| 12 | Doctor Availability | Set Time replaces mock data with live `/api/doctor/availability` (GET/PUT); set slots flow instantly into Appointments, Consultation revisit, and Virtual Clinic revisit calendar |
| 13 | Public holidays | `isPublicHoliday` (Set Time calendar) no longer hardcodes `2024` — real Pakistan holidays (incl. shifting lunar Eid dates) via new backend proxy `GET /api/public-holidays` |
| 14 | Doctor online status | "Online Now" no longer hardcoded — status now simply reflects **login state** (`token` present → online); avatar shows the doctor's uploaded `profile_image` instead of the `FaUserMd` icon |
| 15 | Default availability | Backend now returns a **default weekly schedule** (Mon/Tue/Wed/Fri 09:00–17:00) for doctors who have never saved one — same shape as the frontend's `buildDefaultSchedule` — so Appointments, Virtual Clinic and Consultation revisit always show usable slots; the doctor can still override it anytime via Set Time (`PUT /api/doctor/availability`) |

---

## 2. Database Migrations

Four new migration files were added under `backend/database/migrations/`.
Run with `php artisan migrate`.

### `2026_09_23_000001_add_reschedule_request_to_consultations_table.php`
- `consultations.reschedule_request` — `json`, nullable (after `active_call`)

### `2026_09_23_000002_add_case_status_to_appointments_table.php`
- `appointments.case_status` — `string(20)`, default `'ongoing'`
- `appointments.follow_up_date` — `date`, nullable
- `appointments.follow_up_time` — `string(5)`, nullable (24h `HH:MM`)

### `2026_09_23_000003_add_recommended_by_consultation_to_appointments_table.php`
- `appointments.recommended_by_consultation_id` — `unsignedBigInteger`, nullable
  (records which consultation created this appointment as a follow-up)

### `2026_09_23_000004_add_prescription_and_conversion_fields.php`
- `appointments.prescription` — `json`, nullable (full prescriptions payload)
- `appointments.diagnosis` — `json`, nullable
- `appointments.lat` / `appointments.lng` — `double`, nullable (appointment-specific override)
- `consultations.converted_to_appointment` — `boolean`, default `false`

---

## 3. Backend Logic

```
backend/app/Http/Controllers/Api/AppointmentController.php
backend/app/Http/Controllers/Api/ConsultationController.php
backend/app/Models/Appointment.php
backend/app/Models/Consultation.php
backend/app/Models/DoctorProfile.php
backend/app/Models/User.php
backend/routes/api.php
```

### 3.1 Consultation list — hide converted consultations
`ConsultationController::index()`
- Filter applied: `$query->where('converted_to_appointment', false)`
- Once a consultation is turned into an appointment it no longer appears in the
  consult list (for both doctor and patient), so it does not duplicate the new case.

### 3.2 Appointment update — save prescription & diagnosis
`AppointmentController::update()`
- `PUT /api/appointments/{id}` accepts `prescription` (JSON) and `diagnosis` (JSON array).
- If `lat`/`lng` are supplied they are stored on the appointment row (used to pin the
  visit map).

### 3.3 Formatting — `formatAppointment()`
Every appointment response now includes:
- `doctor.lat`, `doctor.lng` — resolved/geocoded coordinates of the doctor's clinic
- `patient.lat`, `patient.lng` — resolved/geocoded coordinates of the patient
- `prescription` — previously saved prescription payload (or `null`)
- `diagnosis` — array of diagnoses (or `null`)
- `source_consultation` — the consultation from `recommended_by_consultation_id`
- `previous_prescription` — most recent prior prescription/diagnosis from history
- `case_status`, `revisit`, `revisit_reason`, `follow_up_date`, `follow_up_time`,
  `cancelled_at`, `cancelled_reason`

### 3.4 Geocoding — `resolveCoordinates()`
- Uses **Nominatim** (OpenStreetMap): `https://nominatim.openstreetmap.org/search`
- Parameters: `q=<location>`, `format=json`, `limit=1`, `countrycodes=pk`
- HTTP timeout **4 seconds**; failure is logged and returns `[null, null]`
- **Per-request static cache** prevents duplicate lookups
- If the model (`DoctorProfile` / `User` / `Appointment`) is fillable for `lat`/`lng`,
  the resolved coordinates are **persisted back to the model** (one-time cost)
- Order of location resolution for a doctor:
  `location` → `clinic_address` → `clinic_name` → user `address`

### 3.5 Returning patient data — `getPreviousPrescription()`
Priority chain (most recent first):
1. Previous **appointment** of the same patient that has a `prescription`
2. Previous **consultation** of the same patient (same doctor) with a `prescription`,
   excluding the consultation that recommended this appointment

Returned shape:
```json
{
  "prescription": { "...": "..." },
  "diagnosis": ["..."],
  "source": "appointment" | "consultation",
  "appointment_id": 123 | null,
  "consultation_id": 123 | null
}
```

### 3.6 Schedule appointment from consultation — `scheduleAppointment()`
`POST /api/consultations/{id}/schedule-appointment`
- Validates `appointment_date` (today or later), `appointment_time` (`H:i`), optional `duration`
- **Slot conflict check:** same doctor/date/time + status in `[pending, scheduled, in_progress]`
  → returns 409 "This time slot is already booked"
- Marks the source consultation as `converted_to_appointment = true`,
  status `completed`, case closed; its `follow_up_date/time` are set
- If that consultation was reached **from an appointment** (Clinic linked flow), the
  original appointment is superseded (`completed`, `case_status = completed`)
- Creates the new appointment with carried-over clinical data:
  - `notes` → `data['notes'] ?? consultation->notes`
  - `symptoms` → `consultation->appointment?->symptoms`
  - `examination_report` → built from the consultation (see below)
  - `recommended_by_consultation_id` → source consultation id

### 3.7 Examination report from consultation — `buildExamReportFromConsultation()`
Rebuilds the exam report for the follow-up appointment by combining:
```
[consultation.examination_notes]

Treatment Plan:
[consultation.treatment_plan]
```

### 3.8 Models — fillable additions
- `Appointment`: `case_status`, `follow_up_date`, `follow_up_time`,
  `prescription`, `diagnosis`, `lat`, `lng`, `recommended_by_consultation_id`
- `Consultation`: `converted_to_appointment`, `reschedule_request`
- `DoctorProfile`: `lat`, `lng`
- `User`: `lat`, `lng`

### 3.9 Routing
Relevant routes (`backend/routes/api.php`):
- `GET  /api/appointments`
- `GET  /api/appointments/{id}`
- `PUT  /api/appointments/{id}` — save prescription / diagnosis / lat / lng
- `POST /api/appointments/{id}/complete` — complete or mark revisit
- `GET  /api/consultations` — (converted consultations hidden)
- `POST /api/consultations/{id}/schedule-appointment`
- `POST /api/complaints` — file a complaint (`appointment_id` or `consultation_id`)
- `GET  /api/doctor/patients` — doctor's patients (see 3.10)

### 3.10 Doctor's patients — `myPatients()` rewrite (live data)
`backend/app/Http/Controllers/Api/DoctorController.php`

Previously this endpoint derived patients **only from appointments**, so patients who
had consultations but never sat in an appointment were missing. Now it merges both sources:

- Loads the logged-in doctor's **appointments** (with patient) **and** **consultations** (with patient)
  for their `doctor_profile_id`
- Collects unique `patient_id`s from both collections
- `$consultationCounts` → count of consultations per `patient_id`
- `$consultationDates` → `started_at` per `patient_id`
- **Timeline** per patient is built by merging appointment dates + consultation dates,
  each entry tagged `type` (`Appointment` / `Consultation`) and sorted **date descending**
- Patients that appear **only in consultations** are included (previously dropped)
- `firstVisit` = earliest date, `lastVisit` = latest date across the merged timeline
- New private helper `mapPatientRecord($patient, $appointmentGroup, $consultationCount, $timeline)`
  returns `id`, `name`, `age`, `gender`, `phone`, `email`, `status`, `profile_image`,
  `appointments`, `consultations`, `completedAppointments`, `missedAppointments`,
  `firstVisit`, `lastVisit`, `timeline`
- Response shape: `{ "success": true, "count": N, "data": [...] }`
- Verified via test script: doctor `Nayab` (doctor_profile_id=8) → 2 patients
  (patient 1 = appointments + consultations, patient 14 = **consultation-only**, now visible)

### 3.11 Doctor availability — existing endpoints wired to the UI
`backend/app/Http/Controllers/Api/DoctorController.php` already shipped two endpoints;
this session only consumed them from the frontend (no backend change needed):

- `getAvailability()` — `GET /api/doctor/availability` (auth: doctor)
  - Returns `{ success, weekly_schedule, max_appointments_per_day, is_online }`
  - `weekly_schedule` is the `DoctorProfile.weekly_schedule` JSON column (cast to array)
  - `is_online` = `'online'` / `'offline'` from `DoctorProfile::isOnline()` (backend
    truth; the Set Time status card itself now keys off login state instead — see 4.10)
- `updateAvailability()` — `PUT /api/doctor/availability`
  - Validates `weekly_schedule` (required array) + optional `max_appointments_per_day`
    (`int`, `min:1`, `max:50`)
  - Persists and returns the saved schedule
- `getDoctorById($id)` — public `GET /api/doctors/{id}` already returns the full
  `DoctorProfile` model, so its `weekly_schedule` cast array is **included** in the JSON —
  used by Appointments `AvailableSlotsDisplay` to show each appointment's doctor's
  real availability
- Verified via test scripts (PUT→GET round-trip HTTP 200, schedule keys
  `monday…sunday`, `max_appointments_per_day` persisted; profile 1 & 8 have schedules,
  profile 2 had none because it was never saved — as expected)

### 3.13 Default weekly schedule — backend always returns usable slots
`backend/app/Models/DoctorProfile.php` + `backend/app/Http/Controllers/Api/DoctorController.php`
- Added `DoctorProfile::DEFAULT_WEEKLY_SCHEDULE` constant — the exact same 7-day shape
  as the frontend's `buildDefaultSchedule` (Mon/Tue/Wed/Fri 09:00–17:00 available,
  Thu/Sat/Sun disabled/empty)
- Added helper `weeklyScheduleOrDefault(): array` — returns the doctor's saved
  `weekly_schedule` when set, otherwise the constant default
- `getAvailability()` (`GET /api/doctor/availability`) now returns
  `weeklyScheduleOrDefault()` instead of the raw (possibly `null`) column — a doctor
  who never opened Set Time still gets the default schedule back
- `getDoctorById($id)` (public `GET /api/doctors/{id}`) now serializes the model and
  injects `weekly_schedule` via `weeklyScheduleOrDefault()` — so Appointments
  `AvailableSlotsDisplay`, Virtual Clinic and Consultation revisit all show usable
  default slots even before the doctor customizes anything
- **Doctor can still change it anytime**: Set Time → save → `PUT /api/doctor/availability`
  persists their own schedule, which then takes precedence (helper returns the saved
  value). No data was written to any existing row — the default is applied at read time
- Verified against live API: `GET /api/doctors/2` (Dr. Ayesha, `weekly_schedule` = NULL
  in DB) → HTTP 200 with default `monday 09:00–17:00`; `GET /api/doctor/availability`
  (doctor2 token) → default schedule returned

### 3.12 Pakistan public holidays proxy — `publicHolidays()`
`backend/app/Http/Controllers/Api/DoctorController.php` + `routes/api.php`

- New public endpoint `GET /api/public-holidays?year=YYYY` (no auth; defaults to
  current year)
- Fetches Google Calendar's public **"Pakistan holidays"** iCal feed
  (`en.pk%23holiday@group.v.calendar.google.com`), extracts `DTSTART;VALUE=DATE`
  entries for the requested year — this includes the **lunar Eid dates that shift
  every year** (Eid-ul-Fitr ≈ 20–23 Mar 2026, Eid-ul-Adha ≈ 27–29 May 2026, Ashura
  25–26 Jun 2026), not just fixed national days
- `Http::timeout(10)` fetch (no CORS issue server-side); results cached per year
  for 24h via `cache()->put()`
- Fallback: fixed national holidays always merged in
  (`01-01`, `02-05`, `03-23`, `05-01`, `08-14`, `11-09`, `12-25`)
- Response: `{ success, year, data: ["YYYY-MM-DD", …] }` — verified live:
  Year 2026 → 43 dates incl. Eid windows
- Note: Nager.Date was evaluated first but **doesn't support Pakistan (PK)** — every
  year returned HTTP 204; Google Calendar iCal has no CORS header, hence the backend
  proxy

---

## 4. Frontend Logic

```
Front-End/src/Profile/Appointment/Appointments.jsx
Front-End/src/Profile/Appointment/Appointments.css
Front-End/src/Profile/Consultations/Consultation.jsx
Front-End/src/Profile/Consultations/Consultation.css
Front-End/src/Profile/EPrescription/eprescriptionData.js
Front-End/src/Profile/PrescriptionRecords/Prescription.jsx
Front-End/src/Profile/PatientsRecords/Patients.jsx
Front-End/src/Profile/PatientsRecords/Patients.css
Front-End/src/Profile/SetTime/availability.jsx
Front-End/src/Profile/SetTime/availability.css
Front-End/src/DoctorFinder/VirtualClinic/Clinic.jsx
Front-End/src/DoctorFinder/VirtualClinic/Clinic.css
Front-End/src/utils/availability.js          ← new shared availability utility
```

### 4.1 Cache — instant first paint (Appointments)
**Root cause found:** `AuthContext.normalizeUser()` stores the user id as `Id`
(capital I). Lowercase `user.id` was always `undefined`, so:
- reads used `appointments_data_undefined`
- writes used `appointments_data_guest`

**Fix:** every cache key/dependency now uses the same pattern as Consultations:
```js
const appointmentUserKey = user?.id ?? user?.Id ?? "guest";
```
- Initial render loads cached rows from `appointments_data_${appointmentUserKey}`
- API fetch **always overwrites** state + cache (including an empty array), so stale
  cache never lingers and "No appointments" shows correctly
- `visibilitychange` refetches on tab focus
- The selected/visit panel re-syncs when fetched data differs (`notes`, `diagnosis`,
  `symptoms`, `examinationReport`, etc.)

### 4.2 Visit page — consultation data shown immediately
The appointment visit panel renders patient-entered/consultation data directly:
- `notes` ← `a.notes || a.source_consultation?.notes`
- `symptoms` ← `a.symptoms?.length ? a.symptoms : []`
- `examinationReport` ← `a.examination_report` or built from
  `source_consultation.examination_notes + treatment_plan`
- `diagnosis` ← `a.diagnosis || a.source_consultation?.diagnosis`
- `prescription` ← carried from `source_consultation` / `previous_prescription` /
  existing appointment data
- Added **read-only Diagnosis** and **Examination Report** sections; the exam report
  editor stays hidden while the doctor is editing the prescription (Active case)

### 4.3 E-Prescription — clinical examination auto-fill
`buildAppointmentRxData()`
- `clinicalExamination` priority:
  1. existing `prescriptionData.clinicalExamination`
  2. `apt.examinationReport` (the appointment's exam report) ← **new**
  3. `sourceRx.clinicalExamination` (from source consultation)

`saveExaminationReport()` (Appointments):
- On **Save Report**, the in-memory `prescriptionData.clinicalExamination` is updated
  with the report text, so an open E-Prescription editor reflects it immediately
- The saved examination report is trimmed before display and API write
- When the doctor clicks **Update Prescription** the Clinical & Physical Examination
  field is pre-filled from the exam report automatically

### 4.4 Custom time slot (Time Picker)
- New **"Custom Time"** button at the end of the slot grid (`TimePicker` component)
- Clicking it reveals a text input; accepts:
  - `HH:MM` 24h (e.g., `19:30`)
  - `H:MM AM/PM` (e.g., `7:30 AM`)
- `normalizeTimeValue()` converts any accepted input to canonical `HH:MM` (24h),
  matching the preset slot format, so everything downstream just works:
  - `submitRevisit()` saves the exact chosen time as `follow_up_time`
  - display via `to12hLabel()` (e.g., `19:30` → `07:30 PM`)
  - `parseTimeToMinutes()` computes the Active window correctly (`max:5` backend rule)
- Invalid input shows an inline error; Enter key applies the value
- Applies everywhere the picker is used: **Complete with Revisit**, patient reschedule,
  and doctor date/time edit

### 4.5 Complaint on appointments (mirrors consultations)
`canFileComplaint()` — same rules as consultations' `canFileReport()`:
| Status            | Complaint available? |
|-------------------|----------------------|
| `Active` / `Ongoing` | Yes, always          |
| `Completed` / `Cancelled` | Yes, **same calendar day** only |
| Otherwise         | No                   |

- Button UI now matches consultations: red "File a Complaint" button + helper hint
  ("Something went wrong? Report it to our review team.")
- Modal sends `appointment_id` to `POST /api/complaints` (front-end already supports it)
- Success toast shown after submit

### 4.6 Mapper additions (`mapBackendAppointment`)
- `completedAt` ← `a.updated_at` or `a.cancelled_at` (timestamp) so the same-day
  complaint window survives page reloads
- `previousPrescription` ← `a.previous_prescription`
- `sourceConsultation` ← `a.source_consultation`

### 4.7 Patients Records — live data, instant load (`Patients.jsx`)
`Front-End/src/Profile/PatientsRecords/Patients.jsx` — previously used mock data;
now fully backed by `GET /api/doctor/patients` (see 3.10).

- **API fetch** with `Authorization: Bearer <token>`; response `data` array mapped via
  `mapBackendPatient()` (timeline entries get icons: `Appointment` / `Consultation` /
  `firstVisit`)
- **Avatar resolution** (`resolveProfileImage`): uses the patient's `profile_image`,
  falls back to `/storage/...` paths, else an inline SVG placeholder
- **Date formatting**: `formatDate` → `en-GB` "12 Jun 2026"; `titleCase` for names
- **Summary cards** now computed from live data: total patients, total appointments,
  total consultations, repeat patients
- **Cache-first instant paint** — same pattern as Consultations/Prescriptions:
  - cache key `patients_data_${userKey}` in `localStorage`
  - `readPatientsCache()` seeds state on mount → **no loader flash**, data paints instantly
  - background refetch on mount + `visibilitychange`, overwrites state **and** cache
  - userKey uses `user?.id ?? user?.Id ?? "guest"` (handles `AuthContext`'s capital `Id`)
- **No loader spinner** — first visit renders the empty state ("No patients records")
  immediately, then live data replaces it the instant the API responds (exactly like
  the Consultations list; `FaSpinner`/"Loading patients..." removed)
- **Empty states**: "No patients records" (no data at all), "No patients found" (search
  miss), "No visit history yet" (patient timeline empty)
- List shows 5 then "Show all" (`visible` slice); patient select opens the detail panel
  (Overview tab with timeline)
- `Patients.css`: loading spinner styles removed; summary/detail/layout styles retained

### 4.8 Doctor availability — Set Time + live slots everywhere
**New shared utility** `Front-End/src/utils/availability.js` (single source of truth for
schedule math used by all four screens):
- `normalizeWeeklySchedule(raw)` — coerces any backend/legacy shape into
  `{ monday: { enabled, slots: [{ id, start, end, type }] }, … sunday }`, defaulting to
  `Mon/Tue/Wed/Fri 09:00–17:00` enabled (falls back when `weekly_schedule` is `null`)
- `dayKeyFromDate(date)` — `YYYY-MM-DD` → weekday key (`monday`…`sunday`)
- `windowsForDate(schedule, date)` — list of `[startMin, endMin]` windows for that day
- `filterSlotsByWindows(slots, windows)` — keeps only 30-min presets inside a window
- `weeklyScheduleEntries(schedule)` — `[{ day, start, end }]` flat list for strip UIs
- `toMinutes("HH:MM")`, `isInWindows`, `availabilityCacheKey`
- `readAvailabilityCache(key)` / `writeAvailabilityCache(key, schedule)` /
  `clearAvailabilityCache(key)` — `localStorage` (key prefix
  `doctor_availability_${userKey}`); all authors use `user?.id ?? user?.Id ?? "guest"`

**SetTime page** (`Front-End/src/Profile/SetTime/availability.jsx`) — mock → live:
- State seeded **cache-first**: `normalizeWeeklySchedule(readAvailabilityCache(userKey) ||
  buildDefaultSchedule())` → instant paint like Consultations
- Fetch `GET /api/doctor/availability` on mount + `visibilitychange`; response writes
  cache; `loading` only true when no cache exists yet
- **Real current dates**: hardcoded `2024` month/year/year-grid replaced with
  `new Date()` (current week's Monday start)
- Save → `PUT /api/doctor/availability` with `{ weekly_schedule, max_appointments_per_day }`;
  success popup + cache write; failure inline `saveError`
- Save button shows `FaSpinner` "Loading…" while in flight (`saveInFlight` ref guard)
- `availability.css`: `.avail-content-loading` overlay, `.avail-spin-icon` /
  `@keyframes availSpin`, `.avail-save-error`

**Appointments** (`Front-End/src/Profile/Appointment/Appointments.jsx`) —
`AvailableSlotsDisplay` was hardcoded (3 static slot ranges); now real:
- New state `doctorSchedule` derived from the **selected appointment's** `doctorProfileId`
  (mapper sets it from `doctor.id`)
- Cache-first read then public `GET /api/doctors/${doctorProfileId}`
  (`weekly_schedule` from full model JSON) — per-doctor cache key
- `weeklyScheduleEntries(normalizeWeeklySchedule(...))` renders actual day/time chips;
  empty state "No availability set — contact the doctor"
- All 4 call sites (pending-approval banner, reschedule suggestion, reschedule popup,
  revisit popup) pass `weeklySchedule={doctorSchedule}`
- `Appointments.css`: `.apt-available-slot-empty` (+ dark variant)

**Virtual Clinic** (`Front-End/src/DoctorFinder/VirtualClinic/Clinic.jsx`) — revisit
calendar slots now real:
- Doctor's `weeklySchedule` state seeded from cache; `GET /api/doctor/availability`
  keeps it fresh (same cache-first pattern)
- Calendar days with **no configured window** are greyed/disabled (`.cli-day-unavailable`,
  `disabled` attr); clicking them does nothing
- `availableTimeSlots = filterSlotsByWindows(timeSlots, windowsForDate(weeklySchedule,
  selectedDate))` — only the doctor's real windows render; changing date/week resets
  stale `selectedTime`/custom time
- If the chosen day has no windows → inline "Doctor is not available on this day" message
- `generateTimeSlots` static 30-min grid is untouched — it's just filtered now

**Consultations** (`Front-End/src/Profile/Consultations/Consultation.jsx`) — revisit popup:
- Doctor-only **availability strip** under the reason textarea: "Your Available Time"
  chips from `weeklyScheduleEntries` (cache-first + `/api/doctor/availability` fetch)
- Empty hint nudges: "set it in Set Time"; `Consultation.css`:
  `.consult-availability-strip*`

### 4.9 Public holidays on the Set Time calendar (no more hardcoded 2024)
`Front-End/src/Profile/SetTime/availability.jsx`
- `isPublicHoliday()` previously checked a hardcoded `Set(["2024-01-01", "2024-12-25"])`
- Now backed by a `publicHolidays` Set seeded **cache-first** from
  `localStorage` (`public_holidays_PK_${year}`) with fixed national holidays as the
  instant fallback
- Fetch effect (`GET /api/public-holidays?year=…`, see 3.12) merges real dates,
  writes cache; on year navigate the set resets to that year's fallback so the
  previous year's Eid dates never leak in
- Year tracked via `viewedYear` (monthly view follows `currentMonth` across year
  boundaries; weekly/yearly use `currentYear`)
- Marked holiday cells keep the existing `avail-dot-holiday` /
  `avail-yearly-day-holiday` styles — only the data source changed

### 4.10 Doctor Status card — login-based status + real avatar
`Front-End/src/Profile/SetTime/availability.jsx` (+ `availability.css`)
- **Status**: `doctorStatus` was `useState("online")` (static mock); it is now derived
  directly from login: `const doctorStatus = token && userKey !== "guest" ? "online" : "offline"` —
  logged in ⇒ "Online Now" / "Available for Consultation", logged out ⇒ "Offline" /
  "Login to go online". No fetch, no cache, always correct for the session
  (an earlier `isOnline()`-based attempt was dropped because it reported Offline
  for a logged-in doctor)
- **Avatar**: the `FaUserMd` placeholder icon is replaced by the doctor's uploaded
  avatar — `<img src={user.PhotoUrl}>` (AuthContext `normalizeUser()` already resolves
  `profile_image` to a full `/storage/...` URL, with an SVG placeholder fallback);
  `FaUserMd` remains only when `PhotoUrl` is absent (guest)
- `availability.css`: `.avail-doctor-avatar-img` (74×74, circular, `object-fit: cover`
  — fits inside the themed `.avail-avatar-wrapper` ring)

---

## 5. Key Flows (End-to-End)

### 5.1 Consultation → Appointment (follow-up)
```
Active Consultation
   └─ Doctor clicks "Schedule Appointment" (POST schedule-appointment)
        ├─ slot conflict check (409 if booked)
        ├─ consultation marked completed + converted_to_appointment = true
        ├─ original linked appointment superseded (completed)
        └─ new appointment (In Progress) created carrying:
             notes, symptoms, examination_report (built), prescription chain
   └─ Consultation disappears from consult list (filtered)
   └─ New appointment visit page shows exam report + diagnosis immediately
```

### 5.2 Prescription save on an appointment
```
Doctor opens appointment → Update Prescription
   └─ buildAppointmentRxData() prefills (patient history + source consultation)
        → edits medicines, diagnosis, clinical examination
   └─ clicks Update
        └─ PUT /api/appointments/{id}
             { prescription: {...}, diagnosis: [...] }
        └─ local state + cache updated instantly (optimistic)
```

### 5.3 Complete with Revisit
```
Doctor clicks "Complete with Revisit"
   └─ popup: reason + follow-up date + time (preset slots OR Custom Time)
   └─ Submit & Complete
        └─ POST /api/appointments/{id}/complete
             { revisit: true, revisit_reason, follow_up_date, follow_up_time }
        └─ status → Ongoing, case_status → revisit
        └─ linked consultation synced (status/case/revisit/follow-up)
   └─ follow-up slot drives the Active window via getSlotDateTime()
```

### 5.4 File a complaint
```
Doctor or Patient on appointment/consultation detail
   └─ File a Complaint (active/ongoing always; completed/cancelled same-day)
        └─ ComplaintModal → POST /api/complaints
             { category, priority, description, proof, appointment_id|consultation_id }
   └─ success toast
```

### 5.5 Doctor sets availability → slots reflect everywhere
```
Doctor opens Set Time
   └─ schedule painted instantly from cache (or default)
   └─ toggle days / edit time windows → Save
        └─ PUT /api/doctor/availability → cache write + success popup
   └─ Appointments: AvailableSlotsDisplay shows this schedule per doctor
   └─ Consultation revisit popup: "Your Available Time" strip shows it
   └─ Virtual Clinic revisit calendar: only these dates/times are bookable
```

---

## 6. Fixed Bugs

| Bug | Cause | Fix |
|-----|-------|-----|
| Appointment list showed "No appointments" for a few seconds | Cache key used `user.id` but `AuthContext` normalizes user id as `Id` (capital) | Use `user?.id ?? user?.Id ?? "guest"` for read + write + effect deps |
| Stale cache never cleared when backend had no data | Fetch skipped overwrite when `fetched.length > 0` guard existed | Always `setData` + rewrite cache, incl. empty array |
| Appointment visit page blank for a few seconds | Same cache-key bug; no `visibilitychange` refetch | Key fix + refetch on tab focus + selected-panel resync |
| Complaint button disappeared after page reload for completed/cancelled items | `completedAt` only set locally, not from API | Mapper now derives `completedAt` from `updated_at` / `cancelled_at` |
| Examination report overwrote diagnosis | Previous logic summarized report into diagnosis | Removed diagnosis coupling; report now feeds `clinicalExamination` only |
| Time picker allowed only 30-minute presets in revisit | Fixed slot grid only | Added "Custom Time" free input (`AM/PM` or `24h`) |

---

## 7. API Reference Summary

| Method | Endpoint | Payload (relevant) | Notes |
|--------|----------|--------------------|-------|
| `GET` | `/api/appointments` | — | List with geocoded lat/lng + prescription history |
| `PUT` | `/api/appointments/{id}` | `prescription`, `diagnosis`, `lat`, `lng`, `notes`, `examination_report` | Saves appointment clinical data |
| `POST` | `/api/appointments/{id}/complete` | `revisit`, `revisit_reason`, `follow_up_date`, `follow_up_time` | Complete / keep open with revisit |
| `GET` | `/api/consultations` | — | Converted consultations filtered out |
| `POST` | `/api/consultations/{id}/schedule-appointment` | `appointment_date`, `appointment_time`, `duration?`, `notes?` | Creates follow-up appointment |
| `POST` | `/api/complaints` | `category`, `priority`, `description`, `proof?`, `appointment_id`/`consultation_id` | Files a complaint |
| `GET` | `/api/doctor/patients` | — (auth: doctor) | Doctor's patients from appointments + consultations |
| `GET` | `/api/doctor/availability` | — (auth: doctor) | Doctor's `weekly_schedule` + `max_appointments_per_day` (returns default schedule if none saved) |
| `PUT` | `/api/doctor/availability` | `weekly_schedule` (array), `max_appointments_per_day?` | Saves doctor availability (doctor's own schedule then wins over default) |
| `GET` | `/api/doctors/{id}` | — (public) | Full doctor profile incl. `weekly_schedule` (default when none saved; used for slot display) |
| `GET` | `/api/public-holidays` | `year?` (e.g. `2026`) | Pakistan holidays via Google iCal proxy (incl. Eid) |

---

## 8. Files Changed

**Backend**
- `backend/app/Http/Controllers/Api/AppointmentController.php`
- `backend/app/Http/Controllers/Api/ConsultationController.php`
- `backend/app/Http/Controllers/Api/DoctorController.php`  ← `myPatients()` rewrite + `publicHolidays()` proxy + default schedule fallback (3.13)
- `backend/app/Models/Appointment.php`
- `backend/app/Models/Consultation.php`
- `backend/app/Models/DoctorProfile.php`  ← `DEFAULT_WEEKLY_SCHEDULE` const + `weeklyScheduleOrDefault()` (3.13)
- `backend/app/Models/User.php`
- `backend/routes/api.php`
- `backend/database/migrations/2026_09_23_000001_*`
- `backend/database/migrations/2026_09_23_000002_*`
- `backend/database/migrations/2026_09_23_000003_*`
- `backend/database/migrations/2026_09_23_000004_*`

**Frontend**
- `Front-End/src/Profile/Appointment/Appointments.jsx`
- `Front-End/src/Profile/Appointment/Appointments.css`
- `Front-End/src/Profile/Consultations/Consultation.jsx`
- `Front-End/src/Profile/Consultations/Consultation.css`
- `Front-End/src/Profile/EPrescription/eprescriptionData.js`
- `Front-End/src/Profile/PrescriptionRecords/Prescription.jsx`
- `Front-End/src/Profile/PatientsRecords/Patients.jsx`  ← live-data rewrite
- `Front-End/src/Profile/PatientsRecords/Patients.css`  ← spinner removed
- `Front-End/src/Profile/SetTime/availability.jsx`      ← live API + real dates
- `Front-End/src/Profile/SetTime/availability.css`      ← loading / error styles
- `Front-End/src/DoctorFinder/VirtualClinic/Clinic.jsx` ← real slots + greyed days
- `Front-End/src/DoctorFinder/VirtualClinic/Clinic.css` ← `.cli-day-unavailable`
- `Front-End/src/utils/availability.js`                 ← NEW shared utility
- `Front-End/src/Profile/SetTime/availability.jsx`      ← real public holidays (4.9)

**Docs**
- `Updates-Doc/Development-Updates-Log.md` (this file)