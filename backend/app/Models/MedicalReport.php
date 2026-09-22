<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
class MedicalReport extends Model
{
    protected $fillable = [
        'patient_id',
        'uploaded_by',
        'consultation_id',
        'original_name',
        'file_path',
        'mime_type',
        'file_size',
        'sent_to_doctor',
    ];

    protected $casts = [
        'sent_to_doctor' => 'boolean',
        'file_size' => 'integer',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'patient_id');
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function consultation(): BelongsTo
    {
        return $this->belongsTo(Consultation::class);
    }

    public function toClinicArray(): array
    {
        $kb = $this->file_size > 0 ? round($this->file_size / 1024, 1) : 0;
        $url = null;
        if ($this->file_path) {
            $url = rtrim(config('app.url'), '/') . '/storage/' . ltrim($this->file_path, '/');
        }

        return [
            'id' => $this->id,
            'name' => $this->original_name,
            'size' => "{$kb} KB",
            'type' => $this->mime_type,
            'date' => $this->created_at?->toDateString(),
            'url' => $url,
            'path' => $this->file_path,
            'sentToDoctor' => (bool) $this->sent_to_doctor,
            'consultation_id' => $this->consultation_id,
            'patient_id' => $this->patient_id,
        ];
    }
}
