<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complainant_id')->constrained('users')->cascadeOnDelete();
            $table->enum('complainant_role', ['patient', 'doctor']);
            $table->foreignId('respondent_id')->constrained('users')->cascadeOnDelete();
            $table->enum('respondent_role', ['patient', 'doctor']);
            $table->foreignId('appointment_id')->nullable()->constrained('appointments')->nullOnDelete();
            $table->foreignId('consultation_id')->nullable()->constrained('consultations')->nullOnDelete();
            $table->string('category');
            $table->enum('priority', ['low', 'average', 'high'])->default('average');
            $table->text('description');
            $table->string('proof_path')->nullable();
            $table->enum('status', ['open', 'warned', 'blocked', 'suspended', 'resolved'])->default('open');
            $table->text('resolution_reason')->nullable();
            $table->foreignId('resolved_by_admin_id')->nullable()->constrained('admins')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
