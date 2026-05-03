import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

async function pushCloudflareSnapshot(type, data) {
    const workerUrl = process.env.NEXT_PUBLIC_CHAT_WORKER_URL;
    const apiSecret = process.env.CLOUDFLARE_API_SECRET;

    if (!workerUrl || !apiSecret) {
        throw new Error('Missing Cloudflare environment variables');
    }

    const targetUrl = workerUrl.startsWith('http') ? workerUrl : `https://${workerUrl}`;

    console.log(`Pushing snapshot [${type}] to Cloudflare Worker...`);
    
    const res = await fetch(targetUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiSecret}`
        },
        body: JSON.stringify({
            action: 'update-snapshot',
            type,
            data
        })
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Cloudflare push failed: ${res.status} ${errText}`);
    }

    console.log(`Successfully pushed snapshot [${type}]!`);
    return true;
}

async function run() {
    console.log('Fetching Grade Analytics Data...');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const { data, error } = await supabase
        .from('grade_records')
        .select('id, student_id_text, student_name, class_name, year_term, final_exam_total, report_card_total, final_exam_data, report_card_data')
        .order('year_term', { ascending: false });

    if (error) {
        console.error('Supabase Error:', error);
        return;
    }

    console.log(`Fetched ${data.length} records. Filtering...`);
    const filteredData = (data || []).filter(item => {
        const isJlptTerm = item.year_term?.startsWith('JLPT');
        const isJlptType = item.final_exam_data?.type === 'JLPT';
        return !isJlptTerm && !isJlptType;
    });
    console.log(`Filtered data: ${filteredData.length} records.`);

    try {
        await pushCloudflareSnapshot('grades_v4', { data: filteredData });
    } catch (e) {
        console.error(e);
    }
}

run();
