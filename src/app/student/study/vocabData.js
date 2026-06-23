const initialVocab = [
  { term: "日本", reading: "にほん", meaning: "Japan", pos: "noun", category: "Places", sentence: "____へ行きます。", example: "日本へ行きます。", exampleEn: "I go to Japan.", wrong: ["日本を飲みます。", "日本は三時です。", "日本で顔を洗います。"] },
  { term: "学校", reading: "がっこう", meaning: "school", pos: "noun", category: "Places", sentence: "毎日、____へ行きます。", example: "毎日、学校へ行きます。", exampleEn: "I go to school every day.", wrong: ["学校を食べます。", "学校は赤い魚です。", "学校で手紙を寝ます。"] },
  { term: "駅", reading: "えき", meaning: "station", pos: "noun", category: "Places", sentence: "____で友だちに会います。", example: "駅で友だちに会います。", exampleEn: "I meet my friend at the station.", wrong: ["駅を読みます。", "駅はおいしいです。", "駅でシャツを着ます。"] },
  { term: "店", reading: "みせ", meaning: "shop; store", pos: "noun", category: "Places", sentence: "この____でパンを買います。", example: "この店でパンを買います。", exampleEn: "I buy bread at this shop.", wrong: ["店を泳ぎます。", "店は昨日です。", "店で雨を開けます。"] },
  { term: "家", reading: "いえ", meaning: "house; home", pos: "noun", category: "Places", sentence: "____でご飯を食べます。", example: "家でご飯を食べます。", exampleEn: "I eat at home.", wrong: ["家を飲みます。", "家は三人を聞きます。", "家で空を着ます。"] },
  { term: "学生", reading: "がくせい", meaning: "student", pos: "noun", category: "People", sentence: "私は____です。", example: "私は学生です。", exampleEn: "I am a student.", wrong: ["学生を飲みます。", "学生は赤い時間です。", "学生でドアを食べます。"] },
  { term: "先生", reading: "せんせい", meaning: "teacher", pos: "noun", category: "People", sentence: "田中さんは日本語 of ____です。", example: "田中さんは日本語の先生です。", exampleEn: "Mr. Tanaka is a Japanese teacher.", wrong: ["先生を切符で行きます。", "先生はとても安いです。", "先生で雨を食べます。"] },
  { term: "友だち", reading: "ともだち", meaning: "friend", pos: "noun", category: "People", sentence: "____と映画を見ます。", example: "友だちと映画を見ます。", exampleEn: "I watch a movie with my friend.", wrong: ["友だちを開けます。", "友だちは青い駅です。", "友だちで水を書きます。"] },
  { term: "男", reading: "おとこ", meaning: "man; male", pos: "noun", category: "People", sentence: "あの____の人は父です。", example: "あの男の人は父です。", exampleEn: "That man is my father.", wrong: ["男を飲みます。", "男は五時を買います。", "男で魚を開けます。"] },
  { term: "女", reading: "おんな", meaning: "woman; female", pos: "noun", category: "People", sentence: "あの____の人は母です。", example: "あの女の人は母です。", exampleEn: "That woman is my mother.", wrong: ["女を食べます。", "女は安い雨です。", "女で手紙を起きます。"] },
  { term: "父", reading: "ちち", meaning: "my father", pos: "noun", category: "Family", sentence: "____は会社員です。", example: "父は会社員です。", exampleEn: "My father is an office worker.", wrong: ["父を飲みます。", "父は青い駅です。", "父で本を泳ぎます。"] },
  { term: "母", reading: "はは", meaning: "my mother", pos: "noun", category: "Family", sentence: "____は料理が好きです。", example: "母は料理が好きです。", exampleEn: "My mother likes cooking.", wrong: ["母を食べます。", "母は小さい月曜日です。", "母で電車を飲みます。"] },
  { term: "子ども", reading: "こども", meaning: "child", pos: "noun", category: "Family", sentence: "公園に____がいます。", example: "公園に子どもがいます。", exampleEn: "There is a child in the park.", wrong: ["子どもを寝ます。", "子どもは白い水です。", "子どもで新聞を食べます。"] },
  { term: "人", reading: "ひと", meaning: "person", pos: "noun", category: "People", sentence: "教室に____がいます。", example: "教室に人がいます。", exampleEn: "There is a person in the classroom.", wrong: ["人を読みます。", "人は寒い駅です。", "人でパンを開けます。"] },
  { term: "本", reading: "ほん", meaning: "book", pos: "noun", category: "Objects", sentence: "____を読みます。", example: "本を読みます。", exampleEn: "I read a book.", wrong: ["本を飲みます。", "本は駅で寝ます。", "本でご飯を会います。"] },
  { term: "新聞", reading: "しんぶん", meaning: "newspaper", pos: "noun", category: "Objects", sentence: "朝、____を読みます。", example: "朝、新聞を読みます。", exampleEn: "I read a newspaper in the morning.", wrong: ["新聞を泳ぎます。", "新聞は七時を食べます。", "新聞で顔を買います。"] },
  { term: "手紙", reading: "てがみ", meaning: "letter", pos: "noun", category: "Objects", sentence: "友だちに____を書きます。", example: "友だちに手紙を書きます。", exampleEn: "I write a letter to my friend.", wrong: ["手紙を飲みます。", "手紙は昨日を歩きます。", "手紙で魚を起きます。"] },
  { term: "車", reading: "くるま", meaning: "car", pos: "noun", category: "Transport", sentence: "____で学校へ行きます。", example: "車で学校へ行きます。", exampleEn: "I go to school by car.", wrong: ["車を読みます。", "車はおいしいです。", "車で水を寝ます。"] },
  { term: "電車", reading: "でんしゃ", meaning: "train", pos: "noun", category: "Transport", sentence: "____に乗ります。", example: "電車に乗ります。", exampleEn: "I ride the train.", wrong: ["電車を食べます。", "電車は赤い日曜日です。", "電車で手紙を飲みます。"] },
  { term: "自転車", reading: "じてんしゃ", meaning: "bicycle", pos: "noun", category: "Transport", sentence: "____で駅へ行きます。", example: "自転車で駅へ行きます。", exampleEn: "I go to the station by bicycle.", wrong: ["自転車を読みます。", "自転車は高い魚です。", "自転車で本を寝ます。"] },
  { term: "時間", reading: "じかん", meaning: "time; hour", pos: "noun", category: "Time", sentence: "日本語を二____勉強します。", example: "日本語を二時間勉強します。", exampleEn: "I study Japanese for two hours.", wrong: ["時間を食べます。", "時間は青い先生です。", "時間で水を開けます。"] },
  { term: "今日", reading: "きょう", meaning: "today", pos: "noun", category: "Time", sentence: "____は月曜日です。", example: "今日は月曜日です。", exampleEn: "Today is Monday.", wrong: ["今日を飲みます。", "今日は大きい駅を食べます。", "今日で鉛筆を寝ます。"] },
  { term: "明日", reading: "あした", meaning: "tomorrow", pos: "noun", category: "Time", sentence: "____、試験があります。", example: "明日、試験があります。", exampleEn: "There is an exam tomorrow.", wrong: ["明日を食べます。", "明日は安い水です。", "明日でドアを読みます。"] },
  { term: "月曜日", reading: "げつようび", meaning: "Monday", pos: "noun", category: "Time", sentence: "____に学校へ行きます。", example: "月曜日に学校へ行きます。", exampleEn: "I go to school on Monday.", wrong: ["月曜日を飲みます。", "月曜日はおいしいです。", "月曜日で新聞を泳ぎます。"] },
  { term: "火曜日", reading: "かようび", meaning: "Tuesday", pos: "noun", category: "Time", sentence: "____にテストがあります。", example: "火曜日にテストがあります。", exampleEn: "There is a test on Tuesday.", wrong: ["火曜日を読みます。", "火曜日は白い車です。", "火曜日で雨を食べます。"] },
  { term: "水", reading: "みず", meaning: "water", pos: "noun", category: "Food", sentence: "____を飲みます。", example: "水を飲みます。", exampleEn: "I drink water.", wrong: ["水を読みます。", "水は駅へ行きます。", "水で友だちを寝ます。"] },
  { term: "魚", reading: "さかな", meaning: "fish", pos: "noun", category: "Food", sentence: "____を食べます。", example: "魚を食べます。", exampleEn: "I eat fish.", wrong: ["魚を読みます。", "魚は月曜日を買います。", "魚で学校を寝ます。"] },
  { term: "肉", reading: "にく", meaning: "meat", pos: "noun", category: "Food", sentence: "____が好きです。", example: "肉が好きです。", exampleEn: "I like meat.", wrong: ["肉を読みます。", "肉は電車へ行きます。", "肉で手紙を開けます。"] },
  { term: "山", reading: "やま", meaning: "mountain", pos: "noun", category: "Nature", sentence: "____に登ります。", example: "山に登ります。", exampleEn: "I climb a mountain.", wrong: ["山を飲みます。", "山は安い先生です。", "山で手紙を食べます。"] },
  { term: "川", reading: "かわ", meaning: "river", pos: "noun", category: "Nature", sentence: "____の近くを歩きます。", example: "川の近くを歩きます。", exampleEn: "I walk near the river.", wrong: ["川を読みます。", "川は月曜日です。", "川で魚を起きます。"] },
  { term: "雨", reading: "あめ", meaning: "rain", pos: "noun", category: "Nature", sentence: "____が降っています。", example: "雨が降っています。", exampleEn: "It is raining.", wrong: ["雨を食べます。", "雨は駅で買います。", "雨で本を寝ます。"] },
  { term: "空", reading: "そら", meaning: "sky", pos: "noun", category: "Nature", sentence: "____が青いです。", example: "空が青いです。", exampleEn: "The sky is blue.", wrong: ["空を飲みます。", "空は駅へ行きます。", "空で新聞を食べます。"] },
  { term: "名前", reading: "なまえ", meaning: "name", pos: "noun", category: "Basics", sentence: "ここに____を書いてください。", example: "ここに名前を書いてください。", exampleEn: "Please write your name here.", wrong: ["名前を飲みます。", "名前は寒い電車です。", "名前でご飯を泳ぎます。"] },
  { term: "お金", reading: "おかね", meaning: "money", pos: "noun", category: "Basics", sentence: "____がありません。", example: "お金がありません。", exampleEn: "I do not have money.", wrong: ["お金を寝ます。", "お金は学校へ行きます。", "お金で雨を読みます。"] },
  { term: "切符", reading: "きっぷ", meaning: "ticket", pos: "noun", category: "Transport", sentence: "駅で____を買います。", example: "駅で切符を買います。", exampleEn: "I buy a ticket at the station.", wrong: ["切符を飲みます。", "切符は火曜日です。", "切符で水を寝ます。"] },
  { term: "大きい", reading: "おおきい", meaning: "big", pos: "i-adjective", category: "Adjectives", sentence: "このかばんは____です。", example: "このかばんは大きいです。", exampleEn: "This bag is big.", wrong: ["大きいを飲みます。", "大きいは駅へ行きます。", "大きいで本を食べます。"] },
  { term: "小さい", reading: "ちいさい", meaning: "small", pos: "i-adjective", category: "Adjectives", sentence: "____犬がいます。", example: "小さい犬がいます。", exampleEn: "There is a small dog.", wrong: ["小さいを読みます。", "小さいは電車を食べます。", "小さいで雨を買います。"] },
  { term: "新しい", reading: "あたらしい", meaning: "new", pos: "i-adjective", category: "Adjectives", sentence: "____本を買いました。", example: "新しい本を買いました。", exampleEn: "I bought a new book.", wrong: ["新しいを飲みます。", "新しいは駅で寝ます。", "新しいで肉を読みます。"] },
  { term: "古い", reading: "ふるい", meaning: "old", pos: "i-adjective", category: "Adjectives", sentence: "これは____写真です。", example: "これは古い写真です。", exampleEn: "This is an old photo.", wrong: ["古いを食べます。", "古いは電車へ行きます。", "古いで水を読みます。"] },
  { term: "高い", reading: "たかい", meaning: "expensive; tall", pos: "i-adjective", category: "Adjectives", sentence: "この時計は____です。", example: "この時計は高いです。", exampleEn: "This watch is expensive.", wrong: ["高いを飲みます。", "高いは学校を読みます。", "高いで魚を寝ます。"] },
  { term: "安い", reading: "やすい", meaning: "cheap", pos: "i-adjective", category: "Adjectives", sentence: "この店は____です。", example: "この店は安いです。", exampleEn: "This store is cheap.", wrong: ["安いを食べます。", "安いは雨へ行きます。", "安いで手紙を飲みます。"] },
  { term: "暑い", reading: "あつい", meaning: "hot (weather)", pos: "i-adjective", category: "Adjectives", sentence: "今日は____です。", example: "今日は暑いです。", exampleEn: "It is hot today.", wrong: ["暑いを読みします。", "暑いは駅を食べます。", "暑いで車を寝ます。"] },
  { term: "寒い", reading: "さむい", meaning: "cold (weather)", pos: "i-adjective", category: "Adjectives", sentence: "冬は____です。", example: "冬は寒いです。", exampleEn: "Winter is cold.", wrong: ["寒いを飲みます。", "寒いは先生を買います。", "寒いで水を読みます。"] },
  { term: "赤い", reading: "あかい", meaning: "red", pos: "i-adjective", category: "Colors", sentence: "____花があります。", example: "赤い花があります。", exampleEn: "There is a red flower.", wrong: ["赤いを飲みます。", "赤いは学校へ行きます。", "赤いで新聞を食べます。"] },
  { term: "白い", reading: "しろい", meaning: "white", pos: "i-adjective", category: "Colors", sentence: "____シャツを着ます。", example: "白いシャツを着ます。", exampleEn: "I wear a white shirt.", wrong: ["白いを読みます。", "白いは電車を飲みます。", "白いで友だちを開けます。"] },
  { term: "青い", reading: "あおい", meaning: "blue", pos: "i-adjective", category: "Colors", sentence: "____ペンを使います。", example: "青いペンを使います。", exampleEn: "I use a blue pen.", wrong: ["青いを食べます。", "青いは駅へ行きます。", "青いでご飯を読みます。"] },
  { term: "行きます", reading: "いきます", meaning: "to go", pos: "verb", category: "Verbs", sentence: "学校へ____。", example: "学校へ行きます。", exampleEn: "I go to school.", wrong: ["行きますを食べます。", "行きますは赤いです。", "行きますで水を読みます。"] },
  { term: "来ます", reading: "きます", meaning: "to come", pos: "verb", category: "Verbs", sentence: "友だちが家へ____。", example: "友だちが家へ来ます。", exampleEn: "My friend comes to my house.", wrong: ["来ますを飲みます。", "来ますは高いです。", "来ますで本を食べます。"] },
  { term: "見ます", reading: "みます", meaning: "to see; to watch", pos: "verb", category: "Verbs", sentence: "テレビを____。", example: "テレビを見ます。", exampleEn: "I watch TV.", wrong: ["見ますを飲みます。", "見ますは月曜日です。", "見ますで水を寝ます。"] },
  { term: "読みます", reading: "よみます", meaning: "to read", pos: "verb", category: "Verbs", sentence: "本を____。", example: "本を読みます。", exampleEn: "I read a book.", wrong: ["読みますを食べます。", "読みますは青いです。", "読みますで駅を飲みます。"] },
  { term: "書きます", reading: "かきます", meaning: "to write", pos: "verb", category: "Verbs", sentence: "名前を____。", example: "名前を書きます。", exampleEn: "I write my name.", wrong: ["書きますを食べます。", "書きますは寒いです。", "書きますで電車を飲みます。"] },
  { term: "食べます", reading: "たべます", meaning: "to eat", pos: "verb", category: "Verbs", sentence: "ご飯を____。", example: "ご飯を食べます。", exampleEn: "I eat a meal.", wrong: ["食べますを読みます。", "食べますは駅です。", "食べますで学校を起きます。"] },
  { term: "飲みます", reading: "のみます", meaning: "to drink", pos: "verb", category: "Verbs", sentence: "水を____。", example: "水を飲みます。", exampleEn: "I drink water.", wrong: ["飲みますを読みます。", "飲みますは月曜日です。", "飲みますで魚を起きます。"] },
  { term: "買います", reading: "かいます", meaning: "to buy", pos: "verb", category: "Verbs", sentence: "店でパンを____。", example: "店でパンを買います。", exampleEn: "I buy bread at the store.", wrong: ["買いますを飲みます。", "買いますは寒いです。", "買いますで新聞を寝ます。"] },
  { term: "会います", reading: "あいます", meaning: "to meet", pos: "verb", category: "Verbs", sentence: "友だちに____。", example: "友だちに会います。", exampleEn: "I meet my friend.", wrong: ["会いますを食べます。", "会いますは赤い水です。", "会いますで本を飲みます。"] },
  { term: "起きます", reading: "おきます", meaning: "to wake up", pos: "verb", category: "Verbs", sentence: "六時に____。", example: "六時に起きます。", exampleEn: "I wake up at six.", wrong: ["起きますを飲みます。", "起きますは白い駅です。", "起きますで魚を読みます。"] },
  { term: "寝ます", reading: "ねます", meaning: "to sleep", pos: "verb", category: "Verbs", sentence: "十一時に____。", example: "十一時に寝ます。", exampleEn: "I sleep at eleven.", wrong: ["寝ますを読みます。", "寝ますは青い学校です。", "寝ますで肉を飲みます。"] },
  { term: "話します", reading: "はなします", meaning: "to speak; to talk", pos: "verb", category: "Verbs", sentence: "日本語で____。", example: "日本語で話します。", exampleEn: "I speak in Japanese.", wrong: ["話しますを食べます。", "話しますは安いです。", "話しますで切符を寝ます。"] },
  { term: "勉強します", reading: "べんきょうします", meaning: "to study", pos: "verb", category: "Verbs", sentence: "図書館で____。", example: "図書館で勉強します。", exampleEn: "I study at the library.", wrong: ["勉強しますを飲みます。", "勉強しますは魚です。", "勉強しますで雨を開けます。"] },
  { term: "朝", reading: "あさ", meaning: "morning", pos: "noun", category: "Time", sentence: "____ご飯を食べます。", example: "朝ご飯を食べます。", exampleEn: "I eat breakfast.", wrong: ["朝を飲みます。", "朝は赤い学校です。", "朝で本を泳ぎます。"] },
  { term: "昼", reading: "ひる", meaning: "noon; daytime", pos: "noun", category: "Time", sentence: "____に友だちと会います。", example: "昼に友だちと会います。", exampleEn: "I meet my friend at noon.", wrong: ["昼を食べます。", "昼は白い先生です。", "昼で水を読みます。"] },
  { term: "夜", reading: "よる", meaning: "night", pos: "noun", category: "Time", sentence: "____、テレビを見ます。", example: "夜、テレビを見ます。", exampleEn: "I watch TV at night.", wrong: ["夜を飲みます。", "夜は電車を食べます。", "夜で名前を泳ぎます。"] }
];

