const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const careerStatsData = JSON.parse(fs.readFileSync('src/data/career_stats_v2.json', 'utf8'));

// エイリアスマップ（正規化後の文字列で比較するが、分かりやすさのため元の表記で書いて、関数内で正規化してキーにする）
const RAW_ALIAS_MAP = {
    'トヨタ自動車大学校神戸校': '専門学校トヨタ神戸自動車大学校',
    'トヨタ神戸自動車大学校': '専門学校トヨタ神戸自動車大学校',
    '東大阪短期大学': '東大阪大学短期大学部',
    'nikko外語専門学校': 'ｎｉｋｋｏ外語観光専門学校',
    'nikko外語観光専門学校': 'ｎｉｋｋｏ外語観光専門学校',
    '神戸外国語大学': '神戸市外国語大学',
    '神戸外国語大学研究生': '神戸市外国語大学',
    '姫路保育福祉専門学校': '姫路福祉保育専門学校',
    'ビジョンクエスト情報デザイン専門学校': 'ヴィジョンネクスト情報デザイン専門学校',
    '東京みらいit&ai専門学校': '東京みらいａｉ＆ｉｔ専門学校',
    '三鷹日商簿記専門学校': '日商簿記三鷹福祉専門学校',
    '西日本アカデミー航空専門学校': '西日本アカデミー専門学校',
    '日本モータースポーツ専門学校': '日本モータースポーツ専門学校大阪校',
    '京都コンピュータ学院': '京都コンピュータ学院京都駅前校',
    '駿台観光＆外語ビジネス専門学校': '駿台観光＆外語ビジネスカレッジ大阪',
    '栃木グローバルビジネスカレッジ': '専門学校Ｔｏｃｈｉｇｉ　Ｇｌｏｂａｌ　Ｆａｓｈｉｏｎ　Ｂｕｓｉｎｅｓｓ　Ｃｏｌｌｅｇｅ',
    '岩谷テクノビジネス専門学校': '岩谷学園よこはまＩＴビジネス専門学校',
    '麻生専門学校': '麻生情報ビジネス専門学校',
    '阪神自動車航空専門学校': '阪神自動車航空鉄道専門学校',
    'oca大阪デザイン＆it専門学校': 'ＯＣＡ大阪デザイン＆テクノロジー専門学校',
};

function hiraganaToKatakana(str) {
    return str.replace(/[\u3041-\u3096]/g, (match) => {
        return String.fromCharCode(match.charCodeAt(0) + 0x60);
    });
}

function normalize(name) {
    if (!name) return '';
    let n = name;
    
    // 全角半角統一（英数字）
    n = n.replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, (s) => {
        return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    });
    
    n = n.toLowerCase();
    
    // 不要な記号・スペース削除
    n = n.replace(/[\s\u3000・\-－\(\)（）\&＆\.\/\,\\＊\*＿_]/g, '');
    
    // ひらがなをカタカナに変換して統一
    n = hiraganaToKatakana(n);
    
    // プレフィックス削除
    n = n.replace(/^(学校法人|専門学校|公立大学法人|国立大学法人)/, '');
    
    // サフィックス・修飾語削除
    n = n.replace(/(研究生|研究科|専攻|（研究生）|\(研究生\)|研究員|別科)$/, '');
    
    // ヴ/ヴィなどの表記ゆれ
    n = n.replace(/ヴィ/g, 'ビ');
    n = n.replace(/ヴェ/g, 'ベ');
    n = n.replace(/ヴォ/g, 'ボ');
    n = n.replace(/ヴァ/g, 'バ');
    n = n.replace(/ヴ/g, 'ブ');
    
    // 長音記号の除去
    n = n.replace(/ー/g, '');
    
    return n;
}

// 正規化したキーでのエイリアスマップ構築
const ALIAS_MAP = {};
Object.entries(RAW_ALIAS_MAP).forEach(([key, val]) => {
    ALIAS_MAP[normalize(key)] = normalize(val);
});

async function main() {
    const { data: dbSchools, error } = await supabase
        .from('master_schools')
        .select('name, school_type');

    if (error) {
        console.error(error);
        return;
    }

    const jsonNames = careerStatsData.topDestinations.map(d => d.name);
    
    console.log(`JSON schools: ${jsonNames.length}`);
    console.log(`DB schools: ${dbSchools.length}`);

    let matchedCount = 0;
    const unmatchedJson = [];

    // DB側の正規化キャッシュ
    const dbNormalized = dbSchools.map(s => ({
        original: s.name,
        normalized: normalize(s.name),
        school_type: s.school_type
    }));

    for (const jName of jsonNames) {
        const jNorm = normalize(jName);
        
        // 1. エイリアスマップによる解決を最優先
        let targetNorm = jNorm;
        if (ALIAS_MAP[jNorm]) {
            targetNorm = ALIAS_MAP[jNorm];
        }

        // 2. 正規化一致
        let match = dbNormalized.find(s => s.normalized === targetNorm);
        
        // 3. 部分一致（前方一致または包含関係、キャンパス等）
        if (!match) {
            match = dbNormalized.find(s => s.normalized.startsWith(targetNorm) || targetNorm.startsWith(s.normalized));
        }

        if (match) {
            matchedCount++;
        } else {
            unmatchedJson.push(jName);
        }
    }

    console.log(`Matched: ${matchedCount} / ${jsonNames.length} (${(matchedCount/jsonNames.length*100).toFixed(1)}%)`);
    console.log(`Unmatched count: ${unmatchedJson.length}`);
}

main();
