import stripMarks from "strip-combining-marks";

const REPLACED_CHARS_PATTERNS = {
  "0": "0|⓪|₀|⁰|𝟢|𝟘|０|𝟎|𝟬|𝟶",
  "1": "⑴|➀|❶|⓵|①|₁|¹|𝟣|𝟙|１|𝟏|𝟭|𝟷",
  "2": "⑵|➋|➁|❷|⓶|②|₂|²|𝟤|𝟚|２|𝟐|𝟮|𝟸",
  "3": "⑶|➌|➂|❸|⓷|③|₃|³|𝟥|𝟛|３|𝟑|𝟯|𝟹",
  "4": "⑷|➍|➃|❹|⓸|④|₄|⁴|𝟦|𝟜|４|𝟒|𝟰|𝟺",
  "5": "⑸|➎|➄|❺|⓹|⑤|₅|⁵|𝟧|𝟝|５|𝟓|𝟱|𝟻",
  "6": "⑹|➏|➅|❻|⓺|⑥|₆|⁶|𝟨|𝟞|６|𝟔|𝟲|𝟼",
  "7": "⑺|➐|➆|❼|⓻|⑦|₇|⁷|𝟩|𝟟|７|𝟕|𝟳|𝟽",
  "8": "⑻|➑|➇|❽|⓼|⑧|₈|⁸|𝟪|𝟠|８|𝟖|𝟴|𝟾",
  "9": "⑼|➒|➈|❾|⓽|⑨|₉|⁹|𝟫|𝟡|９|𝟗|𝟵|𝟿",
  a: [
    "ﾑ|ａ|Ａ|＠|🇦|🅰|🅐|🄰|𝞪|𝞐|𝝰|𝝖|𝜶|𝜜|𝛼|𝛢|𝛂|𝚨|𝚊|𝙰|𝙖|𝘼|𝘢|𝘈|𝗮|𝗔|𝖺|𝖠|𝖆|𝕬|𝕒|𝔸|𝔞|𝔄|𝓪|𝓐|𝒶|𝒜|𝒂|𝑨|𝑎",
    "𝐴|𝐚|𝐀|𐊠|ꭺ|ꓯ|ꓮ|ꋬ|卂|Ɐ|ⓐ|Ⓐ|⒜|⍺|∆|∀|₳|ₐ|ᾼ|Ὰ|Ᾱ|Ᾰ|ᾷ|ᾶ|ᾴ|ᾳ|ᾲ|ᾱ|ᾰ|ᾏ|ᾎ|ᾍ|ᾌ|ᾋ|ᾊ|ᾉ|ᾈ|ᾇ|ᾆ|ᾅ|ᾄ|ᾃ|ᾂ|ᾁ",
    "ᾀ|ὰ|ἇ|ἆ|ἅ|ἄ|ἃ|ἂ|ἁ|ἀ|ặ|Ặ|ẵ|Ẵ|ẳ|Ẳ|ằ|Ằ|ắ|Ắ|ậ|Ậ|ẫ|Ẫ|ẩ|Ẩ|ầ|Ầ|ấ|Ấ|ả|Ả|ạ|Ạ|ẚ|ḁ|Ḁ|ᵃ|ᴬ|ᴀ|ᗩ|ᗅ|ᗄ|Ꮧ|Ꭿ",
    "Ꭺ|ለ|ค|බ|Թ|ӓ|Ӓ|Ѧ|а|Д|А|α|ά|Λ|Δ|Α|Ά|ɒ|ɑ|ɐ|Ⱥ|ȧ|Ȧ|ǻ|Ǻ|ǟ|ǎ|Ǎ|ą|Ą|ă|Ă|ā|Ā|å|ä|ã|â|á|à|Å|Ä|Ã|Â|Á|À",
    "ª|a|A|@|:regional_indicator_a:|4",
  ].join("|"),
  b: [
    "ｂ|Ｂ|🇧|🅱|🅑|🄱|𝞫|𝞑|𝝱|𝝗|𝜷|𝜝|𝛽|𝛣|𝛃|𝚩|𝚋|𝙱|𝙗|𝘽|𝘣|𝘉|𝗯|𝗕|𝖻|𝖡|𝖇|𝕻|𝕭|𝕓|𝔹|𝔟|𝔓|𝔅|𝓫|𝓑|𝒷|𝒃|𝑩|𝑏|𝐵|𝐛",
    "𝐁|𐑂|𐌁|𐊡|𐊂|ꮟ|ꞵ|Ꞵ|ꓭ|ꓐ|乃|ⓑ|Ⓑ|⒝|ℬ|ḇ|Ḇ|ḅ|Ḅ|ḃ|Ḃ|ᵇ|ᴮ|ᛒ|ᙠ|ᗷ|ᖯ|ᏼ|Ᏼ|Ᏸ|Ꮟ|ც|Ⴆ|๖|๒|฿|ط|ҍ|ѣ|ь|ъ|в|Ь|В",
    "Б|ϐ|β|Β|ʙ|ɮ|ɞ|ƅ|Ƅ|ƀ|ß|b|B|:regional_indicator_b:",
  ].join("|"),
  c: [
    "ｃ|Ｃ|🝌|🇨|🅲|🅒|🄲|𝚌|𝙲|𝙘|𝘾|𝘤|𝘊|𝗰|𝗖|𝖼|𝖢|𝖈|𝕮|𝕔|𝔠|𝓬|𝓒|𝒸|𝒞|𝒄|𝑪|𝑐|𝐶|𝐜|𝐂|𐑋|𐐽|𐐣|𐐕|𐌂|𐊢|ꮯ|ꓛ|ꓚ|匚|ⲥ|Ⲥ|ⓒ|Ⓒ|⒞",
    "↻|ↄ|Ↄ|ⅽ|Ⅽ|ℭ|℃|ℂ|₵|ḉ|Ḉ|ᶜ|ᴐ|ᴄ|ᑢ|ᑕ|Ꮳ|Ꮯ|ፈ|ር|ᄃ|ၥ|၁|ང|උ|ҫ|Ҁ|с|С|Ͻ|Ϲ|ϲ|Ϛ|ς|ͻ|ʗ|ɕ|ɔ|Ȼ|ƈ|Ɔ|č|Č|ċ|Ċ|ĉ",
    "Ĉ|ć|Ć|ç|Ç|©|¢|c|C|:regional_indicator_c:",
  ].join("|"),
  d: [
    "ｄ|Ｄ|🇩|🅳|🅓|🄳|𝚍|𝙳|𝙙|𝘿|𝘥|𝘋|𝗱|𝗗|𝖽|𝖣|𝖉|𝕯|𝕕|𝔻|𝔡|𝔇|𝓭|𝓓|𝒹|𝒟|𝒅|𝑫|𝑑|𝐷|𝐝|𝐃|ꭰ|ꓷ|ꓓ|ꓒ|ⓓ|Ⓓ|⒟|∂|ↁ|ⅾ|Ⅾ",
    "ⅆ|ⅅ|₫|ḓ|Ḓ|ḑ|Ḑ|ḏ|Ḏ|ḍ|Ḍ|ḋ|Ḋ|ᵈ|ᴰ|ᴅ|ᗬ|ᗪ|ᗡ|ᗞ|ᕲ|ᑯ|Ꮷ|Ꮄ|Ꭰ|໓|๔|ծ|ժ|ԃ|ԁ|ɗ|ɖ|ƌ|Ɗ|đ|Đ|ď|Ď|Ð|d|D|:regional_indicator_d:",
  ].join("|"),
  e: [
    "ﾐ|ｅ|Ｅ|ﻉ|🇪|🅴|🅔|🄴|𝞷|𝞢|𝞔|𝝽|𝝨|𝝚|𝝃|𝜮|𝜠|𝜉|𝛴|𝛦|𝛏|𝚺|𝚬|𝚎|𝙴|𝙚|𝙀|𝘦|𝘌|𝗲|𝗘|𝖾|𝖤|𝖊|𝕰|𝕖|𝔼|𝔢|𝔈|𝓮|𝓔|𝒆|𝑬|𝑒|𝐸",
    "𝐞|𝐄|𐐩|𐐁|𐊆|ꮛ|ꭼ|ꬲ|ꞓ|ꝫ|ꓱ|ꓰ|乇|㉫|ⵉ|ⴺ|ⴹ|ⳍ|ⲉ|ⓔ|Ⓔ|⒠|⋿|⋴|∑|∊|∈|∃|ⅇ|⅀|ℰ|ℯ|℮|ℇ|€|ₑ|Ὲ|ὲ|Ἕ|Ἔ|Ἓ|Ἒ|Ἑ|Ἐ|ἕ",
    "ἔ|ἓ|ἒ|ἑ|ἐ|ệ|Ệ|ễ|Ễ|ể|Ể|ề|Ề|ế|Ế|ẽ|Ẽ|ẻ|Ẻ|Ẹ|ḝ|Ḝ|ḛ|Ḛ|ḙ|Ḙ|ḗ|Ḗ|ḕ|Ḕ|ᵉ|ᴱ|ᴈ|ᴇ|ᘿ|ᗴ|Ꮛ|Ꭼ|ჳ|ཇ|ԑ|Ԑ|ӡ|ә|Ә|ҿ|ҽ",
    "є|э|з|е|Е|ϵ|ξ|ε|έ|Σ|Ξ|Ε|ʒ|ɜ|ɛ|ə|ɘ|Ɇ|ȝ|ǝ|ƺ|Ʃ|Ɛ|Ə|Ǝ|ě|Ě|ę|Ę|ė|Ė|ĕ|Ĕ|ē|Ē|ë|ê|é|è|Ë|Ê|É|È|£|e|E|:regional_indicator_e:|3",
  ].join("|"),
  f: [
    "ｆ|Ｆ|ךּ|🇫|🅵|🅕|🄵|𝟋|𝚏|𝙵|𝙛|𝙁|𝘧|𝘍|𝗳|𝗙|𝖿|𝖥|𝖋|𝕱|𝕗|𝔽|𝔣|𝔉|𝓯|𝓕|𝒻|𝒇|𝑭|𝑓|𝐹|𝐟|𝐅|𐊥|𐊇|ꬵ|ꟻ|ꞙ|Ꞙ|ꜰ|ꓞ|ꓝ|千|ⓕ|Ⓕ",
    "⒡|Ⅎ|ℱ|℉|₣|ẝ|ḟ|Ḟ|ᶠ|ᖷ|ᖵ|ᖴ|Ꮈ|ན|ғ|ϝ|Ϝ|ʄ|ɟ|ƒ|Ƒ|ſ|f|F|:regional_indicator_f:",
  ].join("|"), // conflicts with T: Ŧ
  g: [
    "ｇ|Ｇ|ﻮ|פֿ|𠂎|🇬|🅶|🅖|🄶|𝚐|𝙶|𝙜|𝙂|𝘨|𝘎|𝗴|𝗚|𝗀|𝖦|𝖌|𝕲|𝕘|𝔾|𝔤|𝔊|𝓰|𝓖|𝒢|𝒈|𝑮|𝑔|𝐺|𝐠|𝐆|ꮐ|ꓖ|ⓖ|Ⓖ|⒢|⅁|ℊ|₲|ḡ",
    "Ḡ|ᶃ|ᵍ|ᴳ|ᘜ|ᏻ|Ᏻ|Ꮹ|Ꮐ|Ꮆ|ງ|ق|ց|ԍ|Ԍ|Б|ʛ|ɢ|ɡ|ɠ|ɓ|ǵ|Ǵ|ǫ|ǧ|Ǧ|Ǥ|ƃ|ģ|Ģ|ġ|Ġ|ğ|Ğ|ĝ|Ĝ|g|G|:regional_indicator_g:",
  ].join("|"),
  h: [
    "ｈ|Ｈ|🇭|🅷|🅗|🄷|𝞖|𝝜|𝜢|𝛨|𝚮|𝚑|𝙷|𝙝|𝙃|𝘩|𝘏|𝗵|𝗛|𝗁|𝖧|𝖍|𝕳|𝕙|𝔥|𝓱|𝓗|𝒽|𝒉|𝑯|𝐻|𝐡|𝐇|𐋏|ꮋ|ꓧ|卄|ん|Ⲏ|Ⱨ|ⓗ",
    "Ⓗ|⒣|ℎ|ℍ|ℌ|ℋ𝑖|ℋ|ₕ|ῌ|Ὴ|ᾟ|ᾞ|ᾝ|ᾜ|ᾛ|ᾚ|ᾙ|ᾘ|Ἧ|Ἦ|Ἥ|Ἤ|Ἣ|Ἢ|Ἡ|Ἠ|ẖ|ḫ|Ḫ|ḩ|Ḩ|ḧ|Ḧ|ḥ|Ḥ|ḣ|Ḣ|ᴴ|ᕼ|Ᏺ|Ꮒ|Ꮋ|ዠ|ዞ",
    "հ|ԋ|Ԋ|Ӊ|ӈ|һ|ђ|н|Н|Ћ|Η|Ή|ʱ|ʰ|ʜ|ɧ|ɦ|ɥ|Ƕ|ħ|Ħ|ĥ|Ĥ|h|\\#|H|:regional_indicator_h:",
  ].join("|"),
  i: [
    "ﾉ|ｉ|Ｉ|！|ﺍ|ﺁ|🇮|🅸|🅘|🄸|𝚒|𝙸|𝙞|𝙄|𝘪|𝘐|𝗶|𝗜|𝗂|𝖨|𝖎|𝕴|𝕚|𝕀|𝔦|𝓲|𝓘|𝒾|𝒊|𝑰|𝑗|𝑖|𝐼|𝐢|𝐈|𐌠|𐌉|𐊊|ꭵ|ꙇ|ꓲ|丨|ⵑ|ⵏ|Ⲓ|ⓘ|Ⓘ|⒤|⍳|∣",
    "ⅼ|ⅰ|Ⅰ|ⅈ|ℹ|ℑ|ℐ|ⁱ|Ὶ|Ῑ|Ῐ|ῗ|ῖ|ῒ|ῑ|ῐ|ὶ|Ἷ|Ἶ|Ἵ|Ἴ|Ἳ|Ἲ|Ἱ|Ἰ|ἷ|ἶ|ἵ|ἴ|ἳ|ἲ|ἱ|ἰ|ị|Ị|ỉ|Ỉ|ḯ|Ḯ|ḭ|Ḭ|ᶤ|ᵢ|ᴵ|ᛁ|ᓰ|Ꮖ|Ꭵ|ར",
    "เ|ߊ|۱|ٱ|١|ا|أ|آ|ו|׀|ӏ|ї|і|І|ϊ|ι|ί|Ι|ΐ|ɪ|ɨ|ǐ|Ǐ|ǃ|Ɨ|ł|ı|İ|į|Į|ĭ|Ĭ|ī|Ī|ĩ|Ĩ|ï|î|í|ì|Ï|Î|Í|Ì|¡|i",
    "\\￨|\\ǀ|I|:regional_indicator_i:|1|!",
  ].join("|"),
  j: [
    "ﾌ|ｊ|Ｊ|ﻝ|🇯|🅹|🅙|🄹|𝚓|𝙹|𝙟|𝙅|𝘫|𝘑|𝗷|𝗝|𝗃|𝖩|𝖏|𝕵|𝕛|𝕁|𝔧|𝔍|𝓳|𝓙|𝒿|𝒥|𝒋|𝑱|𝐽|𝐣|𝐉|ꭻ|Ʝ|ꞁ|ꓙ|ⱼ|ⓙ|Ⓙ|⒥|ⅉ|ᴶ|ᴊ|ᒚ|ᒎ|ᒍ|Ꮰ|Ꭻ|ว",
    "ڶ|ل|ز|נ|ן|ј|Ј|ϳ|Ϳ|ʲ|ʝ|Ɉ|ǰ|ĵ|Ĵ|j|J|:regional_indicator_j:",
  ].join("|"),
  k: [
    "ｋ|Ｋ|🇰|🅺|🅚|🄺|𝟆|𝞳|𝞙|𝞌|𝝹|𝝟|𝝒|𝜿|𝜥|𝜘|𝜅|𝛫|𝛞|𝛋|𝚱|𝚔|𝙺|𝙠|𝙆|𝘬|𝘒|𝗸|𝗞|𝗄|𝖪|𝖐|𝕶|𝕜|𝕂|𝔨|𝔎|𝓴|𝓚|𝓀|𝒦|𝒌|𝑲",
    "𝑘|𝐾|𝐤|𝐊|𐒼|ꮶ|Ꝁ|ꓗ|ⲕ|Ⲕ|ⓚ|Ⓚ|⒦|⋊|K|₭|ₖ|ḵ|Ḵ|ḳ|Ḳ|ḱ|Ḱ|ᵏ|ᴷ|ᴋ|ᛕ|ᖽᐸ|Ꮶ|ӄ|Ӄ|Ҡ|ҟ|Ҝ|қ|к|К|Ќ|ϰ|ϗ|κ|Κ|ʞ|ƙ|ĸ",
    "ķ|Ķ|k|K|:regional_indicator_k:",
  ].join("|"),
  l: [
    "ﾚ|ｌ|Ｌ|ﺎ|ﺂ|🇱|🅻|🅛|🄻|𝚕|𝙻|𝙡|𝙇|𝘭|𝘓|𝗹|𝗟|𝗅|𝖫|𝖑|𝕷|𝕝|𝕃|𝔩|𝔏|𝓵|𝓛|𝓁|𝒍|𝑳|𝑙|𝐿|𝐥|𝐋|𐑃|𐐛|ꮮ|Ꝉ|ꓡ|ㄥ|し|ⳑ|Ⳑ|Ⱡ|ⓛ|Ⓛ|⒧",
    "Ⅼ|⅃|⅂|ℓ|ℒ|ₗ|ḽ|Ḽ|ḻ|Ḻ|ḹ|Ḹ|ḷ|Ḷ|ᴸ|ᒺ|ᒪ|Ꮮ|Ꮭ|Ꮁ|ᄂ|Ӏ|ˡ|ʟ|ʆ|ʅ|ɭ|ɫ|ƪ|Ɩ|ł|Ł|ŀ|Ŀ|ľ|Ľ|ļ|Ļ|ĺ|Ĺ|l|L|:regional_indicator_l:",
  ].join("|"),
  m: [
    "ﾶ|ｍ|Ｍ|🇲|🅼|🅜|🄼|𝞛|𝝡|𝜧|𝛭|𝚳|𝚖|𝙼|𝙢|𝙈|𝘮|𝘔|𝗺|𝗠|𝗆|𝖬|𝖒|𝕸|𝕞|𝕄|𝔪|𝔐|𝓶|𝓜|𝓂|𝒎|𝑴|𝑚|𝑀|𝐦|𝐌|𐌑",
    "𐊰|ꮇ|ꓟ|爪|Ⲙ|ⓜ|Ⓜ|⒨|Ⅿ|ℳ|₥|ₘ|ṃ|Ṃ|ṁ|Ṁ|ḿ|Ḿ|ᵐ|ᴹ|ᴍ|៣|ᛖ|ᘻ|ᗰ|Ꮇ|๓|Ӎ|м|М|ϻ|Ϻ|Μ|ʍ|ɱ|ɯ|m|M|:regional_indicator_m:",
  ].join("|"),
  n: [
    "ｎ|Ｎ|🇳|🅽|🅝|🄽|𝞜|𝝢|𝜨|𝛮|𝚴|𝚗|𝙽|𝙣|𝙉|𝘯|𝘕|𝗻|𝗡|𝗇|𝖭|𝖓|𝕹|𝕟|𝔫|𝔑|𝓷|𝓝|𝓃|𝒩|𝒏|𝑵|𝑛|𝑁|𝐧|𝐍|𐑍|𐐥|ꓵ|ꓠ|刀|几",
    "Ⲡ|Ⲛ|ⓝ|Ⓝ|⒩|⋂|∏|ℿ|ℕ|₦|ₙ|ⁿ|ῇ|ῆ|ῄ|ῃ|ῂ|ᾗ|ᾖ|ᾕ|ᾔ|ᾓ|ᾒ|ᾑ|ᾐ|ὴ|ἧ|ἦ|ἥ|ἤ|ἣ|ἢ|ἡ|ἠ|ṋ|Ṋ|ṉ|Ṉ|ṇ|Ṇ|ṅ|Ṅ|ᶰ|ᴺ|ᴎ|ហ",
    "ᘉ|ᑎ|Ꮑ|ቡ|በ|ຖ|ภ|ก|מ|ռ|ո|ղ|Ռ|Ո|ӣ|ѝ|й|и|П|Й|И|Ѝ|Ϟ|η|ή|Π|Ν|ͷ|Ͷ|ɴ|ɳ|ɲ|Ǹ|ƞ|Ɲ|ŋ|ŉ|ň|Ň|ņ|Ņ|ń|Ń|ñ|Ñ|n|N|:regional_indicator_n:",
  ].join("|"),
  o: [
    "ｏ|Ｏ|ﻬ|ﻫ|ﻪ|ﻩ|ﮭ|ﮬ|ﮫ|ﮪ|ﮩ|ﮨ|ﮧ|ﮦ|🇴|🅾|🅞|🄾|𝞼|𝞸|𝞞|𝞂|𝝾|𝝤|𝝈|𝝄|𝜪|𝜎|𝜊|𝛰|𝛔|𝛐|𝚶|𝚘|𝙾|𝙤|𝙊|𝘰|𝘖|𝗼|𝗢|𝗈|𝖮|𝖔|𝕺",
    "𝕠|𝕆|𝔬|𝔒|𝓸|𝓞|𝒪|𝒐|𝑶|𝑜|𝑂|𝐨|𝐎|𐓪|𐓃|𐓂|𐐬|𐐄|𐊫|𐊒|ꬽ|Ꙩ|ꓳ|㊉|ㄖ|の|〇|ⵙ|ⵔ|ⲟ|Ⲟ|⨀|✿|☉|ⓞ|Ⓞ|⒪|⍥|⊙|∅|ℴ|ₒ",
    "Ὼ|Ὸ|ᾯ|ᾮ|ᾭ|ᾬ|ᾫ|ᾪ|ᾩ|ᾨ|ὸ|Ὧ|Ὦ|Ὥ|Ὤ|Ὣ|Ὢ|Ὡ|Ὠ|Ὅ|Ὄ|Ὃ|Ὂ|Ὁ|Ὀ|ὅ|ὄ|ὃ|ὂ|ὁ|ὀ|ỡ|Ỡ|ở|Ở|ờ|Ờ|ớ|Ớ|ộ|Ộ|Ỗ|ổ|Ổ|ồ|Ồ|ố|Ố|ỏ|Ỏ",
    "ọ|Ọ|ṓ|Ṓ|ṑ|Ṑ|ṏ|Ṏ|ṍ|Ṍ|ð|ᵒ|ᴼ|ᴑ|ᴏ|ᗝ|ᓍ|Ꮎ|Ꭷ|ዐ|ჿ|၀|ဝ|໐|๐|๏|ට|൦|ഠ|೦|౦|௦|୦|ଠ|૦|੦|০|०|߀|۵|۝|ە|ہ|ھ|٥|ه|ס|օ",
    "Օ|Ө|ӧ|Ӧ|ѻ|о|Ф|О|ό|φ|σ|ο|θ|Ο|Θ|˚|ʘ|ǿ|Ǿ|ǒ|Ǒ|Ʊ|ơ|Ơ|ő|Ő|ŏ|Ŏ|ō|Ō|ø|ö|õ|ô|ó|ò|ð|Ø|Ö|Õ|Ô|Ó|Ò|º|°|o|O|♡|:regional_indicator_o:|0",
  ].join("|"),
  p: [
    "ｱ|ｐ|Ｐ|🇵|🅿|🅟|🄿|𝟈|𝞺|𝞠ϱ|𝞠|𝞎|𝞀|𝝦|𝝔|𝝆|𝜬|𝜚|𝜌|𝛲|𝛠|𝛒|𝚸|𝚙|𝙿|𝙥|𝙋|𝘱|𝘗|𝗽|𝗣|𝗉|𝖯|𝖕|𝕡|𝔭|𝓹|𝓟|𝓅|𝒫|𝒑|𝑷|𝑝|𝑃|𝐩|𝐏",
    "𐓄|𐊕|ꮲ|ꓑ|卩|ⲣ|Ⲣ|Ᵽ|ⓟ|Ⓟ|⒫|⍴|ℙ|℘|₱|ₚ|‽|Ῥ|ῥ|ῤ|ṗ|Ṗ|ṕ|Ṕ|ᵖ|ᴾ|ᴩ|ᴘ|ᕵ|ᑭ|Ꮲ|Ꭾ|ק|ք|բ|Ԁ|Ҏ|р|Р|ϸ|Ϸ|ϱ|ρ|Ρ|ƿ|Ƥ|þ|Þ|¶",
    "p|P|:regional_indicator_p:",
  ].join("|"),
  q: [
    "ｑ|Ｑ|🇶|🆀|🅠|🅀|𝚚|𝚀|𝙦|𝙌|𝘲|𝘘|𝗾|𝗤|𝗊|𝖰|𝖖|𝕼|𝕢|𝔮|𝔔|𝓺|𝓠|𝓆|𝒬|𝒒|𝑸|𝑞|𝑄|𝐪|𝐐|𐌒|𐊭|ꟼ|Ꝗ|ゐ|ⵕ|ⓠ|Ⓠ|⒬|ℚ|ợ|ᶐ|ᕴ",
    "ᑫ|Ꭴ|๑|۹|ף|զ|գ|ԛ|Ҩ|ϥ|ϙ|Ϙ|Ω|ʠ|ɋ|Ɋ|ǭ|Ǭ|Ǫ|ƍ|q|Q|:regional_indicator_q:",
  ].join("|"),
  r: [
    "ｒ|Ｒ|🇷|🆁|🅡|🅁|𝞒|𝝘|𝜞|𝛤|𝚪|𝚛|𝚁|𝙧|𝙍|𝘳|𝘙|𝗿|𝗥|𝗋|𝖱|𝖗|𝕽|𝕣|𝔯|𝓻|𝓡|𝓇|𝒓|𝑹|𝑟|𝑅|𝐫|𝐑|𐒴|ꮢ|ꮁ|ꭱ|ꭈ|ꭇ|ꓣ|尺|ⲅ|Ɽ|ⓡ|Ⓡ|⒭|℞",
    "ℝ|ℜ|ℛ|ṟ|Ṟ|ṝ|Ṝ|ṛ|Ṛ|ṙ|Ṙ|ᵣ|ᴿ|ᴦ|ᴚ|ᴙ|ᚱ|ᖇ|Ꮢ|Ꭱ|འ|ཞ|ર|ր|Ի|я|г|Я|ʳ|ʁ|ʀ|ɿ|ɾ|ɼ|ɹ|Ɍ|Ʀ|ř|Ř|ŗ|Ŗ|ŕ|Ŕ|®|r|R|:regional_indicator_r:",
  ].join("|"),
  s: [
    "ｓ|Ｓ|＄|ﮎ|🇸|🆂|🅢|🅂|𝚜|𝚂|𝙨|𝙎|𝘴|𝘚|𝘀|𝗦|𝗌|𝖲|𝖘|𝕾|𝕤|𝕊|𝔰|𝔖|𝓼|𝓢|𝓈|𝒮|𝒔|𝑺|𝑠|𝑆|𝐬|𝐒|𐑈|𐐠|𐊖|ꮪ|ꜱ|ꙅ|Ꙅ|ꓢ|꒚|丂|ⓢ|Ⓢ|⒮|∫|₴",
    "ₛ|ṩ|Ṩ|ṧ|Ṧ|ṥ|Ṥ|ṣ|Ṣ|ṡ|Ṡ|ᴤ|ᔕ|Ꮪ|Ꮥ|Ꭶ|ร|ى|ֆ|Տ|ѕ|Ѕ|ϩ|ˢ|ʃ|ʂ|Ș|ƽ|ƨ|Ƨ|š|Š|ş|Ş|ŝ|Ŝ|ś|Ś|§|s|\\$|S|:regional_indicator_s:|5",
  ].join("|"),
  t: [
    "ｲ|ｨ|ｔ|Ｔ|🇹|🆃|🅣|🅃|𝞽|𝚝|𝚃|𝙩|𝙏|𝘵|𝘛|𝘁|𝗧|𝗍|𝖳|𝖙|𝕿|𝕥|𝕋|𝔱|𝔗|𝓽|𝓣|𝓉|𝒯|𝒕|𝑻|𝑡|𝑇|𝐭|𝐓|𐌕|𐊱|𐊗|ꭲ|ꓔ|꓄|丅|ㄒ|Ⲧ|Ⲅ|⟙|ⓣ|Ⓣ|⒯",
    "⊥|⊤|ℾ|₮|ₜ|†|ẗ|ṱ|Ṱ|ṯ|Ṯ|ṭ|Ṭ|ṫ|Ṫ|ᵗ|ᵀ|ᴛ|ᖶ|ᒥ|Ꮦ|Ꮏ|Ꮁ|Ꭲ|ኮ|ح|է|Շ|Ի|Ե|ҭ|т|Т|Г|ϯ|Ϯ|τ|π|Τ|Γ|Ͳ|ʈ|ʇ|ɬ|ȶ|ț|Ț|ǂ|Ʈ|Ƭ|ƫ|ƚ",
    "ŧ|ť|Ť|ţ|Ţ|t|T|:regional_indicator_t:|7",
  ].join("|"), // conflicts with F: Ŧ
  u: [
    "ｕ|Ｕ|🇺|🆄|🅤|🅄|𝞵|𝝻|𝝁|𝜇|𝛍|𝚞|𝚄|𝙪|𝙐|𝘶|𝘜|𝘂|𝗨|𝗎|𝖴|𝖚|𝖀|𝕦|𝕌|𝔲|𝔘|𝓾|𝓤|𝓊|𝒰|𝒖|𝑼|𝑢|𝑈|𝐮|𝐔|𐓶|𐓎|ꭒ|ꭎ|ꞟ|ꓴ|ㄩ|ひ|ⓤ",
    "Ⓤ|⒰|⋃|∪|∩|℧|ῧ|ῦ|ῢ|ῡ|ῠ|ὺ|ὗ|ὖ|ὕ|ὔ|ὓ|ὒ|ὑ|ὐ|ự|Ự|Ữ|ử|Ử|ừ|Ừ|ứ|Ứ|ủ|Ủ|ụ|Ụ|ṻ|Ṻ|ṹ|Ṹ|ṷ|Ṷ|ṵ|Ṵ|ṳ|Ṳ|ᵾ|ᵤ|ᵘ|ᵁ|ᴜ|ᘴ|ᘮ",
    "ᓑ|ᑘ|ᑌ|ᐡ|Ꮼ|ሆ|ሀ|ย|น|પ|և|ս|մ|Ս|Մ|Ц|ύ|ϋ|υ|μ|ΰ|ʋ|ʊ|Ʉ|Ȕ|ǜ|Ǜ|ǚ|Ǚ|ǘ|Ǘ|ǖ|Ǖ|ǔ|Ǔ|Ʊ|ư|Ư|ų|Ų|ű|Ű|ů|Ů|ŭ|Ŭ|ū|Ū|ũ|Ũ|û",
    "ú|ù|Ü|Û|Ú|Ù|µ|u|U|:regional_indicator_u:",
  ].join("|"),
  v: [
    "ｖ|Ｖ|🇻|🆅|🅥|🅅|𝝼|𝝂|𝜈|𝛎|𝚟|𝚅|𝙫|𝙑|𝘷|𝘝|𝘃|𝗩|𝗏|𝖵|𝖛|𝖁|𝕧|𝕍|𝔳|𝔙|𝓿|𝓥|𝓋|𝒱|𝒗|𝑽|𝑣|𝑉|𝐯|𝐕|𐓘|𐒰|𐌡|𐊍|ꮩ|ꓦ|ꓥ|ⴸ|ⴷ|ⱽ|ⓥ|Ⓥ",
    "⒱|⋁|∨|√|ⅴ|Ⅴ|℣|ṿ|Ṿ|ṽ|Ṽ|ᵥ|ᵛ|ᴧ|ᴠ|ᐺ|ᐱ|ᐯ|Ꮩ|Ꮙ|ง|۸|۷|٨|٧|ש|ע|ט|Ѷ|ѵ|Ѵ|Л|ν|Λ|ʌ|ʋ|Ʌ|Ɣ|v|V|:regional_indicator_v:",
  ].join("|"),
  w: [
    "ｗ|Ｗ|🇼|🆆|🅦|🅆|𝟉|𝟂|𝞏|𝞈|𝝕|𝝎|𝜛|𝜔|𝜋|𝛡|𝛚|𝛑|𝚠|𝚆|𝙬|𝙒|𝘸|𝘞|𝘄|𝗪|𝗐|𝖶|𝖜|𝖂|𝕨|𝕎|𝔴|𝔚|𝔀|𝓦|𝓌|𝒲|𝒘|𝑾|𝑤",
    "𝑊|𝐰|𝐖|𐓑|ꮃ|ꞷ|ꙍ|ꓪ|山|ⲱ|ⓦ|Ⓦ|⒲|⍵|ℼ|₩|ῷ|ῶ|ῴ|ῳ|ῲ|ẘ|ẉ|Ẉ|ẇ|Ẇ|ẅ|Ẅ|ẃ|Ẃ|ẁ|Ẁ|ᵂ|ᴡ|ᘺ|ᗯ|Ꮿ|Ꮤ|Ꮚ|Ꮗ|Ꮃ|ሠ|ཡ|ຟ|ฬ",
    "ฝ|చ|ա|ԝ|Ԝ|ѡ|Ѡ|ш|Щ|ϖ|ώ|ω|ψ|ʷ|ʍ|ɯ|ŵ|Ŵ|w|W|:regional_indicator_w:",
  ].join("|"),
  x: [
    "ﾒ|ｘ|Ｘ|אָ|אַ|🇽|🆇|🅧|🅇|𝟀|𝞆|𝝌|𝜒|𝛘|𝚡|𝚇|𝙭|𝙓|𝘹|𝘟|𝘅|𝗫|𝗑|𝖷|𝖝|𝖃|𝕩|𝕏|𝔵|𝔛|𝔁|𝓧|𝓍|𝒳|𝒙|𝑿|𝑥|𝑋|𝐱|𝐗|𐌢|𐌗|𐊴|𐊐|ꭕ|ꭓ|Ꭓ|ꓫ|꒼",
    "乂|〤|ⵝ|ⲭ|Ⲭ|⨯|⤬|⤫|╳|ⓧ|Ⓧ|⒳|⌧|ⅹ|Ⅹ|ℵ|ₓ|ẍ|Ẍ|ẋ|Ẋ|ᚷ|᙮|᙭|ᕽ|ᕁ|ጀ|ჯ|א|Ӿ|Ӽ|ҳ|х|Х|Ж|χ|Χ|ˣ|ɤ|×|x|X|:regional_indicator_x:",
  ].join("|"),
  y: [
    "ﾘ|ｙ|Ｙ|🇾|🆈|🅨|🅈|𝞬|𝝲|𝜸|𝛾|𝛄|𝚢|𝚈|𝙮|𝙔|𝘺|𝘠|𝘆|𝗬|𝗒|𝖸|𝖞|𝖄|𝕪|𝕐|𝔶|𝔜|𝔂|𝓨|𝓎|𝒴|𝒚|𝒀|𝑦|𝑌|𝐲|𝐘|𐊲|ꭚ|ꓬ|ꐯ|ꌦ|ㄚ|Ⲩ|ⓨ|Ⓨ|⒴",
    "⅄|ℽ|Ὺ|Ῡ|Ῠ|Ὗ|Ὕ|Ὓ|Ὑ|ỿ|ỹ|Ỹ|ỷ|Ỷ|ỵ|Ỵ|ỳ|Ỳ|ẙ|ẏ|Ẏ|ᶌ|ᖻ|Ꮍ|Ꭹ|ყ|ฯ|ץ|վ|կ|Ӳ|Ӌ|ұ|ү|Ү|ч|у|У|Ў|ϔ|ϓ|ϒ|γ|Υ|Ύ|ˠ|ʸ|ʏ|ʎ|ɣ|Ɏ|Ƴ",
    "Ÿ|ŷ|Ŷ|ÿ|ý|Ý|¥|y|Y|:regional_indicator_y:",
  ].join("|"),
  z: [
    "ｚ|Ｚ|🇿|🆉|🅩|🅉|𝚣|𝚉|𝙯|𝙕|𝘻|𝘡|𝘇|𝗭|𝗓|𝖹|𝖟|𝖅|𝕫|𝔷|𝔃|𝓩|𝓏|𝒵|𝒛|𝒁|𝑧|𝑍|𝐳|𝐙|ꮓ|ꓜ|乙|Ⱬ|☡|ⓩ|Ⓩ|⒵|ℨ|ℤ|ẕ|Ẕ|ẓ|Ẓ|ẑ|Ẑ|ᶻ|ᴢ|ᙆ",
    "ᘔ|Ꮓ|ፚ|ຊ|չ|ζ|Ζ|ʑ|ʐ|ɀ|ȥ|ƹ|ƶ|Ƶ|ž|Ž|ż|Ż|ź|Ź|z|Z|:regional_indicator_z:",
  ].join("|"),
  " ": "\\s+", // multiple whitespace -> space
  ".": "．",
  ",": "，|‘",
  "?": "？",
};

const REPLACED_CHARS: Record<string, RegExp> = Array.from(Object.entries(REPLACED_CHARS_PATTERNS)).reduce(
  (obj, [to, from]) => {
    obj[to] = new RegExp(from, "gm");
    return obj;
  },
  {},
);

const NORMAL_CHARS_REGEX = /[a-z2689:.-_+()*&^%><;"'}{~,]+/gim;

function containsOnlyNormalChars(text: string) {
  const match = text.match(NORMAL_CHARS_REGEX);
  return match && match[0].length === text.length;
}

/**
 * Normalizes the input text to only lowercase ASCII letters and special characters
 */
export function normalizeText(text: string) {
  if (!containsOnlyNormalChars(text)) {
    for (const to in REPLACED_CHARS) {
      text = text.replace(REPLACED_CHARS[to], to);
    }
  }

  return stripMarks(text.toLowerCase());
}