const compactVocabData = `
入口|いりぐち|entrance|noun|Places
出口|でぐち|exit|noun|Places
教室|きょうしつ|classroom|noun|Places
図書館|としょかん|library|noun|Places
病院|びょういん|hospital|noun|Places
銀行|ぎんこう|bank|noun|Places
郵便局|ゆうびんきょく|post office|noun|Places
公園|こうえん|park|noun|Places
会社|かいしゃ|company; office|noun|Places
大学|だいがく|university|noun|Places
高校|こうこう|high school|noun|Places
中学校|ちゅうがっこう|junior high school|noun|Places
小学校|しょうがっこう|elementary school|noun|Places
町|まち|town|noun|Places
国|くに|country|noun|Places
外国|がいこく|foreign country|noun|Places
近く|ちかく|nearby|noun|Places
上|うえ|up; above|noun|Position
下|した|down; below|noun|Position
前|まえ|front; before|noun|Position
後ろ|うしろ|back; behind|noun|Position
右|みぎ|right|noun|Position
左|ひだり|left|noun|Position
中|なか|inside|noun|Position
外|そと|outside|noun|Position
隣|となり|next door; next to|noun|Position
間|あいだ|between|noun|Position
東|ひがし|east|noun|Direction
西|にし|west|noun|Direction
南|みなみ|south|noun|Direction
北|きた|north|noun|Direction
私|わたし|I; me|noun|People
あなた|あなた|you|noun|People
誰|だれ|who|noun|People
兄|あに|my older brother|noun|Family
お兄さん|おにいさん|older brother|noun|Family
姉|あね|my older sister|noun|Family
お姉さん|おねえさん|older sister|noun|Family
弟|おとうと|younger brother|noun|Family
妹|いもうと|younger sister|noun|Family
家族|かぞく|family|noun|Family
夫|おっと|husband|noun|Family
妻|つま|wife|noun|Family
会社員|かいしゃいん|company employee|noun|People
医者|いしゃ|doctor|noun|People
店員|てんいん|shop clerk|noun|People
駅員|えきいん|station staff|noun|People
留学生|りゅうがくせい|international student|noun|People
日本人|にほんじん|Japanese person|noun|People
外国人|がいこくじん|foreigner|noun|People
食べ物|たべもの|food|noun|Food
飲み物|のみもの|drink|noun|Food
ご飯|ごはん|rice; meal|noun|Food
朝ご飯|あさごはん|breakfast|noun|Food
昼ご飯|ひるごはん|lunch|noun|Food
晩ご飯|ばんごはん|dinner|noun|Food
パン|パン|bread|noun|Food
卵|たまご|egg|noun|Food
牛肉|ぎゅうにく|beef|noun|Food
豚肉|ぶたにく|pork|noun|Food
鶏肉|とりにく|chicken|noun|Food
野菜|やさい|vegetable|noun|Food
果物|くだもの|fruit|noun|Food
牛乳|ぎゅうにゅう|milk|noun|Food
お茶|おちゃ|tea|noun|Food
紅茶|こうちゃ|black tea|noun|Food
コーヒー|コーヒー|coffee|noun|Food
ジュース|ジュース|juice|noun|Food
酒|さけ|alcohol; sake|noun|Food
塩|しお|salt|noun|Food
砂糖|さとう|sugar|noun|Food
醤油|しょうゆ|soy sauce|noun|Food
服|ふく|clothes|noun|Objects
上着|うわぎ|jacket|noun|Objects
下着|したぎ|underwear|noun|Objects
靴|くつ|shoes|noun|Objects
帽子|ぼうし|hat; cap|noun|Objects
眼鏡|めがね|glasses|noun|Objects
時計|とけい|clock; watch|noun|Objects
傘|かさ|umbrella|noun|Objects
鞄|かばん|bag|noun|Objects
財布|さいふ|wallet|noun|Objects
鍵|かぎ|key|noun|Objects
机|つくえ|desk|noun|Objects
椅子|いす|chair|noun|Objects
鉛筆|えんぴつ|pencil|noun|Objects
ボールペン|ボールペン|ballpoint pen|noun|Objects
紙|かみ|paper|noun|Objects
写真|しゃしん|photo|noun|Objects
地図|ちず|map|noun|Objects
電話|でんわ|telephone|noun|Objects
携帯電話|けいたいでんわ|mobile phone|noun|Objects
部屋|へや|room|noun|Places
窓|まど|window|noun|Objects
ドア|ドア|door|noun|Objects
電気|でんき|electricity; light|noun|Objects
冷蔵庫|れいぞうこ|refrigerator|noun|Objects
テレビ|テレビ|television|noun|Objects
ラジオ|ラジオ|radio|noun|Objects
パソコン|パソコン|computer|noun|Objects
映画|えいが|movie|noun|Culture
音楽|おんがく|music|noun|Culture
歌|うた|song|noun|Culture
英語|えいご|English|noun|Language
日本語|にほんご|Japanese language|noun|Language
漢字|かんじ|kanji|noun|Language
平仮名|ひらがな|hiragana|noun|Language
片仮名|かたかな|katakana|noun|Language
言葉|ことば|word; language|noun|Language
試験|しけん|exam|noun|School
宿題|しゅくだい|homework|noun|School
授業|じゅぎょう|class; lesson|noun|School
問題|もんだい|question; problem|noun|School
答え|こたえ|answer|noun|School
練習|れんしゅう|practice|noun|School
質問|しつもん|question|noun|School
休み|やすみ|rest; holiday|noun|Time
毎日|まいにち|every day|noun|Time
毎朝|まいあさ|every morning|noun|Time
毎晩|まいばん|every night|noun|Time
昨日|きのう|yesterday|noun|Time
一昨日|おととい|the day before yesterday|noun|Time
明後日|あさって|the day after tomorrow|noun|Time
今朝|けさ|this morning|noun|Time
今晩|こんばん|this evening|noun|Time
今週|こんしゅう|this week|noun|Time
先週|せんしゅう|last week|noun|Time
来週|らいしゅう|next week|noun|Time
今月|こんげつ|this month|noun|Time
先月|せんげつ|last month|noun|Time
来月|らいげつ|next month|noun|Time
今年|ことし|this year|noun|Time
去年|きょねん|last year|noun|Time
来年|らいねん|next year|noun|Time
誕生日|たんじょうび|birthday|noun|Time
午前|ごぜん|morning; a.m.|noun|Time
午後|ごご|afternoon; p.m.|noun|Time
半|はん|half|noun|Time
月|つき|month; moon|noun|Time
年|とし|year; age|noun|Time
日曜日|にちようび|Sunday|noun|Time
水曜日|すいようび|Wednesday|noun|Time
木曜日|もくようび|Thursday|noun|Time
金曜日|きんようび|Friday|noun|Time
土曜日|どようび|Saturday|noun|Time
春|はる|spring|noun|Time
夏|なつ|summer|noun|Time
秋|あき|autumn|noun|Time
冬|ふゆ|winter|noun|Time
天気|てんき|weather|noun|Nature
雪|ゆき|snow|noun|Nature
風|かぜ|wind|noun|Nature
海|うみ|sea|noun|Nature
木|き|tree|noun|Nature
花|はな|flower|noun|Nature
犬|いぬ|dog|noun|Animals
猫|ねこ|cat|noun|Animals
鳥|とり|bird|noun|Animals
一|いち|one|number|Numbers
二|に|two|number|Numbers
三|さん|three|number|Numbers
四|よん|four|number|Numbers
五|ご|five|number|Numbers
六|ろく|six|number|Numbers
七|なな|seven|number|Numbers
八|はち|eight|number|Numbers
九|きゅう|nine|number|Numbers
十|じゅう|ten|number|Numbers
百|ひゃく|hundred|number|Numbers
千|せん|thousand|number|Numbers
円|えん|yen|noun|Numbers
一人|ひとり|one person|noun|Numbers
二人|ふたり|two people|noun|Numbers
一つ|ひとつ|one thing|noun|Numbers
二つ|ふたつ|two things|noun|Numbers
三つ|みっつ|three things|noun|Numbers
四つ|よっつ|four things|noun|Numbers
五つ|いつつ|five things|noun|Numbers
六つ|むっつ|six things|noun|Numbers
七つ|ななつ|seven things|noun|Numbers
八つ|やっつ|eight things|noun|Numbers
九つ|ここのつ|nine things|noun|Numbers
大人|おとな|adult|noun|People
若い|わかい|young|i-adjective|Adjectives
長い|ながい|long|i-adjective|Adjectives
短い|みじかい|short|i-adjective|Adjectives
太い|ふとい|thick; fat|i-adjective|Adjectives
細い|ほそい|thin; narrow|i-adjective|Adjectives
重い|おもい|heavy|i-adjective|Adjectives
軽い|かるい|light|i-adjective|Adjectives
広い|ひろい|wide; spacious|i-adjective|Adjectives
狭い|せまい|narrow; small|i-adjective|Adjectives
強い|つよい|strong|i-adjective|Adjectives
弱い|よわい|weak|i-adjective|Adjectives
早い|はやい|early; fast|i-adjective|Adjectives
遅い|おそい|late; slow|i-adjective|Adjectives
明るい|あかるい|bright|i-adjective|Adjectives
暗い|くらい|dark|i-adjective|Adjectives
忙しい|いそがしい|busy|i-adjective|Adjectives
楽しい|たのしい|fun|i-adjective|Adjectives
難しい|むずかしい|difficult|i-adjective|Adjectives
易しい|やさしい|easy|i-adjective|Adjectives
優しい|やさしい|kind; gentle|i-adjective|Adjectives
面白い|おもしろい|interesting; funny|i-adjective|Adjectives
つまらない|つまらない|boring|i-adjective|Adjectives
美味しい|おいしい|delicious|i-adjective|Adjectives
まずい|まずい|bad-tasting|i-adjective|Adjectives
甘い|あまい|sweet|i-adjective|Adjectives
辛い|からい|spicy|i-adjective|Adjectives
丸い|まるい|round|i-adjective|Adjectives
黒い|くろい|black|i-adjective|Colors
黄色い|きいろい|yellow|i-adjective|Colors
茶色い|ちゃいろい|brown|i-adjective|Colors
好き|すき|liked; favorite|na-adjective|Adjectives
嫌い|きらい|disliked|na-adjective|Adjectives
静か|しずか|quiet|na-adjective|Adjectives
賑やか|にぎやか|lively|na-adjective|Adjectives
綺麗|きれい|beautiful; clean|na-adjective|Adjectives
有名|ゆうめい|famous|na-adjective|Adjectives
便利|べんり|convenient|na-adjective|Adjectives
元気|げんき|healthy; energetic|na-adjective|Adjectives
暇|ひま|free; not busy|na-adjective|Adjectives
大丈夫|だいじょうぶ|all right|na-adjective|Adjectives
歩きます|あるきます|to walk|verb|Verbs
走ります|はしります|to run|verb|Verbs
帰ります|かえります|to return home|verb|Verbs
入ります|はいります|to enter|verb|Verbs
出ます|でます|to leave; to exit|verb|Verbs
乗ります|のります|to ride|verb|Verbs
降ります|おります|to get off|verb|Verbs
聞きます|ききます|to listen; to ask|verb|Verbs
休みます|やすみます|to rest; to be absent|verb|Verbs
働きます|はたらきます|to work|verb|Verbs
待ちます|まちます|to wait|verb|Verbs
持ちます|もちます|to hold; to have|verb|Verbs
使います|つかいます|to use|verb|Verbs
作ります|つくります|to make|verb|Verbs
売ります|うります|to sell|verb|Verbs
座ります|すわります|to sit|verb|Verbs
立ちます|たちます|to stand|verb|Verbs
洗います|あらいます|to wash|verb|Verbs
開けます|あけます|to open|verb|Verbs
閉めます|しめます|to close|verb|Verbs
消します|けします|to turn off; to erase|verb|Verbs
つけます|つけます|to turn on; to attach|verb|Verbs
忘れます|わすれます|to forget|verb|Verbs
教えます|おしえます|to teach; to tell|verb|Verbs
習います|ならいます|to learn|verb|Verbs
借ります|かります|to borrow|verb|Verbs
貸します|かします|to lend|verb|Verbs
遊びます|あそびます|to play|verb|Verbs
泳ぎます|およぎます|to swim|verb|Verbs
洗濯します|せんたくします|to do laundry|verb|Verbs
掃除します|そうじします|to clean|verb|Verbs
料理します|りょうりします|to cook|verb|Verbs
旅行します|りょこうします|to travel|verb|Verbs
結婚します|けっこんします|to marry|verb|Verbs
散歩します|さんぽします|to take a walk|verb|Verbs
コピーします|コピーします|to copy|verb|Verbs
ゆっくり|ゆっくり|slowly|adverb|Adverbs
すぐ|すぐ|soon; immediately|adverb|Adverbs
よく|よく|often; well|adverb|Adverbs
時々|ときどき|sometimes|adverb|Adverbs
いつも|いつも|always|adverb|Adverbs
たくさん|たくさん|many; much|adverb|Adverbs
少し|すこし|a little|adverb|Adverbs
全部|ぜんぶ|all|adverb|Adverbs
一緒に|いっしょに|together|adverb|Adverbs
多分|たぶん|probably|adverb|Adverbs
本当に|ほんとうに|really|adverb|Adverbs
もう|もう|already; anymore|adverb|Adverbs
まだ|まだ|not yet; still|adverb|Adverbs
これ|これ|this|noun|Basics
それ|それ|that|noun|Basics
あれ|あれ|that over there|noun|Basics
ここ|ここ|here|noun|Basics
そこ|そこ|there|noun|Basics
あそこ|あそこ|over there|noun|Basics
どこ|どこ|where|noun|Basics
何|なに|what|noun|Basics
どれ|どれ|which one|noun|Basics
どの|どの|which|noun|Basics
いくら|いくら|how much|noun|Basics
どうして|どうして|why|adverb|Basics
そして|そして|and then|conjunction|Basics
しかし|しかし|however|conjunction|Basics
でも|める|but|conjunction|Basics
から|から|because; from|conjunction|Basics
まで|まで|until; to|particle|Basics
とても|とても|very|adverb|Adverbs
あまり|あまり|not very|adverb|Adverbs
`.trim();

