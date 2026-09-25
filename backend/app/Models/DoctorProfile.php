<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DoctorProfile extends Model
{
    /**
     * Default weekly availability used whenever a doctor has not saved
     * their own schedule yet (mirrors the frontend's buildDefaultSchedule).
     */
    public const DEFAULT_WEEKLY_SCHEDULE = [
        'monday'    => ['enabled' => true,  'slots' => [['id' => 1, 'start' => '09:00', 'end' => '17:00', 'type' => 'available']]],
        'tuesday'   => ['enabled' => true,  'slots' => [['id' => 1, 'start' => '09:00', 'end' => '17:00', 'type' => 'available']]],
        'wednesday' => ['enabled' => true,  'slots' => [['id' => 1, 'start' => '09:00', 'end' => '17:00', 'type' => 'available']]],
        'thursday'  => ['enabled' => false, 'slots' => []],
        'friday'    => ['enabled' => true,  'slots' => [['id' => 1, 'start' => '09:00', 'end' => '17:00', 'type' => 'available']]],
        'saturday'  => ['enabled' => false, 'slots' => []],
        'sunday'    => ['enabled' => false, 'slots' => []],
    ];

    protected $fillable = [
        'user_id',
        'pmdc_number',
        'license_expiry',
        'license_image',
        'qualifications',
        'specialties',
        'experiences',
        'cnic_document',
        'status',
        'rating',
        'experience_years',
        'location',
        'phone',
        'email',
        'consultation_fee',
        'available_days',
        'available_time_start',
        'available_time_end',
        'bio',
        'clinic_name',
        'clinic_address',
        'is_verified',
        'rejection_reason',
        'lat',
        'lng',
        'weekly_schedule',
        'max_appointments_per_day',
        'objected_document',
        'reupload_status',
        'reupload_message',
        'reupload_image',
        'reupload_at',
    ];

    protected $casts = [
        'license_expiry' => 'date',
        'qualifications' => 'array',
        'specialties' => 'array',
        'experiences' => 'array',
        'available_days' => 'array',
        'weekly_schedule' => 'array',
        'rating' => 'float',
        'consultation_fee' => 'decimal:2',
        'is_verified' => 'boolean',
        'max_appointments_per_day' => 'integer',
        'reupload_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'doctor_profile_id');
    }

    public function consultations(): HasMany
    {
        return $this->hasMany(Consultation::class, 'doctor_profile_id');
    }

    public function isOnline(): bool
    {
        $ongoing = $this->consultations()
            ->where('status', 'ongoing')
            ->count();
        
        if ($ongoing > 0) {
            return false;
        }

        return true;
    }

    /**
     * The doctor's weekly schedule, or the default if none saved yet.
     */
    public function weeklyScheduleOrDefault(): array
    {
        return !empty($this->weekly_schedule) && is_array($this->weekly_schedule)
            ? $this->weekly_schedule
            : self::DEFAULT_WEEKLY_SCHEDULE;
    }

    public function toDoctorArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->user ? $this->user->name : 'Dr. Unknown',
            'specialization' => $this->specialties[0] ?? 'General Physician',
            'rating' => (float) ($this->rating ?? 0),
            'experience' => (int) ($this->experience_years ?? 0),
            'location' => $this->location ?? '',
            'status' => $this->isOnline() ? 'online' : 'offline',
            'phone' => $this->phone ?? '',
            'email' => $this->email ?? $this->user?->email ?? '',
            'consultation_fee' => (float)($this->consultation_fee ?? 0),
            'specialties' => $this->specialties ?? [],
            'clinic_name' => $this->clinic_name ?? '',
            'clinic_address' => $this->clinic_address ?? '',
            'bio' => $this->bio ?? '',
            'experience_years' => (int)$this->experience_years,
            'profile_image' => $this->user?->profile_image ?? null,
        ];
    }
}
