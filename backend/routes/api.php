<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AdminAuthController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\DoctorController;
use App\Http\Controllers\Api\AppointmentController;
use App\Http\Controllers\Api\ConsultationController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FeedbackController;
use App\Http\Controllers\Api\PrescriptionController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\PharmacyController;
use App\Http\Controllers\Api\OPDController;
use App\Http\Controllers\Api\MedicalReportController;
use Illuminate\Support\Facades\Storage;

/**
 * ============================================================
 * HEALTH CHECK
 * ============================================================
 */
Route::get('/test', function () {
    return response()->json([
        'message' => 'Laravel API Working',
        'status' => true,
        'timestamp' => now(),
    ]);
});

/**
 * ============================================================
 * PUBLIC AUTH ROUTES (No authentication required)
 * These paths match exactly what the React frontend calls.
 * ============================================================
 */
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
Route::post('/medi/google-login', [AuthController::class, 'googleLogin']);
Route::post('/medi/FeedbackForm', [FeedbackController::class, 'store']);
Route::get('/reviews', [FeedbackController::class, 'publicReviews']);

/**
 * ============================================================
 * ADMIN AUTH ROUTES
 * ============================================================
 */
Route::prefix('admin')->group(function () {
    Route::post('/login', [AdminAuthController::class, 'login']);

    // Protected admin routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AdminAuthController::class, 'logout']);
        Route::get('/profile', [AdminAuthController::class, 'profile']);
        Route::put('/profile', [AdminAuthController::class, 'updateProfile']);
        Route::post('/change-password', [AdminAuthController::class, 'changePassword']);
        Route::post('/avatar', [AdminAuthController::class, 'updateAvatar']);
        Route::get('/dashboard', [DashboardController::class, 'index']);

        // ── Doctor verification management ──
        Route::get('/doctors', [DoctorController::class, 'adminList']);
        Route::put('/doctors/{id}/status', [DoctorController::class, 'updateStatus']);

        // ── Platform user management ──
        Route::get('/users', [AdminController::class, 'listUsers']);
        Route::put('/users/{id}/status', [AdminController::class, 'updateUserStatus']);
        Route::post('/users/{id}/warn', [AdminController::class, 'warnUser']);

        // ── Complaints ──
        Route::get('/complaints', [ComplaintController::class, 'adminIndex']);
        Route::post('/complaints/{id}/action', [ComplaintController::class, 'adminAction']);

        // ── Feedback overview ──
        Route::get('/feedback', [AdminController::class, 'listFeedback']);
        Route::get('/doctor-feedback', [AdminController::class, 'listDoctorFeedback']);
        Route::get('/appointments', [AdminController::class, 'listAppointments']);
        Route::get('/pharmacy-orders', [PharmacyController::class, 'adminOrders']);
        Route::patch('/pharmacy-orders/{id}', [PharmacyController::class, 'updateOrderStatus']);

        // ── Admin team management ──
        Route::get('/admins', [AdminController::class, 'listAdmins']);
        Route::post('/admins', [AdminController::class, 'createAdmin']);
        Route::delete('/admins/{id}', [AdminController::class, 'deleteAdmin']);
    });
});

/**
 * ============================================================
 * PROTECTED ROUTES (Authentication required via Sanctum)
 * ============================================================
 */
