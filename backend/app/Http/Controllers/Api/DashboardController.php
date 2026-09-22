<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Appointment;
use App\Models\Complaint;
use App\Models\Consultation;
use App\Models\ConsultationMessage;
use App\Models\DoctorProfile;
use App\Models\MedicalReport;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        if ($user instanceof Admin) {
            return response()->json(['success' => true, 'data' => $this->adminStats()]);
        }

        $doctorProfile = $user->doctorProfile;

        return response()->json([
            'success' => true,
            'data' => $doctorProfile ? $this->doctorStats($doctorProfile) : $this->patientStats($user),
        ]);
    }

    private function adminStats(): array
    {
        $startOfMonth = now()->startOfMonth();

        return [
            'totalDoctors' => DoctorProfile::count(),
            'newDoctors' => DoctorProfile::where('created_at', '>=', $startOfMonth)->count(),
            'totalPatients' => User::where('usertype_id', 1)->count(),
            'newPatients' => User::where('usertype_id', 1)->where('created_at', '>=', $startOfMonth)->count(),
            'pendingDocuments' => DoctorProfile::where('status', 'pending')->count(),
            'activeReports' => Complaint::where('status', 'open')->count(),
            'doctorDocuments' => DoctorProfile::with('user')->orderByDesc('created_at')->limit(5)->get()
                ->map(fn (DoctorProfile $d) => [
                    'id' => $d->id,
                    'name' => $d->user?->name,
                    'profile_image' => $d->user?->profile_image,
                    'document' => $d->license_image ? basename($d->license_image) : '1 Qualification(s)',
                    'status' => ucfirst($d->status),
                    'uploaded' => $d->created_at?->toDateString(),
                ]),
            'feedbackOverview' => $this->feedbackOverview(),
            'recentReports' => Complaint::with('respondent')->orderByDesc('created_at')->limit(5)->get()
                ->map(fn (Complaint $c) => [
                    'id' => $c->id,
                    'against' => $c->respondent?->name,
                    'reason' => $c->category,
                    'status' => ucfirst($c->status),
                ]),
            'analytics' => $this->adminAnalytics(),
            'recentAppointments' => Appointment::with(['doctor.user', 'patient'])->orderByDesc('created_at')->limit(8)->get()
                ->map(fn (Appointment $a) => [
                    'id' => $a->id,
                    'patient' => $a->patient?->name,
                    'doctor' => $a->doctor?->user?->name,
                    'date' => $a->appointment_date?->toDateString(),
                    'time' => $a->appointment_time,
                    'type' => $a->consultation_type,
                    'status' => $a->status,
                ]),
        ];
    }

    private function feedbackOverview(): array
    {
        $ratings = Consultation::whereNotNull('rating')->pluck('rating');
        $total = $ratings->count();
        $avg = $total ? round($ratings->avg(), 1) : 0;

        $distribution = collect(range(5, 1))->map(function ($stars) use ($ratings, $total) {
            $count = $ratings->filter(fn ($r) => (int) $r === $stars)->count();
            return [
                'stars' => $stars,
                'percentage' => $total ? round(($count / $total) * 100) : 0,
            ];
        });

        $contactFeedbacks = \App\Models\Feedback::count();
        $recentContactFeedbacks = \App\Models\Feedback::orderByDesc('created_at')->limit(3)->get()
            ->map(fn (\App\Models\Feedback $f) => [
                'name' => $f->name,
                'email' => $f->email,
                'message' => Str::limit($f->message, 80),
                'date' => $f->created_at?->diffForHumans(),
            ]);

        return [
            'overallRating' => $avg,
            'totalReviews' => $total,
            'distribution' => $distribution,
            'contactFeedbacks' => $contactFeedbacks,
            'recentContactFeedbacks' => $recentContactFeedbacks,
        ];
    }

    private function doctorStats(DoctorProfile $doctorProfile): array
    {
        $today = now()->toDateString();
        $startOfMonth = now()->startOfMonth();

        $todayAppointments = Appointment::where('doctor_profile_id', $doctorProfile->id)
            ->where('appointment_date', $today)
            ->with(['patient', 'consultation'])
            ->orderBy('appointment_time')
            ->get();

        $totalPatients = Appointment::where('doctor_profile_id', $doctorProfile->id)
            ->distinct('patient_id')->count('patient_id');

        $recentPatients = Appointment::where('doctor_profile_id', $doctorProfile->id)
            ->with('patient')->orderByDesc('created_at')->limit(5)->get();

        $recentPrescriptions = Consultation::where('doctor_profile_id', $doctorProfile->id)
            ->whereNotNull('prescription')->with('patient')
            ->orderByDesc('ended_at')->limit(5)->get();

        $ongoing = Consultation::where('doctor_profile_id', $doctorProfile->id)
            ->where('status', Consultation::STATUS_ONGOING)
            ->with(['patient', 'doctor.user', 'appointment'])->get();

        $completed = Consultation::where('doctor_profile_id', $doctorProfile->id)
            ->where('status', Consultation::STATUS_COMPLETED)
            ->with(['patient', 'doctor.user', 'appointment'])
            ->orderByDesc('ended_at')->limit(10)->get();

        return [
            'profileStatus' => $doctorProfile->status,
            'rejectionReason' => $doctorProfile->rejection_reason,
            'isVerified' => $doctorProfile->is_verified,
            'objectedDocument' => $doctorProfile->objected_document,
            'reuploadStatus' => $doctorProfile->reupload_status,
            'reuploadMessage' => $doctorProfile->reupload_message,
            'reuploadImage' => $doctorProfile->reupload_image,
            'todayConsultations' => Consultation::where('doctor_profile_id', $doctorProfile->id)
                ->whereDate('created_at', $today)->count(),
            'upcomingAppointments' => Appointment::where('doctor_profile_id', $doctorProfile->id)->upcoming()->count(),
            'totalPatients' => $totalPatients,
            'totalConsultations' => Consultation::where('doctor_profile_id', $doctorProfile->id)->count(),
            'averageRating' => (float) $doctorProfile->rating,
            'newPatientsThisMonth' => Appointment::where('doctor_profile_id', $doctorProfile->id)
                ->where('created_at', '>=', $startOfMonth)
                ->distinct('patient_id')->count('patient_id'),
            'consultationsThisMonth' => Consultation::where('doctor_profile_id', $doctorProfile->id)
                ->where('created_at', '>=', $startOfMonth)->count(),
            'totalReviews' => Consultation::where('doctor_profile_id', $doctorProfile->id)
                ->whereNotNull('rating')->count(),
            'todaySchedule' => $todayAppointments->map(fn (Appointment $a) => [
                'time' => $a->appointment_time,
                'name' => $a->patient?->name,
                'type' => ucfirst((string) $a->consultation_type) . ' Consultation',
                'status' => ucfirst($a->status),
                'avatar' => $a->patient?->profile_image,
                'consultationId' => $a->consultation?->id,
            ]),
            'recentPatients' => $recentPatients->map(fn (Appointment $a) => [
                'name' => $a->patient?->name,
                'issue' => is_array($a->symptoms) ? implode(', ', $a->symptoms) : $a->symptoms,
                'time' => $a->created_at?->diffForHumans(),
                'avatar' => $a->patient?->profile_image,
            ]),
            'recentPrescriptions' => $recentPrescriptions->map(fn (Consultation $c) => [
                'name' => $c->patient?->name,
                'medicine' => collect($c->prescription['medicines'] ?? [])->pluck('name')->filter()->implode(', ') ?: '—',
                'time' => $c->ended_at?->diffForHumans(),
            ]),
            'ongoingConsultations' => $this->withLastMessages($ongoing),
            'completedConsultations' => $this->withLastMessages($completed),
            'analytics' => $this->doctorAnalytics($doctorProfile),
            'consultationTypeDistribution' => $this->consultationTypeDistribution($doctorProfile),
        ];
    }

    private function patientStats(User $user): array
    {
        $latestRx = Consultation::where('patient_id', $user->id)
            ->whereNotNull('prescription')
            ->with(['doctor.user', 'patient'])
            ->orderByDesc('ended_at')
            ->orderByDesc('id')
            ->first();

        $next = Appointment::where('patient_id', $user->id)->upcoming()
            ->with(['doctor.user', 'consultation'])
            ->first();

        $ongoing = Consultation::where('patient_id', $user->id)
            ->where('status', Consultation::STATUS_ONGOING)
            ->with(['doctor.user', 'appointment', 'patient'])->get();

        $completed = Consultation::where('patient_id', $user->id)
            ->where('status', Consultation::STATUS_COMPLETED)
            ->with(['doctor.user', 'appointment', 'patient'])
            ->orderByDesc('ended_at')->limit(10)->get();

        $upcomingList = Appointment::where('patient_id', $user->id)->upcoming()
            ->with(['doctor.user', 'consultation'])
            ->limit(5)
            ->get()
            ->map(fn (Appointment $a) => $this->mapUpcomingAppointment($a))
            ->values();

        return [
            'upcomingAppointments' => Appointment::where('patient_id', $user->id)->upcoming()->count(),
            'activePrescriptions' => Consultation::where('patient_id', $user->id)
                ->whereNotNull('prescription')->count(),
            'activeMedicineCount' => count($latestRx?->prescription['medicines'] ?? []),
            'totalReports' => MedicalReport::where('patient_id', $user->id)->count(),
            'completedConsultations' => Consultation::where('patient_id', $user->id)
                ->where('status', Consultation::STATUS_COMPLETED)->count(),
            'ongoingConsultations' => $this->withLastMessages($ongoing),
            'completedConsultationsList' => $this->withLastMessages($completed),
            'upcomingAppointmentsList' => $upcomingList,
            'nextAppointment' => $this->mapUpcomingAppointment($next),
            'latestPrescription' => $this->mapPrescription($latestRx),
            'analytics' => $this->patientAnalytics($user),
        ];
    }

    private function mapUpcomingAppointment(?Appointment $a): ?array
    {
        if (!$a) {
            return null;
        }

        $when = $a->appointment_date?->format('D, d M Y') ?: '';
        if ($a->appointment_time) {
            $when .= ($when ? ', ' : '') . $a->appointment_time;
        }

        return [
            'id' => $a->id,
            'when' => $when ?: 'Scheduled',
            'doctorName' => $a->doctor?->user?->name ?: 'Doctor',
            'specialty' => $a->doctor?->specialties[0] ?? ($a->department ?: 'General Physician'),
            'consultationId' => $a->consultation?->id,
            'status' => $a->status,
            'type' => $a->consultation_type,
        ];
    }

    private function mapPrescription(?Consultation $c): ?array
    {
        if (!$c) {
            return null;
        }

        $specialty = $c->doctor?->specialties[0] ?? 'General Physician';
        $doctorName = $c->doctor?->user?->name ?: 'Doctor';

        return [
            'id' => $c->id,
            'patient' => $c->patient?->name,
            'patientName' => $c->patient?->name,
            'presId' => 'PRES ' . now()->year . '/' . str_pad((string) $c->id, 6, '0', STR_PAD_LEFT),
            'mrNumber' => 'MR-' . str_pad((string) ($c->patient_id ?? 0), 6, '0', STR_PAD_LEFT),
            'doctorName' => $doctorName,
            'doctorSpecialty' => $specialty,
            'prescribedBy' => "{$doctorName}, {$specialty}",
            'age' => $c->patient?->date_of_birth ? $c->patient->date_of_birth->age . 'y' : '',
            'gender' => $c->patient?->gender ? strtolower(substr((string) $c->patient->gender, 0, 1)) : '',
            'date' => optional($c->ended_at ?? $c->updated_at)->format('m/d/Y'),
            'diagnosis' => is_array($c->diagnosis) ? implode(', ', $c->diagnosis) : ($c->diagnosis ?: ''),
            'medicines' => $c->prescription['medicines'] ?? [],
            'advice' => $c->prescription['advice'] ?? null,
            'notes' => $c->notes,
        ];
    }

    private function withLastMessages(Collection $consultations): Collection
    {
        if ($consultations->isEmpty()) {
            return $consultations;
        }

        $latest = ConsultationMessage::whereIn('consultation_id', $consultations->pluck('id'))
            ->orderByDesc('id')
            ->get()
            ->unique('consultation_id')
            ->keyBy('consultation_id');

        $consultations->each(function (Consultation $c) use ($latest) {
            $c->setAttribute('last_message', $latest->get($c->id)?->message);
        });

        return $consultations;
    }

    private function consultationTypeDistribution(DoctorProfile $doctorProfile): array
    {
        $types = Appointment::where('doctor_profile_id', $doctorProfile->id)
            ->pluck('consultation_type')
            ->map(fn ($t) => strtolower(trim((string) ($t ?: 'other'))));

        $video = $types->filter(fn ($t) => $t === 'video')->count();
        $voice = $types->filter(fn ($t) => in_array($t, ['voice', 'audio'], true))->count();
        $chat = $types->filter(fn ($t) => $t === 'chat')->count();
        $other = $types->count() - $video - $voice - $chat;
        $total = $video + $voice + $chat + $other;

        $pct = fn (int $n) => $total ? (int) round(($n / $total) * 100) : 0;

        return [
            'total' => $total,
            'items' => [
                ['key' => 'video', 'label' => 'Video Consult', 'count' => $video, 'percent' => $pct($video)],
                ['key' => 'voice', 'label' => 'Voice Consult', 'count' => $voice, 'percent' => $pct($voice)],
                ['key' => 'chat', 'label' => 'Chat Consult', 'count' => $chat, 'percent' => $pct($chat)],
                ['key' => 'other', 'label' => 'Other', 'count' => $other, 'percent' => $pct($other)],
            ],
        ];
    }

    private function doctorAnalytics(DoctorProfile $doctorProfile): array
    {
        $days = collect(range(6, 0))->map(function ($ago) use ($doctorProfile) {
            $date = now()->subDays($ago)->toDateString();
            return [
                'label' => now()->subDays($ago)->format('D'),
                'consultations' => Consultation::where('doctor_profile_id', $doctorProfile->id)
                    ->whereDate('created_at', $date)->count(),
                'appointments' => Appointment::where('doctor_profile_id', $doctorProfile->id)
                    ->whereDate('appointment_date', $date)->count(),
            ];
        });

        $patientIds = Appointment::where('doctor_profile_id', $doctorProfile->id)->pluck('patient_id')->unique();
        $patients = User::whereIn('id', $patientIds)->get();
        $gender = [
            'male' => $patients->where('gender', 'male')->count(),
            'female' => $patients->where('gender', 'female')->count(),
            'other' => $patients->filter(fn ($p) => !in_array(strtolower((string) $p->gender), ['male', 'female'], true))->count(),
        ];

        $concerns = Appointment::where('doctor_profile_id', $doctorProfile->id)
            ->whereNotNull('symptoms')
            ->get()
            ->flatMap(function (Appointment $a) {
                $s = $a->symptoms;
                if (is_array($s)) {
                    return $s;
                }
                return $s ? [preg_replace('/\s+/', ' ', $s)] : [];
            })
            ->filter()
            ->countBy(fn ($c) => ucfirst(strtolower(trim((string) $c))))
            ->sortDesc()
            ->take(5)
            ->map(fn ($count, $name) => ['name' => $name, 'count' => $count])
            ->values();

        return [
            'weekly' => $days,
            'demographics' => $gender,
            'commonConcerns' => $concerns,
        ];
    }

    private function patientAnalytics(User $user): array
    {
        $days = collect(range(6, 0))->map(function ($ago) use ($user) {
            $date = now()->subDays($ago)->toDateString();
            return [
                'label' => now()->subDays($ago)->format('D'),
                'consultations' => Consultation::where('patient_id', $user->id)->whereDate('created_at', $date)->count(),
                'appointments' => Appointment::where('patient_id', $user->id)->whereDate('appointment_date', $date)->count(),
            ];
        });

        return ['weekly' => $days];
    }

    private function adminAnalytics(): array
    {
        $days = collect(range(6, 0))->map(function ($ago) {
            $date = now()->subDays($ago)->toDateString();
            return [
                'label' => now()->subDays($ago)->format('D'),
                'consultations' => Consultation::whereDate('created_at', $date)->count(),
                'appointments' => Appointment::whereDate('appointment_date', $date)->count(),
            ];
        });

        return [
            'weekly' => $days,
            'totalAppointments' => Appointment::count(),
            'pendingAppointments' => Appointment::where('status', 'pending')->count(),
            'totalConsultations' => Consultation::count(),
            'completedConsultations' => Consultation::where('status', Consultation::STATUS_COMPLETED)->count(),
        ];
    }
}
