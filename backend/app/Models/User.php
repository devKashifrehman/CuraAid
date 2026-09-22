<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
protected $fillable = [
    'name',
    'email',
    'mobile',
    'password',
    'status',
    'auth_provider',
    'provider_id',
    'usertype_id',
    'gender',
    'date_of_birth',
    'blood_group',
    'profile_image',
    'address',
    'lat',
    'lng',
    'language',
    'region',
    'two_factor_enabled',
    'warnings_count',
    'last_action_reason',
];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'date_of_birth' => 'date',
            'two_factor_enabled' => 'boolean',
        ];
    }
    public function doctorProfile(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(DoctorProfile::class);
    }

    public function usertype(): BelongsTo
    {
        return $this->belongsTo(Usertypes::class, 'usertype_id');
    }

    public function appointments(): HasMany
    {
        return $this->hasMany(Appointment::class, 'patient_id');
    }

    public function consultations(): HasMany
    {
        return $this->hasMany(Consultation::class, 'patient_id');
    }

    public function complaintsFiled(): HasMany
    {
        return $this->hasMany(Complaint::class, 'complainant_id');
    }

    public function complaintsAgainst(): HasMany
    {
        return $this->hasMany(Complaint::class, 'respondent_id');
    }

    public function actionLogs(): HasMany
    {
        return $this->hasMany(UserActionLog::class);
    }
}
