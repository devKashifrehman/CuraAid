<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (!Schema::hasColumn('appointments', 'prescription')) {
                $table->json('prescription')->nullable()->after('examination_report');
            }
            if (!Schema::hasColumn('appointments', 'diagnosis')) {
                $table->json('diagnosis')->nullable()->after('prescription');
            }
            if (!Schema::hasColumn('appointments', 'lat')) {
                $table->double('lat')->nullable()->after('diagnosis');
            }
            if (!Schema::hasColumn('appointments', 'lng')) {
                $table->double('lng')->nullable()->after('lat');
            }
        });

        Schema::table('consultations', function (Blueprint $table) {
            if (!Schema::hasColumn('consultations', 'converted_to_appointment')) {
                $table->boolean('converted_to_appointment')->default(false)->after('case_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['prescription', 'diagnosis', 'lat', 'lng']);
        });

        Schema::table('consultations', function (Blueprint $table) {
            $table->dropColumn('converted_to_appointment');
        });
    }
};