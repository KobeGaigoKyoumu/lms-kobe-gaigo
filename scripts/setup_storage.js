
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function setupStorage() {
    console.log('Setting up storage bucket: chat-attachments...');

    // 1. Create Bucket
    const { data, error } = await supabase
        .storage
        .createBucket('chat-attachments', {
            public: false,
            fileSizeLimit: 10485760, // 10MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('Bucket already exists.');
        } else {
            console.error('Error creating bucket:', error);
            // Don't return, try to update public status if needed (optional)
        }
    } else {
        console.log('Bucket created successfully:', data);
    }

    // Note: Policies are usually set via SQL/Dashboard, but the bucket is ready.
    // Unlike SQL policies for tables, storage buckets often need SQL policies for RLS on the `storage.objects` table.
    // The bucket creation via JS only creates the bucket entry.
    // The SQL file I prepared includes the policies.
}

setupStorage();
