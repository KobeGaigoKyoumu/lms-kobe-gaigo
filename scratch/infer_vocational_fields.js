const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=');
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

// 学校名キーワード → 学習分野のマッピング
// 優先度順（先にマッチしたものが適用される）
const FIELD_RULES = [
    // 医療・看護・リハビリ系
    { keywords: ['看護', 'ナーシング', '助産'], field: '看護・助産' },
    { keywords: ['歯科衛生', '歯科技工', '歯科', 'デンタル'], field: '歯科・デンタル' },
    { keywords: ['リハビリテーション', 'リハビリ', '理学療法', '作業療法', '言語聴覚', '視能訓練'], field: 'リハビリテーション・理学・作業' },
    { keywords: ['柔道整復', '柔整', '鍼灸', 'はり灸', 'はりきゅう', '整体', 'カイロ'], field: '東洋療法・柔整・鍼灸' },
    { keywords: ['臨床検査', '臨床工学', '放射線', '救急救命', '臨床医学'], field: '臨床検査・臨床工学・放射線' },
    { keywords: ['医療秘書', '医療事務'], field: '医療事務・秘書' },
    { keywords: ['医療福祉', '医療保健', '保健衛生', '厚生', '健康', 'メディカル', '医療'], field: '医療・保健・メディカル' },
    { keywords: ['薬'], field: '薬学・くすり' },
    
    // 福祉・保育・教育系
    { keywords: ['保育', 'こども', '幼児教育', 'チャイルド'], field: '保育・幼児教育' },
    { keywords: ['社会福祉', '福祉', '介護', '健祥会'], field: '社会福祉・介護' },
    
    // 美容・理容系
    { keywords: ['理容美容', '美容理容', '美容', '理容', 'ビューティー', 'ビューティ', 'エステ', 'ネイル', 'メイク', 'コスメ'], field: '美容・理容・ビューティ' },
    
    // IT・コンピュータ系
    { keywords: ['情報処理', 'ＩＴ', 'IT', 'ＡＩ', 'AI', 'コンピュータ', 'コンピューター', 'プログラミング'], field: '情報処理・IT・AI' },
    { keywords: ['ゲーム', 'CG', 'ＣＧ', 'アニメ', 'マンガ', '漫画', 'コミック'], field: 'ゲーム・CG・アニメ' },
    { keywords: ['情報ビジネス', '情報'], field: '情報処理・ビジネス' },
    { keywords: ['ＯＡ', 'OA'], field: '情報処理・OA' },
    
    // 工業・技術系
    { keywords: ['自動車整備', '自動車大学校', '自動車工学', '自動車'], field: '自動車整備・工学' },
    { keywords: ['電気', '電子'], field: '電気・電子' },
    { keywords: ['建築', '建設', 'インテリア', '住まい'], field: '建築・土木・インテリア' },
    { keywords: ['測量'], field: '測量' },
    { keywords: ['航空'], field: '航空' },
    { keywords: ['土木'], field: '土木' },
    { keywords: ['機械'], field: '機械' },
    { keywords: ['工業技術', '工業', '工科', '工学院', 'テクノロジー', 'テクニカル', 'テクノ'], field: '工業・技術・テクノロジー' },
    
    // ビジネス・会計・法律系
    { keywords: ['簿記', '会計', '経理', '税理'], field: '簿記・会計・税理' },
    { keywords: ['法律', '法科', 'Law', 'Ｌａｗ'], field: '法律・公務員' },
    { keywords: ['ビジネス', '経営', '商業', '商科', '実務'], field: 'ビジネス・経営・商業' },
    { keywords: ['秘書'], field: '秘書' },
    { keywords: ['観光', 'ツーリズム', 'トラベル', 'ホテル', 'ブライダル', 'ウエディング'], field: '観光・ホテル・ブライダル' },
    { keywords: ['語学', '外語', '外国語', '英語', '国際', '英数', 'コミュニケーション'], field: '語学・国際' },
    
    // デザイン・アート・クリエイティブ系
    { keywords: ['デザイナー', 'デザイン', 'クリエイティブ', 'クリエイター', '芸術', 'アート', '美術', '書道', '工芸'], field: 'デザイン・美術・芸術' },
    { keywords: ['写真', 'フォト'], field: '写真' },
    { keywords: ['映像', '放送', 'メディア', 'マスコミ', '映画'], field: '映像・音響・メディア' },
    { keywords: ['音楽', 'ミュージック', 'ダンス', 'エンターテイメント', 'パフォーマンス', '演劇', '声優', '俳優'], field: '音楽・エンタメ・声優' },
    
    // ファッション・服飾系
    { keywords: ['ファッション', '服飾', '服装', 'モード', '洋裁', '和裁', '文化服装', 'ドレスメーカー', '洋装', '編物', 'きもの', '裁縫'], field: 'ファッション・服飾・裁縫' },
    
    // 調理・製菓・栄養系
    { keywords: ['調理', 'クッキング', '料理', 'シェフ'], field: '調理・料理' },
    { keywords: ['製菓', 'パティシエ', 'カフェ', 'スイーツ', 'パン', 'ベーカリー', '製パン'], field: '製菓・製パン・カフェ' },
    { keywords: ['栄養', '食', 'フード'], field: '栄養・食物' },
    
    // 動物・ペット・農業系
    { keywords: ['動物', 'ペット', 'トリマー', '愛犬', 'グルーミング', 'ドッグ', 'アニマル'], field: '動物・ペット' },
    { keywords: ['農業', '農林', '園芸', '造園', '酪農'], field: '農業・園芸・酪農' },
    { keywords: ['フラワー', '花'], field: 'フラワー' },
    { keywords: ['環境', 'エコ', '自然', '海洋', '水産', '漁業'], field: '環境・バイオ・水産' },
    
    // スポーツ系
    { keywords: ['スポーツ', '体育', 'トレーナー', 'フィットネス'], field: 'スポーツ・フィットネス' },
    
    // 受験予備校・公務員・その他
    { keywords: ['予備校', 'ゼミナール', '進学', '学習会'], field: '受験予備校・学習支援' },
    { keywords: ['公務員', '自衛隊', '防衛', '消防'], field: '公務員・防衛・消防' },
    { keywords: ['YMCA', 'ＹＭＣＡ'], field: '福祉・国際・総合' },
    { keywords: ['総合学院', '総合学園', '総合', 'コアカレッジ', 'カレッジ', '学園', '学院', '専修学校', '高等専修', '高等学園', '高等課程'], field: '総合・その他' },
];