const supplementalVocabData = `
赤ちゃん|あかちゃん|baby|noun|Family
祖父|そふ|my grandfather|noun|Family
おじいさん|おじいさん|grandfather; elderly man|noun|Family
祖母|そぼ|my grandmother|noun|Family
おばあさん|おばあさん|grandmother; elderly woman|noun|Family
伯父|おじ|my uncle|noun|Family
おじさん|おじさん|uncle; middle-aged man|noun|Family
伯母|おば|my aunt|noun|Family
おばさん|おばさん|aunt; middle-aged woman|noun|Family
親|おや|parent|noun|Family
両親|りょうしん|parents|noun|Family
兄弟|きょうだい|siblings; brothers|noun|Family
姉妹|しまい|sisters|noun|Family
男の子|おとこのこ|boy|noun|People
女の子|おんなのこ|girl|noun|People
男の人|おとこのひと|man|noun|People
女の人|おんなのひと|woman|noun|People
この人|このひと|this person|noun|People
その人|そのひと|that person|noun|People
あの人|あのひと|that person over there|noun|People
皆さん|みなさん|everyone|noun|People
皆|みんな|everyone|noun|People
一人で|ひとりで|alone; by oneself|adverb|People
何人|なんにん|how many people|noun|People
背|せ|height; back|noun|Body
頭|あたま|head|noun|Body
顔|かお|face|noun|Body
目|め|eye|noun|Body
耳|みみ|ear|noun|Body
鼻|はな|nose|noun|Body
口|くち|mouth|noun|Body
歯|は|tooth|noun|Body
手|て|hand|noun|Body
足|あし|foot; leg|noun|Body
体|からだ|body|noun|Body
お腹|おなか|stomach|noun|Body
喉|のど|throat|noun|Body
髪|かみ|hair|noun|Body
風邪|かぜ|cold; flu|noun|Health
熱|ねつ|fever|noun|Health
薬|くすり|medicine|noun|Health
痛い|いたい|painful; hurt|i-adjective|Health
眠い|ねむい|sleepy|i-adjective|Health
危ない|あぶない|dangerous|i-adjective|Health
大切|たいせつ|important|na-adjective|Adjectives
同じ|おなじ|same|na-adjective|Adjectives
色々|いろいろ|various|na-adjective|Adjectives
駄目|だめ|not good; no good|na-adjective|Adjectives
簡単|かんたん|easy; simple|na-adjective|Adjectives
複雑|ふくざつ|complicated|na-adjective|Adjectives
低い|ひくい|low; short|i-adjective|Adjectives
多い|おおい|many; much|i-adjective|Adjectives
少ない|すくない|few; little|i-adjective|Adjectives
近い|ちかい|near|i-adjective|Adjectives
遠い|とおい|far|i-adjective|Adjectives
良い|いい|good|i-adjective|Adjectives
悪い|わるい|bad|i-adjective|Adjectives
可愛い|かわいい|cute|i-adjective|Adjectives
涼しい|すずしい|cool|i-adjective|Adjectives
暖かい|あたたかい|warm|i-adjective|Adjectives
温かい|あたたかい|warm|i-adjective|Adjectives
冷たい|つめたい|cold to the touch|i-adjective|Adjectives
厚い|あつい|thick|i-adjective|Adjectives
薄い|うすい|thin|i-adjective|Adjectives
おかしい|おかしい|strange; funny|i-adjective|Adjectives
恥ずかしい|はずかしい|embarrassing; shy|i-adjective|Adjectives
欲しい|ほしい|want|i-adjective|Adjectives
寂しい|さびしい|lonely|i-adjective|Adjectives
眠ります|ねむります|to sleep|verb|Verbs
起こします|おこします|to wake someone up|verb|Verbs
開きます|あきます|to open|verb|Verbs
閉まります|しまります|to close|verb|Verbs
始まります|はじまります|to begin|verb|Verbs
終わります|おわります|to finish|verb|Verbs
始めます|はじめます|to start|verb|Verbs
終えます|おえます|to finish; to end|verb|Verbs
曲がります|まがります|to turn|verb|Verbs
渡ります|わたります|to cross|verb|Verbs
止まります|とまります|to stop|verb|Verbs
止めます|とめます|to stop something|verb|Verbs
置きます|おきます|to put; to place|verb|Verbs
並びます|ならびます|to line up|verb|Verbs
並べます|ならべます|to line up; to arrange|verb|Verbs
探します|さがします|to search for|verb|Verbs
分かります|わかります|to understand|verb|Verbs
知ります|しります|to know|verb|Verbs
思います|おもいます|to think|verb|Verbs
言います|いいます|to say|verb|Verbs
呼びます|よびます|to call|verb|Verbs
歌います|うたいます|to sing|verb|Verbs
弾きます|ひきます|to play an instrument|verb|Verbs
踊ります|おどります|to dance|verb|Verbs
撮ります|とります|to take a photo|verb|Verbs
取ります|とります|to take|verb|Verbs
払います|はらいます|to pay|verb|Verbs
なくします|なくします|to lose something|verb|Verbs
見せます|みせます|to show|verb|Verbs
見つけます|みつけます|to find|verb|Verbs
手伝います|てつだいます|to help|verb|Verbs
変えます|かえます|to change|verb|Verbs
替えます|かえます|to exchange; to replace|verb|Verbs
覚えます|おぼえます|to memorize|verb|Verbs
考えます|かんがえます|to think|verb|Verbs
答えます|こたえます|to answer|verb|Verbs
質問します|しつもんします|to ask a question|verb|Verbs
電話します|でんわします|to telephone|verb|Verbs
運動します|うんどうします|to exercise|verb|Verbs
練習します|れんしゅうします|to practice|verb|Verbs
説明します|せつめいします|to explain|verb|Verbs
紹介します|しょうかいします|to introduce|verb|Verbs
案内します|あんないします|to guide|verb|Verbs
仕事します|しごとします|to work|verb|Verbs
残業します|ざんぎょうします|to work overtime|verb|Verbs
出張します|しゅっちょうします|to go on a business trip|verb|Verbs
留学します|りゅうがくします|to study abroad|verb|Verbs
卒業します|そつぎょうします|to graduate|verb|Verbs
入学します|にゅうがくします|to enter school|verb|Verbs
出発します|しゅっぱつします|to depart|verb|Verbs
到着します|とうちゃくします|to arrive|verb|Verbs
予約します|よやくします|to reserve|verb|Verbs
注文します|ちゅうもんします|to order|verb|Verbs
買い物します|かいものします|to shop|verb|Verbs
大使館|たいしかん|embassy|noun|Places
交番|こうばん|police box|noun|Places
市役所|しやくしょ|city hall|noun|Places
役所|やくしょ|government office|noun|Places
空港|くうこう|airport|noun|Places
港|みなと|port; harbor|noun|Places
バス停|バスてい|bus stop|noun|Transport
地下鉄|ちかてつ|subway|noun|Transport
新幹線|しんかんせん|Shinkansen; bullet train|noun|Transport
飛行機|ひこうき|airplane|noun|Transport
船|ふね|ship; boat|noun|Transport
道|みち|road; way|noun|Town
道路|どうろ|road|noun|Town
角|かど|corner|noun|Town
橋|はし|bridge|noun|Town
信号|しんごう|traffic light|noun|Town
横断歩道|おうだんほどう|pedestrian crossing|noun|Town
建物|たてもの|building|noun|Town
アパート|アパート|apartment|noun|Buildings
マンション|マンション|apartment building|noun|Buildings
台所|だいどころ|kitchen|noun|Home
風呂|ふろ|bath|noun|Home
お風呂|おふろ|bath|noun|Home
トイレ|トイレ|toilet|noun|Home
玄関|げんかん|entryway|noun|Home
廊下|ろうか|hallway|noun|Home
階段|かいだん|stairs|noun|Home
エレベーター|エレベーター|elevator|noun|Buildings
庭|にわ|garden|noun|Home
住所|じゅうしょ|address|noun|Basics
番号|ばんごう|number|noun|Basics
電話番号|でんわばんごう|phone number|noun|Basics
国籍|こくせき|nationality|noun|Basics
年齢|ねんれい|age|noun|Basics
趣味|しゅみ|hobby|noun|Hobbies
スポーツ|スポーツ|sports|noun|Hobbies
サッカー|サッカー|soccer|noun|Hobbies
テニス|テニス|tennis|noun|Hobbies
野球|やきゅう|baseball|noun|Hobbies
水泳|すいえい|swimming|noun|Hobbies
散歩|さんぽ|walk; stroll|noun|Hobbies
旅行|りょこう|travel|noun|Hobbies
カラオケ|カラオケ|karaoke|noun|Hobbies
ギター|ギター|guitar|noun|Hobbies
絵|え|picture; painting|noun|Culture
漫画|まんが|comic; manga|noun|Culture
アニメ|アニメ|anime|noun|Culture
雑誌|ざっし|magazine|noun|Objects
辞書|じしょ|dictionary|noun|Objects
封筒|ふうとう|envelope|noun|Objects
葉書|はがき|postcard|noun|Objects
箱|はこ|box|noun|Objects
皿|さら|plate|noun|Objects
箸|はし|chopsticks|noun|Objects
スプーン|スプーン|spoon|noun|Objects
フォーク|フォーク|fork|noun|Objects
ナイフ|ナイフ|knife|noun|Objects
コップ|コップ|cup; glass|noun|Objects
お皿|おさら|plate|noun|Objects
石鹸|せっけん|soap|noun|Daily Life
タオル|タオル|towel|noun|Daily Life
歯ブラシ|はブラシ|toothbrush|noun|Daily Life
洗濯機|せんたくき|washing machine|noun|Daily Life
掃除機|そうじき|vacuum cleaner|noun|Daily Life
切手|きって|stamp|noun|Objects
カード|カード|card|noun|Shopping
現金|げんきん|cash|noun|Shopping
値段|ねだん|price|noun|Shopping
半額|はんがく|half price|noun|Shopping
無料|むりょう|free of charge|noun|Shopping
レジ|レジ|cash register|noun|Shopping
領収書|りょうしゅうしょ|receipt|noun|Shopping
お釣り|おつり|change|noun|Shopping
売り場|うりば|sales floor; department|noun|Shopping
食堂|しょくどう|dining hall|noun|Food
レストラン|レストラン|restaurant|noun|Food
喫茶店|きっさてん|coffee shop|noun|Food
メニュー|メニュー|menu|noun|Food
定食|ていしょく|set meal|noun|Food
弁当|べんとう|boxed lunch|noun|Food
おにぎり|おにぎり|rice ball|noun|Food
味噌汁|みそしる|miso soup|noun|Food
ご馳走|ごちそう|feast; treat|noun|Food
料理|りょうり|cooking; dish|noun|Food
和食|わしょく|Japanese food|noun|Food
洋食|ようしょく|Western food|noun|Food
中華料理|ちゅうかりょうり|Chinese food|noun|Food
ラーメン|ラーメン|ramen|noun|Food
カレー|カレー|curry|noun|Food
アイスクリーム|アイスクリーム|ice cream|noun|Food
チョコレート|チョコレート|chocolate|noun|Food
お菓子|おかし|sweets; snacks|noun|Food
ケーキ|ケーキ|cake|noun|Food
朝食|ちょうしょく|breakfast|noun|Food
昼食|ちゅうしょく|lunch|noun|Food
夕食|ゆうしょく|dinner|noun|Food
ご主人|ごしゅじん|someone's husband|noun|Family
奥さん|おくさん|someone's wife|noun|Family
英会話|えいかいわ|English conversation|noun|Language
会話|かいわ|conversation|noun|Language
文法|ぶんぽう|grammar|noun|Language
発音|はつおん|pronunciation|noun|Language
作文|さくぶん|composition|noun|School
漢字テスト|かんじテスト|kanji test|noun|School
教科書|きょうかしょ|textbook|noun|School
ノート|ノート|notebook|noun|School
消しゴム|けしゴム|eraser|noun|School
定規|じょうぎ|ruler|noun|School
制服|せいふく|uniform|noun|Clothes
背広|せびろ|business suit|noun|Clothes
スーツ|スーツ|suit|noun|Clothes
セーター|セーター|sweater|noun|Clothes
シャツ|シャツ|shirt|noun|Clothes
ズボン|ズボン|pants|noun|Clothes
スカート|スカート|skirt|noun|Clothes
靴下|くつした|socks|noun|Clothes
ネクタイ|ネクタイ|tie|noun|Clothes
コート|コート|coat|noun|Clothes
ジャケット|ジャケット|jacket|noun|Clothes
ポケット|ポケット|pocket|noun|Clothes
眼鏡屋|めがねや|glasses shop|noun|Shopping
本屋|ほんや|bookstore|noun|Shopping
花屋|はなや|flower shop|noun|Shopping
肉屋|にくや|butcher shop|noun|Shopping
魚屋|さかなや|fish shop|noun|Shopping
八百屋|やおや|vegetable shop|noun|Shopping
薬屋|くすりや|pharmacy|noun|Shopping
スーパー|スーパー|supermarket|noun|Shopping
デパート|デパート|department store|noun|Shopping
コンビニ|コンビニ|convenience store|noun|Shopping
店長|てんちょう|store manager|noun|Work
社長|しゃちょう|company president|noun|Work
社員|しゃいん|company employee|noun|Work
会議|かいぎ|meeting|noun|Work
資料|しりょう|materials; documents|noun|Work
受付|うけつけ|reception|noun|Work
事務所|じむしょ|office|noun|Work
工場|こうじょう|factory|noun|Work
仕事中|しごとちゅう|at work|noun|Work
休憩|きゅうけい|break; rest|noun|Work
給料|きゅうりょう|salary|noun|Work
疲れます|つかれます|to get tired|verb|Health
困ります|こまります|to be troubled|verb|Feelings
泣きます|なきます|to cry|verb|Feelings
笑います|わらいます|to laugh|verb|Feelings
怒ります|おこります|to get angry|verb|Feelings
驚きます|おどろきます|to be surprised|verb|Feelings
心配します|しんぱいします|to worry|verb|Feelings
安心します|あんしんします|to feel relieved|verb|Feelings
悲しい|かなしい|sad|i-adjective|Feelings
嬉しい|うれしい|happy|i-adjective|Feelings
怖い|こわい|scary|i-adjective|Feelings
心配|しんぱい|worried|na-adjective|Feelings
安全|あんぜん|safe|na-adjective|Feelings
本当|ほんとう|truth; real|noun|Basics
嘘|うそ|lie|noun|Basics
理由|りゆう|reason|noun|Basics
意味|いみ|meaning|noun|Basics
用事|ようじ|errand; thing to do|noun|Daily Life
約束|やくそく|promise; appointment|noun|Daily Life
予定|よてい|plan; schedule|noun|Daily Life
準備|じゅんび|preparation|noun|Daily Life
一番|いちばん|number one; the most|adverb|Numbers
最初|さいしょ|first; beginning|noun|Time
最後|さいご|last; end|noun|Time
次|つぎ|next|noun|Time
今度|こんど|next time; this time|noun|Time
今回|こんかい|this time|noun|Time
毎年|まいとし|every year|noun|Time
毎月|まいつき|every month|noun|Time
毎週|まいしゅう|every week|noun|Time
最近|さいきん|recently|adverb|Time
さっき|さっき|a little while ago|adverb|Time
後で|あとで|later|adverb|Time
先に|さきに|first; ahead|adverb|Time
だんだん|だんだん|gradually|adverb|Adverbs
だいたい|だいたい|mostly; approximately|adverb|Adverbs
ちょっと|ちょっと|a little|adverb|Adverbs
もっと|もっと|more|adverb|Adverbs
もう一度|もういちど|one more time|adverb|Adverbs
どうぞ|どうぞ|please; go ahead|expression|Greetings
どうも|どうも|thanks; very|expression|Greetings
ありがとう|ありがとう|thank you|expression|Greetings
ありがとうございます|ありがとうございます|thank you very much|expression|Greetings
すみません|すみません|excuse me; sorry|expression|Greetings
ごめんなさい|ごめんなさい|sorry|expression|Greetings
おはようございます|おはようございます|good morning|expression|Greetings
こんにちは|こんにちは|hello|expression|Greetings
こんばんは|こんばんは|good evening|expression|Greetings
さようなら|さようなら|goodbye|expression|Greetings
おやすみなさい|おやすみなさい|good night|expression|Greetings
いただきます|いただきます|said before eating|expression|Greetings
ごちそうさまでした|ごちそうさまでした|said after eating|expression|Greetings
いらっしゃいませ|いらっしゃいませ|welcome to our store|expression|Greetings
お願いします|おねがいします|please|expression|Greetings
分かりました|わかりました|I understand|expression|Greetings
結構です|けっこうです|no thank you; fine|expression|Greetings
もちろん|もちろん|of course|adverb|Adverbs
もしもし|もしもし|hello on the phone|expression|Greetings
じゃあ|じゃあ|well then|conjunction|Basics
それから|それから|after that; and then|conjunction|Basics
それでは|それでは|well then|conjunction|Basics
例えば|たとえば|for example|adverb|Basics
`.trim();

