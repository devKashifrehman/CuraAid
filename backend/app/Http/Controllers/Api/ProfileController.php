<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class ProfileController extends Controller
{
    /**
     * Update the logged-in user's (patient/doctor/admin) own basic profile fields.
     * Doctor-specific credential fields (specialties, pmdc, fee, etc.) go through
     * DoctorController::update instead — this only touches the shared account row.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        if ($user instanceof Admin) {
            $rules = [
                'name' => 'sometimes|string|max:255',
                'contact' => 'sometimes|nullable|string|max:30',
                'age' => 'sometimes|nullable|integer|min:18|max:100',
            ];
        } else {
            $rules = [
                'name' => 'sometimes|string|max:255',
                'mobile' => 'sometimes|string|max:20',
                'gender' => 'sometimes|nullable|in:male,female,other',
                'date_of_birth' => 'sometimes|nullable|date',
                'blood_group' => 'sometimes|nullable|string|max:10',
                'address' => 'sometimes|nullable|string|max:255',
                'lat' => 'sometimes|nullable|numeric',
                'lng' => 'sometimes|nullable|numeric',
                'language' => 'sometimes|string|max:50',
                'region' => 'sometimes|string|max:50',
            ];
        }

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user->update($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => $user,
        ]);
    }

    /**
     * Upload/replace the logged-in user's avatar.
     */
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        $user = $request->user();
        $path = $request->file('avatar')->store('avatars', 'public');

        $user->update(['profile_image' => $path]);

        return response()->json([
            'success' => true,
            'message' => 'Avatar updated successfully',
            'profile_image' => $path,
            'url' => asset('storage/' . $path),
        ]);
    }

    /**
     * Change the logged-in user's password (works for User or Admin).
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect',
            ], 422);
        }

        $user->update(['password' => Hash::make($request->new_password)]);

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully',
        ]);
    }

    /**
     * Toggle the (persisted) two-factor flag. Note: this only stores an on/off
     * preference — there is no real TOTP/SMS challenge wired to it.
     */
    public function toggleTwoFactor(Request $request)
    {
        $request->validate([
            'enabled' => 'required|boolean',
        ]);

        $user = $request->user();
        $user->update(['two_factor_enabled' => $request->boolean('enabled')]);

        return response()->json([
            'success' => true,
            'message' => $request->boolean('enabled') ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
            'two_factor_enabled' => $user->two_factor_enabled,
        ]);
    }
}
