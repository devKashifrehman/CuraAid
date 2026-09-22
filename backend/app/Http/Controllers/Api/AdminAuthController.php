<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AdminAuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $admin = Admin::where('email', $request->email)->first();

        if (!$admin) {
            return response()->json([
                'success' => false,
                'message' => 'Admin not found',
            ], 401);
        }

        if (!Hash::check($request->password, $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid password',
            ], 401);
        }

        if ($admin->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Account is inactive',
            ], 403);
        }

        $token = $admin->createToken('admin_auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Admin login successful',
            'admin' => $admin,
            'token' => $token,
            'role' => $admin->role,
        ]);
    }

    public function logout(Request $request)
    {
        $admin = $this->authorizeAdmin($request);
        if ($admin instanceof \Illuminate\Http\JsonResponse) {
            return $admin;
        }

        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    public function profile(Request $request)
    {
        $admin = $this->authorizeAdmin($request);
        if ($admin instanceof \Illuminate\Http\JsonResponse) {
            return $admin;
        }

        return response()->json([
            'success' => true,
            'admin' => $admin,
        ]);
    }

    /**
     * Ensure the authenticated Sanctum principal is an Admin, not a patient/doctor User.
     *
     * @return Admin|\Illuminate\Http\JsonResponse
     */
    private function authorizeAdmin(Request $request)
    {
        $user = $request->user();

        if (!$user instanceof Admin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        return $user;
    }

    public function updateProfile(Request $request)
    {
        $admin = $this->authorizeAdmin($request);
        if ($admin instanceof \Illuminate\Http\JsonResponse) {
            return $admin;
        }

        $validator = Validator::make($request->all(), [
            'name' => 'nullable|string|max:255',
            'age' => 'nullable|integer|min:18|max:99',
            'contact' => 'nullable|string|max:30',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $admin->update([
            'name' => $request->input('name', $admin->name),
            'age' => $request->input('age', $admin->age),
            'contact' => $request->input('contact', $admin->contact),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'admin' => $admin->refresh(),
        ]);
    }

    public function changePassword(Request $request)
    {
        $admin = $this->authorizeAdmin($request);
        if ($admin instanceof \Illuminate\Http\JsonResponse) {
            return $admin;
        }

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        if (!Hash::check($request->current_password, $admin->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect',
            ], 422);
        }

        $admin->update(['password' => Hash::make($request->new_password)]);

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully',
        ]);
    }

    public function updateAvatar(Request $request)
    {
        $admin = $this->authorizeAdmin($request);
        if ($admin instanceof \Illuminate\Http\JsonResponse) {
            return $admin;
        }

        $validator = Validator::make($request->all(), [
            'profile_image' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $path = $request->file('profile_image')->store('admin_avatars', 'public');

        $admin->update(['profile_image' => $path]);

        return response()->json([
            'success' => true,
            'message' => 'Profile image updated successfully',
            'admin' => $admin->refresh(),
            'profile_image' => $path,
        ]);
    }
}
