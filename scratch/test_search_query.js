const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function buildOrConditions(q) {
    if (!q.trim()) return '';
    const originalQ = q.trim();
    const cleanQ = q.replace(/[\s\u3000]/g, '');
    
    const toFullWidth = (str) => {
        return str.replace(/[A-Za-z0-9]/g, (s) => {
            return String.fromCharCode(s.charCodeAt(0) + 0xFEE0);
        });
    };
    const toHalfWidth = (str) => {
        return str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => {
            return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
        });
    };

    const searchTerms = new Set();
    [originalQ, cleanQ].forEach(term => {
        searchTerms.add(term);
        searchTerms.add(toFullWidth(term));
        searchTerms.add(toHalfWidth(term));
    });

    const uniqueTerms = Array.from(searchTerms).filter(Boolean);
    const orParts = [];
    uniqueTerms.forEach(term => {
        orParts.push(`name.ilike.%${term}%,kana.ilike.%${term}%,katakana.ilike.%${term}%,romaji.ilike.%${term}%,departments.ilike.%${term}%`);
    });
    return orParts.join(',');
}

async function testSearch(q) {
    const searchOrConditions = buildOrConditions(q);
    console.log(`\nTesting: "${q}"`);
    console.log(`Or Conditions length: ${searchOrConditions.length}`);
    
    const { data, error } = await supabase
        .from('master_schools')
        .select('code, name')
        .or(searchOrConditions)
        .limit(5);

    if (error) {
        console.error("  Error:", error.message);
    } else {
        console.log(`  Success! Found ${data.length} records.`);
        data.forEach(d => console.log(`    - ${d.name}`));
    }
}

async function main() {
    await testSearch('トヨタ');
    await testSearch('京都 コンピュータ');
    await testSearch('oca');
    await testSearch('ＯＣＡ');
    await testSearch('京都　情報'); // 全角スペース
    await testSearch('専門学校'); // 非常によくある単語
}

main();
