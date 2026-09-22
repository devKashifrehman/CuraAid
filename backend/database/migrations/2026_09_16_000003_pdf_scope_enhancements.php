<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table) {
            if (!Schema::hasColumn('doctor_profiles', 'max_appointments_per_day')) {
                $table->unsignedTinyInteger('max_appointments_per_day')->default(12);
            }
        });

        Schema::table('consultations', function (Blueprint $table) {
            if (!Schema::hasColumn('consultations', 'examination_notes')) {
                $table->text('examination_notes')->nullable();
            }
            if (!Schema::hasColumn('consultations', 'treatment_plan')) {
                $table->text('treatment_plan')->nullable();
            }
            if (!Schema::hasColumn('consultations', 'case_status')) {
                $table->string('case_status', 30)->default('ongoing');
            }
            if (!Schema::hasColumn('consultations', 'active_call')) {
                $table->json('active_call')->nullable();
            }
        });

        if (!Schema::hasTable('consultation_signals')) {
            Schema::create('consultation_signals', function (Blueprint $table) {
                $table->id();
                $table->foreignId('consultation_id')->constrained('consultations')->cascadeOnDelete();
                $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
                $table->string('kind', 30);
                $table->json('payload')->nullable();
                $table->timestamps();
                $table->index(['consultation_id', 'id']);
            });
        }

        $driver = Schema::getConnection()->getDriverName();
        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE appointments MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'pending'");
            DB::statement("ALTER TABLE appointments MODIFY COLUMN consultation_type VARCHAR(20) NOT NULL DEFAULT 'video'");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('consultation_signals');

        Schema::table('consultations', function (Blueprint $table) {
            foreach (['examination_notes', 'treatment_plan', 'case_status', 'active_call'] as $col) {
                if (Schema::hasColumn('consultations', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('doctor_profiles', function (Blueprint $table) {
            if (Schema::hasColumn('doctor_profiles', 'max_appointments_per_day')) {
                $table->dropColumn('max_appointments_per_day');
            }
        });
    }
};
