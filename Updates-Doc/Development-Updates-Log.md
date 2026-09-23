# CuraAid — Development Updates & Logic Documentation

> Session-based changelog covering Backend, Frontend and Database logic implemented
> during this development session. Updated: 23 Sep 2026
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

---

## 4. Frontend Logic

```
Front-End/src/Profile/Appointment/Appointments.jsx
Front-End/src/Profile/Appointment/Appointments.css
Front-End/src/Profile/Consultations/Consultation.jsx
Front-End/src/Profile/EPrescription/eprescriptionData.js
Front-End/src/Profile/PrescriptionRecords/Prescription.jsx
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

---

## 8. Files Changed

**Backend**
- `backend/app/Http/Controllers/Api/AppointmentController.php`
- `backend/app/Http/Controllers/Api/ConsultationController.php`
- `backend/app/Models/Appointment.php`
- `backend/app/Models/Consultation.php`
- `backend/app/Models/DoctorProfile.php`
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

**Docs**
- `Updates-Doc/Development-Updates-Log.md` (this file)