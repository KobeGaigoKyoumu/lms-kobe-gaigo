import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const envContent = fs.readFileSync('.env.local', 'utf8')
const env = {}
envContent.split('\n').filter(l => l.includes('=')).forEach(l => {
    const parts = l.split('=')
    env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '')
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY']
const supabase = createClient(supabaseUrl, supabaseKey)

// 都道府県名からコードへのマッピング
const PREFECTURE_MAP = {
    "北海道": "01", "青森県": "02", "岩手県": "03", "宮城県": "04", "秋田県": "05", "山形県": "06", "福島県": "07",
    "茨城県": "08", "栃木県": "09", "群馬県": "10", "埼玉県": "11", "千葉県": "12", "東京都": "13", "神奈川県": "14",
    "新潟県": "15", "富山県": "16", "石川県": "17", "福井県": "18", "山梨県": "19", "長野県": "20", "岐阜県": "21",
    "静岡県": "22", "愛知県": "23", "三重県": "24", "滋賀県": "25", "京都府": "26", "大阪府": "27", "兵庫県": "28",
    "奈良県": "29", "和歌山県": "30", "鳥取県": "31", "島根県": "32", "岡山県": "33", "広島県": "34", "山口県": "35",
    "徳島県": "36", "香川県": "37", "愛媛県": "38", "高知県": "39", "福岡県": "40", "佐賀県": "41", "長崎県": "42",
    "熊本県": "43", "大分県": "44", "宮崎県": "45", "鹿児島県": "46", "沖縄県": "47"
}

// 高専の地名マッピング
const KOSEN_PLACE_MAP = {
    "函館": { kana: "はこだて", kata: "ハコダテ", roma: "hakodate" },
    "苫小牧": { kana: "とまこまい", kata: "トマコマイ", roma: "tomakomai" },
    "釧路": { kana: "くしろ", kata: "クシロ", roma: "kushiro" },
    "旭川": { kana: "あさひかわ", kata: "アサヒカワ", roma: "asahikawa" },
    "八戸": { kana: "はちのへ", kata: "ハチノヘ", roma: "hachinohe" },
    "一関": { kana: "いちのせき", kata: "イチノセキ", roma: "ichinoseki" },
    "仙台": { kana: "せんだい", kata: "センダイ", roma: "sendai" },
    "秋田": { kana: "あきた", kata: "アキタ", roma: "akita" },
    "鶴岡": { kana: "つるおか", kata: "ツルオカ", roma: "tsuruoka" },
    "福島": { kana: "ふくしま", kata: "フクシマ", roma: "fukushima" },
    "茨城": { kana: "いばらき", kata: "イバラキ", roma: "ibaraki" },
    "小山": { kana: "おやま", kata: "オヤマ", roma: "oyama" },
    "群馬": { kana: "ぐんま", kata: "グンマ", roma: "gunma" },
    "木更津": { kana: "きさらづ", kata: "キサラヅ", roma: "kisarazu kisaradu" },
    "東京": { kana: "とうきょう", kata: "トウキョウ", roma: "toukyou tokyo" },
    "長岡": { kana: "ながおか", kata: "ナガオカ", roma: "nagaoka" },
    "富山": { kana: "とやま", kata: "トヤマ", roma: "toyama" },
    "石川": { kana: "いしかわ", kata: "イシカワ", roma: "ishikawa" },
    "福井": { kana: "ふくい", kata: "フクイ", roma: "fukui" },
    "長野": { kana: "ながの", kata: "ナガノ", roma: "nagano" },
    "岐阜": { kana: "ぎふ", kata: "ギフ", roma: "gifu" },
    "沼津": { kana: "ぬまづ", kata: "ヌマヅ", roma: "numazu numadu" },
    "豊田": { kana: "とよた", kata: "トヨタ", roma: "toyota" },
    "鳥羽商船": { kana: "とばしょうせん", kata: "トバショウセン", roma: "tobashousen tobashosen" },
    "鈴鹿": { kana: "すずか", kata: "スズカ", roma: "suzuka" },
    "舞鶴": { kana: "まいづる", kata: "マイヅル", roma: "maizuru mailduru" },
    "明石": { kana: "あかし", kata: "アカシ", roma: "akashi akasi" },
    "奈良": { kana: "なら", kata: "ナラ", roma: "nara" },
    "和歌山": { kana: "わかやま", kata: "ワカヤマ", roma: "wakayama" },
    "米子": { kana: "よなご", kata: "ヨナゴ", roma: "yonago" },
    "松江": { kana: "まつえ", kata: "マツエ", roma: "matsue matue" },
    "津山": { kana: "tsuyama", kata: "ツヤマ", roma: "tsuyama" },
    "広島商船": { kana: "ひろしましょうせん", kata: "ヒロシマショウセン", roma: "hiroshimashousen hiroshimashosen" },
    "呉": { kana: "くれ", kata: "クレ", roma: "kure" },
    "徳山": { kana: "tokuyama", kata: "トクヤマ", roma: "tokuyama" },
    "宇部": { kana: "うべ", kata: "ウベ", roma: "ube" },
    "大島商船": { kana: "おおしましょうせん", kata: "オオシマショウセン", roma: "ooshimashousen oshimashosen" },
    "阿南": { kana: "あなん", kata: "アナン", roma: "anan" },
    "香川": { kana: "かがわ", kata: "カガワ", roma: "kagawa" },
    "新居浜": { kana: "にいはま", kata: "ニイハマ", roma: "niihama" },
    "弓削商船": { kana: "ゆげしょうせん", kata: "ユゲショウセン", roma: "yugeshousen yugeshosen" },
    "高知": { kana: "こうち", kata: "コウチ", roma: "kouchi kochi" },
    "久留米": { kana: "くるめ", kata: "クルメ", roma: "kurume" },
    "有明": { kana: "ありあけ", kata: "アリアケ", roma: "ariake" },
    "北九州": { kana: "きたきゅうしゅう", kata: "キタキュウシュウ", roma: "kitakyuushuu kitakyushu" },
    "佐世保": { kana: "させぼ", kata: "サセボ", roma: "sasebo" },
    "熊本": { kana: "くまもと", kata: "クマモト", roma: "kumamoto" },
    "大分": { kana: "おおいた", kata: "オオイタ", roma: "ooita oita" },
    "都城": { kana: "みやこのじょう", kata: "ミヤコノジョウ", roma: "miyakonojou miyakonojo" },
    "鹿児島": { kana: "かごしま", kata: "カゴシマ", roma: "kagoshima" },
    "沖縄": { kana: "おきなわ", kata: "オキナワ", roma: "okinawa" },
    "東京都立産業技術": { kana: "とうきょうとりつさんぎょうぎじゅつ", kata: "トウキョウトリツサンギョウギジュツ", roma: "toukyoutoritsusangyougijutsu tokyotoritsusangyogijutsu" },
    "大阪公立大学": { kana: "おおさかこうりつだいがく", kata: "オオサカコウリツダイガク", roma: "oosakakouritsudaigaku osakakoritsudaigaku" },
    "神戸市立": { kana: "こうべしりつ", kata: "コウベシリツ", roma: "koubeshiritsu kobeshiritsu" },
    "サレジオ": { kana: "されじお", kata: "サレジオ", roma: "sarejio" },
    "国際": { kana: "こくさい", kata: "コクサイ", roma: "kokusai" },
    "近畿大学": { kana: "きんきだいがく", kata: "キンキダイガク", roma: "kinkidaigaku" },
    "神山まるごと": { kana: "かみやままるごと", kata: "カミヤママルゴト", roma: "kamiyamamarugoto" }
}

// 不足している大学・短大のマッピング (ホームページURL付き)
const UNIVERSITY_MAP = {
    "F101110100010": {
        name: "北海道大学",
        type: "university",
        pref: "01",
        kana: "ほっかいどうだいがく",
        kata: "ホッカイドウダイガク",
        roma: "hokkaidoudaigaku hokkaidodaigaku",
        website: "https://www.hokudai.ac.jp/"
    },
    "F101110100029": {
        name: "北海道教育大学",
        type: "university",
        pref: "01",
        kana: "ほっかいどうきょういくだいがく",
        kata: "ホッカイドウキョウイクダイガク",
        roma: "hokkaidoukyouikudaigaku hokkaidokyoikudaigaku",
        website: "https://www.hue.ac.jp/"
    },
    "F101110100038": {
        name: "室蘭工業大学",
        type: "university",
        pref: "01",
        kana: "むろらんこうぎょうだいがく",
        kata: "ムロランコウギョウダイガク",
        roma: "murorankougyoudaigaku murorankogyodaigaku",
        website: "https://www.muroran-it.ac.jp/"
    },
    "F101110100047": {
        name: "小樽商科大学",
        type: "university",
        pref: "01",
        kana: "おたるしょうかだいがく",
        kata: "オタルショウカダイガク",
        roma: "otarushoukadaigaku otarushokadaigaku",
        website: "https://www.otaru-uc.ac.jp/"
    },
    "F101110100056": {
        name: "帯広畜産大学",
        type: "university",
        pref: "01",
        kana: "おびひろちくさんだいがく",
        kata: "オビヒロチクサンダイガク",
        roma: "obihirochikusandaigaku",
        website: "https://www.obihiro.ac.jp/"
    },
    "F113110102719": {
        name: "東京医科歯科大学",
        type: "university",
        pref: "13",
        kana: "とうきょういかしかだいがく",
        kata: "トウキョウイカシカダイガク",
        roma: "toukyouikashikadaigaku tokyoikashikadaigaku",
        website: "https://www.tmd.ac.jp/"
    },
    "F113110102746": {
        name: "東京工業大学",
        type: "university",
        pref: "13",
        kana: "とうきょうこうぎょうだいがく",
        kata: "トウキョウコウギョウダイガク",
        roma: "toukyoukougyoudaigaku tokyokogyodaigaku",
        website: "https://www.titech.ac.jp/"
    },
    "F214210104900": {
        name: "川崎市立看護短期大学",
        type: "junior_college",
        pref: "14",
        kana: "かわさきしりつかんごたんきだいがく",
        kata: "カワサキシリツカンゴタンキダイガク",
        roma: "kawasakishiritsukangotankidaigaku",
        website: "https://www.kawasaki-cnjc.ac.jp/"
    }
}

// 58校の高専データ（ホームページURL付き）
const KOSEN_LIST = [
  { "name": "函館工業高等専門学校", "code": "G101110100535", "address": "北海道函館市戸倉町14－1", "website": "https://www.hakodate-ct.ac.jp/" },
  { "name": "苫小牧工業高等専門学校", "code": "G101110100544", "address": "北海道苫小牧市字錦岡443", "website": "https://www.tomakomai-ct.ac.jp/" },
  { "name": "釧路工業高等専門学校", "code": "G101110100553", "address": "北海道釧路市大楽毛西2－32－1", "website": "https://www.kushiro-ct.ac.jp/" },
  { "name": "旭川工業高等専門学校", "code": "G101110100562", "address": "北海道旭川市春光台2条2－1－6", "website": "https://www.asahikawa-nct.ac.jp/" },
  { "name": "八戸工業高等専門学校", "code": "G102110100721", "address": "青森県八戸市大字田面木字上野平16－1", "website": "https://www.hachinohe-ct.ac.jp/" },
  { "name": "一関工業高等専門学校", "code": "G103110100846", "address": "岩手県一関市萩荘字高梨", "website": "https://www.ichinoseki.ac.jp/" },
  { "name": "仙台高等専門学校", "code": "G104110101041", "address": "宮城県仙台市青葉区愛子中央4－16－1", "website": "https://www.sendai-nct.ac.jp/" },
  { "name": "秋田工業高等専門学校", "code": "G105110101166", "address": "秋田県秋田市飯島文京町1－1", "website": "https://www.akita-nct.ac.jp/" },
  { "name": "鶴岡工業高等専門学校", "code": "G106110101263", "address": "山形県鶴岡市井岡字沢田104", "website": "https://www.tsuruoka-nct.ac.jp/" },
  { "name": "福島工業高等専門学校", "code": "G107110101404", "address": "福島県いわき市平上荒川字長尾30", "website": "https://www.fukushima-nct.ac.jp/" },
  { "name": "茨城工業高等専門学校", "code": "G108110101546", "address": "茨城県ひたちなか市中根866", "website": "https://www.ibaraki-ct.ac.jp/" },
  { "name": "小山工業高等専門学校", "code": "G109110101705", "address": "栃木県小山市大字中久喜771", "website": "https://www.oyama-ct.ac.jp/" },
  { "name": "群馬工業高等専門学校", "code": "G110110101935", "address": "群馬県前橋市鳥羽町580", "website": "https://www.gunma-ct.ac.jp/" },
  { "name": "木更津工業高等専門学校", "code": "G112110102692", "address": "千葉県木更津市清見台東2－11－1", "website": "https://www.kisarazu.ac.jp/" },
  { "name": "東京工業高等専門学校", "code": "G113110104564", "address": "東京都八王子市椚田町1220－2", "website": "https://www.tokyo-ct.ac.jp/" },
  { "name": "長岡工業高等専門学校", "code": "G115110105302", "address": "新潟県長岡市西片貝町888", "website": "https://www.nagaoka-ct.ac.jp/" },
  { "name": "富山高等専門学校", "code": "G116110105383", "address": "富山県富山市本郷町13", "website": "https://www.toyama-ct.ac.jp/" },
  { "name": "石川工業高等専門学校", "code": "G117110105578", "address": "石川県河北郡津幡町北中条タ1", "website": "https://www.ishikawa-c.ac.jp/" },
  { "name": "福井工業高等専門学校", "code": "G118110105666", "address": "福井県鯖江市下司町", "website": "https://www.fukui-nct.ac.jp/" },
  { "name": "長野工業高等専門学校", "code": "G120110105966", "address": "長野県長野市大字徳間716", "website": "https://www.nagano-nct.ac.jp/" },
  { "name": "岐阜工業高等専門学校", "code": "G121110106214", "address": "岐阜県本巣市上真桑2236－2", "website": "https://www.gifu-nct.ac.jp/" },
  { "name": "沼津工業高等専門学校", "code": "G122110106419", "address": "静岡県沼津市大岡3600", "website": "https://www.numazu-ct.ac.jp/" },
  { "name": "豊田工業高等専門学校", "code": "G123110107131", "address": "愛知県豊田市栄生町2－1", "website": "https://www.toyota-ct.ac.jp/" },
  { "name": "鳥羽商船高等専門学校", "code": "G124110107265", "address": "三重県鳥羽市池上町1－1", "website": "https://www.toba-cmt.ac.jp/" },
  { "name": "鈴鹿工業高等専門学校", "code": "G124110107256", "address": "三重県鈴鹿市白子町", "website": "https://www.suzuka-ct.ac.jp/" },
  { "name": "舞鶴工業高等専門学校", "code": "G126110107842", "address": "京都府舞鶴市字白屋234", "website": "https://www.maizuru-ct.ac.jp/" },
  { "name": "明石工業高等専門学校", "code": "G128110109189", "address": "兵庫県明石市魚住町西岡679－3", "website": "https://www.akashi.ac.jp/" },
  { "name": "奈良工業高等専門学校", "code": "G129110109348", "address": "奈良県大和郡山市矢田町22", "website": "https://www.nara-k.ac.jp/" },
  { "name": "和歌山工業高等専門学校", "code": "G130110109407", "address": "和歌山県御坊市名田町野島77", "website": "https://www.wakayama-nct.ac.jp/" },
  { "name": "米子工業高等専門学校", "code": "G131110109451", "address": "鳥取県米子市彦名町4448", "website": "https://www.yonago-k.ac.jp/" },
  { "name": "松江工業高等専門学校", "code": "G132110109496", "address": "島根県松江市西生馬町14－4", "website": "https://www.matsue-ct.ac.jp/" },
  { "name": "津山工業高等専門学校", "code": "G133110109770", "address": "岡山県津山市沼624－1", "website": "https://www.tsuyama-ct.ac.jp/" },
  { "name": "広島商船高等専門学校", "code": "G134110110044", "address": "広島県豊田郡大崎上島町東野4272－1", "website": "https://www.hiroshima-cmt.ac.jp/" },
  { "name": "呉工業高等専門学校", "code": "G134110110035", "address": "広島県呉市阿賀南2－2－11", "website": "https://www.kure-nct.ac.jp/" },
  { "name": "徳山工業高等専門学校", "code": "G135110110203", "address": "山口県周南市学園台", "website": "https://www.tokuyama.ac.jp/" },
  { "name": "宇部工業高等専門学校", "code": "G135110110212", "address": "山口県宇部市常盤台2－14－1", "website": "https://www.ube-k.ac.jp/" },
  { "name": "大島商船高等専門学校", "code": "G135110110221", "address": "山口県大島郡周防大島町大字小松1091番地1", "website": "https://www.oshima-cmt.ac.jp/" },
  { "name": "阿南工業高等専門学校", "code": "G136110110300", "address": "徳島県阿南市見能林町青木265", "website": "https://www.anan-nct.ac.jp/" },
  { "name": "香川高等専門学校", "code": "G137110110372", "address": "香川県高松市勅使町355", "website": "https://www.kagawa-nct.ac.jp/" },
  { "name": "新居浜工業高等専門学校", "code": "G138110110488", "address": "愛媛県新居浜市八雲町7－1", "website": "https://www.niihama-nct.ac.jp/" },
  { "name": "弓削商船高等専門学校", "code": "G138110110497", "address": "愛媛県越智郡上島町弓削下弓削1000番地", "website": "https://www.yuge.ac.jp/" },
  { "name": "高知工業高等専門学校", "code": "G139110110566", "address": "高知県南国市物部乙200－1", "website": "https://www.kochi-ct.ac.jp/" },
  { "name": "久留米工業高等専門学校", "code": "G140110111107", "address": "福岡県久留米市小森野1－1－1", "website": "https://www.kurume-nct.ac.jp/" },
  { "name": "有明工業高等専門学校", "code": "G140110111116", "address": "福岡県大牟田市東萩尾町150", "website": "https://www.ariake-nct.ac.jp/" },
  { "name": "北九州工業高等専門学校", "code": "G140110111125", "address": "福岡県北九州市小倉南区志井5－20－1", "website": "https://www.kitakyushu-nct.ac.jp/" },
  { "name": "佐世保工業高等専門学校", "code": "G142110111285", "address": "長崎県佐世保市沖新町1－1", "website": "https://www.sasebo.ac.jp/" },
  { "name": "熊本高等専門学校", "code": "G143110111408", "address": "熊本県八代市平山新町2627", "website": "https://www.kumamoto-nct.ac.jp/" },
  { "name": "大分工業高等専門学校", "code": "G144110111513", "address": "大分県大分市大字牧1666", "website": "https://www.oita-ct.ac.jp/" },
  { "name": "都城工業高等専門学校", "code": "G145110111610", "address": "宮崎県都城市吉尾町473－1", "website": "https://www.miyakonojo-nct.ac.jp/" },
  { "name": "鹿児島工業高等専門学校", "code": "G146110111726", "address": "鹿児島県霧島市隼人町真孝1460－1", "website": "https://www.kagoshima-ct.ac.jp/" },
  { "name": "沖縄工業高等専門学校", "code": "G147110111832", "address": "沖縄県名護市字辺野古905", "website": "https://www.okinawa-ct.ac.jp/" },
  { "name": "東京都立産業技術高等専門学校", "code": "G113210104571", "address": "東京都品川区東大井1－10－40", "website": "https://www.metro-cit.ac.jp/" },
  { "name": "大阪公立大学工業高等専門学校", "code": "G127210108642", "address": "大阪府寝屋川市幸町26－12", "website": "https://www.osaka-pct.ac.jp/" },
  { "name": "神戸市立工業高等専門学校", "code": "G128210109196", "address": "兵庫県神戸市西区学園東町8－3", "website": "https://www.kobe-kosen.ac.jp/" },
  { "name": "サレジオ工業高等専門学校", "code": "G113310104588", "address": "東京都町田市小山ヶ丘4－6－8", "website": "https://www.salesio-sp.ac.jp/" },
  { "name": "国際高等専門学校", "code": "G117310105583", "address": "石川県金沢市久安2－270", "website": "https://www.ict-kanazawa.ac.jp/" },
  { "name": "近畿大学工業高等専門学校", "code": "G124310107270", "address": "三重県名張市春日丘7番町1", "website": "https://www.ktc.ac.jp/" },
  { "name": "神山まるごと高等専門学校", "code": "G136310000014", "address": "徳島県名西郡神山町神領西上角175-1", "website": "https://kamiyama.ac.jp/" }
]

// 都道府県コードの割り当て
function getPrefectureCode(address) {
    if (!address) return null;
    for (const [prefName, code] of Object.entries(PREFECTURE_MAP)) {
        if (address.includes(prefName)) {
            return code;
        }
    }
    return null;
}

// 高専のかな情報を生成する
function generateKosenKana(name) {
    let place = "";
    for (const k of Object.keys(KOSEN_PLACE_MAP)) {
        if (name.startsWith(k)) {
            place = k;
            break;
        }
    }

    if (!place) {
        console.error(`Cannot find place mapping for: ${name}`);
        return { kana: name, katakana: name, romaji: name };
    }

    const map = KOSEN_PLACE_MAP[place];
    
    let suffixKana = "";
    let suffixKata = "";
    let suffixRoma = "";

    if (name.endsWith("工業高等専門学校")) {
        suffixKana = "こうぎょうこうとうせんもんがっこう";
        suffixKata = "コウギョウコウトウセンモンガッコウ";
        suffixRoma = "kougyou koutou senmon gakkou kogyo koto senmon gakko";
    } else if (name.endsWith("商船高等専門学校")) {
        suffixKana = "しょうせんこうとうせんもんがっこう";
        suffixKata = "ショウセンコウトウセンモンガッコウ";
        suffixRoma = "shousen koutou senmon gakkou shosen koto senmon gakko";
    } else if (name.endsWith("高等専門学校")) {
        suffixKana = "こうとうせんもんがっこう";
        suffixKata = "コウトウセンモンガッコウ";
        suffixRoma = "koutou senmon gakkou koto senmon gakko";
    }

    const standardRomaji = `${map.roma}${suffixRoma.split(' ')[0]} ${suffixRoma.split(' ').slice(1).map(r => `${map.roma}${r}`).join(' ')}`;

    return {
        kana: `${map.kana}${suffixKana}`,
        katakana: `${map.kata}${suffixKata}`,
        romaji: standardRomaji.trim()
    }
}

async function run() {
    const records = [];

    // 1. 大学・短大・大学院データの追加
    for (const [code, info] of Object.entries(UNIVERSITY_MAP)) {
        records.push({
            code: code,
            name: info.name,
            school_type: info.type,
            kana: info.kana,
            katakana: info.kata,
            romaji: info.roma,
            prefecture: info.pref,
            website: info.website
        });

        if (info.type === 'university') {
            const gradName = `${info.name}大学院`;
            const standardRomaji = info.roma.split(' ').map(r => `${r}daigakuin`).join(' ');
            records.push({
                code: `${code}-grad`,
                name: gradName,
                school_type: 'graduate_school',
                kana: `${info.kana}だいがくいん`,
                katakana: `${info.kata}ダイガクイン`,
                romaji: standardRomaji,
                prefecture: info.pref,
                website: info.website
            });
        }
    }

    // 2. 高専データの追加
    for (const k of KOSEN_LIST) {
        const prefCode = getPrefectureCode(k.address);
        const kanaInfo = generateKosenKana(k.name);
        
        records.push({
            code: k.code,
            name: k.name,
            school_type: 'technical_college',
            kana: kanaInfo.kana,
            katakana: kanaInfo.katakana,
            romaji: kanaInfo.romaji,
            prefecture: prefCode,
            website: k.website
        });
    }

    console.log(`Prepared ${records.length} records for upsert.`);
    
    console.log("Upserting into Supabase...");
    const { data, error } = await supabase
        .from('master_schools')
        .upsert(records, { onConflict: 'code' });

    if (error) {
        console.error("Error during upsert:", error.message);
    } else {
        console.log("Successfully upserted records with website URLs!");
    }
}

run();
