<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Appointment extends Model
{
    protected $fillable = [
        'doctor_profile_id',
        'patient_id',
        'appointment_date',
        'appointment_time',
        'status',
        'symptoms',
        'duration',
        'age',
        'department',
        'severity',
        'consultation_type',
        'meeting_link',
        'notes',
        'cancelled_at',
        'cancellation_reason',
        'examination_report',
        'revisit',
        'revisit_reason',
        'reschedule_request',
        'recommended_by_consultation_id',
    ];

    protected $casts = [
        'appointment_date' => 'date',
        'symptoms' => 'array',
        'cancelled_at' => 'datetime',
        'revisit' => 'boolean',
        'reschedule_request' => 'array',
    ];

    // Status constants
    const STATUS_PENDING = 'pending';
    const STATUS_SCHEDULED = 'scheduled';
    const STATUS_IN_PROGRESS = 'in_progress';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';
    const STATUS_NO_SHOW = 'no_show';
    const STATUS_REJECTED = 'rejected';

    // Severity constants
    const SEVERITY_LOW = 'low';
    const SEVERITY_MEDIUM = 'medium';
    const SEVERITY_HIGH = 'high';

    // Consultation type constants
    const CONSULTATION_VIDEO = 'video';
    const CONSULTATION_AUDIO = 'audio';
    const CONSULTATION_CHAT = 'chat';
    const CONSULTATION_PHYSICAL = 'physical';

    /**
     * Get the doctor profile for this appointment
     */
    public function doctor(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class, 'doctor_profile_id');
    }

    /**
     * Get the patient for this appointment
     */
    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    /**
     * Get the consultation related to this appointment
     */
    public function consultation(): HasOne
    {
        return $this->hasOne(Consultation::class, 'appointment_id');
    }

    /**
     * Check if appointment can be started
     */
    public function canStart(): bool
    {
        return $this->status === self::STATUS_SCHEDULED;
    }

    /**
     * Check if appointment can be cancelled
     */
    public function canCancel(): bool
    {
        return in_array($this->status, [
            self::STATUS_PENDING,
            self::STATUS_SCHEDULED,
            self::STATUS_IN_PROGRESS,
        ]);
    }

    /**
     * Mark appointment as started
     */
    public function start(): bool
    {
        if (!$this->canStart()) {
            return false;
        }
        return $this->update(['status' => self::STATUS_IN_PROGRESS]);
    }

    /**
     * Mark appointment as completed
     */
    public function complete(): bool
    {
        return $this->update(['status' => self::STATUS_COMPLETED]);
    }

    /**
     * Cancel appointment
     */
    public function cancel(?string $reason = null): bool
    {
        if (!$this->canCancel()) {
            return false;
        }
        return $this->update([
            'status' => self::STATUS_CANCELLED,
            'cancelled_at' => now(),
            'cancellation_reason' => $reason,
        ]);
    }

    /**
     * Scope to get upcoming appointments
     */
    public function scopeUpcoming($query)
    {
        return $query->whereDate('appointment_date', '>=', today())
                    ->whereIn('status', [self::STATUS_PENDING, self::STATUS_SCHEDULED])
                    ->orderBy('appointment_date', 'asc');
    }

    /**
     * Scope to get past appointments
     */
    public function scopePast($query)
    {
        return $query->whereDate('appointment_date', '<', today())
                    ->orderBy('appointment_date', 'desc');
    }
}
