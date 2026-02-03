
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function verifySchema() {
    console.log('Verifying messages table schema...');

    // Attempt to insert a dummy record with attachment fields to check if columns exist
    // We'll trust the error message if it fails
    // Or we can just select * limit 1 and check keys

    const { data, error } = await supabase
        .from('messages')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error selecting from messages:', error);
        return;
    }

    if (data.length > 0) {
        console.log('Sample record keys:', Object.keys(data[0]));
        const hasUrl = 'attachment_url' in data[0];
        console.log('Has attachment_url column:', hasUrl);

        if (!hasUrl) {
            console.error('CRITICAL: attachment_url column is MISSING in the returned data (or value is null and omitted? No, select * includes nulls usually)');
        }
    } else {
        console.log('No messages found. Attempting to insert a test message with attachment fields...');

        const testPayload = {
            student_id: 'test-schema-check',
            sender_type: 'system',
            content: 'Schema Check',
            attachment_url: 'test',
            attachment_name: 'test',
            attachment_type: 'test',
            read: true
        };

        const { data: insertData, error: insertError } = await supabase
            .from('messages')
            .insert([testPayload])
            .select();

        if (insertError) {
            console.error('Insert failed:', insertError);
            console.log('This confirms columns likely do not exist or violate constraints.');
        } else {
            console.log('Insert successful! Columns exist.');
            // Cleanup
            await supabase.from('messages').delete().eq('id', insertData[0].id);
        }
    }
}

verifySchema();
