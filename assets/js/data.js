/* ============ 数据：字母表 / 单词库 / 句子库 ============ */
window.DATA = {};

/* 26 个字母自然拼读（内容与用户提供的参考图表一致，元音红标） */
DATA.letters = [
  { i: 1,  L: "Aa", vowel: true,  phon: "[eɪ]",       sound: "[æ]",   hint: "哎" },
  { i: 2,  L: "Bb", vowel: false, phon: "[bi:]",      sound: "[b]",   hint: "播" },
  { i: 3,  L: "Cc", vowel: false, phon: "[si:]",      sound: "[k]",   hint: "科" },
  { i: 4,  L: "Dd", vowel: false, phon: "[di:]",      sound: "[d]",   hint: "的" },
  { i: 5,  L: "Ee", vowel: true,  phon: "[i:]",       sound: "[e]",   hint: "矮" },
  { i: 6,  L: "Ff", vowel: false, phon: "[ef]",       sound: "[f]",   hint: "扶" },
  { i: 7,  L: "Gg", vowel: false, phon: "[dʒi:]",     sound: "[g]",   hint: "哥" },
  { i: 8,  L: "Hh", vowel: false, phon: "[eɪtʃ]",     sound: "[h]",   hint: "喝" },
  { i: 9,  L: "Ii", vowel: true,  phon: "[aɪ]",       sound: "[ɪ]",   hint: "诶" },
  { i: 10, L: "Jj", vowel: false, phon: "[dʒeɪ]",     sound: "[dʒ]",  hint: "汁" },
  { i: 11, L: "Kk", vowel: false, phon: "[keɪ]",      sound: "[k]",   hint: "科" },
  { i: 12, L: "Ll", vowel: false, phon: "[el]",       sound: "[l]",   hint: "了" },
  { i: 13, L: "Mm", vowel: false, phon: "[em]",       sound: "[m]",   hint: "么" },
  { i: 14, L: "Nn", vowel: false, phon: "[en]",       sound: "[n]",   hint: "呢" },
  { i: 15, L: "Oo", vowel: true,  phon: "[əʊ]",       sound: "[ɒ]",   hint: "哦" },
  { i: 16, L: "Pp", vowel: false, phon: "[pi:]",      sound: "[p]",   hint: "泼" },
  { i: 17, L: "Qq", vowel: false, phon: "[kju:]",     sound: "[kw]",  hint: "扩" },
  { i: 18, L: "Rr", vowel: false, phon: "[a:(r)]",    sound: "[r]",   hint: "弱" },
  { i: 19, L: "Ss", vowel: false, phon: "[es]",       sound: "[s]",   hint: "丝" },
  { i: 20, L: "Tt", vowel: false, phon: "[ti:]",      sound: "[t]",   hint: "特" },
  { i: 21, L: "Uu", vowel: true,  phon: "[ju:]",      sound: "[ʌ]",   hint: "阿" },
  { i: 22, L: "Vv", vowel: false, phon: "[vi:]",      sound: "[v]",   hint: "吴" },
  { i: 23, L: "Ww", vowel: false, phon: "['dʌblju:]", sound: "[w]",   hint: "我" },
  { i: 24, L: "Xx", vowel: false, phon: "[eks]",      sound: "[ks]",  hint: "科斯" },
  { i: 25, L: "Yy", vowel: false, phon: "[waɪ]",      sound: "[j]",   hint: "耶" },
  { i: 26, L: "Zz", vowel: false, phon: "[zi:]",      sound: "[z]",   hint: "自" }
];

