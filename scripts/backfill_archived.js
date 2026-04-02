const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Helper to load env from .env.local
const loadEnv = () => {
    const content = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    content.split('\n').filter(l => l.includes('=')).forEach(l => {
        const parts = l.split('=');
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
    });
    return env;
};

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function backfill() {
    console.log("Starting backfill for is_archived NULL values...");
    
    // 1. Update homework_assignments where is_archived is null
    const { data, error, count } = await supabase
        .from('homework_assignments')
        .update({ is_archived: false })
        .is('is_archived', null)
        .select('id');

    if (error) {
        console.error("Backfill error:", error);
    } else {
        console.log(`Successfully updated ${data?.length || 0} assignments.`);
    }
}

backfill();
