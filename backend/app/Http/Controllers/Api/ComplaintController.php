<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Appointment;
use App\Models\Complaint;
use App\Models\Consultation;
use App\Models\User;
use App\Models\UserActionLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ComplaintController extends Controller
{
    /**
     * File a complaint against the other party of an appointment or consultation.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'appointment_id' => 'required_without:consultation_id|nullable|exists:appointments,id',
            'consultation_id' => 'required_without:appointment_id|nullable|exists:consultations,id',
            'category' => 'required|string|max:255',
            'priority' => 'nullable|in:low,average,high',
            'description' => 'required|string|min:10|max:2000',
            'proof' => 'nullable|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        $appointment = $request->appointment_id ? Appointment::find($request->appointment_id) : null;
        $consultation = $request->consultation_id ? Consultation::find($request->consultation_id) : null;
        $context = $appointment ?: $consultation;

        if (!$context || ($context->patient_id !== $user->id && $context->doctor?->user_id !== $user->id)) {
            return response()->json([
                'success' => false,
                'message' => 'You are not a participant in this appointment/consultation',
            ], 403);
        }

        $isPatientFiling = $context->patient_id === $user->id;
        $doctorUserId = $context->doctor?->user_id;

        $complainantRole = $isPatientFiling ? 'patient' : 'doctor';
        $respondentRole = $isPatientFiling ? 'doctor' : 'patient';
        $respondentId = $isPatientFiling ? $doctorUserId : $context->patient_id;

        if (!$respondentId) {
            return response()->json([
                'success' => false,
                'message' => 'Could not determine the other party',
            ], 422);
        }

        $proofPath = $request->hasFile('proof')
            ? $request->file('proof')->store('complaints', 'public')
            : null;

        $complaint = Complaint::create([
            'complainant_id' => $user->id,
            'complainant_role' => $complainantRole,
            'respondent_id' => $respondentId,
            'respondent_role' => $respondentRole,
            'appointment_id' => $appointment?->id,
            'consultation_id' => $consultation?->id,
            'category' => $request->category,
            'priority' => $request->priority ?? 'average',
            'description' => $request->description,
            'proof_path' => $proofPath,
            'status' => 'open',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Complaint submitted successfully',
            'data' => $complaint,
        ], 201);
    }

    /**
     * Complaints filed by the logged-in user.
     */
    public function index(Request $request)
    {
        $complaints = Complaint::with(['complainant', 'respondent'])
            ->where('complainant_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $complaints,
        ]);
    }

    /**
     * Admin: list all complaints, optionally filtered by status.
     */
    public function adminIndex(Request $request)
    {
        if (!$request->user() instanceof Admin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        $query = Complaint::with(['complainant', 'respondent']);

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $complaints = $query->orderByDesc('created_at')->get();

        return response()->json([
            'success' => true,
            'data' => $complaints,
        ]);
    }

    /**
     * Admin: act on a complaint — warn/block/suspend the respondent, resolve, or reopen.
     */
    public function adminAction(Request $request, $id)
    {
        $admin = $request->user();
        if (!$admin instanceof Admin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        $complaint = Complaint::find($id);
        if (!$complaint) {
            return response()->json([
                'success' => false,
                'message' => 'Complaint not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'action' => 'required|in:warn,block,suspend,resolve,reopen',
            'reason' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $action = $request->action;
        $reason = $request->reason;
        $respondent = User::find($complaint->respondent_id);

        $statusMap = [
            'warn' => 'warned',
            'block' => 'blocked',
            'suspend' => 'suspended',
            'resolve' => 'resolved',
            'reopen' => 'open',
        ];
        $complaint->update([
            'status' => $statusMap[$action],
            'resolution_reason' => $reason,
            'resolved_by_admin_id' => in_array($action, ['resolve', 'block', 'suspend', 'warn']) ? $admin->id : null,
        ]);

        if ($respondent && $action === 'warn') {
            $respondent->update([
                'warnings_count' => $respondent->warnings_count + 1,
                'last_action_reason' => $reason,
            ]);
        } elseif ($respondent && in_array($action, ['block', 'suspend'])) {
            $respondent->update([
                'status' => $action === 'block' ? 'blocked' : 'suspended',
                'last_action_reason' => $reason,
            ]);
        }

        if ($respondent) {
            UserActionLog::create([
                'user_id' => $respondent->id,
                'admin_id' => $admin->id,
                'action' => $action,
                'reason' => $reason,
                'complaint_id' => $complaint->id,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Action applied successfully',
            'data' => $complaint,
        ]);
    }
}
