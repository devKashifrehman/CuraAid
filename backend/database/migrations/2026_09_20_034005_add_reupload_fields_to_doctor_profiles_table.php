<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table) {
            $table->string('objected_document')->nullable()->after('rejection_reason');
            $table->string('reupload_status')->nullable()->after('objected_document');
            $table->string('reupload_message')->nullable()->after('reupload_status');
            $table->string('reupload_image')->nullable()->after('reupload_message');
            $table->timestamp('reupload_at')->nullable()->after('reupload_image');
        });
    }

    public function down(): void
    {
        Schema::table('doctor_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'objected_document',
                'reupload_status',
                'reupload_message',
                'reupload_image',
                'reupload_at',
            ]);
        });
    }
};
