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

        // The booked appointment slot is always closed out here — a revisit
        // means a new appointment will be booked for the follow-up, while the
        // consultation *record* itself (chat history, etc.) stays open.
        if ($consultation->appointment) {
            $consultation->appointment->update([
                'status' => Appointment::STATUS_COMPLETED,
                'revisit' => $needsRevisit,
                'revisit_reason' => $data['revisit_reason'] ?? null,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Consultation completed',
            'data' => $consultation,
        ]);
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
