<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Appointment;
use App\Models\Consultation;
use App\Models\Feedback;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminController extends Controller
{
    private function requireAdmin(Request $request)
    {
        if (!$request->user() instanceof Admin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        return null;
    }

    /**
     * List every platform user (patients + doctors) for the admin Users page.
     */
    public function listUsers(Request $request)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        $query = User::with(['doctorProfile', 'usertype']);

        if ($request->filled('role')) {
            $usertypeId = $request->role === 'doctor' ? 2 : 1;
            $query->where('usertype_id', $usertypeId);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%");
            });
        }

        $users = $query->orderByDesc('created_at')->get()->map(function (User $u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'role' => $u->usertype_id == 2 ? 'Doctor' : 'Patient',
                'email' => $u->email,
                'phone' => $u->mobile,
                'gender' => $u->gender,
                'address' => $u->address,
                'status' => $u->status,
                'warnings_count' => $u->warnings_count,
                'last_action_reason' => $u->last_action_reason,
                'joined' => $u->created_at?->toDateString(),
                'specialty' => $u->doctorProfile?->specialties[0] ?? null,
                'doctor_profile_id' => $u->doctorProfile?->id,
                'is_verified' => $u->doctorProfile?->is_verified ?? null,
                'profile_image' => $u->profile_image,
            ];
        });

        return response()->json([
            'success' => true,
            'count' => $users->count(),
            'data' => $users,
        ]);
    }

    /**
     * Directly set a user's account status (active/inactive/suspended/blocked).
     */
    public function updateUserStatus(Request $request, $id)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:active,inactive,suspended,blocked',
            'reason' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        $user->update([
            'status' => $request->status,
            'last_action_reason' => $request->reason,
        ]);

        \App\Models\UserActionLog::create([
            'user_id' => $user->id,
            'admin_id' => $request->user()->id,
            'action' => $request->status,
            'reason' => $request->reason,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'User status updated successfully',
            'data' => $user,
        ]);
    }

    /**
     * Issue a standalone warning to a user (no status change, just a tally
     * + reason) — used when the admin isn't acting on a specific complaint.
     */
    public function warnUser(Request $request, $id)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        $validator = Validator::make($request->all(), [
            'reason' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found',
            ], 404);
        }

        $user->update([
            'warnings_count' => $user->warnings_count + 1,
            'last_action_reason' => $request->reason,
        ]);

        \App\Models\UserActionLog::create([
            'user_id' => $user->id,
            'admin_id' => $request->user()->id,
            'action' => 'warn',
            'reason' => $request->reason,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Warning issued successfully',
            'data' => $user,
        ]);
    }

    /**
     * General "contact us" feedback submissions.
     */
    public function listFeedback(Request $request)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        $feedback = Feedback::with('user')->orderByDesc('created_at')->get()
            ->map(fn (Feedback $f) => [
                'id' => $f->id,
                'name' => $f->name,
                'email' => $f->email,
                'message' => $f->message,
                'profile_image' => $f->user?->profile_image,
                'created_at' => $f->created_at,
            ]);

        return response()->json([
            'success' => true,
            'data' => $feedback,
        ]);
    }

    /**
     * Patient ratings/reviews of doctors, sourced from completed consultations.
     */
    public function listDoctorFeedback(Request $request)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        $reviews = Consultation::with(['doctor.user', 'patient'])
            ->whereNotNull('rating')
            ->orderByDesc('updated_at')
            ->get()
            ->map(function (Consultation $c) {
                return [
                    'id' => $c->id,
                    'patientName' => $c->patient?->name,
                    'doctorName' => $c->doctor?->user?->name,
                    'rating' => $c->rating,
                    'comment' => $c->review_comment,
                    'date' => $c->updated_at?->toDateString(),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => $reviews,
        ]);
    }

    /**
     * List every admin account (any authenticated admin may view the team).
     */
    public function listAdmins(Request $request)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        return response()->json([
            'success' => true,
            'data' => Admin::orderBy('name')->get(),
        ]);
    }

    /**
     * Create a new admin account (super_admin only).
     */
    public function createAdmin(Request $request)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        if ($request->user()->role !== 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Only a super admin can add new admins',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:admins,email',
            'contact' => 'nullable|string|max:30',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $admin = Admin::create([
            'name' => $request->name,
            'email' => $request->email,
            'contact' => $request->contact,
            'password' => Hash::make($request->password),
            'role' => 'admin',
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Admin created successfully',
            'data' => $admin,
        ], 201);
    }

    /**
     * Remove an admin account (super_admin only, cannot remove self).
     */
    public function deleteAdmin(Request $request, $id)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        if ($request->user()->role !== 'super_admin') {
            return response()->json([
                'success' => false,
                'message' => 'Only a super admin can remove admins',
            ], 403);
        }

        if ((int) $id === $request->user()->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot remove your own account',
            ], 400);
        }

        $admin = Admin::find($id);
        if (!$admin) {
            return response()->json([
                'success' => false,
                'message' => 'Admin not found',
            ], 404);
        }

        $admin->delete();

        return response()->json([
            'success' => true,
            'message' => 'Admin removed successfully',
        ]);
    }

    /**
     * Platform-wide appointment oversight for administrators.
     */
    public function listAppointments(Request $request)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        $query = Appointment::with(['doctor.user', 'patient'])->orderByDesc('appointment_date');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $appointments = $query->limit(100)->get()->map(function (Appointment $a) {
            return [
                'id' => $a->id,
                'patient' => $a->patient?->name,
                'doctor' => $a->doctor?->user?->name,
                'date' => $a->appointment_date?->toDateString(),
                'time' => $a->appointment_time,
                'type' => $a->consultation_type,
                'status' => $a->status,
                'department' => $a->department,
            ];
        });

        return response()->json([
            'success' => true,
            'count' => $appointments->count(),
            'data' => $appointments,
        ]);
    }
}
