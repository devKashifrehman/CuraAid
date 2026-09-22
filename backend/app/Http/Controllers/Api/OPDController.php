<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DoctorProfile;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class OPDController extends Controller
{
    /**
     * Get all available specialties
     */
    public function getSpecialties()
    {
        try {
            $specialties = DoctorProfile::where('status', 'approved')
                ->get()
                ->flatMap(function ($doctor) {
                    $specs = is_string($doctor->specialties) 
                        ? json_decode($doctor->specialties, true) 
                        : $doctor->specialties;
                    return $specs ?? [];
                })
                ->unique()
                ->values()
                ->toArray();

            return response()->json([
                'success' => true,
                'data' => $specialties
            ]);
        } catch (\Exception $e) {
            Log::error('Get specialties error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch specialties'
            ], 500);
        }
    }

    /**
     * Get doctors by specialty
     */
    public function getDoctorsBySpecialty($specialty)
    {
        try {
            $doctors = DoctorProfile::with('user')
                ->where('status', 'approved')
                ->get()
                ->filter(function ($doctor) use ($specialty) {
                    $specialties = is_string($doctor->specialties) 
                        ? json_decode($doctor->specialties, true) 
                        : $doctor->specialties;
                    return $specialties && in_array($specialty, $specialties);
                })
                ->map(function ($doctor) {
                    return $this->formatDoctor($doctor);
                })
                ->values();

            return response()->json([
                'success' => true,
                'count' => $doctors->count(),
                'data' => $doctors
            ]);
        } catch (\Exception $e) {
            Log::error('Get doctors by specialty error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch doctors'
            ], 500);
        }
    }

    /**
     * Get online doctors
     */
    public function getOnlineDoctors()
    {
        try {
            $doctors = DoctorProfile::with('user')
                ->where('status', 'approved')
                ->get()
                ->map(function ($doctor) {
                    return $this->formatDoctor($doctor);
                })
                ->filter(fn ($d) => ($d['status'] ?? '') === 'online')
                ->values();

            return response()->json([
                'success' => true,
                'count' => $doctors->count(),
                'data' => $doctors
            ]);
        } catch (\Exception $e) {
            Log::error('Get online doctors error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch online doctors'
            ], 500);
        }
    }

    /**
     * Get available doctors (online + no active consultations)
     */
    public function getAvailableDoctors()
    {
        try {
            $doctors = DoctorProfile::with('user')
                ->where('status', 'approved')
                ->get()
                ->map(function ($doctor) {
                    return $this->formatDoctor($doctor);
                })
                ->filter(fn ($d) => ($d['is_available'] ?? true) === true)
                ->values();

            return response()->json([
                'success' => true,
                'count' => $doctors->count(),
                'data' => $doctors
            ]);
        } catch (\Exception $e) {
            Log::error('Get available doctors error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch available doctors'
            ], 500);
        }
    }

    /**
     * Get top-rated doctors
     */
    public function getTopRatedDoctors(Request $request)
    {
        try {
            $limit = $request->get('limit', 10);
            
            $doctors = DoctorProfile::with('user')
                ->where('status', 'approved')
                ->orderBy('rating', 'desc')
                ->limit($limit)
                ->get()
                ->map(function ($doctor) {
                    return $this->formatDoctor($doctor);
                });

            return response()->json([
                'success' => true,
                'count' => $doctors->count(),
                'data' => $doctors
            ]);
        } catch (\Exception $e) {
            Log::error('Get top-rated doctors error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch top-rated doctors'
            ], 500);
        }
    }

    /**
     * Search doctors by name, specialty, or location
     */
    public function searchDoctors(Request $request)
    {
        try {
            $query = $request->get('query', '');
            $specialty = $request->get('specialty', '');
            $location = $request->get('location', '');

            if (empty($query) && empty($specialty) && empty($location)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Search query is required'
                ], 400);
            }

            $doctorsQuery = DoctorProfile::with('user')
                ->where('status', 'approved');

            if (!empty($query)) {
                $doctorsQuery->where(function ($q) use ($query) {
                    $q->where('pmdc_number', 'LIKE', "%{$query}%")
                      ->orWhereHas('user', function ($userQuery) use ($query) {
                          $userQuery->where('name', 'LIKE', "%{$query}%")
                                    ->orWhere('email', 'LIKE', "%{$query}%");
                      });
                });
            }

            if (!empty($specialty)) {
                $doctorsQuery->where(function ($q) use ($specialty) {
                    $q->where('specialties', 'LIKE', "%\"{$specialty}\"%")
                      ->orWhere('specialties', 'LIKE', "%{$specialty}%");
                });
            }

            if (!empty($location)) {
                $doctorsQuery->whereHas('user', function ($userQuery) use ($location) {
                    $userQuery->where('city', 'LIKE', "%{$location}%")
                              ->orWhere('address', 'LIKE', "%{$location}%");
                });
            }

            $doctors = $doctorsQuery->get()
                ->map(function ($doctor) {
                    return $this->formatDoctor($doctor);
                });

            return response()->json([
                'success' => true,
                'count' => $doctors->count(),
                'data' => $doctors
            ]);
        } catch (\Exception $e) {
            Log::error('Search doctors error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to search doctors'
            ], 500);
        }
    }

    /**
     * Get nearby doctors based on user location
     */
    public function getNearbyDoctors(Request $request)
    {
        try {
            $lat = $request->get('lat');
            $lng = $request->get('lng');
            $radius = $request->get('radius', 10); // in kilometers

            if (!$lat || !$lng) {
                return response()->json([
                    'success' => false,
                    'message' => 'Latitude and longitude are required'
                ], 400);
            }

            // Prefer doctor_profiles.lat/lng; fall back to all approved if no coords
            $doctors = DoctorProfile::with('user')
                ->where('status', 'approved')
                ->get()
                ->map(function ($doctor) use ($lat, $lng) {
                    $dLat = $doctor->lat ?? $doctor->user?->lat;
                    $dLng = $doctor->lng ?? $doctor->user?->lng;
                    $distance = null;
                    if ($dLat !== null && $dLng !== null) {
                        $distance = 6371 * acos(
                            min(1, max(-1,
                                cos(deg2rad($lat)) * cos(deg2rad($dLat)) *
                                cos(deg2rad($dLng) - deg2rad($lng)) +
                                sin(deg2rad($lat)) * sin(deg2rad($dLat))
                            ))
                        );
                    }
                    return array_merge(
                        $this->formatDoctor($doctor),
                        ['distance' => $distance !== null ? round($distance, 2) . ' km' : null, '_distance' => $distance]
                    );
                })
                ->filter(fn ($d) => $d['_distance'] === null || $d['_distance'] <= $radius)
                ->sortBy(fn ($d) => $d['_distance'] ?? 9999)
                ->map(function ($d) {
                    unset($d['_distance']);
                    return $d;
                })
                ->values();

            return response()->json([
                'success' => true,
                'count' => $doctors->count(),
                'data' => $doctors
            ]);
        } catch (\Exception $e) {
            Log::error('Get nearby doctors error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch nearby doctors'
            ], 500);
        }
    }

    /**
     * Match doctors by symptoms (NLP-based matching)
     */
    public function matchDoctorsBySymptom(Request $request)
    {
        try {
            $symptoms = $request->get('symptoms', '');
            $language = $request->get('language', 'en');

            if (empty($symptoms)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Symptoms description is required'
                ], 400);
            }

            // Get all approved doctors
            $doctors = DoctorProfile::with('user')
                ->where('status', 'approved')
                ->get();

            // Score each doctor based on symptom matching
            $scoredDoctors = $doctors->map(function ($doctor) use ($symptoms, $language) {
                $score = $this->calculateSymptomMatchScore($doctor, $symptoms, $language);
                
                return array_merge(
                    $this->formatDoctor($doctor),
                    ['match_score' => $score]
                );
            });

            // Sort by match score descending
            $matchedDoctors = $scoredDoctors
                ->filter(function ($doctor) {
                    return $doctor['match_score'] > 0;
                })
                ->sortByDesc('match_score')
                ->values();

            // Return top matches with confidence levels
            return response()->json([
                'success' => true,
                'count' => $matchedDoctors->count(),
                'data' => $matchedDoctors->map(function ($doctor) {
                    $doctor['confidence'] = $this->calculateConfidence($doctor['match_score']);
                    return $doctor;
                })
            ]);
        } catch (\Exception $e) {
            Log::error('Match doctors by symptom error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to match doctors by symptoms'
            ], 500);
        }
    }

    /**
     * Calculate symptom match score for a doctor
     */
    private function calculateSymptomMatchScore($doctor, $symptoms, $language)
    {
        $score = 0;
        $specialties = is_string($doctor->specialties) 
            ? json_decode($doctor->specialties, true) 
            : $doctor->specialties;

        $symptomKeywords = $this->extractSymptoms($symptoms, $language);

        foreach ($specialties as $specialty) {
            $specialtyScore = $this->matchSpecialtyWithSymptoms($specialty, $symptomKeywords, $language);
            $score += $specialtyScore;
        }

        // Boost score for doctors with more experience
        $experience = $doctor->experiences;
        if (is_string($experience)) {
            $experience = json_decode($experience, true);
        }
        
        $experienceYears = 0;
        if (is_array($experience)) {
            foreach ($experience as $exp) {
                if (isset($exp['years'])) {
                    $experienceYears += (int) $exp['years'];
                }
            }
        }
        $score += $experienceYears * 0.5;
        $score += ((float) ($doctor->rating ?? 0)) * 2;
        if (method_exists($doctor, 'isOnline') && $doctor->isOnline()) {
            $score += 3;
        }

        return max(0, $score);
    }

    /**
     * Extract symptoms from text
     */
    private function extractSymptoms($text, $language)
    {
        $keywords = [];
        $text = strtolower($text);

        // Common symptom keywords (can be expanded based on language)
        $symptomMap = [
            'pain' => ['pain', 'ache', 'aching', 'hurts', 'sore', 'discomfort'],
            'fever' => ['fever', 'temp', 'temperature', 'hot'],
            'cough' => ['cough', 'coughing', 'dry cough', 'wet cough'],
            'headache' => ['headache', 'head pain', 'migraine', 'migrane'],
            'chest_pain' => ['chest pain', 'chest ache', 'chest tightness'],
            'breath' => ['shortness of breath', 'breathing', 'breathless', 'cant breathe'],
            'skin' => ['rash', 'skin rash', 'itching', 'itchy', 'itch', 'acne'],
            'heart' => ['heart pain', 'palpitation', 'heart racing'],
            'stomach' => ['stomach pain', 'abdominal pain', 'belly ache'],
            'nausea' => ['nausea', 'nauseous', 'vomiting', 'vomit'],
            'weakness' => ['weakness', 'weak', 'tired', 'fatigue'],
            'dizziness' => ['dizziness', 'dizzy', 'lightheaded', 'vertigo'],
            'allergy' => ['allergy', 'allergic', 'hives'],
            'stress' => ['stress', 'anxiety', 'anxious', 'tension', 'worry'],
            'depression' => ['depression', 'depressed', 'sad', 'hopeless'],
            'sleep' => ['sleep problem', 'insomnia', 'sleepless'],
            'tooth' => ['tooth pain', 'toothache', 'dental pain'],
            'eye' => ['eye pain', 'blurry vision', 'blur vision', 'red eye'],
            'joint' => ['joint pain', 'arthritis', 'joint ache', 'swollen joints'],
            'back' => ['back pain', 'lower back pain', 'backache'],
            'period' => ['period', 'menstrual', 'menstruation'],
            'pregnancy' => ['pregnancy', 'pregnant'],
            'diabetes' => ['diabetes', 'sugar', 'diabetic'],
            'bp' => ['blood pressure', 'high bp', 'low bp', 'hypertension'],
        ];

        if ($language === 'ur' || $language === 'roman') {
            // Add Urdu/Roman keywords
            $urduMap = [
                'pain' => ['dard', 'takleef'],
                'fever' => ['bukhar', 'bukh', 'garmi'],
                'cough' => ['khansi', 'khaansi'],
                'headache' => ['sar dard', 'sir dard'],
                'chest_pain' => ['seena dard', 'sina dard'],
                'skin' => ['kharish', 'khujli', 'chamri'],
                'heart' => ['dil mein dard', 'dil dard'],
                'stomach' => ['pet mein dard', 'pait dard'],
                'nausea' => ['matli', 'ulti'],
                'weakness' => ['kamzori', 'kamzoori', 'thakan'],
                'dizziness' => ['chakkar', 'chakrana'],
                'tooth' => ['dant dard', 'daant dard'],
                'eye' => ['aankh dard', 'ankh dard'],
                'joint' => ['jorhon ka dard', 'gathiya'],
                'back' => ['kamar ka dard', 'peeth ka dard'],
                'period' => ['haiz', 'masik'],
                'pregnancy' => ['hamla', 'hamal'],
                'bp' => ['blood pressure', 'bp', 'pressure'],
            ];

            foreach ($urduMap as $key => $terms) {
                if (!isset($symptomMap[$key])) {
                    $symptomMap[$key] = [];
                }
                $symptomMap[$key] = array_merge($symptomMap[$key], $terms);
            }
        }

        // Find matching symptoms
        foreach ($symptomMap as $symptom => $terms) {
            foreach ($terms as $term) {
                if (strpos($text, strtolower($term)) !== false) {
                    $keywords[] = $symptom;
                    break;
                }
            }
        }

        return array_unique($keywords);
    }

    /**
     * Match specialty with symptoms
     */
    private function matchSpecialtyWithSymptoms($specialty, $symptoms, $language)
    {
        // Specialty to symptom mapping
        $specialtyMap = [
            'Cardiologist' => ['heart', 'chest_pain', 'breath', 'bp', 'heart_attack'],
            'General Physician' => ['fever', 'cough', 'cold', 'body_pain', 'weakness', 'headache', 'nausea'],
            'Dermatologist' => ['skin', 'allergy', 'acne', 'hair'],
            'Pediatrician' => ['fever', 'cough', 'cold', 'baby', 'child'],
            'Dentist' => ['tooth', 'gum', 'jaw'],
            'Eye Specialist' => ['eye', 'vision', 'blur_vision'],
            'Psychologist' => ['stress', 'anxiety', 'depression', 'mood', 'sleep'],
            'Gynecologist' => ['period', 'pregnancy', 'pelvic_pain', 'bleeding'],
            'Neurologist' => ['headache', 'dizziness', 'memory', 'seizure'],
            'Orthopedic' => ['joint', 'back', 'neck', 'bone', 'fracture'],
            'ENT' => ['ear', 'nose', 'throat', 'hearing'],
            'Urologist' => ['urination', 'kidney', 'bladder'],
            'Gastroenterologist' => ['stomach', 'diarrhea', 'constipation', 'acidity'],
            'Endocrinologist' => ['diabetes', 'thyroid', 'hormone', 'weight'],
        ];

        $score = 0;
        $specialtySymptoms = $specialtyMap[$specialty] ?? [];

        foreach ($symptoms as $symptom) {
            if (in_array($symptom, $specialtySymptoms)) {
                $score += 2;
            }
        }

        // Partial matches
        foreach ($symptoms as $symptom) {
            foreach ($specialtySymptoms as $specSymptom) {
                if (strpos($specSymptom, $symptom) !== false || strpos($symptom, $specSymptom) !== false) {
                    $score += 1;
                    break;
                }
            }
        }

        return $score;
    }

    /**
     * Calculate confidence level based on match score
     */
    private function calculateConfidence($score)
    {
        if ($score >= 10) return 0.95;
        if ($score >= 8) return 0.85;
        if ($score >= 6) return 0.75;
        if ($score >= 4) return 0.65;
        if ($score >= 2) return 0.50;
        return 0.30;
    }

    /**
     * Format doctor data for response
     */
    private function formatDoctor($doctor)
    {
        $user = $doctor->user;
        
        $specialties = is_string($doctor->specialties) 
            ? json_decode($doctor->specialties, true) 
            : $doctor->specialties;

        $qualifications = is_string($doctor->qualifications) 
            ? json_decode($doctor->qualifications, true) 
            : $doctor->qualifications;

        $experiences = is_string($doctor->experiences) 
            ? json_decode($doctor->experiences, true) 
            : $doctor->experiences;

        // Calculate total experience years
        $totalExperience = 0;
        if (is_array($experiences)) {
            foreach ($experiences as $exp) {
                if (isset($exp['years'])) {
                    $totalExperience += (int) $exp['years'];
                }
            }
        }

        // Get primary specialty
        $primarySpecialty = is_array($specialties) && count($specialties) > 0 
            ? $specialties[0] 
            : 'General Physician';

        $isAvailable = method_exists($doctor, 'isOnline') ? $doctor->isOnline() : true;
        $status = $isAvailable ? 'online' : 'busy';
        $expYears = (int) ($doctor->experience_years ?? $totalExperience);

        return [
            'id' => $doctor->id,
            'user_id' => $doctor->user_id,
            'name' => $user ? $user->name : 'Unknown Doctor',
            'specialization' => $primarySpecialty,
            'specialties' => $specialties ?? [],
            'rating' => $doctor->rating ?? 4.5,
            'experience' => $expYears,
            'location' => $doctor->location ?? ($user->address ?? 'Unknown'),
            'status' => $status,
            'phone' => $doctor->phone ?? ($user->mobile ?? null),
            'email' => $doctor->email ?? ($user->email ?? null),
            'qualifications' => $qualifications ?? [],
            'experiences' => $experiences ?? [],
            'pmdc_number' => $doctor->pmdc_number,
            'about' => $doctor->bio ?? null,
            'consultation_fee' => $doctor->consultation_fee ?? 0,
            'image' => $user && $user->profile_image
                ? asset('storage/' . $user->profile_image)
                : null,
            'is_online' => $status === 'online',
            'is_available' => $isAvailable,
        ];
    }
}