Route::middleware('auth:sanctum')->group(function () {

    // Get authenticated user
    Route::get('/user', function (Request $request) {
        return response()->json([
            'success' => true,
            'user' => $request->user(),
        ]);
    });

    // ── Shared profile management (works for patients, doctors, admins) ──
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);
    Route::post('/change-password', [ProfileController::class, 'changePassword']);
    Route::post('/two-factor', [ProfileController::class, 'toggleTwoFactor']);

    // ── Role-aware dashboard stats ──
    Route::get('/dashboard', [DashboardController::class, 'index']);

    // ── Prescriptions (derived from completed consultations) ──
    Route::get('/prescriptions', [PrescriptionController::class, 'index']);

    // ── Complaints ──
    Route::post('/complaints', [ComplaintController::class, 'store']);
    Route::get('/complaints', [ComplaintController::class, 'index']);

    // ── Medical reports (patient uploads; doctor views shared reports) ──
    Route::get('/medical-reports', [MedicalReportController::class, 'index']);
    Route::post('/medical-reports', [MedicalReportController::class, 'store']);
    Route::post('/medical-reports/{id}/send-to-doctor', [MedicalReportController::class, 'sendToDoctor']);
    Route::delete('/medical-reports/{id}', [MedicalReportController::class, 'destroy']);

    /**
     * ── DOCTOR PROFILE ROUTES ──
     */
    Route::prefix('doctor')->group(function () {
        // Get upcoming/past appointments (doctor only) — must be registered
        // before the generic '/profile/{id}' style routes below.
        Route::get('/appointments/upcoming', [AppointmentController::class, 'getDoctorUpcoming']);
        Route::get('/appointments/past', [AppointmentController::class, 'getPastAppointments']);

        // Doctor's own patients, derived from appointment/consultation history
        Route::get('/patients', [DoctorController::class, 'myPatients']);

        // Doctor's weekly availability schedule
        Route::get('/availability', [DoctorController::class, 'getAvailability']);
        Route::put('/availability', [DoctorController::class, 'updateAvailability']);

        // Get doctor profile of logged-in doctor
        Route::get('/profile', [DoctorController::class, 'show']);

        // Create doctor profile
        Route::post('/profile', [DoctorController::class, 'store']);

        // Re-upload specific objected document
        Route::post('/reupload-document', [DoctorController::class, 'reuploadDocument']);

        // Update doctor profile
        Route::put('/profile/{id}', [DoctorController::class, 'update']);
    });

    /**
     * ── APPOINTMENT ROUTES ──
     */
    Route::prefix('appointments')->group(function () {
        // Get past appointments — must come before '/{id}' or "past" would be
        // captured as the {id} parameter.
        Route::get('/past', [AppointmentController::class, 'getPastAppointments']);

        // Get all appointments
        Route::get('/', [AppointmentController::class, 'index']);

        // Create new appointment
        Route::post('/', [AppointmentController::class, 'store']);

        // Get single appointment
        Route::get('/{id}', [AppointmentController::class, 'show']);

        // Update appointment
        Route::put('/{id}', [AppointmentController::class, 'update']);

        // Cancel appointment
        Route::post('/{id}/cancel', [AppointmentController::class, 'cancel']);

        // Reschedule workflow
        Route::post('/{id}/reschedule', [AppointmentController::class, 'proposeReschedule']);
        Route::post('/{id}/reschedule/approve', [AppointmentController::class, 'approveReschedule']);
        Route::post('/{id}/reschedule/reject', [AppointmentController::class, 'rejectReschedule']);
        Route::post('/{id}/approve', [AppointmentController::class, 'approve']);
        Route::post('/{id}/reject', [AppointmentController::class, 'reject']);
    });

    /**
     * ── CONSULTATION ROUTES ──
     */
    Route::prefix('consultations')->group(function () {
        // Get all consultations
        Route::get('/', [ConsultationController::class, 'index']);

        // Create new consultation (from appointment OR from doctor for virtual clinic)
        Route::post('/', [ConsultationController::class, 'store']);
        Route::post('/with-doctor', [ConsultationController::class, 'storeWithDoctor']);

        // Get single consultation
        Route::get('/{id}', [ConsultationController::class, 'show']);

        // Save notes/diagnosis/prescription progress without completing
        Route::put('/{id}', [ConsultationController::class, 'update']);

        // Start consultation (doctor only)
        Route::post('/{id}/start', [ConsultationController::class, 'start']);

        // Complete consultation (doctor only)
        Route::post('/{id}/complete', [ConsultationController::class, 'complete']);

        // Cancel consultation (doctor or patient)
        Route::post('/{id}/cancel', [ConsultationController::class, 'cancel']);

        // Get messages for consultation
        Route::get('/{id}/messages', [ConsultationController::class, 'getMessages']);

        // Add message to consultation
        Route::post('/{id}/messages', [ConsultationController::class, 'addMessage']);

        // Add review (patient only)
        Route::post('/{id}/review', [ConsultationController::class, 'addReview']);

        Route::post('/{id}/call/start', [ConsultationController::class, 'startCall']);
        Route::get('/{id}/call', [ConsultationController::class, 'getCall']);
        Route::post('/{id}/call/signal', [ConsultationController::class, 'postSignal']);
        Route::get('/{id}/call/signals', [ConsultationController::class, 'getSignals']);
        Route::post('/{id}/call/end', [ConsultationController::class, 'endCall']);
    });
});

