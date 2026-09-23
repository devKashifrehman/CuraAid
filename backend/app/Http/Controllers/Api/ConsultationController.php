<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use App\Models\Consultation;
use App\Models\ConsultationMessage;
use App\Models\ConsultationSignal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ConsultationController extends Controller
{
    /**
     * List consultations for the logged-in patient or doctor.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $doctorProfile = $user->doctorProfile;

        $query = Consultation::with([
            'doctor' => fn ($q) => $q->select([
                'id', 'user_id', 'specialties', 'experience_years',
            ]),
            'doctor.user' => fn ($q) => $q->select(['id', 'name', 'profile_image']),
            'patient' => fn ($q) => $q->select([
                'id', 'name', 'date_of_birth', 'gender', 'mobile', 'email', 'profile_image',
            ]),
            'appointment' => fn ($q) => $q->select([
                'id', 'appointment_date', 'appointment_time', 'status',
                'revisit', 'revisit_reason', 'reschedule_request',
            ]),
        ]);

        $query = $doctorProfile
            ? $query->where('doctor_profile_id', $doctorProfile->id)
            : $query->where('patient_id', $user->id);

        // Cases that were converted into a follow-up appointment (via the
        // Clinic's "Appointment" option) are fully handed off: they no longer
        // appear in the consultations list at all.
        $query->where('converted_to_appointment', false);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $consultations = $query->orderByDesc('created_at')->limit(200)->get();

        return response()->json([
            'success' => true,
            'count' => $consultations->count(),
            'data' => $consultations,
        ]);
    }

    /**
     * Doctor saves notes/diagnosis/prescription progress on an ongoing
     * consultation without closing it out (that's what complete() is for).
     */
    public function update(Request $request, $id)
    {
        $consultation = Consultation::find($id);
        $doctorProfile = $request->user()->doctorProfile;

        if (!$consultation || !$doctorProfile || $consultation->doctor_profile_id !== $doctorProfile->id) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation not found or unauthorized',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'notes' => 'sometimes|nullable|string',
            'diagnosis' => 'sometimes|nullable|array',
            'prescription' => 'sometimes|nullable|array',
            'follow_up_date' => 'sometimes|nullable|date',
            'examination_notes' => 'sometimes|nullable|string',
            'treatment_plan' => 'sometimes|nullable|string',
            'case_status' => 'sometimes|in:ongoing,completed,revisit',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $consultation->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Consultation updated',
            'data' => $consultation,
        ]);
    }

    /**
     * Start a consultation from an existing (patient-owned, scheduled) appointment.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'appointment_id' => 'required|exists:appointments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $appointment = Appointment::find($request->appointment_id);

        if ($appointment->patient_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        if ($appointment->consultation) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation already exists for this appointment',
                'data' => $appointment->consultation,
            ], 409);
        }

        $consultation = Consultation::create([
            'appointment_id' => $appointment->id,
            'doctor_profile_id' => $appointment->doctor_profile_id,
            'patient_id' => $appointment->patient_id,
            'status' => Consultation::STATUS_SCHEDULED,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Consultation created',
            'data' => $consultation,
        ], 201);
    }

    /**
     * Virtual clinic: patient opens a chat session with a doctor (no appointment).
     */
    public function storeWithDoctor(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'doctor_profile_id' => 'required|exists:doctor_profiles,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        $existing = Consultation::where('patient_id', $user->id)
            ->where('doctor_profile_id', $request->doctor_profile_id)
            ->where('status', Consultation::STATUS_ONGOING)
            ->first();

        if ($existing) {
            return response()->json([
                'success' => true,
                'message' => 'Reusing existing consultation',
                'data' => $existing->load(['doctor.user', 'patient']),
            ]);
        }

        $consultation = Consultation::create([
            'appointment_id' => null,
            'doctor_profile_id' => $request->doctor_profile_id,
            'patient_id' => $user->id,
            'status' => Consultation::STATUS_ONGOING,
            'started_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Virtual clinic consultation started',
            'data' => $consultation->load(['doctor.user', 'patient']),
        ], 201);
    }

    /**
     * Join an appointment's case from the Appointments page. Creates (or
     * reuses) the consultation linked to the appointment so the Clinic session
     * tracks the same case. Works for the patient or the attending doctor.
     */
    public function linkAppointment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'appointment_id' => 'required|exists:appointments,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();
        $appointment = Appointment::with(['doctor.user', 'patient'])->find($request->appointment_id);

        if (!$appointment) {
            return response()->json([
                'success' => false,
                'message' => 'Appointment not found',
            ], 404);
        }

        $doctorProfile = $user->doctorProfile;
        $isPatient = $appointment->patient_id === $user->id;
        $isDoctor = $doctorProfile && $appointment->doctor_profile_id === $doctorProfile->id;

        if (!$isPatient && !$isDoctor) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 403);
        }

        // Reuse an existing linked consultation (any non-finished state).
        if ($appointment->consultation) {
            $existing = $appointment->consultation->load(['doctor.user', 'patient']);
            return response()->json([
                'success' => true,
                'message' => 'Reusing existing consultation',
                'linked_appointment' => $appointment,
                'data' => $existing,
            ]);
        }

        $consultation = Consultation::create([
            'appointment_id' => $appointment->id,
            'doctor_profile_id' => $appointment->doctor_profile_id,
            'patient_id' => $appointment->patient_id,
            'status' => Consultation::STATUS_ONGOING,
            'started_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Consultation linked to appointment',
            'linked_appointment' => $appointment,
            'data' => $consultation->fresh()->load(['doctor.user', 'patient']),
        ], 201);
    }

    /**
     * Get a single consultation (must be a participant).
     */
    public function show(Request $request, $id)
    {
        $consultation = Consultation::with(['doctor.user', 'patient', 'appointment'])->find($id);

        if (!$consultation || !$this->userCanAccess($request->user(), $consultation)) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation not found or unauthorized',
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $consultation,
        ]);
    }

    /**
     * Start a consultation (doctor only).
     */
    public function start(Request $request, $id)
    {
        $consultation = Consultation::find($id);
        $doctorProfile = $request->user()->doctorProfile;

        if (!$consultation || !$doctorProfile || $consultation->doctor_profile_id !== $doctorProfile->id) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation not found or unauthorized',
            ], 404);
        }

        $consultation->update([
            'status' => Consultation::STATUS_ONGOING,
            'started_at' => now(),
        ]);

        if ($consultation->appointment) {
            $consultation->appointment->update(['status' => Appointment::STATUS_IN_PROGRESS]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Consultation started',
            'data' => $consultation,
        ]);
    }

    /**
     * Complete a consultation (doctor only), optionally saving notes/diagnosis/prescription.
     */
    public function complete(Request $request, $id)
    {
        $consultation = Consultation::find($id);
        $doctorProfile = $request->user()->doctorProfile;

        if (!$consultation || !$doctorProfile || $consultation->doctor_profile_id !== $doctorProfile->id) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation not found or unauthorized',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'notes' => 'nullable|string',
            'diagnosis' => 'nullable|array',
            'prescription' => 'nullable|array',
            'follow_up_date' => 'nullable|date',
            'follow_up_time' => 'nullable|string|max:5',
            'revisit' => 'nullable|boolean',
            'revisit_reason' => 'nullable|string|max:1000',
            'examination_notes' => 'nullable|string',
            'treatment_plan' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $needsRevisit = (bool) ($data['revisit'] ?? false);

        // A revisit keeps the consultation open (the doctor wants to see the
        // patient again in this same session window) instead of closing it out.
        $consultation->update(array_merge($data, [
            'status' => $needsRevisit ? Consultation::STATUS_ONGOING : Consultation::STATUS_COMPLETED,
            'case_status' => $needsRevisit ? 'revisit' : 'completed',
            'ended_at' => $needsRevisit ? null : now(),
        ]));

        // A booked appointment follows the exact same case lifecycle as the
        // consultation record itself: a revisit reopens the case (in_progress
        // with a follow-up slot), only the final no-revisit completion closes it.
        if ($consultation->appointment) {
            $consultation->appointment->update([
                'status' => $needsRevisit ? Appointment::STATUS_IN_PROGRESS : Appointment::STATUS_COMPLETED,
                'case_status' => $needsRevisit ? 'revisit' : 'completed',
                'revisit' => $needsRevisit,
                'revisit_reason' => $needsRevisit ? ($data['revisit_reason'] ?? null) : null,
                'follow_up_date' => $needsRevisit ? ($data['follow_up_date'] ?? null) : null,
                'follow_up_time' => $needsRevisit ? ($data['follow_up_time'] ?? null) : null,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Consultation completed',
            'data' => $consultation,
        ]);
    }

    /**
     * Schedule a follow-up appointment from a consultation (doctor only).
     *
     * This is the doctor's "Appointment" revisit option. The current
     * consultation case is CLOSED (completed) and a brand-new appointment is
     * created as ongoing so it shows up in the Appointments tab, linked back
     * to the source consultation via recommended_by_consultation_id.
     */
    public function scheduleAppointment(Request $request, $id)
    {
        $consultation = Consultation::find($id);
        $doctorProfile = $request->user()->doctorProfile;

        if (!$consultation || !$doctorProfile || $consultation->doctor_profile_id !== $doctorProfile->id) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation not found or unauthorized',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'appointment_date' => 'required|date|after_or_equal:today',
            'appointment_time' => 'required|date_format:H:i',
            'duration' => 'nullable|integer|min:15|max:180',
            'notes' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();

        $conflict = Appointment::where('doctor_profile_id', $doctorProfile->id)
            ->whereDate('appointment_date', $data['appointment_date'])
            ->whereTime('appointment_time', $data['appointment_time'])
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

        // The consultation case closes; the follow-up continues as an appointment.
        $consultation->update([
            'status' => Consultation::STATUS_COMPLETED,
            'case_status' => 'completed',
            'ended_at' => now(),
            'revisit' => false,
            'follow_up_date' => $data['appointment_date'],
            'follow_up_time' => $data['appointment_time'],
            'converted_to_appointment' => true,
        ]);

        // When this consultation was reached from an appointment (the Clinic
        // linked it), that original case is superseded by the new appointment.
        if ($consultation->appointment) {
            $consultation->appointment->update([
                'status' => Appointment::STATUS_COMPLETED,
                'case_status' => 'completed',
                'revisit' => false,
            ]);
        }

        // Carry the previous clinical data (prescription + diagnosis) into the
        // follow-up appointment so the returning patient's history is preserved.
        $appointment = Appointment::create([
            'doctor_profile_id' => $doctorProfile->id,
            'patient_id' => $consultation->patient_id,
            'appointment_date' => $data['appointment_date'],
            'appointment_time' => $data['appointment_time'],
            'duration' => $data['duration'] ?? 30,
            'status' => Appointment::STATUS_IN_PROGRESS,
            'case_status' => 'ongoing',
            'notes' => $data['notes'] ?? $consultation->notes,
            'symptoms' => $consultation->appointment?->symptoms,
            'examination_report' => $this->buildExamReportFromConsultation($consultation),
            'recommended_by_consultation_id' => $consultation->id,
            'prescription' => $consultation->prescription,
            'diagnosis' => $consultation->diagnosis,
        ]);

        $appointment->load('doctor.user', 'patient');

        return response()->json([
            'success' => true,
            'message' => 'Follow-up appointment scheduled',
            'data' => [
                'consultation' => $consultation->fresh()->load(['doctor.user', 'patient']),
                'appointment' => $appointment,
            ],
        ], 201);
    }

    /**
     * Combine a completed consultation's clinical notes into the free-text
     * examination report used by the follow-up appointment's visit page.
     */
    private function buildExamReportFromConsultation(?Consultation $consultation): ?string
    {
        if (!$consultation) {
            return null;
        }

        $parts = [];

        if (!empty($consultation->examination_notes)) {
            $parts[] = trim((string) $consultation->examination_notes);
        }

        if (!empty($consultation->treatment_plan)) {
            $parts[] = 'Treatment Plan: ' . trim((string) $consultation->treatment_plan);
        }

        return $parts ? implode("\n\n", $parts) : null;
    }

    /**
     * Cancel an ongoing/active consultation (doctor or patient).
     */
    public function cancel(Request $request, $id)
    {
        $user = $request->user();
        $consultation = Consultation::find($id);

        if (!$consultation || !$this->userCanAccess($user, $consultation)) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation not found or unauthorized',
            ], 404);
        }

        if (in_array($consultation->status, [Consultation::STATUS_COMPLETED, Consultation::STATUS_CANCELLED])) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation is already ' . $consultation->status,
            ], 400);
        }

        $consultation->update([
            'status' => Consultation::STATUS_CANCELLED,
            'ended_at' => now(),
        ]);

        if ($consultation->appointment) {
            $consultation->appointment->update([
                'status' => Appointment::STATUS_CANCELLED,
                'cancelled_at' => now(),
                'cancellation_reason' => $request->get('reason', 'Cancelled by ' . ($user->doctorProfile ? 'doctor' : 'patient')),
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Consultation cancelled',
            'data' => $consultation,
        ]);
    }

    /**
     * Patient proposes a new date/time for an ongoing consultation (no appointment row required).
     */
    public function proposeReschedule(Request $request, $id)
    {
        $user = $request->user();
        $consultation = Consultation::find($id);

        if (!$consultation || $consultation->patient_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation not found',
            ], 404);
        }

        if (in_array($consultation->status, [Consultation::STATUS_COMPLETED, Consultation::STATUS_CANCELLED])) {
            return response()->json([
                'success' => false,
                'message' => 'A completed or cancelled consultation cannot be rescheduled',
            ], 400);
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

        $consultation->update([
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
            'data' => $consultation->load(['doctor.user', 'patient']),
        ]);
    }

    /**
     * Doctor approves a pending reschedule request, optionally fixing their own date/time.
     * The consultation stays Ongoing (started_at untouched) so the Active window is
     * computed from the fixed slot (active 15 min before, until start + duration).
     */
    public function approveReschedule(Request $request, $id)
    {
        $doctorProfile = $request->user()->doctorProfile;
        $consultation = Consultation::find($id);

        if (!$consultation || !$doctorProfile || $consultation->doctor_profile_id !== $doctorProfile->id) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation not found',
            ], 404);
        }

        $pending = $consultation->reschedule_request;
        if (!$pending || ($pending['status'] ?? null) !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'No pending reschedule request',
            ], 400);
        }

        if (in_array($consultation->status, [Consultation::STATUS_COMPLETED, Consultation::STATUS_CANCELLED])) {
            return response()->json([
                'success' => false,
                'message' => 'A completed or cancelled consultation cannot be rescheduled',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'date' => 'nullable|date',
            'time' => 'nullable|date_format:H:i',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $finalDate = $request->date ?: $pending['suggested_date'];
        $finalTime = $request->time ?: $pending['suggested_time'];

        $consultation->update([
            'status' => Consultation::STATUS_ONGOING,
            // Reset the clock: the Activity window drives "Active" from the fixed slot
            // (15 min before the approved time until start + duration).
            'started_at' => null,
            'reschedule_request' => array_merge($pending, [
                'status' => 'approved',
                'approved_by' => 'doctor',
                'approved_date' => $finalDate,
                'approved_time' => $finalTime,
            ]),
        ]);

        // Keep any linked appointment's schedule in sync for consistency.
        if ($consultation->appointment) {
            $consultation->appointment->update([
                'appointment_date' => $finalDate,
                'appointment_time' => $finalTime,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Reschedule approved',
            'data' => $consultation->load(['doctor.user', 'patient']),
        ]);
    }

    /**
     * Doctor rejects a pending reschedule request.
     */
    public function rejectReschedule(Request $request, $id)
    {
        $doctorProfile = $request->user()->doctorProfile;
        $consultation = Consultation::find($id);

        if (!$consultation || !$doctorProfile || $consultation->doctor_profile_id !== $doctorProfile->id) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation not found',
            ], 404);
        }

        $pending = $consultation->reschedule_request;
        if (!$pending || ($pending['status'] ?? null) !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'No pending reschedule request',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $consultation->update([
            'reschedule_request' => array_merge($pending, [
                'status' => 'rejected',
                'rejection_reason' => $request->reason,
                'rejected_by' => 'doctor',
            ]),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Reschedule rejected',
            'data' => $consultation->load(['doctor.user', 'patient']),
        ]);
    }

    /**
     * List chat messages for a consultation.
     */
    public function getMessages(Request $request, $id)
    {
        $consultation = Consultation::find($id);

        if (!$consultation || !$this->userCanAccess($request->user(), $consultation)) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation not found or unauthorized',
            ], 404);
        }

        $messages = $consultation->chatMessages()->with('sender')->orderBy('created_at')->get();

        return response()->json([
            'success' => true,
            'consultation_id' => $consultation->id,
            'messages' => $messages,
        ]);
    }

    /**
     * Add a chat message to a consultation.
     */
    public function addMessage(Request $request, $id)
    {
        $consultation = Consultation::find($id);
        $user = $request->user();

        if (!$consultation || !$this->userCanAccess($user, $consultation)) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation not found or unauthorized',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'message' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $doctorProfile = $user->doctorProfile;
        $senderType = ($doctorProfile && $consultation->doctor_profile_id === $doctorProfile->id)
            ? 'doctor'
            : 'patient';

        $message = ConsultationMessage::create([
            'consultation_id' => $consultation->id,
            'sender_id' => $user->id,
            'sender_type' => $senderType,
            'message' => $request->message,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Message sent',
            'data' => $message,
        ], 201);
    }

    /**
     * Add a rating/review to a completed consultation (patient only).
     */
    public function addReview(Request $request, $id)
    {
        $consultation = Consultation::find($id);
        $user = $request->user();

        if (!$consultation || $consultation->patient_id !== $user->id) {
            return response()->json([
                'success' => false,
                'message' => 'Consultation not found or unauthorized',
            ], 404);
        }

        if ($consultation->status === Consultation::STATUS_CANCELLED) {
            return response()->json([
                'success' => false,
                'message' => 'A cancelled consultation cannot be reviewed',
            ], 400);
        }

        $validator = Validator::make($request->all(), [
            'rating' => 'required|integer|min:1|max:5',
            'review_comment' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $consultation->update($validator->validated());

        // Refresh the doctor's average rating across all reviewed consultations.
        $doctor = $consultation->doctor;
        if ($doctor) {
            $doctor->update([
                'rating' => $doctor->consultations()->whereNotNull('rating')->avg('rating') ?? 0,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Review added',
            'data' => $consultation,
        ]);
    }

    private function userCanAccess($user, Consultation $consultation): bool
    {
        if ($consultation->patient_id === $user->id) {
            return true;
        }

        $doctorProfile = $user->doctorProfile;

        return $doctorProfile && $consultation->doctor_profile_id === $doctorProfile->id;
    }

    /**
     * Start ringing the other party for an audio/video call.
     */
    public function startCall(Request $request, $id)
    {
        $consultation = Consultation::find($id);
        $user = $request->user();

        if (!$consultation || !$this->userCanAccess($user, $consultation)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 404);
        }

        $validator = Validator::make($request->all(), [
            'type' => 'required|in:audio,video',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $call = [
            'type' => $request->type,
            'status' => 'ringing',
            'initiator_id' => $user->id,
            'started_at' => now()->toIso8601String(),
        ];
        $consultation->update(['active_call' => $call]);

        ConsultationSignal::create([
            'consultation_id' => $consultation->id,
            'sender_id' => $user->id,
            'kind' => 'ring',
            'payload' => $call,
        ]);

        return response()->json(['success' => true, 'data' => $call]);
    }

    public function getCall(Request $request, $id)
    {
        $consultation = Consultation::find($id);
        if (!$consultation || !$this->userCanAccess($request->user(), $consultation)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $consultation->active_call,
        ]);
    }

    public function postSignal(Request $request, $id)
    {
        $consultation = Consultation::find($id);
        $user = $request->user();
        if (!$consultation || !$this->userCanAccess($user, $consultation)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 404);
        }

        $validator = Validator::make($request->all(), [
            'kind' => 'required|in:ring,offer,answer,ice,hangup,reject,accept',
            'payload' => 'nullable|array',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $signal = ConsultationSignal::create([
            'consultation_id' => $consultation->id,
            'sender_id' => $user->id,
            'kind' => $request->kind,
            'payload' => $request->payload,
        ]);

        $call = $consultation->active_call ?? [];
        if ($request->kind === 'accept') {
            $call['status'] = 'active';
            $consultation->update(['active_call' => $call]);
        } elseif (in_array($request->kind, ['hangup', 'reject'], true)) {
            $call['status'] = $request->kind === 'reject' ? 'rejected' : 'ended';
            $consultation->update(['active_call' => $call]);
        }

        return response()->json(['success' => true, 'data' => $signal], 201);
    }

    public function getSignals(Request $request, $id)
    {
        $consultation = Consultation::find($id);
        $user = $request->user();
        if (!$consultation || !$this->userCanAccess($user, $consultation)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 404);
        }

        $afterId = (int) $request->query('after_id', 0);
        $signals = ConsultationSignal::where('consultation_id', $consultation->id)
            ->where('id', '>', $afterId)
            ->where('sender_id', '!=', $user->id)
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $signals,
            'call' => $consultation->active_call,
        ]);
    }

    public function endCall(Request $request, $id)
    {
        $consultation = Consultation::find($id);
        $user = $request->user();
        if (!$consultation || !$this->userCanAccess($user, $consultation)) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 404);
        }

        ConsultationSignal::create([
            'consultation_id' => $consultation->id,
            'sender_id' => $user->id,
            'kind' => 'hangup',
            'payload' => ['reason' => $request->get('reason')],
        ]);

        $call = $consultation->active_call ?? [];
        $call['status'] = 'ended';
        $consultation->update(['active_call' => $call]);

        return response()->json(['success' => true, 'data' => $call]);
    }
}
