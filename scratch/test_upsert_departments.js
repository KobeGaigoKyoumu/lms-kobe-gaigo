const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=');
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // 動作確認のため、大原和服専門学園(id: 6bcf6913-78c2-4b10-a58f-0390a7735f93)を取得
    const { data: before, error: getErr } = await supabase
        .from('master_schools')
        .select('*')
        .eq('id', '6bcf6913-78c2-4b10-a58f-0390a7735f93')
        .single();
        
    if (getErr) {
        console.error("Get Error:", getErr);
        return;
    }
    
    console.log("Before update:", before);
    
    // departmentsのみ更新するupsertを実行
    const { data: afterUpsert, error: upsertErr } = await supabase
        .from('master_schools')
        .upsert({
            id: '6bcf6913-78c2-4b10-a58f-0390a7735f93',
            departments: 'テスト学科A, テスト学科B'
        })
        .select()
        .single();
        
    if (upsertErr) {
        console.error("Upsert Error:", upsertErr);
        return;
    }
    
    console.log("After upsert:", afterUpsert);
    
    // 元に戻す
    const { error: resetErr } = await supabase
        .from('master_schools')
        .update({ departments: null })
        .eq('id', '6bcf6913-78c2-4b10-a58f-0390a7735f93');
        
    if (resetErr) {
        console.error("Reset Error:", resetErr);
    } else {
        console.log("Successfully reset departments to null.");
    }
}

run();
