<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Consultation extends Model
{
    protected $fillable = [
        'appointment_id',
        'doctor_profile_id',
        'patient_id',
        'status',
        'started_at',
        'ended_at',
        'messages',
        'notes',
        'prescription',
        'diagnosis',
        'follow_up_date',
        'follow_up_time',
        'rating',
        'review_comment',
        'revisit',
        'revisit_reason',
        'examination_notes',
        'treatment_plan',
        'case_status',
        'active_call',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
        'follow_up_date' => 'date',
        'messages' => 'array',
        'prescription' => 'array',
        'diagnosis' => 'array',
        'rating' => 'integer',
        'revisit' => 'boolean',
        'active_call' => 'array',
    ];

    public function signals(): HasMany
    {
        return $this->hasMany(ConsultationSignal::class);
    }

    const STATUS_SCHEDULED = 'scheduled';
    const STATUS_ONGOING = 'ongoing';
    const STATUS_COMPLETED = 'completed';
    const STATUS_CANCELLED = 'cancelled';

    public function appointment(): BelongsTo
    {
        return $this->belongsTo(Appointment::class);
    }

    public function doctor(): BelongsTo
    {
        return $this->belongsTo(DoctorProfile::class, 'doctor_profile_id');
    }

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function isOngoing(): bool
    {
        return $this->status === self::STATUS_ONGOING;
    }

    public function chatMessages(): HasMany
    {
        return $this->hasMany(ConsultationMessage::class);
    }
}