<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use Illuminate\Http\Request;

class PrescriptionController extends Controller
{
    /**
     * List prescriptions derived from completed consultations. There is no
     * separate prescriptions table — a prescription IS a completed
     * consultation's stored prescription/diagnosis data.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $doctorProfile = $user->doctorProfile;

        $query = Consultation::with([
            'doctor' => fn ($q) => $q->select(['id', 'user_id', 'specialties']),
            'doctor.user' => fn ($q) => $q->select(['id', 'name', 'profile_image']),
            'patient' => fn ($q) => $q->select(['id', 'name', 'date_of_birth', 'gender', 'profile_image']),
        ])->whereNotNull('prescription');

        $query = $doctorProfile
            ? $query->where('doctor_profile_id', $doctorProfile->id)
            : $query->where('patient_id', $user->id);

        $consultations = $query->orderByDesc('updated_at')->limit(200)->get();

        $data = $consultations->map(function (Consultation $c) {
            $dateValue = $c->updated_at ?? $c->ended_at ?? $c->started_at ?? $c->created_at ?? $c->appointment?->appointment_date ?? $c->follow_up_date;
            $timeValue = $dateValue?->format('h:i A');

            return [
                'id' => $c->id,
                'consultation_id' => $c->id,
                'patientName' => $c->patient?->name,
                'patientId' => $c->patient_id,
                'patientAge' => $c->patient?->date_of_birth ? $c->patient->date_of_birth->age : null,
                'patientGender' => $c->patient?->gender,
                'doctorName' => $c->doctor?->user?->name,
                'doctorSpecialty' => $c->doctor?->specialties[0] ?? null,
                'doctorAvatar' => $c->doctor?->user?->profile_image,
                'patientAvatar' => $c->patient?->profile_image,
                'date' => $dateValue?->toDateString(),
                'time' => $timeValue,
                'updated_at' => $c->updated_at?->toDateTimeString(),
                'diagnosis' => $c->diagnosis,
                'medicines' => $c->prescription['medicines'] ?? [],
                'advice' => $c->prescription['advice'] ?? null,
                'allergies' => $c->prescription['allergies'] ?? null,
                'presentingComplaint' => $c->prescription['presentingComplaint'] ?? null,
                'presentIllness' => $c->prescription['presentIllness'] ?? null,
                'clinicalExamination' => $c->prescription['clinicalExamination'] ?? null,
                'vitals' => $c->prescription['vitals'] ?? null,
                'notes' => $c->notes,
                'follow_up_date' => $c->follow_up_date?->toDateString(),
            ];
        });

        return response()->json([
            'success' => true,
            'count' => $data->count(),
            'data' => $data,
        ]);
    }
}