/* 三年级英语单词（人教版三起点常见词汇，按主题分类） */
DATA.words = {
  "动物": [
    { w: "cat", z: "猫" }, { w: "dog", z: "狗" }, { w: "pig", z: "猪" },
    { w: "duck", z: "鸭子" }, { w: "panda", z: "熊猫" }, { w: "monkey", z: "猴子" },
    { w: "bird", z: "鸟" }, { w: "bear", z: "熊" }, { w: "elephant", z: "大象" },
    { w: "tiger", z: "老虎" }, { w: "lion", z: "狮子" }, { w: "rabbit", z: "兔子" }
  ],
  "颜色": [
    { w: "red", z: "红色" }, { w: "blue", z: "蓝色" }, { w: "green", z: "绿色" },
    { w: "yellow", z: "黄色" }, { w: "black", z: "黑色" }, { w: "white", z: "白色" },
    { w: "orange", z: "橙色" }, { w: "brown", z: "棕色" }, { w: "purple", z: "紫色" },
    { w: "pink", z: "粉色" }
  ],
  "数字": [
    { w: "one", z: "一" }, { w: "two", z: "二" }, { w: "three", z: "三" },
    { w: "four", z: "四" }, { w: "five", z: "五" }, { w: "six", z: "六" },
    { w: "seven", z: "七" }, { w: "eight", z: "八" }, { w: "nine", z: "九" },
    { w: "ten", z: "十" }, { w: "eleven", z: "十一" }, { w: "twelve", z: "十二" }
  ],
  "水果食物": [
    { w: "apple", z: "苹果" }, { w: "banana", z: "香蕉" }, { w: "orange", z: "橙子" },
    { w: "pear", z: "梨" }, { w: "grape", z: "葡萄" }, { w: "watermelon", z: "西瓜" },
    { w: "bread", z: "面包" }, { w: "rice", z: "米饭" }, { w: "noodles", z: "面条" },
    { w: "egg", z: "鸡蛋" }, { w: "milk", z: "牛奶" }, { w: "juice", z: "果汁" }
  ],
  "文具": [
    { w: "pen", z: "钢笔" }, { w: "pencil", z: "铅笔" }, { w: "ruler", z: "尺子" },
    { w: "eraser", z: "橡皮" }, { w: "book", z: "书" }, { w: "bag", z: "书包" },
    { w: "crayon", z: "蜡笔" }, { w: "school", z: "学校" }, { w: "classroom", z: "教室" }
  ],
  "身体": [
    { w: "head", z: "头" }, { w: "eye", z: "眼睛" }, { w: "ear", z: "耳朵" },
    { w: "nose", z: "鼻子" }, { w: "mouth", z: "嘴巴" }, { w: "face", z: "脸" },
    { w: "hand", z: "手" }, { w: "arm", z: "手臂" }, { w: "leg", z: "腿" },
    { w: "foot", z: "脚" }
  ],
  "家人": [
    { w: "father", z: "爸爸" }, { w: "mother", z: "妈妈" }, { w: "brother", z: "兄/弟" },
    { w: "sister", z: "姐/妹" }, { w: "grandpa", z: "爷爷/外公" }, { w: "grandma", z: "奶奶/外婆" },
    { w: "family", z: "家庭" }, { w: "friend", z: "朋友" }
  ],
  "天气": [
    { w: "sunny", z: "晴朗的" }, { w: "rainy", z: "下雨的" }, { w: "cloudy", z: "多云的" },
    { w: "windy", z: "有风的" }, { w: "snowy", z: "下雪的" }, { w: "hot", z: "热的" },
    { w: "cold", z: "冷的" }, { w: "warm", z: "温暖的" }, { w: "cool", z: "凉爽的" }
  ]
};

/* 三年级常用句子 */
DATA.sentences = [
  { s: "Hello! I'm Li Ming.", z: "你好！我是李明。" },
  { s: "Good morning, teacher!", z: "老师，早上好！" },
  { s: "Nice to meet you.", z: "很高兴认识你。" },
  { s: "How are you? I'm fine, thank you.", z: "你好吗？我很好，谢谢。" },
  { s: "What's your name? My name is Amy.", z: "你叫什么名字？我叫艾米。" },
  { s: "This is my friend.", z: "这是我的朋友。" },
  { s: "I like apples very much.", z: "我非常喜欢苹果。" },
  { s: "Can I have some water, please?", z: "请给我一些水好吗？" },
  { s: "Let's go to school together.", z: "我们一起去上学吧。" },
  { s: "What color is it? It's red.", z: "它是什么颜色？它是红色的。" },
  { s: "How old are you? I'm nine years old.", z: "你几岁了？我九岁了。" },
  { s: "Where is my pencil? It's on the desk.", z: "我的铅笔在哪？在桌子上。" },
  { s: "Thank you! You're welcome.", z: "谢谢你！不客气。" },
  { s: "Goodbye! See you tomorrow!", z: "再见！明天见！" }
];

/* 主题配置 */
DATA.themes = [
  { id: "puppy",  name: "汪汪救援队", desc: "勇敢小狗救援队，一起出发！", img: "assets/img/themes/puppy.png" },
  { id: "nezha",  name: "国风小哪吒", desc: "脚踏风火轮，我命由我不由天！", img: "assets/img/themes/nezha.png" },
  { id: "plane",  name: "飞机小英雄", desc: "彩色小飞机，环游全世界！", img: "assets/img/themes/plane.png" },
  { id: "pig",    name: "超人小猪侠", desc: "披风一甩，超人登场！", img: "assets/img/themes/pig.png" },
  { id: "castle", name: "梦幻大城堡", desc: "星光烟花，童话之夜！", img: "assets/img/themes/castle.png" },
  { id: "candy",  name: "星空糖果屋", desc: "甜甜的世界，甜甜的你！", img: "assets/img/themes/candy.png" }
];
