/**
 * 学校名と学校種別から、「国立」「公立」「私立」を判定するヘルパー関数
 * 
 * @param {string} name - 学校名 (例: "東京大学", "神戸市外国語大学")
 * @param {string} schoolType - 学校種別 ('university', 'junior_college', 'vocational_school', 'graduate_school', 'technical_college')
 * @returns {string|null} - "国立", "公立", "私立" または判定不可の場合は null
 */
export function getEstablishmentType(name, schoolType) {
    if (!name) return null;

    // 1. 公立 (Public) の判定
    // 都道府県立・市区町村立などの一般的なキーワード
    const publicKeywords = [
        '都立', '道立', '府立', '県立', '市立', '区立', '町立', '村立', '公立', '組合立',
        '神戸市外国語大学', '神戸市看護大学', '前橋工科大学', '高崎経済大学', '産業技術大学院大学',
        '情報科学芸術大学院大学', '長岡造形大学', '高知工科大学', '名桜大学', '国際教養大学',
        '福岡女子大学', '九州歯科大学'
    ];
    if (publicKeywords.some(keyword => name.includes(keyword))) {
        return '公立';
    }

    // 2. 国立 (National) の判定
    // 「国立音楽大学」「国立音楽院」などの私立学校を除外して「国立」を判定
    if (name.includes('国立') && !name.includes('国立音楽')) {
        return '国立';
    }

    // 国立病院機構や特定の省庁大学校など
    const nationalKeywords = [
        '独立行政法人国立病院機構',
        '国立療養所',
        '気象大学校',
        '防衛大学校',
        '防衛医科大学校',
        '海上保安大学校',
        '航空保安大学校',
        '水産大学校',
        '職業能力開発総合大学校'
    ];
    if (nationalKeywords.some(keyword => name.includes(keyword))) {
        return '国立';
    }

    // 国立大学（および大学院大学）のリスト
    const nationalUniversities = [
        '北海道大学', '室蘭工業大学', '小樽商科大学', '帯広畜産大学', '旭川医科大学', '北見工業大学', '北海道教育大学',
        '弘前大学', '岩手大学', '東北大学', '秋田大学', '山形大学', '福島大学',
        '茨城大学', '筑波大学', '筑波技術大学', '宇都宮大学', '群馬大学', '埼玉大学', '千葉大学',
        '東京大学', '東京医科歯科大学', '東京外国語大学', '東京学芸大学', '東京農工大学', '東京芸術大学', '東京工業大学', '東京海洋大学', 'お茶の水女子大学', '電気通信大学', '一橋大学', '政策研究大学院大学',
        '横浜国立大学', '新潟大学', '長岡技術科学大学', '上越教育大学', '富山大学', '金沢大学', '福井大学', '山梨大学', '信州大学', '岐阜大学', '静岡大学', '浜松医科大学',
        '名古屋大学', '愛知教育大学', '名古屋工業大学', '豊橋技術科学大学', '三重大学',
        '滋賀大学', '滋賀医科大学', '京都大学', '京都教育大学', '京都工芸繊維大学', '大阪大学', '兵庫教育大学', '神戸大学', '奈良教育大学', '奈良女子大学', '奈良先端科学技術大学院大学', '和歌山大学',
        '鳥取大学', '島根大学', '岡山大学', '広島大学', '山口大学',
        '徳島大学', '鳴門教育大学', '香川大学', '愛媛大学', '高知大学',
        '九州大学', '九州工業大学', '福岡教育大学', '佐賀大学', '長崎大学', '熊本大学', '大分大学', '宮崎大学', '鹿児島大学', '鹿屋体育大学', '琉球大学',
        '総合研究大学院大学', '北陸先端科学技術大学院大学'
    ];
    if (nationalUniversities.some(univ => name.startsWith(univ) || name === univ)) {
        return '国立';
    }

    // 3. 私立 (Private) の判定
    // 大学・短期大学・大学院・専門学校・高等専門学校に該当し、国公立でないものは私立
    const targetTypes = ['university', 'junior_college', 'graduate_school', 'vocational_school', 'technical_college'];
    if (targetTypes.includes(schoolType)) {
        return '私立';
    }

    return null;
}
