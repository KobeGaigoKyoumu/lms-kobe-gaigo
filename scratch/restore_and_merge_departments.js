const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=');
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
});

const supabase = createClient(env['NEXT_PUBLIC_SUPABASE_URL'], env['SUPABASE_SERVICE_ROLE_KEY']);

// PDFのパス
const textPath = path.join(__dirname, 'pdf_text.txt');
if (!fs.existsSync(textPath)) {
    console.error("pdf_text.txt not found in scratch folder!");
    process.exit(1);
}

const content = fs.readFileSync(textPath, 'utf8');
const lines = content.split('\n');

const courseKeywords = [
    '工業専門課程', '農業専門課程', '医療専門課程', '衛生専門課程',
    '教育・社会福祉専門課程', '教育社会福祉専門課程', '商業実務専門課程',
    '服飾・家政専門課程', '文化・教養専門課程', '国際交流専門課程',
    '自動車整備専門課程', '家庭専門課程', '家政専門課程', '服飾専門課程',
    '専門課程'
];

// 学校名キーワード → 学習分野のマッピング
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

function parsePDF() {
    const pdfSchools = new Map(); // schoolName -> Set of depts
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('文部科学大臣') || trimmed.startsWith('※') || trimmed.startsWith('表') || trimmed.startsWith('備考') || trimmed.startsWith('--')) {
            return;
        }
        
        const parts = trimmed.split('\t');
        const fullNameAndDept = parts[0].trim();
        
        for (const keyword of courseKeywords) {
            if (fullNameAndDept.includes(keyword)) {
                const index = fullNameAndDept.indexOf(keyword);
                const schoolName = fullNameAndDept.substring(0, index).trim();
                const deptName = fullNameAndDept.substring(index + keyword.length).trim();
                
                if (schoolName && deptName) {
                    if (!pdfSchools.has(schoolName)) {
                        pdfSchools.set(schoolName, new Set());
                    }
                    pdfSchools.get(schoolName).add(deptName);
                }
                break;
            }
        }
    });
    return pdfSchools;
}

function normalizeName(name) {
    if (!name) return '';
    return name
        .replace(/[\s\u3000]/g, '') // スペース除去
        .replace(/[\-\-\—\–\─\━]/g, '') // ハイフン類除去
        .replace(/[a-zA-Z0-9]/g, s => String.fromCharCode(s.charCodeAt(0) + 0xFEE0)) // 半角英数字を全角に
        .replace(/[\(\)（）]/g, '') // カッコ除去
        .replace(/学校法人/g, '')
        .replace(/専修学校/g, '')
        .replace(/専門学校/g, '')
        .replace(/工業専門/g, '')
        .replace(/医療専門/g, '')
        .replace(/商業実務/g, '')
        .replace(/高等専門/g, '')
        .replace(/学園/g, '')
        .replace(/学院/g, '')
        .replace(/大学校/g, '')
        .replace(/短期大学部/g, '')
        .replace(/短期大学/g, '')
        .replace(/大学/g, '');
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
    try {
        console.log("Fetching all vocational schools from database...");
        const { data: dbSchools, error: fetchErr } = await supabase
            .from('master_schools')
            .select('*')
            .eq('school_type', 'vocational_school');
            
        if (fetchErr) throw fetchErr;
        console.log(`Fetched ${dbSchools.length} vocational schools from DB.`);

        const pdfSchools = parsePDF();
        console.log(`Parsed ${pdfSchools.size} unique schools from PDF.`);

        // DB学校のノーマライズネームマップ
        const dbNormMap = new Map(); // normalizedName -> school object
        dbSchools.forEach(school => {
            const norm = normalizeName(school.name);
            if (norm) {
                dbNormMap.set(norm, school);
            }
        });

        const schoolDeptsMap = new Map(); // dbSchool.code -> Set of depts
        let matchCount = 0;

        for (const [pdfSchoolName, depts] of pdfSchools.entries()) {
            const pdfNorm = normalizeName(pdfSchoolName);
            
            // 1. 完全一致
            let matchedSchool = dbSchools.find(s => s.name === pdfSchoolName);
            
            // 2. スペース除去一致
            if (!matchedSchool) {
                const pdfSpacedOut = pdfSchoolName.replace(/[\s\u3000]/g, '');
                matchedSchool = dbSchools.find(s => s.name.replace(/[\s\u3000]/g, '') === pdfSpacedOut);
            }
            
            // 3. ノーマライズ一致
            if (!matchedSchool) {
                matchedSchool = dbNormMap.get(pdfNorm);
            }
            
            // 4. ノーマライズ部分一致
            if (!matchedSchool) {
                for (const [dbNorm, school] of dbNormMap.entries()) {
                    if (dbNorm.length >= 4 && pdfNorm.length >= 4) {
                        if (pdfNorm.includes(dbNorm) || dbNorm.includes(pdfNorm)) {
                            matchedSchool = school;
                            break;
                        }
                    }
                }
            }

            if (matchedSchool) {
                if (!schoolDeptsMap.has(matchedSchool.code)) {
                    schoolDeptsMap.set(matchedSchool.code, new Set());
                }
                const entry = schoolDeptsMap.get(matchedSchool.code);
                depts.forEach(d => entry.add(d));
                matchCount++;
            }
        }

        console.log(`\nMatched ${matchCount} PDF schools out of ${pdfSchools.size}.`);

        const updatedRecords = [];
        let withDeptsCount = 0;
        let onlyFieldCount = 0;

        for (const school of dbSchools) {
            const field = inferField(school.name);
            const deptsSet = schoolDeptsMap.get(school.code);

            if (deptsSet && deptsSet.size > 0) {
                const deptListStr = Array.from(deptsSet).join(', ');
                // 学科・コース情報がある場合は分野と併記する
                const mergedValue = `${deptListStr} 【分野：${field}】`;
                updatedRecords.push({
                    ...school,
                    departments: mergedValue
                });
                withDeptsCount++;
            } else {
                // 学科・コースがない場合は分野のみ設定する
                const mergedValue = `【学習分野】${field}`;
                updatedRecords.push({
                    ...school,
                    departments: mergedValue
                });
                onlyFieldCount++;
            }
        }

        console.log(`\nPrepared ${updatedRecords.length} records to update.`);
        console.log(`  - With departments & field: ${withDeptsCount}`);
        console.log(`  - With field only: ${onlyFieldCount}`);

        // 100件ずつのチャンクに分割してアップサートを実行
        const chunkSize = 100;
        for (let i = 0; i < updatedRecords.length; i += chunkSize) {
            const chunk = updatedRecords.slice(i, i + chunkSize);
            console.log(`Upserting chunk ${i / chunkSize + 1} (${chunk.length} records)...`);
            
            const { error: upsertErr } = await supabase
                .from('master_schools')
                .upsert(chunk, { onConflict: 'code' });
                
            if (upsertErr) {
                console.error(`Error upserting chunk ${i / chunkSize + 1}:`, upsertErr.message);
            } else {
                console.log(`Chunk ${i / chunkSize + 1} updated successfully.`);
            }
            
            await sleep(100);
        }

        console.log("\nVocational school departments restore and merge completed successfully!");

    } catch (e) {
        console.error("Fatal error during import:", e);
    }
}

run();
