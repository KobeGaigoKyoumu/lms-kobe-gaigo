const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const kuromoji = require('kuromoji');
const wanakana = require('wanakana');

// Supabase設定（.env.preview.local から本番のキーを使用する）
// なければ直接ハードコードされているキーを使用
const supabaseUrl = 'https://mwtlfyhkzkfagvmdwgii.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13dGxmeWhremtmYWd2bWR3Z2lpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzYyMTk0MywiZXhwIjoyMDgzMTk3OTQzfQ.rWkYoR9W4KZddI-QJMD8MreUEg4eA8vbLWGbh6xgBbE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ローマ字の長音省略パターンを生成
function getAlternativeRomaji(romaji) {
    return romaji
        .replace(/ou/g, 'o')
        .replace(/uu/g, 'u')
        .replace(/aa/g, 'a')
        .replace(/ee/g, 'e')
        .replace(/oo/g, 'o');
}

// 漢字からふりがな（ひらがな、カタカナ、ローマ字）を生成するクラス
class KanaGenerator {
    constructor(tokenizer) {
        this.tokenizer = tokenizer;
    }

    generate(text) {
        try {
            const tokens = this.tokenizer.tokenize(text);
            let reading = '';
            for (const token of tokens) {
                // readingがあればそれを使用。なければ surface_form
                reading += token.reading || token.surface_form;
            }
            
            // readingは基本カタカナなのでひらがな・ローマ字に変換
            const hiragana = wanakana.toHiragana(reading);
            const katakana = wanakana.toKatakana(reading);
            const standardRomaji = wanakana.toRomaji(reading);
            const altRomaji = getAlternativeRomaji(standardRomaji);
            
            // 重複を排除して結合
            const romajiSet = new Set([standardRomaji, altRomaji]);
            const romaji = Array.from(romajiSet).join(' ');

            return {
                kana: hiragana,
                katakana: katakana,
                romaji: romaji
            };
        } catch (e) {
            console.error(`Error generating kana for ${text}:`, e.message);
            // エラー時はフォールバック
            const h = wanakana.toHiragana(text);
            const k = wanakana.toKatakana(text);
            const r = wanakana.toRomaji(text);
            return { kana: h, katakana: k, romaji: `${r} ${getAlternativeRomaji(r)}` };
        }
    }
}

// APIからデータを取得するヘルパー
function fetchSchoolsFromApi(schoolType, page) {
    return new Promise((resolve, reject) => {
        // active=true で廃校を除外
        const url = `https://school.teraren.com/schools.json?school_type=${schoolType}&active=true&page=${page}`;
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`API responded with code ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// 100msウェイト
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
    console.log('Initializing Kuromoji tokenizer...');
    const tokenizer = await new Promise((resolve, reject) => {
        kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build((err, tok) => {
            if (err) reject(err);
            else resolve(tok);
        });
    });
    
    const generator = new KanaGenerator(tokenizer);
    console.log('Tokenizer initialized successfully.');

    // 取得対象の学校区分
    // F1: 大学, F2: 短大, H1: 専修学校
    const schoolTypes = [
        { apiCode: 'F1', dbType: 'university' },
        { apiCode: 'F2', dbType: 'junior_college' },
        { apiCode: 'H1', dbType: 'vocational_school' }
    ];

    let totalProcessed = 0;
    
    for (const target of schoolTypes) {
        console.log(`\n--- Fetching type: ${target.dbType} (${target.apiCode}) ---`);
        let page = 1;
        let hasMore = true;
        let retryCount = 0;
        const maxRetries = 3;

        while (hasMore) {
            console.log(`Fetching page ${page} for ${target.dbType}...`);
            try {
                const apiSchools = await fetchSchoolsFromApi(target.apiCode, page);
                
                if (!apiSchools || apiSchools.length === 0) {
                    console.log(`No more data for ${target.dbType} at page ${page}.`);
                    hasMore = false;
                    break;
                }

                console.log(`Fetched ${apiSchools.length} items. Generating kana and preparing DB records...`);
                const records = [];

                for (const item of apiSchools) {
                    // かな情報生成
                    const kanaInfo = generator.generate(item.name);
                    
                    // レコード作成
                    records.push({
                        code: item.code,
                        name: item.name,
                        school_type: target.dbType,
                        kana: kanaInfo.kana,
                        katakana: kanaInfo.katakana,
                        romaji: kanaInfo.romaji,
                        prefecture: item.prefecture_number || null
                    });

                    // 大学（F1）の場合、大学院のデータも作成
                    if (target.apiCode === 'F1') {
                        const gradName = `${item.name}大学院`;
                        const gradKanaInfo = generator.generate(gradName);
                        records.push({
                            code: `${item.code}-grad`, // 重複を避けるためのダミーコード
                            name: gradName,
                            school_type: 'graduate_school',
                            kana: gradKanaInfo.kana,
                            katakana: gradKanaInfo.katakana,
                            romaji: gradKanaInfo.romaji,
                            prefecture: item.prefecture_number || null
                        });
                    }
                }

                // DBへのバルクインサート（既存レコードは上書きまたは無視）
                console.log(`Inserting ${records.length} records into Supabase...`);
                const { error } = await supabase
                    .from('master_schools')
                    .upsert(records, { onConflict: 'code' });

                if (error) {
                    console.error('Supabase upsert error:', error.message);
                    console.log('Skipping this batch due to error.');
                } else {
                    totalProcessed += records.length;
                    console.log(`Successfully upserted ${records.length} records.`);
                }

                page++;
                retryCount = 0; // 成功したためリトライカウントをリセット
                // サーバーに負荷をかけないためのウェイト
                await sleep(150);

            } catch (e) {
                console.error(`Error on page ${page} for ${target.dbType}:`, e.message);
                retryCount++;
                if (retryCount >= maxRetries) {
                    console.log(`Max retries (${maxRetries}) reached for page ${page}. Skipping this page/type.`);
                    hasMore = false;
                } else {
                    console.log(`Waiting 2 seconds before retrying (Attempt ${retryCount}/${maxRetries})...`);
                    await sleep(2000);
                }
            }
        }
    }

    console.log(`\nImport complete! Total schools processed & upserted: ${totalProcessed}`);
}

main().catch(err => {
    console.error('Fatal error during import:', err);
});
