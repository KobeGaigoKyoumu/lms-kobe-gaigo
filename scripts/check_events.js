const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEvents() {
    const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_date', { ascending: true });

    if (error) {
        console.error('Error fetching events:', error);
        return;
    }

    console.log('Found events:', data.length);
    data.forEach(event => {
        console.log('--------------------------------------------------');
        console.log(`ID: ${event.id}`);
        console.log(`Title: ${event.title}`);
        console.log(`Type: ${event.event_type}`);
        console.log(`Color: ${event.color}`);
        console.log(`Start: ${event.start_date}`);
        console.log(`End:   ${event.end_date}`);
        console.log(`AllDay: ${event.all_day}`);
    });
}

checkEvents();