function inferField(schoolName) {
    for (const rule of FIELD_RULES) {
        for (const kw of rule.keywords) {
            if (schoolName.includes(kw)) {
                return rule.field;
            }
        }
    }
    return '総合・その他';
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    try {
        console.log("Fetching all vocational schools to unify field categories...");
        const { data: schools, error } = await supabase
            .from('master_schools')
            .select('*')
            .eq('school_type', 'vocational_school');
        
        if (error) throw error;
        console.log(`Found ${schools.length} vocational schools in total.`);
        
        const updatedRecords = [];
        let inferredCount = 0;
        let unknownCount = 0;
        const unknownNames = [];
        
        for (const school of schools) {
            const field = inferField(school.name);
            if (field) {
                updatedRecords.push({
                    ...school,
                    departments: `【学習分野】${field}`
                });
                inferredCount++;
            } else {
                unknownCount++;
                unknownNames.push(school.name);
            }
        }
        
        console.log(`\nInferred field for ${inferredCount} schools.`);
        console.log(`Could not infer for ${unknownCount} schools.`);
        
        if (unknownNames.length > 0) {
            console.log('\nSchools that could not be inferred (first 30):');
            unknownNames.slice(0, 30).forEach(n => console.log(`  - ${n}`));
        }
        
        // DBにアップサート
        console.log(`\nUpserting ${updatedRecords.length} records...`);
        const chunkSize = 200;
        for (let i = 0; i < updatedRecords.length; i += chunkSize) {
            const chunk = updatedRecords.slice(i, i + chunkSize);
            console.log(`  Chunk ${Math.floor(i / chunkSize) + 1} (${chunk.length} records)...`);
            const { error: upsertErr } = await supabase
                .from('master_schools')
                .upsert(chunk, { onConflict: 'code' });
            if (upsertErr) {
                console.error(`  Error:`, upsertErr.message);
            } else {
                console.log(`  OK`);
            }
            await sleep(100);
        }
        
        console.log('\nDone!');
    } catch (e) {
        console.error('Fatal error:', e);
    }
}

run();
