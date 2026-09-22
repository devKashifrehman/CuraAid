<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Medicine extends Model
{
    protected $fillable = [
        'name', 'brand', 'category', 'type', 'illness', 'price',
        'pack_size', 'unit_label', 'manufacturer', 'description',
        'usage', 'aliases', 'image_key', 'is_active',
    ];

    protected $casts = [
        'price' => 'float',
        'pack_size' => 'integer',
        'aliases' => 'array',
        'is_active' => 'boolean',
    ];

    public function toPharmacyArray(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'brand' => $this->brand,
            'category' => $this->category,
            'type' => $this->type,
            'illness' => $this->illness,
            'price' => (float) $this->price,
            'packSize' => (int) $this->pack_size,
            'unitLabel' => $this->unit_label,
            'manufacturer' => $this->manufacturer,
            'description' => $this->description,
            'usage' => $this->usage,
            'aliases' => $this->aliases ?? [],
            'image_key' => $this->image_key,
            'image_url' => $this->uploadedImageUrl(),
            'is_active' => (bool) $this->is_active,
        ];
    }

    private function uploadedImageUrl(): ?string
    {
        $key = (string) $this->image_key;
        if ($key === '' || preg_match('/^[1-6]$/', $key)) {
            return null;
        }

        return rtrim((string) config('app.url'), '/') . '/storage/' . ltrim($key, '/');
    }
}