const manualQuestionData = `
reading|「日本」の読み方はどれですか。|にほん|にほん~にちほん~にっぽ~ひもと|日本 = にほん / Japan
reading|「学校」の読み方はどれですか。|がっこう|がっこう~がこう~かっこう~がくこう|学校 = がっこう / school
reading|「先生」の読み方はどれですか。|せんせい|せんせい~せんせ~せんさい~せいせん|先生 = せんせい / teacher
reading|「学生」の読み方はどれですか。|がくせい|がくせい~がっせい~かくせい~がくさい|学生 = がくせい / student
reading|「友だち」の読み方はどれですか。|ともだち|ともだち~ゆうだち~ともたち~ゆだち|友だち = ともだち / friend
reading|「駅」の読み方はどれですか。|えき|えき~えぎ~いき~やく|駅 = えき / station
reading|「店」の読み方はどれですか。|みせ|みせ~てん~みぜ~めせ|店 = miせ / shop
reading|「家」の読み方はどれですか。|いえ|いえ~うちえ~か~や|家 = いえ / house
reading|「会社」の読み方はどれですか。|かいしゃ|かいしゃ~かいじゃ~がいしゃ~かしゃ|会社 = かいしゃ / company
reading|「銀行」の読み方はどれですか。|ぎんこう|ぎんこう~ぎんごう~きんこう~ぎこう|銀行 = ぎんこう / bank
reading|「郵便局」の読み方はどれですか。|ゆうびんきょく|ゆうびんきょく~ゆびんきょく~ゆうべんきょく~ゆうびんきょ|郵便局 = ゆうびんきょく / post office
reading|「病院」の読み方はどれですか。|びょういん|びょういん~びよういん~ひょういん~びょいん|病院 = びょういん / hospital
reading|「図書館」の読み方はどれですか。|としょかん|としょかん~とうしょかん~としょうかん~ずしょかん|図書館 = としょかん / library
reading|「教室」の読み方はどれですか。|きょうしつ|きょうしつ~きょしつ~きょうしち~きょうじつ|教室 = きょうしつ / classroom
reading|「公園」の読み方はどれですか。|こうえん|こうえん~こうえい~こえん~ごうえん|公園 = こうえん / park
reading|「入口」の読み方はどれですか。|いりぐち|いりぐち~はいりぐち~いれぐち~にゅうぐち|入口 = いりぐち / entrance
reading|「出口」の読み方はどれですか。|でぐち|でぐち~しゅっぐち~でくち~だぐち|出口 = でぐち / exit
reading|「右」の読み方はどれですか。|みぎ|みぎ~ひだり~うえ~まえ|右 = みぎ / right
reading|「左」の読み方はどれですか。|ひだり|ひだり~みぎ~した~うしろ|左 = ひだり / left
reading|「上」の読み方はどれですか。|うえ|うえ~した~なか~そと|上 = うえ / up
reading|「下」の読み方はどれですか。|した|した~うえ~まえ~なか|下 = した / down
reading|「前」の読み方はどれですか。|まえ|まえ~あと~うしろ~みぎ|前 = まえ / front
reading|「後ろ」の読み方はどれですか。|うしろ|うしろ~あとろ~ごろ~まえ|後ろ = うしろ / behind
reading|「中」の読み方はどれですか。|なか|なか~ちゅう~そと~した|中 = なか / inside
reading|「外」の読み方はどれですか。|そと|そと~がい~なか~うえ|外 = そと / outside
reading|「本」の読み方はどれですか。|ほん|ほん~ぼん~ぽん~もと|本 = ほん / book
reading|「新聞」の読み方はどれですか。|しんぶん|しんぶん~しんぷん~しんぶ~にゅうぶん|新聞 = しんぶん / newspaper
reading|「手紙」の読み方はどれですか。|てがみ|てがみ~てかみ~しゅがみ~てし|手紙 = てがみ / letter
reading|「写真」の読み方はどれですか。|しゃしん|しゃしん~しゃじん~さしん~しょしん|写真 = しゃしん / photo
reading|「名前」の読み方はどれですか。|なまえ|なまえ~めいぜん~なめえ~なまい|名前 = なまえ / name
reading|「電話」の読み方はどれですか。|でんわ|でんわ~てんわ~でんは~でわ|電話 = でんわ / telephone
reading|「電車」の読み方はどれですか。|でんしゃ|でんしゃ~てんしゃ~でんじゃ~でしゃ|電車 = でんしゃ / train
reading|「自転車」の読み方はどれですか。|じてんしゃ|じてんしゃ~じどうしゃ~してんしゃ~じてんじゃ|自転車 = じてんしゃ / bicycle
reading|「車」の読み方はどれですか。|くるま|くるま~しゃ~くらま~くろま|車 = くるま / car
reading|「切符」の読み方はどれですか。|きっぷ|きっぷ~きぷ~せっぷ~きふ|切符 = きっぷ / ticket
reading|「時間」の読み方はどれですか。|じかん|じかん~しかん~じけん~ときかん|時間 = じかん / time
reading|「今日」の読み方はどれですか。|きょう|きょう~こんにち~きょ~きのう|今日 = きょう / today
reading|「明日」の読み方はどれですか。|あした|あした~あすた~みょうにち~きょう|明日 = あした / tomorrow
reading|「昨日」の読み方はどれですか。|きのう|きのう~きょう~さくじつ~きの|昨日 = きのう / yesterday
reading|「来週」の読み方はどれですか。|らいしゅう|らいしゅう~せんしゅう~こんしゅう~らいしょう|来週 = らいしゅう / next week
orthography|「にほん」(Japan) の正しい漢字はどれですか。|日本|日本~日木~本日~二本|にほん is written as 日本.
orthography|「がっこう」(school) の正しい漢字はどれですか。|学校|学校~学枚~字校~学交|がっこう is written as 学校.
orthography|「せんせい」(teacher) の正しい漢字はどれですか。|先生|先生~学生~先正~生先|せんせい is written as 先生.
orthography|「がくせい」(student) の正しい漢字はどれですか。|学生|学生~学校~学正~先生|がくせい is written as 学生.
orthography|「えき」(station) の正しい漢字はどれですか。|駅|駅~駐~駅車~馬|えき is written as 駅.
orthography|「みせ」(shop) の正しい漢字はどれですか。|店|店~駅~家~町|みせ is written as 店.
orthography|「いえ」(house) の正しい漢字はどれですか。|家|家~店~室~屋|いえ is written as 家.
orthography|「かいしゃ」(company) の正しい漢字はどれですか。|会社|会社~会社員~合社~回社|かいしゃ is written as 会社.
orthography|「ぎんこう」(bank) の正しい漢字はどれですか。|銀行|銀行~金行~銀校~行銀|ぎんこう is written as 銀行.
orthography|「びょういん」(hospital) の正しい漢字はどれですか。|病院|病院~美容院~病員~病完|びょういん is written as 病院.
orthography|「としょかん」(library) の正しい漢字はどれですか。|図書館|図書館~図書間~図書官~図所館|としょかん is written as 図書館.
orthography|「きょうしつ」(classroom) の正しい漢字はどれですか。|教室|教室~教師~教屋~教質|きょうしつ is written as 教室.
orthography|「こうえん」(park) の正しい漢字はどれですか。|公園|公園~公円~学校~公院|こうえん is written as 公園.
orthography|「いりぐち」(entrance) の正しい漢字はどれですか。|入口|入口~出口~人口~入日|いりぐち is written as 入口.
orthography|「でぐち」(exit) の正しい漢字はどれですか。|出口|出口~入口~出日~出中|でぐち is written as 出口.
orthography|「みぎ」(right) の正しい漢字はどれですか。|右|右~左~石~有|みぎ is written as 右.
orthography|「ひだり」(left) の正しい漢字はどれですか。|左|左~右~在~石|ひだり is written as 左.
orthography|「うえ」(up) の正しい漢字はどれですか。|上|上~下~土~中|うえ is written as 上.
orthography|「した」(down) の正しい漢字はどれですか。|下|下~上~不~外|した is written as 下.
orthography|「まえ」(front) の正しい漢字はどれですか。|前|前~後~午~門|まえ is written as 前.
orthography|「ほん」(book) の正しい漢字はどれですか。|本|本~木~日~休|ほん is written as 本.
orthography|「しんぶん」(newspaper) の正しい漢字はどれですか。|新聞|新聞~新文~新分~聞新|しんぶん is written as 新聞.
orthography|「てがみ」(letter) の正しい漢字はどれですか。|手紙|手紙~手神~手上~紙手|てがみ is written as 手紙.
orthography|「しゃしん」(photo) の正しい漢字はどれですか。|写真|写真~写直~写真ん~写具|しゃしん is written as 写真.
orthography|「なまえ」(name) の正しい漢字はどれですか。|名前|名前~名間~名後~前名|なまえ is written as 名前.
orthography|「でんわ」(telephone) の正しい漢字はどれですか。|電話|電話~電語~電車~電和|でんわ is written as 電話.
orthography|「でんしゃ」(train) の正しい漢字はどれですか. |電車|電車~電話~車電~電社|でんしゃ is written as 電車.
orthography|「じてんしゃ」(bicycle) の正しい漢字はどれですか。|自転車|自転車~自動車~自電車~白転車|じてんしゃ is written as 自転車.
orthography|「くるま」(car) の正しい漢字はどれですか。|車|車~電~東~重|くるま is written as 車.
orthography|「きっぷ」(ticket) の正しい漢字はどれですか。|切符|切符~切府~切付~切布|きっぷ is written as 切符.
orthography|「じかん」(time) の正しい漢字はどれですか。|時間|時間~時問~寺間~時計|じかん is written as 時間.
orthography|「きょう」(today) の正しい漢字はどれですか。|今日|今日~明日~昨日~今年|きょう is written as 今日.
orthography|「あした」(tomorrow) の正しい漢字はどれですか。|明日|明日~昨日~今日~毎日|あした is written as 明日.
orthography|「きのう」(yesterday) の正しい漢字はどれですか。|昨日|昨日~明日~今日~去年|きのう is written as 昨日.
orthography|「らいしゅう」(next week) の正しい漢字はどれですか。|来週|来週~先週~今週~来月|らいしゅう is written as 来週.
orthography|「たべもの」(food) の正しい漢字はどれですか。|食べ物|食べ物~飲み物~食物語~食べ者|たべもの is written as 食べ物.
orthography|「のみもの」(drink) の正しい漢字はどれですか。|飲み物|飲み物~食べ物~飲み者~飲物語|のみもの is written as 飲み物.
orthography|「やさい」(vegetable) の正しい漢字はどれですか。|野菜|野菜~野才~夜菜~野采|やさい is written as 野菜.
orthography|「くだもの」(fruit) の正しい漢字はどれですか。|果物|果物~菓物~果者~課物|くだもの is written as 果物.
orthography|「おかね」(money) の正しい漢字はどれですか。|お金|お金~お全~お会~お今|おかね is written as お金.
context|毎日、____へ行きます。|学校|学校~魚~電気~名前|学校へ行きます means I go to school.
context|駅で____を買います。|切符|切符~宿題~天気~家族|切符を買います means buy a ticket.
context|朝、____を読みます。|新聞|新聞~牛乳~靴~公園|新聞を読みます means read a newspaper.
context|友だちに____を書きます。|手紙|手紙~電車~肉~帽子|手紙を書く means write a letter.
context|この____でパンを買います。|店|店~川~名前~時間|店で買います means buy at a shop.
context|____で本を借ります。|図書館|図書館~病院~銀行~郵便局|図書館で本を借ります means borrow books at the library.
context|____でお金を出します。|銀行|銀行~学校~山~教室|銀行 is the place for money services.
context|____で手紙を出します。|郵便局|郵便局~病院~公園~店|郵便局 is a post office.
context|風邪です。____へ行きます。|病院|病院~銀行~図書館~駅|病院へ行きます means go to the hospital.
context|____で先生の話を聞きます。|教室|教室~海~駅~店|教室 is classroom.
context|子どもが____で遊びます。|公園|公園~銀行~郵便局~病院|公園で遊びます means play in the park.
context|部屋の____を開けます。|窓|窓~靴~牛肉~曜日|窓を開けます means open the window.
context|部屋の____を閉めます。|ドア|ドア~地図~果物~月|ドアを閉めます means close the door.
context|雨ですから、____を持って行きます。|傘|傘~机~魚~歌|傘 means umbrella.
context|____を見ます。|映画|映画~砂糖~病院~入口|映画を見る means watch a movie.
context|____を聞きます。|音楽|音楽~野菜~銀行~出口|音楽を聞きます means listen to music.
context|____を飲みます。|水|水~本~靴~学校|水を飲みます means drink water.
context|____を食べます。|魚|魚~電話~地図~駅|魚を食べます means eat fish.
context|____が好きです。|肉|肉~切符~時間~名前|肉が好きです means like meat.
context|____を使います。|パソコン|パソコン~ゆっくり~青い~行きます|パソコンを使います means use a computer.
context|____で学校へ行きます。|電車|電車~手紙~天気~質問|電車で行きます means go by train.
context|____で駅へ行きます。|自転車|自転車~新聞~卵~教室|自転車で行きます means go by bicycle.
context|____に乗ります。|車|車~宿題~砂糖~猫|車に乗ります means ride in a car.
context|ここに____を書いてください。|名前|名前~魚~公園~雨|名前を書く means write your name.
context|____がありません。|お金|お金~ゆっくり~青い~行きます|お金がありません means I have no money.
context|今日は____です。|月曜日|月曜日~ゆっくり~あたたかい~泳ぎます|月曜日 is Monday.
context|____、試験があります。|明日|明日~銀行~野菜~窓|明日 means tomorrow.
context|____は暑いです。|夏|夏~机~音楽~切符|夏 is summer and often hot.
context|____は寒いです。|冬|冬~本~食堂~果物|冬 is winter and cold.
context|____が降っています。|雨|雨~空~花~木|雨が降る means it rains.
context|____が青いです。|空|空~ゆっくり~美味しい~泳ぎます|空 means sky.
context|____に登ります。|山|山~川~店~電話|山に登ります means climb a mountain.
context|____の近くを歩きます。|川|川~肉~時計~会社員|川 means river.
context|____を着ます。|服|服~本~水~地図|服を着ます means wear clothes.
context|____をはきます。|靴|靴~帽子~眼鏡~傘|靴をはきます means put on shoes.
context|____をかぶります。|帽子|帽子~靴~電話~机|帽子をかぶります means wear a hat.
context|____をかけます。|眼鏡|眼鏡~傘~椅子~新聞|眼鏡をかけます means wear glasses.
context|____を消します。|電気|電気~卵~川~家族|電気を消します means turn off the light.
context|____に座ります。|椅子|椅子~野菜~切符~ゆっくり|椅子に座ります means sit on a chair.
context|____の上に本があります。|机|机~山~銀行~空|机 means desk.
meaning|「学校」の意味として、いちばん近いものはどれですか。|school|school~hospital~bank~station|学校 = school
meaning|「先生」の意味として、いちばん近いものはどれですか。|teacher|teacher~student~doctor~friend|先生 = teacher
meaning|「学生」の意味として、いちばん近いものはどれですか。|student|student~teacher~shop clerk~father|学生 = student
meaning|「駅」の意味として、いちばん近いものはどれですか。|station|station~shop~park~library|駅 = station
meaning|「店」の意味として、いちばん近いものはどれですか。|shop|shop~river~newspaper~ticket|店 = shop
meaning|「病院」の意味として、いちばん近いものはどれですか。|hospital|hospital~post office~school~park|病院 = hospital
meaning|「銀行」の意味として、いちばん近いものはどれですか。|bank|bank~library~classroom~mountain|銀行 = bank
meaning|「図書館」の意味として、いちばん近いものはどれですか。|library|library~hospital~shop~sea|図書館 = library
meaning|「郵便局」の意味として、いちばん近いものはどれですか。|post office|post office~bank~station~classroom|郵便局 = post office
meaning|「公園」の意味として、いちばん近いものはどれですか。|park|park~company~bank~room|公園 = park
meaning|「家族」の意味として、いちばん近いものはどれですか。|family|family~food~ticket~weather|家族 = family
meaning|「友だち」の意味として、いちばん近いものはどれですか。|friend|friend~teacher~doctor~station staff|友だち = friend
meaning|「医者」の意味として、いちばん近いものはどれですか。|doctor|doctor~student~shop clerk~older sister|医者 = doctor
meaning|「店員」の意味として、いちばん近いものはどれですか。|shop clerk|shop clerk~doctor~teacher~child|店員 = shop clerk
meaning|「食べ物」の意味として、いちばん近いものはどれですか。|food|food~drink~money~map|食べ物 = food
meaning|「飲み物」の意味として、いちばん近いものはどれですか。|drink|drink~food~clothes~chair|飲み物 = drink
meaning|「牛乳」の意味として、いちばん近いものはどれですか。|milk|milk~tea~coffee~juice|牛乳 = milk
meaning|「野菜」の意味として、いちばん近いものはどれですか。|vegetable|vegetable~fruit~meat~fish|野菜 = vegetable
meaning|「果物」の意味として、いちばん近いものはどれですか。|fruit|fruit~vegetable~egg~salt|果物 = fruit
meaning|「切符」の意味として、いちばん近いものはどれですか。|ticket|ticket~letter~umbrella~desk|切符 = ticket
meaning|「時計」の意味として、いちばん近いものはどれですか。|clock; watch|clock; watch~glasses~wallet~key|時計 = clock or watch
meaning|「傘」の意味として、いちばん近いものはどれですか。|umbrella|umbrella~hat~shoes~bag|傘 = umbrella
meaning|「地図」の意味として、いちばん近いものはどれですか。|map|map~photo~letter~song|地図 = map
meaning|「宿題」の意味として、いちばん近いものはどれですか。|homework|homework~exam~answer~question|宿題 = homework
meaning|「試験」の意味として、いちばん近いものはどれですか。|exam|exam~practice~lesson~holiday|試験 = exam
meaning|「毎日」の意味として、いちばん近いものはどれですか。|every day|every day~tomorrow~last week~next year|毎日 = every day
meaning|「昨日」の意味として、いちばん近いものはどれですか。|yesterday|yesterday~today~tomorrow~this month|昨日 = yesterday
meaning|「来週」の意味として、いちばん近いものはどれですか。|next week|next week~last week~this week~next month|来週 = next week
meaning|「天気」の意味として、いちばん近いものはどれですか。|weather|weather~wind~snow~sky|天気 = weather
meaning|「海」の意味として、いちばん近いものはどれですか。|sea|sea~mountain~river~tree|海 = sea
meaning|「花」の意味として、いちばん近いものはどれですか。|flower|flower~tree~bird~cat|花 = flower
meaning|「大きい」の意味として、いちばん近いものはどれですか。|big|big~small~new~old|大きい = big
meaning|「小さい」の意味として、いちばん近いものはどれですか。|small|small~big~expensive~cheap|小さい = small
meaning|「高い」の意味として、いちばん近いものはどれですか。|expensive; tall|expensive; tall~cheap~cold~dark|高い = expensive or tall
meaning|「安い」の意味として、いちばん近いものはどれですか。|cheap|cheap~expensive~hot~bright|安い = cheap
meaning|「新しい」の意味として、いちばん近いものはどれですか。|new|new~old~high~clean|新しい = new
meaning|「古い」の意味として、いちばん近いものはどれですか。|old|old~new~heavy~light|古い = old
meaning|「暑い」の意味として、いちばん近いものはどれですか。|hot (weather)|hot (weather)~cold~cool~warm|暑い = hot (weather)
meaning|「寒い」の意味として、いちばん近いものはどれですか。|cold (weather)|cold (weather)~hot~warm~cool|寒い = cold (weather)
meaning|「赤い」の意味として、いちばん近いものはどれですか。|red|red~white~blue~yellow|赤い = red
meaning|「白い」の意味として、いちばん近いものはどれですか。|white|white~red~blue~black|白い = white
meaning|「青い」の意味として、いちばん近いものはどれですか。|blue|blue~red~white~brown|青い = blue
meaning|「道」の意味として、いちばん近いものはどれですか。|road|road~building~kitchen~hobby|道 = road
meaning|「信号」の意味として、いちばん近いものはどれですか。|traffic light|traffic light~address~price~receipt|信号 = traffic light
meaning|「建物」の意味として、いちばん近いものはどれですか。|building|building~garden~bath~stairs|建物 = building
meaning|「住所」の意味として、いちばん近いものはどれですか。|address|address~phone number~nationality~age|住所 = address
meaning|「趣味」の意味として、いちばん近いものはどれですか。|hobby|hobby~salary~meeting~medicine|趣味 = hobby
meaning|「旅行」の意味として、いちばん近いものはどれですか。|travel|travel~practice~question~uniform|旅行 = travel
meaning|「漫画」の意味として、いちばん近いものはどれですか。|comic; manga|comic; manga~dictionary~envelope~receipt|漫画 = comic or manga
meaning|「辞書」の意味として、いちばん近いものはどれですか。|dictionary|dictionary~magazine~postcard~box|辞書 = dictionary
meaning|「値段」の意味として、いちばん近いものはどれですか。|price|price~cash~change~card|値段 = price
meaning|「給料」の意味として、いちばん近いものはどれですか。|salary|salary~meeting~factory~break|給料 = salary
meaning|「予定」の意味として、いちばん近いものはどれですか。|plan; schedule|plan; schedule~promise~reason~truth|予定 = plan or schedule
usage|「終わります」の使い方として、正しい文はどれですか。|授業が終わります。|授業が終わります。~終わりますを食べます。~終わりますは赤いです。~終わりますで薬を飲みます。|終わります means to finish.
usage|「始まります」の使い方として、正しい文はどれですか。|九時に授業が始まります。|九時に授業が始まります。~始まりますを読みます。~始まりますは安いです。~始まりますで顔を食べます。|始まります means to begin.
usage|「曲がります」の使い方として、正しい文はどれですか。|信号を右に曲がります。|信号を右に曲がります。~曲がりますを飲みます。~曲がりますは古いです。~曲がりますで弁当を読みます。|曲がります means to turn.
usage|「渡ります」の使い方として、正しい文はどれですか。|橋を渡ります。|橋を渡ります。~渡りますを食べます。~渡りますは青いです。~渡りますで薬を寝ます。|渡ります means to cross.
usage|「止まります」の使い方として、正しい文はどれですか。|バスが止まります。|バスが止まります。~止まりますを飲みます。~止まりますは難しいです。~止まりますで顔を読みます。|止まります means to stop.
usage|「置きます」の使い方として、正しい文はどれですか。|机の上に本を置きます。|机の上に本を置きます。~置きますを食べます。~置きますは白いです。~置きますで空港を飲みます。|置きます means to put.
usage|「探します」の使い方として、正しい文はどれですか。|鍵を探します。|鍵を探します。~探しますを食べます。~探しますは暑いです。~探しますで地下鉄を飲みます。|探します means to search for.
usage|「分かります」の使い方として、正しい文はどれですか。|日本語が分かります。|日本語が分かります。~分かりますを飲みます。~分かりますは大きいです。~分かりますで弁当を寝ます。|分かります means to understand.
usage|「言います」の使い方として、正しい文はどれですか。|名前を言います。|名前を言います。~言いますを食べます。~言いますは小さいです。~言いますで信号を飲みます。|言います means to say.
usage|「歌います」の使い方として、正しい文はどれですか。|歌を歌います。|歌を歌います。~歌いますを読みます。~歌いますは寒いです。~歌いますで薬を食べます。|歌います means to sing.
usage|「撮ります」の使い方として、正しい文はどれですか。|写真を撮ります。|写真を撮ります。~撮りますを飲みます。~撮りますは遠いです。~撮りますで住所を寝ます。|撮ります means to take a photo.
usage|「払います」の使い方として、正しい文はどれですか。|お金を払います。|お金を払います。~払いますを読みます。~払いますは涼しいです。~払いますで顔を食べます。|払います means to pay.
usage|「見せます」の使い方として、正しい文はどれですか。|写真を見せます。|写真を見せます。~見せますを飲みます。~見せますは丸いです。~見せますで薬を寝ます。|見せます means to show.
usage|「覚えます」の使い方として、正しい文はどれですか。|漢字を覚えます。|漢字を覚えます。~覚えますを食べます。~覚えますは黄色いです。~覚えますで空港を飲みます。|覚えます means to memorize.
usage|「答えます」の使い方として、正しい文はどれですか。|質問に答えます。|質問に答えます。~答えますを飲みます。~答えますは重いです。~答えますで建物を食べます。|答えます means to answer.
usage|「電話します」の使い方として、正しい文はどれですか。|友だちに電話します。|友だちに電話します。~電話しますを食べます。~電話しますは甘いです。~電話しますで道を寝ます。|電話します means to telephone.
usage|「予約します」の使い方として、正しい文はどれですか。|ホテルを予約します。|ホテルを予約します。~予約しますを飲みます。~予約しますは辛いです。~予約しますで顔を読みます。|予約します means to reserve.
usage|「注文します」の使い方として、正しい文はどれですか。|レストランで料理を注文します。|レストランで料理を注文します。~注文しますを食べます。~注文しますは低いです。~注文しますで薬を寝ます。|注文します means to order.
usage|「紹介します」の使い方として、正しい文はどれですか。|友だちを紹介します。|友だちを紹介します。~紹介しますを飲みます。~紹介しますは薄いです。~紹介しますで飛行機を食べます。|紹介します means to introduce.
usage|「練習します」の使い方として、正しい文はどれですか。|毎日、漢字を練習します。|毎日、漢字を練習します。~練習しますを飲みます。~練習しますは冷たいです。~練習しますで住所を寝ます。|練習します means to practice.
usage|「新しい」の使い方として、正しい文はどれですか。|新しいカメラを買いました。|新しいカメラを買いました。~新しい服を着ると温かいです。~机の上が新しいです。~この新しい魚を食べます。|新しい means new.
usage|「冷たい」の使い方として、正しい文はどれですか。|冷たいジュースを飲みます。|冷たいジュースを飲みます。~今日は冷たいです。~このお風呂は冷たいです。~冷たい服を着ます。|冷たい means cold to the touch.
usage|「曲がります」の使い方として、正しい文はどれですか。|角を右に曲がります。|角を右に曲がります。~電車を曲がります。~橋を曲がります。~階段を曲がります。|曲がります means to turn.
usage|「休みます」の使い方として、正しい文はどれですか。|会社を休みます。|会社を休みます。~宿題を休みます。~傘を休みます。~ご飯を休みます。|休みます means to rest or be absent.
usage|「持ちます」の使い方として、正しい文はどれですか。|カバンを持ちます。|カバンを持ちます。~学校を持ちます。~切符を持ちます。~水を持ちます。|持ちます means to hold or carry.
reading|「帰ります」の読み方はどれですか。|かえります|かえります~がいります~かえます~かりります|帰ります = かえります / to return home
reading|「降ります」の読み方はどれですか。|おります|おります~ふります~のります~あがります|降ります = おります / to get off
reading|「働きます」の読み方はどれですか。|はたらきます|はたらきます~うごきます~ひらきます~あるきます|働きます = はたらきます / to work
reading|「立ちます」の読み方はどれですか。|たちます|たちます~だちます~おきます~すわります|立ちます = たちます / to stand
reading|「閉めます」の読み方はどれですか。|しめます|しめます~ひめます~あけます~とめます|閉めます = しめます / to close
reading|「教えます」の読み方はどれですか。|おしえます|おしえます~おさえます~ならいます~おぼえます|教えます = おしえます / to teach; to tell
reading|「習います」の読み方はどれですか。|ならいます|ならいます~なむらいます~ならします~ならいます|習います = ならいます / to learn
reading|「泳ぎます」の読み方はどれですか。|およぎます|およぎます~およぐます~あそびます~はしります|泳ぎます = およぎます / to swim
reading|「広い」の読み方はどれですか。|ひろい|ひろい~くらい~せまい~おおい|広い = ひろい / wide
reading|「狭い」の読み方はどれですか。|せまい|せまい~ひろい~わるい~かるい|狭い =せまい / narrow
reading|「早い」の読み方はどれですか。|はやい|はやい~おそい~やすい~わかい|早い = はやい / early; fast
reading|「明るい」の読み方はどれですか。|あかるい|あかるい~くらい~あたたかい~かるい|明るい = あかるい / bright
reading|「楽しい」の読み方はどれですか。|たのしい|たのしい~うれしい~おかしい~やさしい|楽しい = たのしい / fun
reading|「難しい」の読み方はどれですか。|むずかしい|むずかしい~やさしい~いそがしい~さびしい|難しい = むずかしい / difficult
reading|「面白い」の読み方はどれですか。|おもしろい|おもしろい~おもしろ~めずらしい~おかしい|面白い = おもしろい / interesting
reading|「綺麗」の読み方はどれですか。|きれい|きれい~きらい~きれい~きいれい|綺麗 = きれい / beautiful; clean
reading|「有名」の読み方はどれですか。|ゆうめい|ゆうめい~ゆめい~ゆうめ~ゆうめん|有名 = ゆうめい / famous
reading|「便利」の読み方はどれですか。|べんり|べんり~ぺんり~べり~へんり|便利 = べんり / convenient
reading|「元気」の読み方はどれですか。|げんき|げんき~けんき~げんち~かんき|元気 = げんき / healthy; energetic
reading|「散歩」の読み方はどれですか。|さんぽ|さんぽ~さんほ~さくぽ~せんぽ|散歩 = さんぽ / walk; stroll
orthography|「かえります」(to return home) の正しい漢字はどれですか。|帰ります|帰ります~買ります~代ります~交ります|かえります is written as 帰ります.
orthography|「おります」(to get off) の正しい漢字はどれですか。|降ります|降ります~下ります~振ります~古ります|おりる is written as 降ります.
orthography|「はたらきます」(to work) の正しい漢字はどれですか。|働きます|働きます~動きます~重きます~作きます|はたらく is written as 働きます.
orthography|「たちます」(to stand) の正しい漢字はどれですか。|立ちます|立ちます~足ちます~有ちます~建ちます|たつ is written as 立ちます.
orthography|「しめます」(to close) の正しい漢字はどれですか。|閉めます|閉めます~開めます~下めます~合めます|しめる is written as 閉めます.
orthography|「おしえます」(to teach) の正しい漢字はどれですか。|教えます|教えます~覚えます~答えます~習えます|おしえる is written as 教えます.
orthography|「ならいます」(to learn) の正しい漢字はどれですか。|習います|習います~教います~習ます~慣います|ならう is written as 習います.
orthography|「およぎます」(to swim) の正しい漢字はどれですか. |泳ぎます|泳ぎます~永ぎます~氷ぎます~波ぎます|およぐ is written as 泳ぎます.
orthography|「ひろい」(wide) の正しい漢字はどれですか。|広い|広い~皮い~短い~太い|ひろい is written as 広い.
orthography|「せまい」(narrow) の正しい漢字はどれですか。|狭い|狭い~広い~細い~古い|せまい is written as 狭い.
orthography|「はやい」(early/fast) の正しい漢字はどれですか。|早い|早い~速い~遅い~若い|はやい is written as 早い.
orthography|「あかるい」(bright) の正しい漢字はどれですか。|明るい|明るい~赤るい~暗るい~青るい|あかるい is written as 明るい.
orthography|「たのしい」(fun) の正しい漢字はどれですか。|楽しい|楽しい~楽しい~歌しい~嬉い|たのしい is written as 楽しい.
orthography|「むずかしい」(difficult) の正しい漢字はどれですか。|難しい|難しい~易しい~優しい~新しい|むずかしい is written as 難しい.
orthography|「おもしろい」(interesting) の正しい漢字はどれですか。|面白い|面白い~白白い~面黒い~表白い|おもしろい is written as 面白い.
orthography|「きれい」(beautiful/clean) の正しい漢字はどれですか。|綺麗|綺麗~奇麗~きれい~清麗|きれい is written as 綺麗.
orthography|「ゆうめい」(famous) の正しい漢字はどれですか。|有名|有名~友名~有明~優名|ゆうめい is written as 有名.
orthography|「べんり」(convenient) の正しい漢字はどれですか。|便利|便利~利便~便理~辨利|べんり is written as 便利.
orthography|「げんき」(healthy/energetic) の正しい漢字はどれですか。|元気|元気~元木~健康~言気|げんき is written as 元気.
orthography|「さんぽ」(walk) の正しい漢字はどれですか。|散歩|散歩~山歩~参歩~散布|さんぽ is written as 散歩.
context|車が多いですから、____運転してください。|ゆっくり|ゆっくり~すぐ~よく~いつも|ゆっくり means slowly.
context|熱がありますから、____病院へ行きます。|すぐ|すぐ~ゆっくり~美味しい~青い|すぐ means immediately.
context|____図書館で本を読みます。|時々|時々~全部~もう~あまり|時々 means sometimes.
context|日曜日は____家で映画を見ます。|いつも|いつも~あたたかい~泳ぎます~美味しい|いつも means always.
context|この本は____読みました。|全部|全部~ゆっくり~美味しい~青い|全部 means all/entirely.
context|日曜日、友だち____買い物に行きます。|と一緒に|と一緒に~で~の近くを~の前に|〜と一緒に means together with.
context|明日は____雨が降るでしょう。|多分|多分~美味しい~ゆっくり~青い|多分 means probably.
context|このケーキは____おいしいです。|本当に|本当に~ゆっくり~泳ぎます~青い|本当に means really.
context|ご飯は____食べました。|もう|もう~あたたかい~ゆっくり~青い|もう means already.
context|宿題は____終わっていません。|まだ|まだ~もう~すぐ~よく|まだ〜ません means not yet.
context|このカメラは____高いです。|とても|とても~ゆっくり~泳ぎます~青い|とても means very.
context|辛い料理は____食べません。|あまり|あまり~ゆっくり~あたたかい~青い|あまり〜ません means not very much.
context|朝起きて、家族に「____」と言います。|おはようございます|おはようございます~こんにちは~こんばんは~おやすみなさい|Morning greeting is おはようございます.
context|昼、人に会ったときは「____」と言います。|こんにちは|こんにちは~こんばんは~おはようございます~さようなら|Daytime greeting is こんにちは.
context|夜、人に会ったときは「____」と言います。|こんばんは|こんばんは~こんにちは~おはようございます~おやすみなさい|Evening greeting is こんばんは.
context|デパートに入ると、店員が「____」と言います。|いらっしゃいませ|いらっしゃいませ~ありがとうございます~こんにちは~お願いします|Welcome greeting is いらっしゃいませ.
context|「コーヒーはいかがですか。」「いいえ、____。」|結構です|結構です~お願いします~すみません~いらっしゃいませ|No thank you is 結構です.
context|私の____はギターを弾くことです。|趣味|趣味~ゆっくり~あたたかい~泳ぎます|趣味 means hobby.
context|レストランで「お水を____。」|お願いします|お願いします~結構です~いらっしゃいませ~さようなら|Please (asking for something) is お願いします.
context|夜寝る前に「____」と言います。|おやすみなさい|おやすみなさい~おはようございます~こんにちは~こんばんは|Greeting before sleep is おやすみなさい.
meaning|「帰ります」の意味として、いちばん近いものはどれですか。|to return home|to return home~to go~to come~to sleep|帰ります = to return home
meaning|「働きます」の意味として、いちばん近いものはどれですか。|to work|to work~to play~to study~to rest|働きます = to work
meaning|「泳ぎます」の意味として、いちばん近いものはどれですか。|to swim|to swim~to run~to walk~to fly|泳ぎます = to swim
meaning|「広い」の意味として、いちばん近いものはどれですか。|wide; spacious|wide; spacious~narrow~high~low|広い = wide
meaning|「狭い」の意味として、いちばん近いものはどれですか。|narrow; small|narrow; small~wide~big~small|狭い = narrow
meaning|「早い」の意味として、いちばん近いものはどれですか。|early; fast|early; fast~late; slow~cheap~expensive|早い = early/fast
meaning|「難しい」の意味として、いちばん近いものはどれですか。|difficult|difficult~easy~kind~interesting|難しい = difficult
meaning|「面白い」の意味として、いちばん近いものはどれですか。|interesting; funny|interesting; funny~boring~difficult~sad|面白い = interesting
meaning|「綺麗」の意味として、いちばん近いものはどれですか。|beautiful; clean|beautiful; clean~dirty~ugly~noisy|綺麗 = beautiful/clean
meaning|「便利」の意味として、いちばん近いものはどれですか。|convenient|convenient~inconvenient~famous~healthy|便利 = convenient
meaning|「ゆっくり」の意味として、いちばん近いものはどれですか。|slowly|slowly~quickly~sometimes~always|ゆっくり = slowly
meaning|「すぐ」の意味として、いちばん近いものはどれですか。|soon; immediately|soon; immediately~later~sometimes~never|すぐ = immediately
meaning|「時々」の意味として、いちばん近いものはどれですか。|sometimes|sometimes~always~often~never|時々 = sometimes
meaning|「いつも」の意味として、いちばん近いものはどれですか。|always|always~sometimes~often~never|いつも = always
meaning|「多分」の意味として、いちばん近いものはですか。|probably|probably~certainly~never~really|多分 = probably
meaning|「本当に」の意味として、いちばん近いものはどれですか。|really|really~probably~never~maybe|本当に = really
meaning|「もう」の意味として、いちばん近いものはどれですか。|already|already~not yet~soon~always|もう = already
meaning|「まだ」の意味として、いちばん近いものはどれですか。|not yet; still|not yet; still~already~soon~always|まだ = not yet
meaning|「とても」の意味として、いちばん近いものはどれですか。|very|very~not very~slowly~really|とても = very
meaning|「あまり」の意味として、いちばん近いものはどれですか。|not very|not very~very~always~already|あまり = not very
usage|「帰ります」の使い方として、正しい文はどれですか。|五時に家に帰ります。|五時に家に帰ります。~ご飯を帰ります。~駅を帰ります。~手紙を帰ります。|帰ります means to return home.
usage|「降ります」の使い方として、正しい文はどれですか。|次の駅で電車を降ります。|次の駅で電車を降ります。~本を降ります。~水を降ります。~宿題を降ります。|降ります means to get off (a vehicle).
usage|「立ちます」の使い方として、正しい文はどれですか。|椅子から立ちます。|椅子から立ちます。~立ちますを食べます。~立ちますを読みます。~立ちますで顔を洗います。|立ちます means to stand up.
usage|「閉めます」の使い方として、正しい文はどれですか。|窓を閉めます。|窓を閉めます。~閉めますを食べます。~閉めますを読みます。~閉めますで切ップを買います。|閉めます means to close.
usage|「教えます」の使い方として、正しい文はどれですか。|英語を教えます。|英語を教えます。~教えますを読みます。~教えますは赤いです。~教えますで顔を洗います。|教えます means to teach.
usage|「習います」の使い方として、正しい文はどれですか。|ピアノを習います。|ピアノを習います。~習いますを飲みます。~習いますは寒いです。~習いますで新聞を読みます。|習います means to learn.
usage|「泳ぎます」の使い方として、正しい文はどれですか。|プールで泳ぎます。|プールで泳ぎます。~泳ぎますを食べます。~泳ぎますは青いです。~泳ぎますで本を寝ます。|泳ぎます means to swim.
usage|「広い」の使い方として、正しい文はどれですか。|私の部屋は広いです。|私の部屋は広いです。~このお茶は広いです。~この時計は広いです。~広いいちごを食べます。|広い means wide/spacious.
usage|「狭い」の使い方として、正しい文はどれですか。|この道は狭いです。|この道は狭いです。~この水は狭いです。~お腹が狭いです。~狭い本を読みます。|狭い means narrow.
usage|「早い」の使い方として、正しい文はどれですか。|朝早く起きます。|朝早く起きます。~早いご飯を食べます。~早いお風呂に入ります。~早い川を泳ぎます。|早い means early/fast.
usage|「明るい」の使い方として、正しい文はどれですか。|この部屋は明るいです。|この部屋は明るいです。~明るい水を飲みます。~明るい犬がいます。~明るい切符を買います。|明るい means bright.
usage|「楽しい」の使い方として、正しい文はどれですか。|旅行はとても楽しかったです。|旅行はとても楽しかったです。~楽しいリンゴを買いました。~楽しい服を着ます。~楽しい水が降っています。|楽しい means fun.
usage|「難しい」の使い方として、正しい文はどれですか。|このテストは難しいです。|このテストは難しいです。~難しい鉛筆を使います。~難しい川を歩きます。~難しい牛乳を飲みます。|難しい means difficult.
usage|「面白い」の使い方として、正しい文はどれですか。|この映画は面白いです。|この映画は面白いです。~面白いシャツを着ます。~面白いご飯を食べます。~面白い時計を買いました。|面白い means interesting.
usage|「綺麗」の使い方として、正しい文はどれですか。|花が綺麗に咲いています。|花が綺麗に咲いています。~綺麗なご飯を食べます。~綺麗な新聞を読みます。~綺麗な切符を買います。|綺麗 means beautiful/clean.
usage|「有名」の使い方として、正しい文はどれですか。|富士山は有名な山です。|富士山は有名な山です。~有名な水を飲みます。~有名な鉛筆があります。~有名な靴をはきます。|有名 means famous.
usage|「便利」の使い方として、正しい文はどれですか。|スマホはとても便利です。|スマホはとても便利です。~便利な魚を食べます。~便利な犬がいます。~便利な本を読みます。|便利 means convenient.
usage|「元気」の使い方として、正しい文はどれですか。|おじいさんはとても元気です。|おじいさんはとても元気です。~元気な水を飲みます。~元気な本を読みます。~元気な傘を持って行きます。|元気 means healthy/energetic.
usage|「ゆっくり」の使い方として、正しい文はどれですか。|ゆっくり話してください。|ゆっくり話してください。~ゆっくりな本を読みます。~ゆっくりなお風呂です。~ゆっくりな服を着ます。|ゆっくり means slowly.
usage|「とても」の使い方として、正しい文はどれですか。|今日はとても暑いです。|今日はとても暑いです。~とてもな服を着ます。~とてものご飯を食べます。~とてもな切符を買います。|とても means very.
`.trim();

