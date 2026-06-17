const fs = require('fs');
const path = require('path');

const textPath = path.join(__dirname, 'pdf_text.txt');
if (!fs.existsSync(textPath)) {
    console.error("Run extract_pdf.js first to generate pdf_text.txt");
    process.exit(1);
}

const content = fs.readFileSync(textPath, 'utf8');
const lines = content.split('\n');

const courseKeywords = [
    '工業専門課程',
    '農業専門課程',
    '医療専門課程',
    '衛生専門課程',
    '教育・社会福祉専門課程',
    '教育社会福祉専門課程',
    '商業実務専門課程',
    '服飾・家政専門課程',
    '文化・教養専門課程',
    '国際交流専門課程',
    '自動車整備専門課程',
    '家庭専門課程',
    '家政専門課程',
    '服飾専門課程',
    '専門課程'
];

const parsedData = [];

lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    // コメントやヘッダー行をスキップ
    if (trimmed.startsWith('文部科学大臣') || trimmed.startsWith('※') || trimmed.startsWith('表') || trimmed.startsWith('備考') || trimmed.startsWith('--')) {
        return;
    }
    
    // タブで区切られているので、まずタブで分割
    // 例: "大原簿記情報専門学校札幌校商業実務専門課程会計システム4年制学科 \t平成二十三年三月一日"
    const parts = trimmed.split('\t');
    const fullNameAndDept = parts[0].trim();
    const dateLimit = parts[1] ? parts[1].trim() : '';
    const memo = parts[2] ? parts[2].trim() : '';
    
    // 廃止された学科はスキップすべきか？
    // 基本的に、ユーザーが指定したデータに学科・コースが記載されているので、廃止されていても現在登録されている学校に追加するのは問題ない。
    // しかし、備考に「廃止」とある場合は、どう扱うか？
    // 備考が「廃止」であっても、過去の卒業生などのために学科情報が画面に表示されていても問題ないと思われるが、一旦すべて保持してみる。
    
    // fullNameAndDept から学校名と学科名を切り離す
    let found = false;
    for (const keyword of courseKeywords) {
        if (fullNameAndDept.includes(keyword)) {
            const index = fullNameAndDept.indexOf(keyword);
            const schoolName = fullNameAndDept.substring(0, index).trim();
            const deptName = fullNameAndDept.substring(index).trim(); // 課程名も含めて学科情報にするか、あるいは課程名を除いた「学科」だけにするか？
            // ユーザーは「学科・コース」と呼んでいる。
            // 課程名（例えば「商業実務専門課程」）は分類名に近いので、
            // 課程名を取り除いた部分、例えば「会計システム4年制学科」を学科とするのが自然である。
            // だが、課程名もあった方が分かりやすいかもしれない。
            // もしくは、両方？例えば「商業実務専門課程会計システム4年制学科」や「会計システム4年制学科」
            // 一般的に学校検索画面で「学科・コース」として表示されるなら「会計システム4年制学科」の方がすっきりしている。
            // 念のため、課程名を除去した部分を学科・コース名とし、空白などで区切るか、課程名も含めるか。
            // ここでは課程名を除去した部分（例：「会計システム4年制学科」）をメインとしつつ、
            // 課程名も必要であれば含める。
            // もし `fullNameAndDept.substring(index + keyword.length).trim()` が学科名になる。
            const shortDeptName = fullNameAndDept.substring(index + keyword.length).trim();
            
            parsedData.push({
                raw: fullNameAndDept,
                schoolName,
                keyword,
                deptName: shortDeptName || fullNameAndDept.substring(index) // 万が一空なら課程名ごと
            });
            found = true;
            break;
        }
    }
    
    if (!found) {
        // キーワードが見つからなかった場合
        // 例: "札幌商工会議所付属専門学校商業実務専門課程 税務会計学科（４年制コース）" などのケース
        // ただし、これはキーワードでマッチするはず (商業実務専門課程 が含まれるため)。
        // マッチしなかった行を記録
        parsedData.push({
            raw: fullNameAndDept,
            schoolName: fullNameAndDept,
            keyword: 'NONE',
            deptName: fullNameAndDept
        });
    }
});

console.log(`Total parsed lines: ${parsedData.length}`);
console.log("Sample parsed results (first 15):");
console.log(JSON.stringify(parsedData.slice(0, 15), null, 2));

console.log("\nUnmatched lines with NONE:");
const unmatched = parsedData.filter(d => d.keyword === 'NONE');
console.log(`Count of unmatched: ${unmatched.length}`);
console.log(JSON.stringify(unmatched.slice(0, 15), null, 2));
