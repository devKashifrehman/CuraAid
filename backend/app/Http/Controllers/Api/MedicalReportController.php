<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\MedicalReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class MedicalReportController extends Controller
{
    /**
     * List medical reports visible to the current user.
     * Patient: own reports. Doctor: reports for a patient they consult (optionally filtered).
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $doctorProfile = $user->doctorProfile;

        $query = MedicalReport::query()->orderByDesc('created_at');

        if ($doctorProfile) {
            $patientId = $request->integer('patient_id') ?: null;
            $consultationId = $request->integer('consultation_id') ?: null;

            if ($consultationId) {
                $consultation = Consultation::where('id', $consultationId)
                    ->where('doctor_profile_id', $doctorProfile->id)
                    ->first();

                if (!$consultation) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Consultation not found or unauthorized',
                    ], 404);
                }

                $query->where(function ($q) use ($consultation) {
                    $q->where('consultation_id', $consultation->id)
                        ->orWhere(function ($q2) use ($consultation) {
                            $q2->where('patient_id', $consultation->patient_id)
                                ->where('sent_to_doctor', true);
                        });
                });
            } elseif ($patientId) {
                $hasAccess = Consultation::where('doctor_profile_id', $doctorProfile->id)
                    ->where('patient_id', $patientId)
                    ->exists();

                if (!$hasAccess) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No consultation history with this patient',
                    ], 403);
                }

                $query->where('patient_id', $patientId)->where('sent_to_doctor', true);
            } else {
                $patientIds = Consultation::where('doctor_profile_id', $doctorProfile->id)
                    ->pluck('patient_id')
                    ->unique()
                    ->values();

                $query->whereIn('patient_id', $patientIds)->where('sent_to_doctor', true);
            }
        } else {
            $query->where('patient_id', $user->id);

            if ($request->filled('consultation_id')) {
                $query->where('consultation_id', $request->integer('consultation_id'));
            }
        }

        $reports = $query->get()->map->toClinicArray();

        return response()->json([
            'success' => true,
            'count' => $reports->count(),
            'data' => $reports,
        ]);
    }

    /**
     * Patient uploads one or more medical report files.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->doctorProfile) {
            return response()->json([
                'success' => false,
                'message' => 'Only patients can upload medical reports',
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'files' => 'required|array|min:1|max:10',
            'files.*' => 'required|file|mimes:pdf,jpg,jpeg,png|max:10240',
            'consultation_id' => 'nullable|exists:consultations,id',
            'sent_to_doctor' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $consultationId = $request->input('consultation_id');
        if ($consultationId) {
            $consultation = Consultation::where('id', $consultationId)
                ->where('patient_id', $user->id)
                ->first();

            if (!$consultation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Consultation not found or unauthorized',
                ], 404);
            }
        }

        $sendToDoctor = $request->boolean('sent_to_doctor', true);
        $created = [];

        foreach ($request->file('files') as $file) {
            $path = $file->store('medical-reports/' . $user->id, 'public');

            $report = MedicalReport::create([
                'patient_id' => $user->id,
                'uploaded_by' => $user->id,
                'consultation_id' => $consultationId,
                'original_name' => $file->getClientOriginalName(),
                'file_path' => $path,
                'mime_type' => $file->getMimeType(),
                'file_size' => $file->getSize(),
                'sent_to_doctor' => $sendToDoctor,
            ]);

            $created[] = $report->toClinicArray();
        }

        return response()->json([
            'success' => true,
            'message' => 'Medical report(s) uploaded',
            'data' => $created,
        ], 201);
    }

    /**
     * Mark a report as shared with the doctor (patient only).
     */
    public function sendToDoctor(Request $request, $id)
    {
        $user = $request->user();
        $report = MedicalReport::where('id', $id)->where('patient_id', $user->id)->first();

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found',
            ], 404);
        }

        if ($request->filled('consultation_id')) {
            $consultation = Consultation::where('id', $request->integer('consultation_id'))
                ->where('patient_id', $user->id)
                ->first();

            if (!$consultation) {
                return response()->json([
                    'success' => false,
                    'message' => 'Consultation not found or unauthorized',
                ], 404);
            }

            $report->consultation_id = $consultation->id;
        }

        $report->sent_to_doctor = true;
        $report->save();

        return response()->json([
            'success' => true,
            'message' => 'Report shared with doctor',
            'data' => $report->toClinicArray(),
        ]);
    }

    /**
     * Delete a report (patient owner only).
     */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $report = MedicalReport::where('id', $id)->where('patient_id', $user->id)->first();

        if (!$report) {
            return response()->json([
                'success' => false,
                'message' => 'Report not found',
            ], 404);
        }

        if ($report->file_path) {
            Storage::disk('public')->delete($report->file_path);
        }

        $report->delete();

        return response()->json([
            'success' => true,
            'message' => 'Report deleted',
        ]);
    }
}
