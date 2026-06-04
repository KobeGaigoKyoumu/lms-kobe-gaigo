// process.env のキーをリストアップするテスト
console.log('--- Environment Variables ---');
const keys = Object.keys(process.env).sort();
keys.forEach(k => {
    // 値を出力するとセキュリティキーが漏洩する可能性があるため、キー名と簡易的なチェックのみ出力
    const val = process.env[k];
    let preview = '';
    if (val) {
        if (val.length > 30) {
            preview = val.substring(0, 15) + '...' + val.substring(val.length - 5);
        } else {
            preview = val;
        }
    }
    console.log(`${k}: ${preview} (Length: ${val ? val.length : 0})`);
});
