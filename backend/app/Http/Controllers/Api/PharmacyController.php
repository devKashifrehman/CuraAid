<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\Medicine;
use App\Models\PharmacyOrder;
use App\Models\PharmacyOrderItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class PharmacyController extends Controller
{
    public function index(Request $request)
    {
        $query = Medicine::where('is_active', true);

        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('brand', 'like', "%{$s}%")
                    ->orWhere('illness', 'like', "%{$s}%")
                    ->orWhere('manufacturer', 'like', "%{$s}%");
            });
        }

        $items = $query->orderBy('name')->get()->map->toPharmacyArray();

        return response()->json([
            'success' => true,
            'count' => $items->count(),
            'data' => $items,
        ]);
    }

    public function categories()
    {
        $cats = Medicine::where('is_active', true)
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values();

        return response()->json([
            'success' => true,
            'data' => $cats,
        ]);
    }

    /**
     * Place a pharmacy order (auth optional — guest checkout allowed with contact details).
     * Card payments are recorded as "paid" for demo; no real payment gateway.
     */
    public function placeOrder(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'customer_name' => 'required|string|max:255',
            'customer_phone' => 'required|string|max:40',
            'delivery_address' => 'required|string|max:1000',
            'payment_method' => 'required|in:cod,card',
            'items' => 'required|array|min:1',
            'items.*.medicine_id' => 'nullable|integer|exists:medicines,id',
            'items.*.medicine_name' => 'required|string|max:255',
            'items.*.quantity' => 'required|integer|min:1|max:500',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.from_prescription' => 'sometimes|boolean',
            'items.*.prescription_key' => 'nullable|string|max:100',
            'discount' => 'sometimes|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
            'prescription_meta' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $discount = (float) ($data['discount'] ?? 0);

        $order = DB::transaction(function () use ($request, $data, $discount) {
            $subtotal = 0;
            $lineRows = [];

            foreach ($data['items'] as $item) {
                $qty = (int) $item['quantity'];
                $unit = (float) $item['unit_price'];

                // Prefer authoritative price from DB when medicine_id is present
                if (!empty($item['medicine_id'])) {
                    $med = Medicine::find($item['medicine_id']);
                    if ($med) {
                        $unit = (float) $med->price;
                        $item['medicine_name'] = $med->name;
                    }
                }

                $lineTotal = round($unit * $qty, 2);
                $subtotal += $lineTotal;

                $lineRows[] = [
                    'medicine_id' => $item['medicine_id'] ?? null,
                    'medicine_name' => $item['medicine_name'],
                    'quantity' => $qty,
                    'unit_price' => $unit,
                    'line_total' => $lineTotal,
                    'from_prescription' => (bool) ($item['from_prescription'] ?? false),
                    'prescription_key' => $item['prescription_key'] ?? null,
                ];
            }

            $subtotal = round($subtotal, 2);
            $discount = min($discount, $subtotal);
            $total = round($subtotal - $discount, 2);
            $paymentMethod = $data['payment_method'];

            $actor = auth('sanctum')->user();
            $order = PharmacyOrder::create([
                'user_id' => $actor instanceof User ? $actor->id : null,
                'customer_name' => $data['customer_name'],
                'customer_phone' => $data['customer_phone'],
                'delivery_address' => $data['delivery_address'],
                'payment_method' => $paymentMethod,
                'payment_status' => $paymentMethod === 'card' ? 'paid' : 'pending',
                'status' => 'placed',
                'subtotal' => $subtotal,
                'discount' => $discount,
                'total' => $total,
                'prescription_meta' => $data['prescription_meta'] ?? null,
                'notes' => $data['notes'] ?? null,
            ]);

            foreach ($lineRows as $row) {
                PharmacyOrderItem::create(array_merge($row, [
                    'pharmacy_order_id' => $order->id,
                ]));
            }

            return $order->load('items');
        });

        return response()->json([
            'success' => true,
            'message' => 'Order placed successfully',
            'data' => $order->toApiArray(),
        ], 201);
    }

    /**
     * List orders for the authenticated user.
     */
    public function myOrders(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        $orders = PharmacyOrder::with('items')
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->get()
            ->map->toApiArray();

        return response()->json([
            'success' => true,
            'count' => $orders->count(),
            'data' => $orders,
        ]);
    }

    /**
     * Show a single order (owner only, or by id+phone for guest confirmation).
     */
    public function showOrder(Request $request, $id)
    {
        $order = PharmacyOrder::with('items')->find($id);
        if (!$order) {
            return response()->json([
                'success' => false,
                'message' => 'Order not found',
            ], 404);
        }

        $user = auth('sanctum')->user();
        if ($user instanceof Admin) {
            return response()->json(['success' => true, 'data' => $order->toApiArray()]);
        }
        if ($user instanceof User && $order->user_id === $user->id) {
            return response()->json(['success' => true, 'data' => $order->toApiArray()]);
        }

        // Guest lookup: require matching phone
        $phone = $request->query('phone');
        if ($phone && $order->customer_phone === $phone) {
            return response()->json(['success' => true, 'data' => $order->toApiArray()]);
        }

        return response()->json([
            'success' => false,
            'message' => 'Unauthorized',
        ], 403);
    }

    /**
     * Identify medicines from an uploaded prescription image/PDF or OCR text,
     * matching against pharmacy stock and (when logged in) the patient's e-prescriptions.
     */
    public function identify(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'nullable|file|mimes:jpg,jpeg,png,webp,gif,pdf|max:10240',
            'text' => 'nullable|string|max:20000',
            'use_latest_prescription' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $catalog = Medicine::where('is_active', true)->get();
        $source = 'none';
        $rawLines = [];
        $haystack = strtolower((string) $request->input('text', ''));

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $haystack .= ' ' . strtolower($file->getClientOriginalName());
        }

        $user = auth('sanctum')->user();
        if (!$user && $request->bearerToken()) {
            $token = \Laravel\Sanctum\PersonalAccessToken::findToken($request->bearerToken());
            $user = $token?->tokenable;
        }
        if (!($user instanceof User)) {
            $user = null;
        }
        if ($request->boolean('use_latest_prescription') && $user) {
            $consult = \App\Models\Consultation::where('patient_id', $user->id)
                ->whereNotNull('prescription')
                ->orderByDesc('ended_at')
                ->orderByDesc('id')
                ->first();

            $meds = $consult?->prescription['medicines'] ?? [];
            if ($meds) {
                $source = 'e-prescription';
                foreach ($meds as $med) {
                    $rawLines[] = [
                        'rawName' => $med['name'] ?? ($med['medicine'] ?? ''),
                        'frequency' => $med['frequency'] ?? ($med['dosage'] ?? $med['dose'] ?? ''),
                        'duration' => $med['duration'] ?? ($med['days'] ?? ''),
                    ];
                }
            }
        }

        if (!$rawLines && $haystack) {
            $matched = $this->matchCatalogFromText($haystack, $catalog);
            if ($matched) {
                $source = $request->filled('text') ? 'ocr' : 'filename';
                $rawLines = $matched;
            }
        }

        if (!$rawLines && $user && !$request->boolean('use_latest_prescription')) {
            $consult = \App\Models\Consultation::where('patient_id', $user->id)
                ->whereNotNull('prescription')
                ->orderByDesc('ended_at')
                ->orderByDesc('id')
                ->first();
            $meds = $consult?->prescription['medicines'] ?? [];
            if ($meds) {
                $source = 'e-prescription';
                foreach ($meds as $med) {
                    $rawLines[] = [
                        'rawName' => $med['name'] ?? '',
                        'frequency' => $med['frequency'] ?? ($med['dosage'] ?? ''),
                        'duration' => $med['duration'] ?? '',
                    ];
                }
            }
        }

        $items = [];
        foreach ($rawLines as $index => $line) {
            $product = $this->findCatalogMedicine($line['rawName'] ?? '', $catalog);
            $items[] = [
                'key' => 'rx-' . ($index + 1),
                'rawName' => $line['rawName'] ?? 'Unknown',
                'productId' => $product?->id,
                'frequency' => $line['frequency'] ?: '1 time per day',
                'duration' => $line['duration'] ?: '5 days',
                'available' => (bool) $product,
                'product' => $product?->toPharmacyArray(),
            ];
        }

        return response()->json([
            'success' => true,
            'source' => $source,
            'count' => count($items),
            'data' => $items,
        ]);
    }

    public function storeMedicine(Request $request)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        $validator = Validator::make($request->all(), $this->medicineRules());
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $this->medicinePayload($request);
        if ($request->hasFile('image')) {
            $data['image_key'] = $request->file('image')->store('medicines', 'public');
        }

        $medicine = Medicine::create($data);

        return response()->json([
            'success' => true,
            'message' => 'Medicine added to pharmacy catalogue',
            'data' => $medicine->toPharmacyArray(),
        ], 201);
    }

    public function updateMedicine(Request $request, $id)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        $medicine = Medicine::find($id);
        if (!$medicine) {
            return response()->json(['success' => false, 'message' => 'Medicine not found'], 404);
        }

        $validator = Validator::make($request->all(), $this->medicineRules(false));
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $data = $this->medicinePayload($request, false);
        if ($request->hasFile('image')) {
            if ($medicine->image_key && !preg_match('/^[1-6]$/', (string) $medicine->image_key)) {
                Storage::disk('public')->delete($medicine->image_key);
            }
            $data['image_key'] = $request->file('image')->store('medicines', 'public');
        }

        $medicine->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Medicine updated',
            'data' => $medicine->fresh()->toPharmacyArray(),
        ]);
    }

    public function destroyMedicine(Request $request, $id)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        $medicine = Medicine::find($id);
        if (!$medicine) {
            return response()->json(['success' => false, 'message' => 'Medicine not found'], 404);
        }

        $medicine->update(['is_active' => false]);

        return response()->json([
            'success' => true,
            'message' => 'Medicine removed from catalogue',
        ]);
    }

    public function adminOrders(Request $request)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        $query = PharmacyOrder::with('items')->orderByDesc('created_at');
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $orders = $query->limit(100)->get()->map->toApiArray();

        return response()->json([
            'success' => true,
            'count' => $orders->count(),
            'data' => $orders,
        ]);
    }

    public function updateOrderStatus(Request $request, $id)
    {
        if ($guard = $this->requireAdmin($request)) {
            return $guard;
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:placed,preparing,shipped,delivered,cancelled',
        ]);
        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $order = PharmacyOrder::with('items')->find($id);
        if (!$order) {
            return response()->json(['success' => false, 'message' => 'Order not found'], 404);
        }

        $order->update(['status' => $request->status]);

        return response()->json([
            'success' => true,
            'message' => 'Order status updated',
            'data' => $order->fresh('items')->toApiArray(),
        ]);
    }

    private function requireAdmin(Request $request)
    {
        $user = $request->user() ?: auth('sanctum')->user();
        if (!$user instanceof Admin) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized. Admin access required.',
            ], 403);
        }

        return null;
    }

    private function medicineRules(bool $creating = true): array
    {
        $name = $creating ? 'required' : 'sometimes';
        $price = $creating ? 'required' : 'sometimes';

        return [
            'name' => "$name|string|max:255",
            'brand' => 'nullable|string|max:255',
            'category' => 'nullable|string|max:100',
            'type' => 'nullable|string|max:80',
            'illness' => 'nullable|string|max:120',
            'price' => "$price|numeric|min:0",
            'pack_size' => 'nullable|integer|min:1|max:5000',
            'packSize' => 'nullable|integer|min:1|max:5000',
            'unit_label' => 'nullable|string|max:40',
            'unitLabel' => 'nullable|string|max:40',
            'manufacturer' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:5000',
            'usage' => 'nullable|string|max:2000',
            'dosage' => 'nullable|string|max:80',
            'aliases' => 'nullable',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp,gif|max:5120',
            'is_active' => 'sometimes|boolean',
        ];
    }

    private function medicinePayload(Request $request, bool $creating = true): array
    {
        $name = trim((string) $request->input('name', ''));
        $dosage = trim((string) $request->input('dosage', ''));
        if ($dosage && $name && !str_contains(strtolower($name), strtolower($dosage))) {
            $name = trim($name . ' ' . $dosage);
        }

        $aliases = $request->input('aliases');
        if (is_string($aliases)) {
            $decoded = json_decode($aliases, true);
            $aliases = is_array($decoded) ? $decoded : array_filter(array_map('trim', explode(',', $aliases)));
        }
        if (!is_array($aliases)) {
            $aliases = [];
        }
        if ($name) {
            $aliases[] = strtolower($name);
        }
        $aliases = array_values(array_unique(array_filter($aliases)));

        $payload = [
            'brand' => $request->input('brand') ?: 'Pharmacy',
            'category' => $request->input('category') ?: 'Medicine',
            'type' => $request->input('type') ?: 'Tablet',
            'illness' => $request->input('illness') ?: 'General',
            'pack_size' => (int) ($request->input('pack_size', $request->input('packSize', 1)) ?: 1),
            'unit_label' => $request->input('unit_label', $request->input('unitLabel', 'tablet')) ?: 'tablet',
            'manufacturer' => $request->input('manufacturer') ?: $request->input('brand') ?: 'Pharmacy',
            'description' => $request->input('description') ?: 'No description provided.',
            'usage' => $request->input('usage') ?: 'As directed by your physician or pharmacist.',
            'aliases' => $aliases,
        ];

        if ($creating || $request->filled('name')) {
            $payload['name'] = $name;
        }
        if ($creating || $request->exists('price')) {
            $payload['price'] = (float) $request->input('price', 0);
        }
        if ($request->exists('is_active')) {
            $payload['is_active'] = $request->boolean('is_active');
        }

        return $payload;
    }

    private function matchCatalogFromText(string $haystack, $catalog): array
    {
        $found = [];
        foreach ($catalog as $med) {
            $needles = array_filter(array_merge(
                [$med->name, $med->brand],
                is_array($med->aliases) ? $med->aliases : []
            ));
            foreach ($needles as $needle) {
                $n = strtolower(trim((string) $needle));
                if (strlen($n) < 4) {
                    continue;
                }
                if (str_contains($haystack, $n)) {
                    $found[] = [
                        'rawName' => $med->name,
                        'frequency' => $this->guessFrequency($haystack),
                        'duration' => $this->guessDuration($haystack),
                    ];
                    break;
                }
            }
        }

        return $found;
    }

    private function findCatalogMedicine(string $rawName, $catalog): ?Medicine
    {
        $text = strtolower(preg_replace('/\s+/', ' ', $rawName));
        if ($text === '') {
            return null;
        }

        foreach ($catalog as $med) {
            $name = strtolower($med->name);
            $aliases = array_map('strtolower', $med->aliases ?? []);
            if (str_contains($name, $text) || str_contains($text, explode('(', $name)[0])) {
                return $med;
            }
            foreach ($aliases as $alias) {
                if ($alias && (str_contains($text, $alias) || str_contains($alias, explode(' ', $text)[0]))) {
                    return $med;
                }
            }
        }

        return null;
    }

    private function guessFrequency(string $text): string
    {
        if (preg_match('/(\d+)\s*(?:times?|x)\s*(?:a|per)?\s*day/', $text, $m)) {
            return $m[1] . ' times per day';
        }
        if (preg_match('/\b(od|once|1\s*daily)\b/', $text)) {
            return '1 tablet OD';
        }
        if (preg_match('/\b(bd|twice)\b/', $text)) {
            return '2 times per day';
        }
        if (preg_match('/\b(tds|thrice)\b/', $text)) {
            return '3 times per day';
        }
        return '1 time per day';
    }

    private function guessDuration(string $text): string
    {
        if (preg_match('/(\d+)\s*days?/', $text, $m)) {
            return $m[1] . ' days';
        }
        if (preg_match('/(\d+)\s*weeks?/', $text, $m)) {
            return ($m[1] * 7) . ' days';
        }
        return '5 days';
    }
}
