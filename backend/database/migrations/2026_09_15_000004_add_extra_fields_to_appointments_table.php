<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->text('examination_report')->nullable()->after('notes');
            $table->boolean('revisit')->default(false)->after('examination_report');
            $table->text('revisit_reason')->nullable()->after('revisit');
            $table->json('reschedule_request')->nullable()->after('revisit_reason');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['examination_report', 'revisit', 'revisit_reason', 'reschedule_request']);
        });
    }
};
