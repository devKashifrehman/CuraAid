<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Consultation;
use App\Models\Feedback;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FeedbackController extends Controller
{
    /**
     * Public contact/feedback form submission.
     * Frontend sends PascalCase fields: Name, Email, Message.
     */
    public function store(Request $request)
    {
        $data = [
            'name' => $request->input('Name', $request->input('name')),
            'email' => $request->input('Email', $request->input('email')),
            'message' => $request->input('Message', $request->input('message')),
        ];

        $validator = Validator::make($data, [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'message' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        $feedback = Feedback::create($validator->validated());

        return response()->json([
            'success' => true,
            'message' => 'Feedback submitted successfully',
            'data' => $feedback,
        ], 201);
    }

    /**
     * Public homepage testimonials: consultation reviews first, then contact-form messages.
     */
    public function publicReviews()
    {
        $reviews = Consultation::with('patient')
            ->whereNotNull('review_comment')
            ->where('review_comment', '!=', '')
            ->whereNotNull('rating')
            ->orderByDesc('updated_at')
            ->limit(6)
            ->get()
            ->map(fn (Consultation $c) => [
                'name' => $c->patient?->name ?: 'Patient',
                'text' => $c->review_comment,
                'rating' => (int) $c->rating,
            ]);

        if ($reviews->isEmpty()) {
            $reviews = Feedback::orderByDesc('created_at')
                ->limit(6)
                ->get()
                ->map(fn (Feedback $f) => [
                    'name' => $f->name ?: 'Patient',
                    'text' => $f->message,
                    'rating' => 5,
                ]);
        }

        return response()->json([
            'success' => true,
            'data' => $reviews->values(),
        ]);
    }
}