const miniExamSets = [
  {
    title: "Mini Mock 1",
    parts: [
      { label: "Part 1. Kanji Reading", ids: [1, 6, 11, 16, 21] },
      { label: "Part 2. Orthography", ids: [42, 47, 52, 57, 62] },
      { label: "Part 3. Context Vocabulary", ids: [84, 85, 86, 87, 89] },
      { label: "Part 4. Paraphrase & Meaning", ids: [123, 131, 133, 134, 141] },
      { label: "Part 5. Usage", ids: [174, 175, 176, 177, 178] }
    ]
  },
  {
    title: "Mini Mock 2",
    parts: [
      { label: "Part 1. Kanji Reading", ids: [2, 7, 12, 17, 22] },
      { label: "Part 2. Orthography", ids: [43, 48, 53, 58, 63] },
      { label: "Part 3. Context Vocabulary", ids: [92, 93, 94, 95, 96] },
      { label: "Part 4. Paraphrase & Meaning", ids: [143, 144, 145, 146, 147] },
      { label: "Part 5. Usage", ids: [179, 180, 181, 182, 183] }
    ]
  },
  {
    title: "Mini Mock 3",
    parts: [
      { label: "Part 1. Kanji Reading", ids: [3, 8, 13, 18, 23] },
      { label: "Part 2. Orthography", ids: [44, 49, 54, 59, 64] },
      { label: "Part 3. Context Vocabulary", ids: [97, 98, 99, 100, 101] },
      { label: "Part 4. Paraphrase & Meaning", ids: [148, 149, 150, 151, 152] },
      { label: "Part 5. Usage", ids: [184, 185, 186, 187, 188] }
    ]
  },
  {
    title: "Mini Mock 4",
    parts: [
      { label: "Part 1. Kanji Reading", ids: [4, 9, 14, 19, 24] },
      { label: "Part 2. Orthography", ids: [45, 50, 55, 60, 65] },
      { label: "Part 3. Context Vocabulary", ids: [102, 103, 107, 108, 109] },
      { label: "Part 4. Paraphrase & Meaning", ids: [153, 154, 155, 156, 157] },
      { label: "Part 5. Usage", ids: [189, 190, 191, 192, 193] }
    ]
  },
  {
    title: "Mini Mock 5",
    parts: [
      { label: "Part 1. Kanji Reading", ids: [199, 200, 201, 202, 203] },
      { label: "Part 2. Orthography", ids: [224, 225, 226, 227, 228] },
      { label: "Part 3. Context Vocabulary", ids: [239, 240, 241, 242, 243] },
      { label: "Part 4. Paraphrase & Meaning", ids: [273, 274, 275, 276, 277] },
      { label: "Part 5. Usage", ids: [290, 291, 292, 293, 294] }
    ]
  }
];

