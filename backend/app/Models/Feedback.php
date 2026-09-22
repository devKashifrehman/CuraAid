<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    protected $table = 'feedback';

    protected $fillable = [
        'name',
        'email',
        'message',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'email', 'email');
    }
}
