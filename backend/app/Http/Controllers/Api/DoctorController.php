<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Appointment;
use App\Models\Consultation;
use App\Models\DoctorProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Validator;

class DoctorController extends Controller
{
    /**
     * Submit doctor verification documents (creates the doctor profile).
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated user.',
            ], 401);
        }

        if ($user->doctorProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile already submitted.',
            ], 409);
        }

        $request->validate([
            'pmdc_number' => 'required|string|max:255|unique:doctor_profiles,pmdc_number',
            'license_expiry' => 'required|date',
            'license_image' => 'required|image|mimes:jpg,jpeg,png|max:5120',
            'qualifications' => 'required|json',
            'specialties' => 'required|json',
            'experiences' => 'required|json',
            'cnic_document' => 'required|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ]);

        $licenseImage = $request->file('license_image')->store('doctor/licenses', 'public');
        $cnicDocument = $request->file('cnic_document')->store('doctor/cnic', 'public');

        $qualifications = json_decode($request->qualifications, true) ?? [];
        $specialties = json_decode($request->specialties, true) ?? [];
        $experiences = json_decode($request->experiences, true) ?? [];

        foreach ($qualifications as $index => &$qualification) {
            if ($request->hasFile("qualificationImage_{$index}")) {
                $qualification['image'] = $request->file("qualificationImage_{$index}")
                    ->store('doctor/qualifications', 'public');
            }
        }

        foreach ($experiences as $index => &$experience) {
            if ($request->hasFile("experienceCertificate_{$index}")) {
                $experience['certificate'] = $request->file("experienceCertificate_{$index}")
                    ->store('doctor/experience-certificates', 'public');
            }
        }

        $doctorProfile = DoctorProfile::create([
            'user_id' => $user->id,
            'pmdc_number' => $request->pmdc_number,
            'license_expiry' => $request->license_expiry,
            'license_image' => $licenseImage,
            'qualifications' => $qualifications,
            'specialties' => $specialties,
            'experiences' => $experiences,
            'cnic_document' => $cnicDocument,
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Doctor profile submitted successfully',
            'user_id' => $user->id,
            'doctor_profile' => $doctorProfile,
        ], 201);
    }

    /**
     * Get the doctor profile of the logged-in doctor.
     */
    public function show(Request $request)
    {
        $user = $request->user();
        $doctorProfile = $user?->doctorProfile()->with('user')->first();

        if (!$doctorProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'doctor_profile' => $doctorProfile,
        ]);
    }

    /**
     * Update the logged-in doctor's own profile.
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $doctorProfile = DoctorProfile::find($id);

        if (!$doctorProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found',
            ], 404);
        }

        if (!$user || $doctorProfile->user_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'experience_years' => 'nullable|integer|min:0',
            'location' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:30',
            'email' => 'nullable|email|max:255',
            'consultation_fee' => 'nullable|numeric|min:0',
            'available_days' => 'nullable|array',
            'available_time_start' => 'nullable',
            'available_time_end' => 'nullable',
            'bio' => 'nullable|string',
            'clinic_name' => 'nullable|string|max:255',
            'clinic_address' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $doctorProfile->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Doctor profile updated successfully',
            'doctor_profile' => $doctorProfile,
        ]);
    }

    /**
     * Public list of approved doctors.
     */
    public function getAllDoctors(Request $request)
    {
        $query = DoctorProfile::with('user')->where('status', 'approved');

        if ($request->filled('specialty')) {
            $query->whereJsonContains('specialties', $request->specialty);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('clinic_name', 'like', "%{$search}%")
                    ->orWhere('location', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $doctors = $query->orderByDesc('rating')->paginate($request->get('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $doctors,
        ]);
    }

    /**
     * Public single doctor profile by id.
     */
    public function getDoctorById($id)
    {
        $doctor = DoctorProfile::with('user')->where('status', 'approved')->find($id);

        if (!$doctor) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor not found',
            ], 404);
        }

        $data = $doctor->toArray();
        $data['weekly_schedule'] = $doctor->weeklyScheduleOrDefault();

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Admin-only: approve, reject, or re-pend a doctor's verification.
     */
    public function updateStatus(Request $request, $id)
    {
        if (!$request->user() instanceof Admin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,approved,rejected',
            'rejection_reason' => 'nullable|string|max:1000',
            'objected_document' => 'nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $doctorProfile = DoctorProfile::find($id);

        if (!$doctorProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found',
            ], 404);
        }

        $updateData = [
            'status' => $request->status,
            'is_verified' => $request->status === 'approved',
        ];

        if ($request->status === 'rejected') {
            $updateData['rejection_reason'] = $request->rejection_reason;
            $updateData['objected_document'] = $request->objected_document;
            $updateData['reupload_status'] = 'pending';
            $updateData['reupload_message'] = null;
            $updateData['reupload_image'] = null;
        } else {
            $updateData['rejection_reason'] = null;
            $updateData['objected_document'] = null;
            $updateData['reupload_status'] = null;
            $updateData['reupload_message'] = null;
            $updateData['reupload_image'] = null;
        }

        $doctorProfile->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Doctor status updated successfully',
            'doctor_profile' => $doctorProfile,
        ]);
    }

    /**
     * Admin-only: list every doctor profile regardless of status (for the
     * document-review dashboard), with real uploaded file URLs.
     */
    public function adminList(Request $request)
    {
        if (!$request->user() instanceof Admin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        $query = DoctorProfile::with('user');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('pmdc_number', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%");
                    });
            });
        }

        $doctors = $query->orderByDesc('created_at')->paginate($request->get('per_page', 20));

        return response()->json([
            'success' => true,
            'data' => $doctors,
        ]);
    }

    /**
     * The logged-in doctor's weekly availability schedule (a flexible JSON
     * blob matching the frontend's per-day enabled/slots[] shape).
     */
    public function getAvailability(Request $request)
    {
        $doctorProfile = $request->user()->doctorProfile;

        if (!$doctorProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'weekly_schedule' => $doctorProfile->weeklyScheduleOrDefault(),
            'max_appointments_per_day' => (int) ($doctorProfile->max_appointments_per_day ?: 12),
            'is_online' => $doctorProfile->isOnline() ? 'online' : 'offline',
        ]);
    }

    public function updateAvailability(Request $request)
    {
        $doctorProfile = $request->user()->doctorProfile;

        if (!$doctorProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found',
            ], 404);
        }

        $request->validate([
            'weekly_schedule' => 'required|array',
            'max_appointments_per_day' => 'sometimes|integer|min:1|max:50',
        ]);

        $payload = ['weekly_schedule' => $request->weekly_schedule];
        if ($request->filled('max_appointments_per_day')) {
            $payload['max_appointments_per_day'] = $request->integer('max_appointments_per_day');
        }

        $doctorProfile->update($payload);

        return response()->json([
            'success' => true,
            'message' => 'Availability saved successfully',
            'weekly_schedule' => $doctorProfile->weekly_schedule,
            'max_appointments_per_day' => (int) ($doctorProfile->max_appointments_per_day ?: 12),
        ]);
    }

    /**
     * The logged-in doctor's patients, derived from their appointment &
     * consultation history (no separate patients table exists — a patient
     * is just any User who has booked with this doctor).
     */
    public function myPatients(Request $request)
    {
        $doctorProfile = $request->user()->doctorProfile;

        if (!$doctorProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found',
            ], 404);
        }

        $appointments = Appointment::where('doctor_profile_id', $doctorProfile->id)
            ->with('patient')
            ->orderBy('appointment_date')
            ->get();

        $consultations = Consultation::where('doctor_profile_id', $doctorProfile->id)
            ->with('patient')
            ->orderBy('started_at')
            ->get();

        $consultationCounts = $consultations
            ->groupBy('patient_id')
            ->map->count();

        $consultationDates = $consultations
            ->groupBy('patient_id')
            ->map(function ($group) {
                return $group->pluck('started_at')->filter();
            });

        $patients = collect();

        $appointments->groupBy('patient_id')->each(function ($group) use (&$patients, $consultationCounts, $consultationDates) {
            $patient = $group->first()->patient;
            if (!$patient) {
                return;
            }

            $patientId = $patient->id;

            $timeline = $group->map(function ($appointment) {
                return [
                    'date' => $appointment->appointment_date?->toDateString(),
                    'type' => 'Appointment',
                    'status' => ucfirst($appointment->status),
                ];
            });

            foreach (($consultationDates[$patientId] ?? collect()) as $startedAt) {
                $timeline->push([
                    'date' => $startedAt?->toDateString(),
                    'type' => 'Consultation',
                    'status' => 'Completed',
                ]);
            }

            $patients[$patientId] = $this->mapPatientRecord(
                $patient,
                $group,
                $consultationCounts[$patientId] ?? 0,
                $timeline,
            );
        });

        // Patients who only consulted (no appointment record) must still appear.
        $consultations->groupBy('patient_id')->each(function ($group) use (&$patients, $consultationDates) {
            $patient = $group->first()->patient;
            if (!$patient || $patients->has($patient->id)) {
                return;
            }

            $patientId = $patient->id;
            $timeline = ($consultationDates[$patientId] ?? collect())->map(function ($startedAt) {
                return [
                    'date' => $startedAt?->toDateString(),
                    'type' => 'Consultation',
                    'status' => 'Completed',
                ];
            });

            $patients[$patientId] = $this->mapPatientRecord(
                $patient,
                collect(),
                $group->count(),
                $timeline,
            );
        });

        $result = $patients->values()->map(function (array $record) {
            $record['timeline'] = collect($record['timeline'])->sortByDesc('date')->values()->all();

            return $record;
        })->all();

        return response()->json([
            'success' => true,
            'count' => count($result),
            'data' => $result,
        ]);
    }

    /**
     * Pakistan public holidays for a given year.
     *
     * Fetches Google Calendar's public "Pakistan holidays" iCal feed, parses the
     * DTSTART dates (covers lunar Eid dates that shift each year), and returns a
     * plain array of "YYYY-MM-DD" strings. Results are cached per year for 24h.
     * A minimal fixed set of national holidays acts as a fallback when the feed
     * is unreachable.
     */
    public function publicHolidays(Request $request)
    {
        $year = (int) $request->query('year', date('Y'));
        $cacheKey = "pakistan_public_holidays_{$year}";

        $cached = cache()->get($cacheKey);
        if (is_array($cached)) {
            return response()->json(['success' => true, 'year' => $year, 'data' => $cached]);
        }

        $holidays = [];
        try {
            $ics = Http::timeout(10)->get('https://calendar.google.com/calendar/ical/en.pk%23holiday%40group.v.calendar.google.com/public/basic.ics')->body();

            preg_match_all('/^DTSTART;VALUE=DATE:(\d{8})\s*$/mi', $ics, $matches);
            foreach ($matches[1] ?? [] as $ymd) {
                if (substr($ymd, 0, 4) === (string) $year) {
                    $holidays[] = sprintf('%s-%s-%s', substr($ymd, 0, 4), substr($ymd, 4, 2), substr($ymd, 6, 2));
                }
            }
        } catch (\Throwable $e) {
            // fall through to fixed fallback below
        }

        // Fixed national holidays (same dates every year) as fallback.
        foreach (['01-01', '02-05', '03-23', '05-01', '08-14', '11-09', '12-25'] as $md) {
            $holidays[] = "{$year}-{$md}";
        }

        $holidays = array_values(array_unique($holidays));
        sort($holidays);

        if (count($holidays) > 7) {
            cache()->put($cacheKey, $holidays, now()->addHours(24));
        }

        return response()->json(['success' => true, 'year' => $year, 'data' => $holidays]);
    }

    /**
     * Build a normalized patient record shared by appointment & consultation
     * history sources.
     */
    private function mapPatientRecord($patient, $appointmentGroup, int $consultationCount, $timeline): array
    {
        $completed = $appointmentGroup->where('status', Appointment::STATUS_COMPLETED)->count();
        $missed = $appointmentGroup->whereIn('status', [Appointment::STATUS_CANCELLED, Appointment::STATUS_NO_SHOW])->count();

        $allDates = collect($timeline)->pluck('date')->filter();

        return [
            'id' => $patient?->id,
            'name' => $patient?->name ?? 'Unknown',
            'age' => $patient?->date_of_birth ? $patient->date_of_birth->age : null,
            'gender' => $patient?->gender,
            'phone' => $patient?->mobile,
            'email' => $patient?->email,
            'status' => $patient?->status,
            'profile_image' => $patient?->profile_image,
            'appointments' => $appointmentGroup->count(),
            'consultations' => $consultationCount,
            'completedAppointments' => $completed,
            'missedAppointments' => $missed,
            'firstVisit' => $allDates->min(),
            'lastVisit' => $allDates->max(),
            'timeline' => $timeline->values()->all(),
        ];
    }

    /**
     * Doctor re-uploads a specific objected document.
     */
    public function reuploadDocument(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $doctorProfile = $user->doctorProfile;

        if (!$doctorProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found.',
            ], 404);
        }

        if ($doctorProfile->status !== 'rejected' || $doctorProfile->reupload_status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'No pending re-upload request.',
            ], 422);
        }

        $request->validate([
            'document_type' => 'required|string|max:255',
            'document_file' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $docType = $request->document_type;
        $file = $request->file('document_file');
        $path = null;

        switch ($docType) {
            case 'license_image':
                $path = $file->store('doctor/licenses', 'public');
                $doctorProfile->update(['license_image' => $path]);
                break;

            case 'cnic_document':
                $path = $file->store('doctor/cnic', 'public');
                $doctorProfile->update(['cnic_document' => $path]);
                break;

            default:
                if (preg_match('/^qualification_(\d+)$/', $docType, $m)) {
                    $idx = (int) $m[1];
                    $quals = $doctorProfile->qualifications ?? [];
                    if (isset($quals[$idx])) {
                        $path = $file->store('doctor/qualifications', 'public');
                        $quals[$idx]['image'] = $path;
                        $doctorProfile->update(['qualifications' => $quals]);
                    } else {
                        return response()->json([
                            'success' => false,
                            'message' => 'Qualification index not found.',
                        ], 422);
                    }
                } elseif (preg_match('/^experience_(\d+)$/', $docType, $m)) {
                    $idx = (int) $m[1];
                    $exps = $doctorProfile->experiences ?? [];
                    if (isset($exps[$idx])) {
                        $path = $file->store('doctor/experience-certificates', 'public');
                        $exps[$idx]['certificate'] = $path;
                        $doctorProfile->update(['experiences' => $exps]);
                    } else {
                        return response()->json([
                            'success' => false,
                            'message' => 'Experience index not found.',
                        ], 422);
                    }
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid document type.',
                    ], 422);
                }
                break;
        }

        $docLabel = str_replace('_', ' ', ucfirst($docType));

        $doctorProfile->update([
            'status' => 'pending',
            'is_verified' => false,
            'rejection_reason' => null,
            'objected_document' => null,
            'reupload_status' => 'reuploaded',
            'reupload_message' => "{$docLabel} has been re-uploaded successfully.",
            'reupload_image' => $path,
            'reupload_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Document re-uploaded successfully.',
            'reupload_message' => $doctorProfile->reupload_message,
            'reupload_image' => $path,
        ]);
    }
}
