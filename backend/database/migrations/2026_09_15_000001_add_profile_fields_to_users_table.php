<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('gender', ['male', 'female', 'other'])->nullable()->after('mobile');
            $table->date('date_of_birth')->nullable()->after('gender');
            $table->string('blood_group')->nullable()->after('date_of_birth');
            $table->string('profile_image')->nullable()->after('blood_group');
            $table->string('address')->nullable()->after('profile_image');
            $table->double('lat')->nullable()->after('address');
            $table->double('lng')->nullable()->after('lat');
            $table->string('language')->default('English')->after('lng');
            $table->string('region')->default('Pakistan')->after('language');
            $table->boolean('two_factor_enabled')->default(false)->after('region');
            $table->unsignedInteger('warnings_count')->default(0)->after('two_factor_enabled');
            $table->string('last_action_reason')->nullable()->after('warnings_count');
        });

        // Widen the status enum to support admin moderation states.
        DB::statement("ALTER TABLE users MODIFY status ENUM('active','inactive','suspended','blocked') NOT NULL DEFAULT 'active'");
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'gender', 'date_of_birth', 'blood_group', 'profile_image',
                'address', 'lat', 'lng', 'language', 'region',
                'two_factor_enabled', 'warnings_count', 'last_action_reason',
            ]);
        });

        DB::statement("ALTER TABLE users MODIFY status ENUM('active','inactive') NOT NULL DEFAULT 'active'");
    }
};
