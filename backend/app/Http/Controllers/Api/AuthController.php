<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    /**
     * Register a new patient or doctor account.
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'mobile' => 'nullable|string|max:20',
            'password' => 'required|string|min:6',
            'usertype_id' => 'required|exists:usertypes,id',
            'status' => 'nullable|in:active,inactive',
            'auth_provider' => 'nullable|in:local,google',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'mobile' => $request->mobile,
            'password' => Hash::make($request->password),
            'usertype_id' => $request->usertype_id,
            'status' => $request->status ?? 'active',
            'auth_provider' => $request->auth_provider ?? 'local',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'User registered successfully',
            'user' => $user,
            'token' => $token,
            'role' => $this->roleForUser($user),
        ], 201);
    }

    /**
     * Email/password login for patients and doctors.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Email not found',
            ], 404);
        }

        if (!Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid password',
            ], 401);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Account is inactive',
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'user' => $user,
            'token' => $token,
            'role' => $this->roleForUser($user),
        ]);
    }

    /**
     * Login or register via a Google ID token (from @react-oauth/google).
     */
    public function googleLogin(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'usertype_id' => 'nullable|exists:usertypes,id',
        ]);

        $response = Http::get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $request->token,
        ]);

        if (!$response->ok()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid Google token',
            ], 401);
        }

        $googleUser = $response->json();

        $expectedClientId = config('services.google.client_id');
        if ($expectedClientId && ($googleUser['aud'] ?? null) !== $expectedClientId) {
            return response()->json([
                'success' => false,
                'message' => 'Google token audience mismatch',
            ], 401);
        }

        $user = User::where('email', $googleUser['email'])->first();

        if (!$user) {
            if (!$request->usertype_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'usertype_id is required to create a new account',
                ], 422);
            }

            $user = User::create([
                'name' => $googleUser['name'] ?? $googleUser['email'],
                'email' => $googleUser['email'],
                'mobile' => '',
                'password' => Hash::make(bin2hex(random_bytes(16))),
                'usertype_id' => $request->usertype_id,
                'status' => 'active',
                'auth_provider' => 'google',
                'provider_id' => $googleUser['sub'],
            ]);
        } elseif ($user->auth_provider !== 'google') {
            $user->update([
                'auth_provider' => 'google',
                'provider_id' => $googleUser['sub'],
            ]);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Account is inactive',
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Google login successful',
            'user' => $user,
            'token' => $token,
            'role' => $this->roleForUser($user),
        ]);
    }

    /**
     * Send a password reset link (logged via MAIL_MAILER=log in local dev).
     */
    public function forgotPassword(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Email not found',
            ], 404);
        }

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return response()->json([
                'success' => true,
                'message' => 'Password reset link sent to your email',
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Unable to send password reset link',
        ], 500);
    }

    private function roleForUser(User $user): string
    {
        if ($user->usertype && $user->usertype->role_name) {
            return strtolower($user->usertype->role_name);
        }

        return $user->usertype_id == 2 ? 'doctor' : 'patient';
    }
}
