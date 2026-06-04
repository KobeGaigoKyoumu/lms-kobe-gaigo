const kuromoji = require('kuromoji');
const wanakana = require('wanakana');

kuromoji.builder({ dicPath: "node_modules/kuromoji/dict" }).build((err, tokenizer) => {
    if (err) {
        console.error('Kuromoji build error:', err);
        return;
    }
    const text = "神戸国際大学";
    const tokens = tokenizer.tokenize(text);
    console.log('Tokens:', tokens);

    // 読みを取得してひらがなに変換する
    let reading = '';
    for (const token of tokens) {
        // readingフィールドがあればそれを使う。なければ surface_form
        // readingは全角カタカナで返ってくることが多い
        const tokenReading = token.reading || token.surface_form;
        reading += tokenReading;
    }
    console.log('Raw reading (katakana):', reading);

    // wanakanaでひらがなとローマ字に変換
    const hiragana = wanakana.toHiragana(reading);
    const romaji = wanakana.toRomaji(reading);

    console.log('Hiragana:', hiragana);
    console.log('Romaji:', romaji);
});