const customVerbExamples = {
  "歩きます": { sentence: "駅まで____。", example: "駅まで歩きます。", exampleEn: "I walk to the station." },
  "走ります": { sentence: "公園を____。", example: "公園を走ります。", exampleEn: "I run in the park." },
  "帰ります": { sentence: "うちへ____。", example: "うちへ帰ります。", exampleEn: "I return home." },
  "入ります": { sentence: "お風呂に____。", example: "お風呂に入ります。", exampleEn: "I take a bath." },
  "出ます": { sentence: "部屋を____。", example: "部屋を出ます。", exampleEn: "I leave the room." },
  "乗ります": { sentence: "電車に____。", example: "電車に乗ります。", exampleEn: "I ride the train." },
  "降ります": { sentence: "バスを____。", example: "バスを降ります。", exampleEn: "I get off the bus." },
  "聞きます": { sentence: "音楽を____。", example: "音楽を聞きます。", exampleEn: "I listen to music." },
  "休みます": { sentence: "会社を____。", example: "会社を休みます。", exampleEn: "I take a day off from work." },
  "働きます": { sentence: "工場で____。", example: "工場で働きます。", exampleEn: "I work at a factory." },
  "待ちます": { sentence: "友達を____。", example: "友達を待ちます。", exampleEn: "I wait for my friend." },
  "持ちます": { sentence: "カバンを____。", example: "カバンを持ちます。", exampleEn: "I hold a bag." },
  "使います": { sentence: "辞書を____。", example: "辞書を使います。", exampleEn: "I use a dictionary." },
  "作ります": { sentence: "料理を____。", example: "料理を作ります。", exampleEn: "I make a dish." },
  "売ります": { sentence: "本を____。", example: "本を売ります。", exampleEn: "I sell books." },
  "座ります": { sentence: "椅子に____。", example: "椅子に座ります。", exampleEn: "I sit on a chair." },
  "立ちます": { sentence: "机の前に____。", example: "机の前に立ちます。", exampleEn: "I stand in front of the desk." },
  "洗います": { sentence: "手を____。", example: "手を洗います。", exampleEn: "I wash my hands." },
  "開けます": { sentence: "窓を____。", example: "窓を開けます。", exampleEn: "I open the window." },
  "閉めます": { sentence: "ドアを____。", example: "ドアを閉めます。", exampleEn: "I close the door." },
  "消します": { sentence: "電気を____。", example: "電気を消します。", exampleEn: "I turn off the light." },
  "つけます": { sentence: "テレビを____。", example: "テレビをつけます。", exampleEn: "I turn on the TV." },
  "忘れます": { sentence: "宿題を____。", example: "宿題を忘れます。", exampleEn: "I forget my homework." },
  "教えます": { sentence: "英語を____。", example: "英語を教えます。", exampleEn: "I teach English." },
  "習います": { sentence: "ピアノを____。", example: "ピアノを習います。", exampleEn: "I learn the piano." },
  "借ります": { sentence: "本を____。", example: "本を借ります。", exampleEn: "I borrow a book." },
  "貸します": { sentence: "傘を____。", example: "傘を貸します。", exampleEn: "I lend an umbrella." },
  "遊びます": { sentence: "公園で____。", example: "公園で遊びます。", exampleEn: "I play in the park." },
  "泳ぎます": { sentence: "海で____。", example: "海で泳ぎます。", exampleEn: "I swim in the sea." },
  "洗濯します": { sentence: "服を____。", example: "服を洗濯します。", exampleEn: "I do laundry." },
  "掃除します": { sentence: "部屋を____。", example: "部屋を掃除します。", exampleEn: "I clean the room." },
  "料理します": { sentence: "台所で____。", example: "台所で料理します。", exampleEn: "I cook in the kitchen." },
  "旅行します": { sentence: "日本を____。", example: "日本を旅行します。", exampleEn: "I travel around Japan." },
  "結婚します": { sentence: "来年____。", example: "来年結婚します。", exampleEn: "I will get married next year." },
  "散歩します": { sentence: "犬と____。", example: "犬と散歩します。", exampleEn: "I take a walk with my dog." },
  "コピーします": { sentence: "資料を____。", example: "資料をコピーします。", exampleEn: "I copy the documents." }
};

