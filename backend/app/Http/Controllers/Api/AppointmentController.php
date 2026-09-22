<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Consultation;
use App\Models\DoctorProfile;
use Illuminate\Http\Request;
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
            $rules['revisit'] = 'sometimes|boolean';
            $rules['revisit_reason'] = 'sometimes|nullable|string|max:1000';
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

        // Once approved, the linked consultation (if any) becomes live.
        if ($appointment->consultation) {
            $appointment->consultation->update([
                'status' => Consultation::STATUS_ONGOING,
                'started_at' => now(),
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
        return [
            'id' => $appointment->id,
            'doctor' => [
                'id' => $appointment->doctor_profile_id,
                'name' => $appointment->doctor?->user?->name ?? 'Unknown Doctor',
                'specialty' => $this->getPrimarySpecialty($appointment->doctor),
            ],
            'patient' => [
                'id' => $appointment->patient_id,
                'name' => $appointment->patient?->name ?? 'Unknown Patient',
                'gender' => $appointment->patient?->gender,
                'phone' => $appointment->patient?->mobile,
                'email' => $appointment->patient?->email,
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
            'revisit' => $appointment->revisit,
            'revisit_reason' => $appointment->revisit_reason,
            'reschedule_request' => $appointment->reschedule_request,
            'cancelled_at' => $appointment->cancelled_at,
            'cancellation_reason' => $appointment->cancellation_reason,
            'created_at' => $appointment->created_at,
            'updated_at' => $appointment->updated_at,
        ];
    }

    private function getPrimarySpecialty(?DoctorProfile $doctor): string
    {
        $specialties = $doctor?->specialties;

        return is_array($specialties) && count($specialties) > 0
            ? $specialties[0]
            : 'General Physician';
    }
}
