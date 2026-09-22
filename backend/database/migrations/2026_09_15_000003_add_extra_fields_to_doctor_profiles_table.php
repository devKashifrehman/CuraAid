<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table) {
            $table->text('rejection_reason')->nullable()->after('status');
            $table->double('lat')->nullable()->after('clinic_address');
            $table->double('lng')->nullable()->after('lat');
            $table->json('weekly_schedule')->nullable()->after('available_time_end');
        });
    }

    public function down(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table) {
            $table->dropColumn(['rejection_reason', 'lat', 'lng', 'weekly_schedule']);
        });
    }
};