const customAdjectiveExamples = {
  "若い": { sentence: "あの人は____です。", example: "あの人は若いです。", exampleEn: "That person is young." },
  "長い": { sentence: "彼女の髪は____です。", example: "彼女の髪は長いです。", exampleEn: "Her hair is long." },
  "短い": { sentence: "この鉛筆は____です。", example: "この鉛筆は短いです。", exampleEn: "This pencil is short." },
  "太い": { sentence: "この木は____です。", example: "この木は太いです。", exampleEn: "This tree is thick." },
  "細い": { sentence: "彼女の指は____です。", example: "彼女の指は細いです。", exampleEn: "Her fingers are thin." },
  "重い": { sentence: "この荷物は____です。", example: "この荷物は重いです。", exampleEn: "This baggage is heavy." },
  "軽い": { sentence: "このバッグは____です。", example: "このバッグは軽いです。", exampleEn: "This bag is light." },
  "広い": { sentence: "私の部屋は____です。", example: "私の部屋は広いです。", exampleEn: "My room is spacious." },
  "狭い": { sentence: "この道は____です。", example: "この道は狭いです。", exampleEn: "This road is narrow." },
  "強い": { sentence: "風が____です。", example: "風が強いです。", exampleEn: "The wind is strong." },
  "弱い": { sentence: "体が____です。", example: "体が弱いです。", exampleEn: "My body is weak." },
  "早い": { sentence: "朝____起きます。", example: "朝早く起きます。", exampleEn: "I wake up early in the morning." },
  "遅い": { sentence: "帰りが____です。", example: "帰りが遅いです。", exampleEn: "Coming home is late." },
  "明るい": { sentence: "この部屋は____です。", example: "この部屋は明るいです。", exampleEn: "This room is bright." },
  "暗い": { sentence: "外はもう____です。", example: "外はもう暗いです。", exampleEn: "It is already dark outside." },
  "忙しい": { sentence: "今日はとても____です。", example: "今日はとても忙しいです。", exampleEn: "I am very busy today." },
  "楽しい": { sentence: "旅行はとても____かったです。", example: "旅行はとても楽しかったです。", exampleEn: "The trip was very fun." },
  "難しい": { sentence: "このテストは____です。", example: "このテストは難しいです。", exampleEn: "This test is difficult." },
  "易しい": { sentence: "この問題は____です。", example: "この問題は易しいです。", exampleEn: "This question is easy." },
  "優しい": { sentence: "先生はとても____です。", example: "先生はとても優しいです。", exampleEn: "The teacher is very kind." },
  "面白い": { sentence: "この映画は____です。", example: "この映画は面白いです。", exampleEn: "This movie is interesting." },
  "つまらない": { sentence: "この本は____です。", example: "この本はつまらないです。", exampleEn: "This book is boring." },
  "美味しい": { sentence: "このリンゴは____です。", example: "このリンゴは美味しいです。", exampleEn: "This apple is delicious." },
  "まずい": { sentence: "このスープは____です。", example: "このスープはまずいです。", exampleEn: "This soup tastes bad." },
  "甘い": { sentence: "このお菓子は____です。", example: "このお菓子は甘いです。", exampleEn: "This sweet is sweet." },
  "辛い": { sentence: "カレーは____です。", example: "カレーは辛いです。", exampleEn: "The curry is spicy." },
  "丸い": { sentence: "月が____です。", example: "月が丸いです。", exampleEn: "The moon is round." },
  "黒い": { sentence: "____猫がいます。", example: "黒い猫がいます。", exampleEn: "There is a black cat." },
  "黄色い": { sentence: "____花が咲いています。", example: "黄色い花が咲いています。", exampleEn: "Yellow flowers are blooming." },
  "茶色い": { sentence: "____犬を飼っています。", example: "茶色い犬を飼っています。", exampleEn: "I have a brown dog." },
  "好き": { sentence: "日本語が____です。", example: "日本語が好きです。", exampleEn: "I like Japanese." },
  "嫌い": { sentence: "にんじんが____です。", example: "にんじんが嫌いです。", exampleEn: "I dislike carrots." },
  "静か": { sentence: "図書館は____です。", example: "図書館は静かです。", exampleEn: "The library is quiet." },
  "賑やか": { sentence: "この通りは____です。", example: "この通りは賑やかです。", exampleEn: "This street is lively." },
  "綺麗": { sentence: "部屋が____になりました。", example: "部屋が綺麗になりました。", exampleEn: "The room became clean." },
  "有名": { sentence: "富士山は____な山です。", example: "富士山は有名な山です。", exampleEn: "Mt. Fuji is a famous mountain." },
  "便利": { sentence: "電車はとても____です。", example: "電車はとても便利です。", exampleEn: "Trains are very convenient." },
  "元気": { sentence: "祖父はとても____です。", example: "祖父はとても元気です。", exampleEn: "My grandfather is very healthy." },
  "暇": { sentence: "明日は____ですか。", example: "明日は暇ですか。", exampleEn: "Are you free tomorrow?" },
  "大丈夫": { sentence: "怪我は____ですか。", example: "怪我は大丈夫ですか。", exampleEn: "Is the injury okay?" }
};

