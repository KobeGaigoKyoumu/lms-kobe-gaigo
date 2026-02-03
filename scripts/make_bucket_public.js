
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function makePublic() {
    console.log('Updating chat-attachments bucket to PUBLIC...');

    const { data, error } = await supabase
        .storage
        .updateBucket('chat-attachments', {
            public: true,
            fileSizeLimit: 10485760,
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        });

    if (error) {
        console.error('Error updating bucket:', error);
    } else {
        console.log('Bucket updated successfully:', data);
    }

    // Also verify it exists and list it
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucket = buckets.find(b => b.name === 'chat-attachments');
    console.log('Bucket details:', bucket);
}

makePublic();