/**
 * ============================================================
 * PUBLIC PHARMACY + OPD ROUTES
 * ============================================================
 */
Route::prefix('pharmacy')->group(function () {
    Route::get('/medicines', [PharmacyController::class, 'index']);
    Route::get('/categories', [PharmacyController::class, 'categories']);
    Route::post('/identify', [PharmacyController::class, 'identify']);
    // Checkout: guest OK; Bearer token attaches user_id when present
    Route::post('/orders', [PharmacyController::class, 'placeOrder']);
    Route::get('/orders/{id}', [PharmacyController::class, 'showOrder']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/orders', [PharmacyController::class, 'myOrders']);
        Route::post('/medicines', [PharmacyController::class, 'storeMedicine']);
        Route::put('/medicines/{id}', [PharmacyController::class, 'updateMedicine']);
        Route::delete('/medicines/{id}', [PharmacyController::class, 'destroyMedicine']);
    });
});

Route::prefix('opd')->group(function () {
    Route::get('/specialties', [OPDController::class, 'getSpecialties']);
    Route::get('/doctors/specialty/{specialty}', [OPDController::class, 'getDoctorsBySpecialty']);
    Route::get('/doctors/online', [OPDController::class, 'getOnlineDoctors']);
    Route::get('/doctors/available', [OPDController::class, 'getAvailableDoctors']);
    Route::get('/doctors/top-rated', [OPDController::class, 'getTopRatedDoctors']);
    Route::get('/doctors/search', [OPDController::class, 'searchDoctors']);
    Route::get('/doctors/nearby', [OPDController::class, 'getNearbyDoctors']);
    Route::post('/match-symptoms', [OPDController::class, 'matchDoctorsBySymptom']);
});

/**
 * ============================================================
 * PUBLIC DOCTOR ROUTES (No authentication required)
 * ============================================================
 */
Route::prefix('doctors')->group(function () {
    // Get all doctors (public)
    Route::get('/', [DoctorController::class, 'getAllDoctors']);

    // Get doctor by ID (public)
    Route::get('/{id}', [DoctorController::class, 'getDoctorById']);
});

/**
 * ============================================================
 * FILE DOWNLOAD ROUTE
 * ============================================================
 */
Route::get('/download/{path}', function ($path) {
    $path = rawurldecode($path);
    $fullPath = storage_path('app/public/' . $path);

    if (!file_exists($fullPath)) {
        return response()->json(['success' => false, 'message' => 'File not found'], 404);
    }

    $mime = mime_content_type($fullPath) ?: 'application/octet-stream';
    $name = basename($fullPath);

    return response()->file($fullPath, [
        'Content-Type' => $mime,
        'Content-Disposition' => 'attachment; filename="' . $name . '"',
    ]);
})->where('path', '.*');

/**
 * ============================================================
 * FALLBACK ROUTES
 * ============================================================
 */
Route::fallback(function () {
    return response()->json([
        'success' => false,
        'message' => 'Endpoint not found',
    ], 404);
});