const customAdverbExamples = {
  "ゆっくり": { sentence: "____話してください。", example: "ゆっくり話してください。", exampleEn: "Please speak slowly." },
  "すぐ": { sentence: "____行きます。", example: "すぐ行きます。", exampleEn: "I will go immediately." },
  "よく": { sentence: "____本を読みます。", example: "よく本を読みます。", exampleEn: "I read books often." },
  "時々": { sentence: "____映画を見ます。", example: "時々映画を見ます。", exampleEn: "I sometimes watch movies." },
  "いつも": { sentence: "朝ご飯は____パンを食べます。", example: "朝ご飯はいつもパンを食べます。", exampleEn: "I always eat bread for breakfast." },
  "たくさん": { sentence: "本が____あります。", example: "本がたくさんあります。", exampleEn: "There are many books." },
  "少し": { sentence: "お茶を____ください。", example: "お茶を少しください。", exampleEn: "Please give me a little tea." },
  "全部": { sentence: "宿題は____終わりました。", example: "宿題は全部終わりました。", exampleEn: "I finished all of my homework." },
  "一緒に": { sentence: "____行きましょう。", example: "一緒に行きましょう。", exampleEn: "Let's go together." },
  "多分": { sentence: "明日は____雨が降るでしょう。", example: "明日は多分雨が降るでしょう。", exampleEn: "It will probably rain tomorrow." },
  "本当に": { sentence: "この料理は____美味しいです。", example: "この料理は本当に美味しいです。", exampleEn: "This dish is really delicious." },
  "もう": { sentence: "____ご飯を食べました。", example: "もうご飯を食べました。", exampleEn: "I already ate my meal." },
  "まだ": { sentence: "____終わっていません。", example: "まだ終わっていません。", exampleEn: "It is not finished yet." },
  "そして": { sentence: "スーパーへ行きました。____パンを買いました。", example: "スーパーへ行きました。そしてパンを買いました。", exampleEn: "I went to the supermarket. And then, I bought bread." },
  "しかし": { sentence: "雨が降っています。____出かけます。", example: "雨が降っています。しかし出かけます。", exampleEn: "It is raining. However, I will go out." },
  "でも": { sentence: "日本語は難しいです。____面白いです。", example: "日本語は難しいです。でも面白いです。", exampleEn: "Japanese is difficult, but interesting." },
  "とても": { sentence: "今日は____暑いです。", example: "今日はとても暑いです。", exampleEn: "It is very hot today." },
  "あまり": { sentence: "お酒は____飲みません。", example: "お酒はあまり飲みません。", exampleEn: "I don't drink alcohol very much." }
};

function generatedExample(item) {
  const term = item.term;
  
  if (item.pos === "verb" && customVerbExamples[term]) {
    return customVerbExamples[term];
  }
  if ((item.pos === "i-adjective" || item.pos === "na-adjective") && customAdjectiveExamples[term]) {
    return customAdjectiveExamples[term];
  }
  if ((item.pos === "adverb" || item.pos === "conjunction") && customAdverbExamples[term]) {
    return customAdverbExamples[term];
  }

  if (item.pos === "verb") {
    return {
      sentence: `明日、____。`,
      example: `明日、${term}。`,
      exampleEn: `Tomorrow I ${item.meaning.replace(/^to /, "")}.`
    };
  }
  if (item.pos === "i-adjective") {
    return {
      sentence: `このものは____です。`,
      example: `このものは${term}です。`,
      exampleEn: `This thing is ${item.meaning}.`
    };
  }
  if (item.pos === "na-adjective") {
    return {
      sentence: `この町は____です。`,
      example: `この町は${term}です。`,
      exampleEn: `This town is ${item.meaning}.`
    };
  }
  if (item.pos === "adverb") {
    return {
      sentence: `____日本語を勉強します。`,
      example: `${term}日本語を勉強します。`,
      exampleEn: `I study Japanese ${item.meaning}.`
    };
  }
  if (item.pos === "number") {
    return {
      sentence: `答えは____です。`,
      example: `答えは${term}です。`,
      exampleEn: `The answer is ${item.meaning}.`
    };
  }
  if (item.category === "Food") {
    return {
      sentence: `____が好きです。`,
      example: `${term}が好きです。`,
      exampleEn: `I like ${item.meaning}.`
    };
  }
  if (item.category === "Places") {
    return {
      sentence: `____へ行きます。`,
      example: `${term}へ行きます。`,
      exampleEn: `I go to the ${item.meaning}.`
    };
  }
  if (item.category === "People" || item.category === "Family") {
    return {
      sentence: `____に会います。`,
      example: `${term}に会います。`,
      exampleEn: `I meet the ${item.meaning}.`
    };
  }
  if (item.category === "Time") {
    return {
      sentence: `____、勉強します。`,
      example: `${term}、勉強します。`,
      exampleEn: `I study ${item.meaning}.`
    };
  }
  return {
    sentence: `ここに____があります。`,
    example: `ここに${term}があります。`,
    exampleEn: `There is ${item.meaning} here.`
  };
}

function generatedWrong(item) {
  if (item.pos === "verb") return [`${item.term}を食べます。`, `${item.term}は赤いです。`, `${item.term}で学校を飲みます。`];
  if (item.pos && item.pos.includes("adjective")) return [`${item.term}を飲みます。`, `${item.term}は駅へ行きます。`, `${item.term}で本を食べます。`];
  if (item.pos === "adverb") return [`${item.term}を食べます。`, `${item.term}は青い駅です。`, `${item.term}で水を読みます。`];
  return [`${item.term}を寝ます。`, `${item.term}は赤い時間です。`, `${item.term}で水を読みます。`];
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseManualQuestions() {
  return manualQuestionData.split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0 && line.includes("|"))
    .map((line, index) => {
      const [type, prompt, answer, optionsText, explain] = line.split("|");
      return {
        id: index + 1,
        type,
        prompt,
        answer,
        options: shuffleArray(optionsText.split("~")),
        explain
      };
    });
}

// 初期化と統合
export const getVocabData = () => {
  const vocab = [...initialVocab];
  const existingTerms = new Set(vocab.map((item) => item.term));
  [compactVocabData, supplementalVocabData].join("\n").split("\n").forEach((line) => {
    const parts = line.split("|");
    if (parts.length < 5) return;
    const [term, reading, meaning, pos, category] = parts;
    if (!term || existingTerms.has(term)) return;
    const item = { term, reading, meaning, pos, category };
    Object.assign(item, generatedExample(item), { wrong: generatedWrong(item) });
    vocab.push(item);
    existingTerms.add(term);
  });
  return vocab;
};

export const getManualQuestions = () => {
  return parseManualQuestions();
};

export const getMiniExamSets = () => {
  return miniExamSets;
};

export const typeLabels = {
  reading: "Kanji Reading",
  orthography: "Orthography (Write in Kanji)",
  context: "Context Vocabulary (Fill in the Blank)",
  meaning: "Paraphrase & Meaning",
  usage: "Usage (Word Context)"
};
