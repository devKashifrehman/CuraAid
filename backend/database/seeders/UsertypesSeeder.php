<?php

namespace Database\Seeders;

use App\Models\Usertypes;
use Illuminate\Database\Seeder;

class UsertypesSeeder extends Seeder
{
    public function run(): void
    {
        Usertypes::updateOrCreate(['id' => 1], ['role_name' => 'patient']);
        Usertypes::updateOrCreate(['id' => 2], ['role_name' => 'doctor']);
    }
}
