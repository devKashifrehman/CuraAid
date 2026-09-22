<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medicines', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('brand')->nullable();
            $table->string('category')->default('Medicine');
            $table->string('type')->default('Tablet');
            $table->string('illness')->nullable();
            $table->decimal('price', 10, 2)->default(0);
            $table->unsignedInteger('pack_size')->default(1);
            $table->string('unit_label')->default('tablet');
            $table->string('manufacturer')->nullable();
            $table->text('description')->nullable();
            $table->text('usage')->nullable();
            $table->json('aliases')->nullable();
            $table->string('image_key')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medicines');
    }
};
