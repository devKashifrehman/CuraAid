<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->string('case_status', 20)->default('ongoing')->after('notes');
            $table->date('follow_up_date')->nullable()->after('case_status');
            $table->string('follow_up_time', 5)->nullable()->after('follow_up_date');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn(['case_status', 'follow_up_date', 'follow_up_time']);
        });
    }
};