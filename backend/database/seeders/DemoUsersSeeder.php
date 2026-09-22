<?php

namespace Database\Seeders;

use App\Models\DoctorProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DemoUsersSeeder extends Seeder
{
    public function run(): void
    {
        $patient = User::updateOrCreate(
            ['email' => 'patient1@test.com'],
            [
                'name' => 'Demo Patient',
                'password' => Hash::make('secret123'),
                'usertype_id' => 1,
                'status' => 'active',
                'mobile' => '03001234567',
            ]
        );

        $doctors = [
            ['email' => 'doctor1@test.com', 'name' => 'Dr. Ahmed Khan', 'pmdc' => 'PMDC-12345', 'specs' => ['Cardiologist'], 'exp' => 15, 'loc' => 'Lahore', 'fee' => 1500, 'rating' => 4.9],
            ['email' => 'doctor2@test.com', 'name' => 'Dr. Ayesha Khan', 'pmdc' => 'PMDC-12346', 'specs' => ['General Physician'], 'exp' => 10, 'loc' => 'Lahore', 'fee' => 800, 'rating' => 4.8],
            ['email' => 'doctor3@test.com', 'name' => 'Dr. Sanaullah', 'pmdc' => 'PMDC-12347', 'specs' => ['Dermatologist'], 'exp' => 8, 'loc' => 'Islamabad', 'fee' => 1200, 'rating' => 4.5],
            ['email' => 'doctor4@test.com', 'name' => 'Dr. Fatima Noor', 'pmdc' => 'PMDC-12348', 'specs' => ['Dentist'], 'exp' => 6, 'loc' => 'Karachi', 'fee' => 1000, 'rating' => 4.6],
            ['email' => 'doctor5@test.com', 'name' => 'Dr. Hina Tariq', 'pmdc' => 'PMDC-12349', 'specs' => ['Psychologist'], 'exp' => 9, 'loc' => 'Lahore', 'fee' => 2000, 'rating' => 4.7],
            ['email' => 'doctor6@test.com', 'name' => 'Dr. Nadia Begum', 'pmdc' => 'PMDC-12350', 'specs' => ['Gynecologist'], 'exp' => 12, 'loc' => 'Lahore', 'fee' => 1800, 'rating' => 4.8],
            ['email' => 'doctor7@test.com', 'name' => 'Dr. Usman Malik', 'pmdc' => 'PMDC-12351', 'specs' => ['Cardiologist'], 'exp' => 8, 'loc' => 'Islamabad', 'fee' => 1300, 'rating' => 4.4],
        ];

        foreach ($doctors as $d) {
            $user = User::updateOrCreate(
                ['email' => $d['email']],
                [
                    'name' => $d['name'],
                    'password' => Hash::make('secret123'),
                    'usertype_id' => 2,
                    'status' => 'active',
                    'mobile' => '0300' . substr(md5($d['email']), 0, 7),
                ]
            );

            DoctorProfile::updateOrCreate(
                ['user_id' => $user->id],
                [
                    'pmdc_number' => $d['pmdc'],
                    'license_expiry' => now()->addYears(2)->toDateString(),
                    'specialties' => $d['specs'],
                    'qualifications' => [['degree' => 'MBBS', 'institute' => 'Demo University']],
                    'experiences' => [['years' => $d['exp'], 'place' => $d['loc'] . ' Clinic']],
                    'status' => 'approved',
                    'is_verified' => true,
                    'rating' => $d['rating'] ?? 4.7,
                    'experience_years' => $d['exp'],
                    'location' => $d['loc'],
                    'phone' => $user->mobile,
                    'email' => $d['email'],
                    'consultation_fee' => $d['fee'],
                    'clinic_name' => $d['name'] . ' Clinic',
                    'clinic_address' => $d['loc'],
                    'max_appointments_per_day' => 12,
                ]
            );
        }

        unset($patient);
    }
}
