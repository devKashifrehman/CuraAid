<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Controls the CORS headers sent by Laravel's HandleCors middleware.
    | The React frontend runs on FRONTEND_URL (default http://localhost:3000)
    | and calls the API at APP_URL (default http://localhost:8000), which is a
    | different origin -> CORS must explicitly allow the frontend origin.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    /*
    | Origins allowed to call the API. Customise with CORS_ALLOWED_ORIGINS
    | (comma separated list), otherwise FRONTEND_URL plus common local
    | development origins are allowed.
    */
    'allowed_origins' => array_filter(explode(',', env(
        'CORS_ALLOWED_ORIGINS',
        implode(',', [
            env('FRONTEND_URL', 'http://localhost:3000'),
            'http://localhost:3000',
            'http://127.0.0.1:3000',
        ])
    ))),

    /*
    | Origin patterns (regex) also allowed. Covers subdomains of the
    | deployed .nayaxchange.com domain used by this project.
    */
    'allowed_origins_patterns' => [
        '#^https?://(.*\.)?nayaxchange\.com$#',
    ],

    'allowed_headers' => [
        'Content-Type',
        'X-Requested-With',
        'Authorization',
        'X-XSRF-TOKEN',
        'Accept',
        'Origin',
    ],

    'exposed_headers' => [],

    'max_age' => 0,

    /*
    | Authentication uses Sanctum Bearer tokens, not cookies, so credentials
    | are NOT required for the cross-origin AJAX calls from the SPA.
    */
    'supports_credentials' => false,

];