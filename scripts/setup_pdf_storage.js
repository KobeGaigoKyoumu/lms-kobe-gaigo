const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
    console.log('Creating "reports-pdf" bucket...');
    const { data, error } = await supabase.storage.createBucket('reports-pdf', {
        public: false, // Keep reports private
        allowedMimeTypes: ['application/pdf'],
        fileSizeLimit: 5242880 // 5MB
    });

    if (error) {
        if (error.message.includes('already exists')) {
            console.log('Bucket "reports-pdf" already exists.');
        } else {
            console.error('Error creating bucket:', error.message);
        }
    } else {
        console.log('Bucket "reports-pdf" created successfully.');
    }
}

createBucket();
