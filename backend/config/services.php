<?php

return [
    /*
     * Supabase Storage — used for author photos, publisher logos and book
     * covers. The service_role key bypasses row-level security and can
     * create buckets, so treat it like a database admin password: env var
     * only, never logged, never sent to the client.
     */
    'supabase' => [
        'url' => env('SUPABASE_URL'),
        'service_role_key' => env('SUPABASE_SERVICE_ROLE_KEY'),
    ],
];
