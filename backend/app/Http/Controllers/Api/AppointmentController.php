<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Consultation;
use App\Models\DoctorProfile;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class AppointmentController extends Controller
{
    /**
     * List appointments for the logged-in user (doctor sees their own, patient sees their own).
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $doctorProfile = $user->doctorProfile;

        $query = Appointment::with(['doctor.user', 'patient']);
        $query = $doctorProfile
            ? $query->where('doctor_profile_id', $doctorProfile->id)
            : $query->where('patient_id', $user->id);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $appointments = $query->orderByDesc('appointment_date')
            ->orderByDesc('appointment_time')
            ->get();

        return response()->json([
            'success' => true,
            'count' => $appointments->count(),
            'data' => $appointments->map(fn ($a) => $this->formatAppointment($a)),
        ]);
    }

    /**
     * Book a new appointment (patient only).
     */
    public function store(Request $request)
    {
        try {
            $user = $request->user();

            $validator = Validator::make($request->all(), [
                'doctor_profile_id' => 'required|exists:doctor_profiles,id',
                'appointment_date' => 'required|date|after_or_equal:today',
                'appointment_time' => 'required|date_format:H:i',
                'duration' => 'nullable|integer|min:15|max:120',
                'notes' => 'nullable|string|max:500',
                'symptoms' => 'nullable|array',
                'age' => 'nullable|integer|min:0|max:150',
                'department' => 'nullable|string|max:255',
                'severity' => 'nullable|in:low,medium,high',
                'consultation_type' => 'required|in:video,audio,chat,physical',
                'patient_id' => 'nullable|exists:users,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Validation errors',
                    'errors' => $validator->errors(),
                ], 422);
            }

            $doctor = DoctorProfile::find($request->doctor_profile_id);
            if (!$doctor || $doctor->status !== 'approved') {
                return response()->json([
                    'success' => false,
                    'message' => 'Doctor not available',
                ], 404);
            }

            $maxPerDay = (int) ($doctor->max_appointments_per_day ?: 12);
            $bookedToday = Appointment::where('doctor_profile_id', $doctor->id)
                ->whereDate('appointment_date', $request->appointment_date)
                ->whereIn('status', [
                    Appointment::STATUS_PENDING,
                    Appointment::STATUS_SCHEDULED,
                    Appointment::STATUS_IN_PROGRESS,
                ])
                ->count();

            if ($bookedToday >= $maxPerDay) {
                return response()->json([
                    'success' => false,
                    'message' => "Doctor has reached the daily limit of {$maxPerDay} appointments",
                ], 409);
            }

            $conflict = Appointment::where('doctor_profile_id', $request->doctor_profile_id)
                ->where('appointment_date', $request->appointment_date)
                ->where('appointment_time', $request->appointment_time)
                ->whereIn('status', [
                    Appointment::STATUS_PENDING,
                    Appointment::STATUS_SCHEDULED,
                    Appointment::STATUS_IN_PROGRESS,
                ])
                ->exists();

            if ($conflict) {
                return response()->json([
                    'success' => false,
                    'message' => 'This time slot is already booked',
                ], 409);
            }

            $patientId = $user->id;
            $status = Appointment::STATUS_PENDING;
            if ($user->doctorProfile) {
                if ((int) $request->doctor_profile_id !== (int) $user->doctorProfile->id) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Doctors can only book on their own schedule',
                    ], 403);
                }
                if (!$request->filled('patient_id')) {
                    return response()->json([
                        'success' => false,
                        'message' => 'patient_id is required when a doctor books a visit',
                    ], 422);
                }
                $patientId = (int) $request->patient_id;
                $status = Appointment::STATUS_SCHEDULED;
            }

            $appointment = Appointment::create([
                'patient_id' => $patientId,
                'doctor_profile_id' => $request->doctor_profile_id,
                'appointment_date' => $request->appointment_date,
                'appointment_time' => $request->appointment_time,
                'duration' => $request->duration ?? 30,
                'notes' => $request->notes,
                'symptoms' => $request->symptoms,
                'age' => $request->age,
                'department' => $request->department,
                'severity' => $request->severity,
                'consultation_type' => $request->consultation_type,
                'status' => $status,
            ]);

            $appointment->load('doctor.user', 'patient');

            return response()->json([
                'success' => true,
                'message' => $status === Appointment::STATUS_PENDING
                    ? 'Appointment request submitted. Waiting for doctor approval.'
                    : 'Appointment booked successfully',
                'data' => $this->formatAppointment($appointment),
            ], 201);
        } catch (\Exception $e) {
            Log::error('Book appointment error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to book appointment',
            ], 500);
        }
    }

    /**
     * Get a single appointment (must belong to the requesting patient or doctor).
     */
    public function show(Request $request, $id)
    {
        $appointment = Appointment::with(['doctor.user', 'patient'])->find($id);

        if (!$appointment || !$this->userCanAccess($request->user(), $appointment)) {
            return response()->json([
                'success' => false,
                'message' => 'Appointment not found',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $this->formatAppointment($appointment),
        ]);
    }

    /**
     * Update an appointment (reschedule, add notes, or doctor-side status change).
     */
    public function update(Request $request, $id)
    {
        $user = $request->user();
        $appointment = Appointment::find($id);

        if (!$appointment || !$this->userCanAccess($user, $appointment)) {
            return response()->json([
                'success' => false,
                'message' => 'Appointment not found',
            ], 404);
        }

        $isDoctor = (bool) $user->doctorProfile;

        $rules = [
            'appointment_date' => 'sometimes|date',
            'appointment_time' => 'sometimes|date_format:H:i',
            'notes' => 'sometimes|nullable|string|max:500',
            'meeting_link' => 'sometimes|nullable|string|max:255',
        ];

        if ($isDoctor) {
            $rules['status'] = 'sometimes|in:pending,scheduled,in_progress,completed,no_show,rejected,cancelled';
            $rules['examination_report'] = 'sometimes|nullable|string';
            $rules['prescription'] = 'sometimes|nullable|array';
            $rules['diagnosis'] = 'sometimes|nullable|array';
            $rules['lat'] = 'sometimes|nullable|numeric';
            $rules['lng'] = 'sometimes|nullable|numeric';
            $rules['revisit'] = 'sometimes|boolean';
            $rules['revisit_reason'] = 'sometimes|nullable|string|max:1000';
            $rules['case_status'] = 'sometimes|in:ongoing,revisit,completed,cancelled';
            $rules['follow_up_date'] = 'sometimes|nullable|date';
            $rules['follow_up_time'] = 'sometimes|nullable|string|max:5';
            $rules['consultation_type'] = 'sometimes|in:video,audio,chat,physical';
            $rules['duration'] = 'sometimes|integer|min:15|max:120';
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation errors',
                'errors' => $validator->errors(),
            ], 422);
        }

        $appointment->update($validator->validated());
        $appointment->load('doctor.user', 'patient');

        return response()->json([
            'success' => true,
            'message' => 'Appointment updated successfully',
            'data' => $this->formatAppointment($appointment),
        ]);
    }

    /**
     * Complete an appointment (doctor only), optionally with a revisit.
     * A revisit keeps the case open like consultations: the appointment returns
     * to in_progress with a scheduled follow-up slot, and only the final
     * no-revisit completion closes the case out.
     */
    public function complete(Request $request, $id)
    {
        $user = $request->user();
        $appointment = Appointment::find($id);

        if (!$appointment || !$this->userCanAccess($user, $appointment)) {
            return response()->json([
                'success' => false,
                'message' => 'Appointment not found',
            ], 404);
        }

        $doctorProfile = $user->doctorProfile;
        if (!$doctorProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Only doctors can complete an appointment',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'notes' => 'nullable|string',
            'examination_report' => 'nullable|string',
            'revisit' => 'nullable|boolean',
            'revisit_reason' => 'nullable|string|max:1000',
            'follow_up_date' => 'nullable|date',
            'follow_up_time' => 'nullable|string|max:5',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $needsRevisit = (bool) ($data['revisit'] ?? false);

        $appointment->update([
            'status' => $needsRevisit ? Appointment::STATUS_IN_PROGRESS : Appointment::STATUS_COMPLETED,
            'case_status' => $needsRevisit ? 'revisit' : 'completed',
            'revisit' => $needsRevisit,
            'revisit_reason' => $needsRevisit ? ($data['revisit_reason'] ?? null) : null,
            'follow_up_date' => $needsRevisit ? ($data['follow_up_date'] ?? null) : null,
            'follow_up_time' => $needsRevisit ? ($data['follow_up_time'] ?? null) : null,
            'notes' => $data['notes'] ?? $appointment->notes,
            'examination_report' => $data['examination_report'] ?? $appointment->examination_report,
        ]);

        // Keep any linked consultation's case lifecycle in sync.
        if ($appointment->consultation) {
            $appointment->consultation->update([
                'status' => $needsRevisit ? Consultation::STATUS_ONGOING : Consultation::STATUS_COMPLETED,
                'case_status' => $needsRevisit ? 'revisit' : 'completed',
                'revisit' => $needsRevisit,
                'revisit_reason' => $needsRevisit ? ($data['revisit_reason'] ?? null) : null,
                'follow_up_date' => $needsRevisit ? ($data['follow_up_date'] ?? null) : null,
                'follow_up_time' => $needsRevisit ? ($data['follow_up_time'] ?? null) : null,
                'ended_at' => $needsRevisit ? null : now(),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => $needsRevisit ? 'Appointment kept open with a revisit' : 'Appointment completed successfully',
            'data' => $this->formatAppointment($appointment->refresh()->load('doctor.user', 'patient')),
        ]);
    }

    /**
     * Cancel an appointment.
     */
    public function cancel(Request $request, $id)
    {
        $user = $request->user();
        $appointment = Appointment::find($id);

        if (!$appointment || !$this->userCanAccess($user, $appointment)) {
            return response()->json([
                'success' => false,
                'message' => 'Appointment not found',
            ], 404);
        }

        if (!$appointment->canCancel()) {
            return response()->json([
                'success' => false,
                'message' => 'This appointment can no longer be cancelled',
            ], 400);
        }

        $appointment->cancel($request->get('reason'));

        return response()->json([
            'success' => true,
            'message' => 'Appointment cancelled successfully',
            'data' => $this->formatAppointment($appointment->refresh()->load('doctor.user', 'patient')),
        ]);
    }

    /**
     * Patient proposes a new date/time for an existing appointment.
     */
    public function proposeReschedule(Request $request, $id)
    {
        $user = $request->user();
        $appointment = Appointment::find($id);

        if (!$appointment || $appointment->patient_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Appointment not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'suggested_date' => 'required|date',
            'suggested_time' => 'required|date_format:H:i',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $appointment->update([
            'reschedule_request' => [
                'suggested_date' => $request->suggested_date,
                'suggested_time' => $request->suggested_time,
                'status' => 'pending',
                'requested_by' => 'patient',
            ],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Reschedule request submitted',
            'data' => $this->formatAppointment($appointment->load('doctor.user', 'patient')),
        ]);
    }

    /**
     * Doctor approves a pending reschedule request, applying the new date/time.
     */
    public function approveReschedule(Request $request, $id)
    {
        $doctorProfile = $request->user()->doctorProfile;
        $appointment = Appointment::find($id);

        if (!$appointment || !$doctorProfile || $appointment->doctor_profile_id !== $doctorProfile->id) {
            return response()->json([
                'success' => false,
                'message' => 'Appointment not found',
            ], 404);
        }

        $pending = $appointment->reschedule_request;
        if (!$pending || ($pending['status'] ?? null) !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'No pending reschedule request',
            ], 400);
        }

        $request->validate([
            'date' => 'nullable|date',
            'time' => 'nullable|date_format:H:i',
        ]);

        // The doctor may fine-tune the patient's suggested slot before approving.
        $finalDate = $request->date ?: $pending['suggested_date'];
        $finalTime = $request->time ?: $pending['suggested_time'];

        $appointment->update([
            'appointment_date' => $finalDate,
            'appointment_time' => $finalTime,
            'reschedule_request' => array_merge($pending, [
                'status' => 'approved',
                'approved_by' => 'doctor',
            ]),
        ]);

        // Once approved, the linked consultation (if any) stays ongoing but its
        // activity is driven by the fixed slot (Active 15 min before the time),
        // so started_at is reset to keep the window logic authoritative.
        if ($appointment->consultation) {
            $appointment->consultation->update([
                'status' => Consultation::STATUS_ONGOING,
                'started_at' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Reschedule approved',
            'data' => $this->formatAppointment($appointment->load('doctor.user', 'patient')),
        ]);
    }

    /**
     * Doctor rejects a pending reschedule request.
     */
    public function rejectReschedule(Request $request, $id)
    {
        $doctorProfile = $request->user()->doctorProfile;
        $appointment = Appointment::find($id);

        if (!$appointment || !$doctorProfile || $appointment->doctor_profile_id !== $doctorProfile->id) {
            return response()->json([
                'success' => false,
                'message' => 'Appointment not found',
            ], 404);
        }

        $pending = $appointment->reschedule_request;
        if (!$pending || ($pending['status'] ?? null) !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'No pending reschedule request',
            ], 400);
        }

        $request->validate(['reason' => 'required|string|max:500']);

        $appointment->update([
            'reschedule_request' => array_merge($pending, [
                'status' => 'rejected',
                'rejection_reason' => $request->reason,
                'rejected_by' => 'doctor',
            ]),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Reschedule rejected',
            'data' => $this->formatAppointment($appointment->load('doctor.user', 'patient')),
        ]);
    }

    /**
     * Doctor approves a pending appointment (PDF: doctors give approval).
     */
    public function approve(Request $request, $id)
    {
        $doctorProfile = $request->user()->doctorProfile;
        $appointment = Appointment::find($id);

        if (!$appointment || !$doctorProfile || $appointment->doctor_profile_id !== $doctorProfile->id) {
            return response()->json([
                'success' => false,
                'message' => 'Appointment not found or unauthorized',
            ], 404);
        }

        if ($appointment->status !== Appointment::STATUS_PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'Only pending appointments can be approved',
            ], 400);
        }

        $appointment->update(['status' => Appointment::STATUS_SCHEDULED]);

        return response()->json([
            'success' => true,
            'message' => 'Appointment approved',
            'data' => $this->formatAppointment($appointment->refresh()->load('doctor.user', 'patient')),
        ]);
    }

    /**
     * Doctor rejects a pending appointment.
     */
    public function reject(Request $request, $id)
    {
        $doctorProfile = $request->user()->doctorProfile;
        $appointment = Appointment::find($id);

        if (!$appointment || !$doctorProfile || $appointment->doctor_profile_id !== $doctorProfile->id) {
            return response()->json([
                'success' => false,
                'message' => 'Appointment not found or unauthorized',
            ], 404);
        }

        if ($appointment->status !== Appointment::STATUS_PENDING) {
            return response()->json([
                'success' => false,
                'message' => 'Only pending appointments can be rejected',
            ], 400);
        }

        $appointment->update([
            'status' => Appointment::STATUS_REJECTED,
            'cancellation_reason' => $request->get('reason'),
            'cancelled_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Appointment rejected',
            'data' => $this->formatAppointment($appointment->refresh()->load('doctor.user', 'patient')),
        ]);
    }

    /**
     * Past appointments for the logged-in patient or doctor.
     */
    public function getPastAppointments(Request $request)
    {
        $user = $request->user();
        $doctorProfile = $user->doctorProfile;

        $query = Appointment::with(['doctor.user', 'patient']);
        $query = $doctorProfile
            ? $query->where('doctor_profile_id', $doctorProfile->id)
            : $query->where('patient_id', $user->id);

        $appointments = $query->past()->get();

        return response()->json([
            'success' => true,
            'count' => $appointments->count(),
            'data' => $appointments->map(fn ($a) => $this->formatAppointment($a)),
        ]);
    }

    /**
     * Upcoming appointments for the logged-in doctor.
     */
    public function getDoctorUpcoming(Request $request)
    {
        $doctorProfile = $request->user()->doctorProfile;

        if (!$doctorProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Doctor profile not found',
            ], 404);
        }

        $appointments = Appointment::with(['doctor.user', 'patient'])
            ->where('doctor_profile_id', $doctorProfile->id)
            ->upcoming()
            ->get();

        return response()->json([
            'success' => true,
            'count' => $appointments->count(),
            'data' => $appointments->map(fn ($a) => $this->formatAppointment($a)),
        ]);
    }

    private function userCanAccess($user, Appointment $appointment): bool
    {
        if ($appointment->patient_id === $user->id) {
            return true;
        }

        $doctorProfile = $user->doctorProfile;

        return $doctorProfile && $appointment->doctor_profile_id === $doctorProfile->id;
    }

    private function formatAppointment(Appointment $appointment): array
    {
        $doctor = $appointment->doctor;
        $doctorUser = $doctor?->user;
        $patient = $appointment->patient;
        $patientAge = $patient?->date_of_birth
            ? $patient->date_of_birth->age
            : ($appointment->age ?? null);

        [$doctorLat, $doctorLng] = $this->resolveCoordinates(
            $doctor,
            $doctor?->location ?? $doctor?->clinic_address ?? $doctor?->clinic_name ?? ($doctorUser?->address ?? null),
        );
        [$patientLat, $patientLng] = $this->resolveCoordinates(
            $patient,
            $patient?->address ?? null,
        );

        return [
            'id' => $appointment->id,
            'doctor' => [
                'id' => $appointment->doctor_profile_id,
                'name' => $doctorUser?->name ?? 'Unknown Doctor',
                'specialty' => $this->getPrimarySpecialty($doctor),
                'location' => $doctor?->location
                    ?? $doctor?->clinic_address
                    ?? $doctor?->clinic_name
                    ?? ($doctorUser?->address ?? null),
                'experience_years' => $doctor?->experience_years,
                'avatar' => $doctorUser?->profile_image,
                'phone' => $doctor?->phone ?? $doctorUser?->mobile,
                'email' => $doctorUser?->email,
                'gender' => $doctorUser?->gender,
                'lat' => $doctorLat,
                'lng' => $doctorLng,
            ],
            'patient' => [
                'id' => $appointment->patient_id,
                'name' => $patient?->name ?? 'Unknown Patient',
                'gender' => $patient?->gender,
                'phone' => $patient?->mobile,
                'email' => $patient?->email,
                'avatar' => $patient?->profile_image,
                'age' => $patientAge,
                'date_of_birth' => $patient?->date_of_birth?->toDateString(),
                'address' => $patient?->address,
                'lat' => $patientLat,
                'lng' => $patientLng,
            ],
            'appointment_date' => $appointment->appointment_date?->toDateString(),
            'appointment_time' => $appointment->appointment_time,
            'duration' => $appointment->duration,
            'consultation_type' => $appointment->consultation_type,
            'status' => $appointment->status,
            'symptoms' => $appointment->symptoms,
            'age' => $appointment->age,
            'department' => $appointment->department,
            'severity' => $appointment->severity,
            'meeting_link' => $appointment->meeting_link,
            'notes' => $appointment->notes,
            'examination_report' => $appointment->examination_report,
            'prescription' => $appointment->prescription,
            'diagnosis' => $appointment->diagnosis,
            'lat' => $appointment->lat,
            'lng' => $appointment->lng,
            'source_consultation' => $this->getSourceConsultation($appointment),
            'previous_prescription' => $this->getPreviousPrescription($appointment),
            'revisit' => $appointment->revisit,
            'revisit_reason' => $appointment->revisit_reason,
            'case_status' => $appointment->case_status ?? 'ongoing',
            'follow_up_date' => $appointment->follow_up_date?->toDateString(),
            'follow_up_time' => $appointment->follow_up_time,
            'reschedule_request' => $appointment->reschedule_request,
            'cancelled_at' => $appointment->cancelled_at,
            'cancellation_reason' => $appointment->cancellation_reason,
            'created_at' => $appointment->created_at,
            'updated_at' => $appointment->updated_at,
        ];
    }

    /**
     * Return the most recent prior prescription/diagnosis for this patient
     * (from another appointment or a completed consultation) so a returning
     * patient's history shows up in the appointment's prescription editor.
     */
    private function getPreviousPrescription(?Appointment $appointment): ?array
    {
        if (!$appointment) {
            return null;
        }

        $patientId = $appointment->patient_id;

        $previousAppointment = Appointment::where('patient_id', $patientId)
            ->where('id', '!=', $appointment->id)
            ->whereNotNull('prescription')
            ->orderByDesc('updated_at')
            ->first();

        if ($previousAppointment && $previousAppointment->prescription) {
            return [
                'prescription' => $previousAppointment->prescription,
                'diagnosis' => $previousAppointment->diagnosis,
                'source' => 'appointment',
                'appointment_id' => $previousAppointment->id,
            ];
        }

        $previousConsultation = Consultation::where('patient_id', $patientId)
            ->whereNotNull('prescription')
            ->when($appointment->doctor_profile_id, fn ($q) => $q->where('doctor_profile_id', $appointment->doctor_profile_id))
            ->where('id', '!=', $appointment->recommended_by_consultation_id)
            ->orderByDesc('updated_at')
            ->first();

        if ($previousConsultation && $previousConsultation->prescription) {
            return [
                'prescription' => $previousConsultation->prescription,
                'diagnosis' => $previousConsultation->diagnosis,
                'source' => 'consultation',
                'consultation_id' => $previousConsultation->id,
            ];
        }

        return null;
    }

    private function getPrimarySpecialty(?DoctorProfile $doctor): string
    {
        $specialties = $doctor?->specialties;

        return is_array($specialties) && count($specialties) > 0
            ? $specialties[0]
            : 'General Physician';
    }

    /**
     * Resolve lat/lng for a map target. Uses the model's stored coordinates if
     * present; otherwise geocodes the location string via Nominatim (cached for
     * the model via a static array so repeated calls within one request do not
     * hit the network again).
     *
     * @param  \Illuminate\Database\Eloquent\Model|null  $model
     * @return array{0: float|null, 1: float|null}
     */
    private function resolveCoordinates(?object $model, ?string $location): array
    {
        static $cache = [];

        $cacheKey = $model ? get_class($model) . ':' . ($model->getKey() ?? 0) : md5((string) $location);

        if (array_key_exists($cacheKey, $cache)) {
            return $cache[$cacheKey];
        }

        if ($model && $model->lat !== null && $model->lng !== null) {
            $cache[$cacheKey] = [(float) $model->lat, (float) $model->lng];

            return $cache[$cacheKey];
        }

        if (!$location) {
            $cache[$cacheKey] = [null, null];

            return $cache[$cacheKey];
        }

        try {
            $response = Http::timeout(4)->get('https://nominatim.openstreetmap.org/search', [
                'q' => $location,
                'format' => 'json',
                'limit' => 1,
                'countrycodes' => 'pk',
            ]);

            $results = $response->json();

            if (!empty($results) && isset($results[0]['lat'], $results[0]['lon'])) {
                $lat = (float) $results[0]['lat'];
                $lng = (float) $results[0]['lon'];

                if ($model && in_array('lat', $model->getFillable(), true) && in_array('lng', $model->getFillable(), true)) {
                    $model->forceFill(['lat' => $lat, 'lng' => $lng])->save();
                }

                $cache[$cacheKey] = [$lat, $lng];

                return [$lat, $lng];
            }
        } catch (\Throwable $e) {
            Log::warning('Geocode failed for "' . $location . '": ' . $e->getMessage());
        }

        $cache[$cacheKey] = [null, null];

        return [null, null];
    }

    /**
     * Return the source consultation (recommended_by_consultation_id) when the
     * appointment was created as a follow-up from a consultation. Lets the
     * frontend prefill the prescription with the patient's previous data.
     */
    private function getSourceConsultation(?Appointment $appointment): ?array
    {
        if (!$appointment || !$appointment->recommended_by_consultation_id) {
            return null;
        }

        $source = $appointment->recommendedByConsultation;

        if (!$source) {
            return null;
        }

        return [
            'id' => $source->id,
            'notes' => $source->notes,
            'prescription' => $source->prescription,
            'diagnosis' => $source->diagnosis,
            'examination_notes' => $source->examination_notes,
            'treatment_plan' => $source->treatment_plan,
        ];
    }
}
