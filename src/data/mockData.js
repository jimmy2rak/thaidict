import { BookOpen, PenTool } from "lucide-react";

export const dailyWord = {
  zh: "\u5B66\u4E60", th: "\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49",
  pinyin: "xu\u00e9x\u00ed", phonetic: "riian-r\u00f9",
  pos: "v.", def: "\u901A\u8FC7\u7EC3\u4E60\u83B7\u5F97\u77E5\u8BC6\u6216\u6280\u80FD",
  defTh: "\u0E2D\u0E48\u0E32\u0E19\u0E2B\u0E19\u0E31\u0E07\u0E2A\u0E37\u0E2D\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E43\u0E2B\u0E49\u0E44\u0E14\u0E49\u0E04\u0E27\u0E32\u0E21\u0E23\u0E39\u0E49",
  exZh: "\u6211\u6BCF\u5929\u90FD\u5728\u5B66\u4E60\u6CF0\u8BED\u3002",
  exTh: "\u0E09\u0E31\u0E19\u0E40\u0E23\u0E35\u0E22\u0E19\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22\u0E17\u0E38\u0E01\u0E27\u0E31\u0E19",
};

export const recentWords = [
  { zh: "\u4F60\u597D", th: "\u0E2A\u0E27\u0E31\u0E2A\u0E14\u0E35", phonetic: "sa-w\u00e0t-dii", time: "10\u5206\u949F\u524D" },
  { zh: "\u8C22\u8C22", th: "\u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13", phonetic: "k\u0E14\u002E\u0011p-kun", time: "25\u5206\u949F\u524D" },
  { zh: "\u670B\u53CB", th: "\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E19", phonetic: "p\u00eE\u00EAn", time: "1\u5C0F\u65F6\u524D" },
  { zh: "\u5B66\u6821", th: "\u0E42\u0E23\u0E07\u0E40\u0E23\u0E35\u0E22\u0E19", phonetic: "roong-riian", time: "2\u5C0F\u65F6\u524D" },
  { zh: "\u5403\u996D", th: "\u0E01\u0E34\u0E19\u0E02\u0E49\u0E32\u0E27", phonetic: "gin-k\u00e2ao", time: "\u6628\u5929" },
];

export const wordDetail = {
  word: "\u0E01\u0E34\u0E19",
  romanization: "gin",
  romanization_source: "deepseek",
  sources: ["src_words_th", "src_words_volubilis", "src_words_orst"],
  sense_count: 3,
  senses: [
    {
      sense_id: 1, pos: "\u52A8\u8BCD", meaning: "\u5403\uFF1B\u98DF\u7528",
      register: "\u901A\u7528",
      examples: [
        { th: "\u0E09\u0E31\u0E19\u0E01\u0E34\u0E19\u0E02\u0E49\u0E32\u0E27\u0E41\u0E25\u0E49\u0E27", zh: "\u6211\u5DF2\u7ECF\u5403\u8FC7\u996D\u4E86" },
        { th: "\u0E01\u0E34\u0E19\u0E1C\u0E25\u0E44\u0E21\u0E49\u0E17\u0E38\u0E01\u0E27\u0E31\u0E19\u0E14\u0E35\u0E15\u0E48\u0E2D\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E", zh: "\u6BCF\u5929\u5403\u6C34\u679C\u6709\u76CA\u5065\u5EB7" },
      ],
      segmented: [
        [
          { text: "\u0E09\u0E31\u0E19", pos: "\u4EE3\u8BCD", meaning: "\u6211" },
          { text: "\u0E01\u0E34\u0E19", pos: "\u52A8\u8BCD", meaning: "\u5403" },
          { text: "\u0E02\u0E49\u0E32\u0E27", pos: "\u540D\u8BCD", meaning: "\u7C73\u996D" },
          { text: "\u0E41\u0E25\u0E49\u0E27", pos: "\u52A9\u8BCD", meaning: "\u5DF2\u7ECF" },
        ],
        [
          { text: "\u0E01\u0E34\u0E19", pos: "\u52A8\u8BCD", meaning: "\u5403" },
          { text: "\u0E1C\u0E25\u0E44\u0E21\u0E49", pos: "\u540D\u8BCD", meaning: "\u6C34\u679C" },
          { text: "\u0E17\u0E38\u0E01\u0E27\u0E31\u0E19", pos: "\u526F\u8BCD", meaning: "\u6BCF\u5929" },
          { text: "\u0E14\u0E35", pos: "\u5F62\u5BB9\u8BCD", meaning: "\u597D" },
          { text: "\u0E15\u0E48\u0E2D", pos: "\u4ECB\u8BCD", meaning: "\u5BF9/\u5BF9\u4E8E" },
          { text: "\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E", pos: "\u540D\u8BCD", meaning: "\u5065\u5EB7" },
        ],
      ],
      source: "ai",
    },
    {
      sense_id: 2, pos: "\u52A8\u8BCD", meaning: "\u559D\uFF08\u9152\uFF09\uFF0C\u996E\u9152",
      register: "\u53E3\u8BED",
      examples: [
        { th: "\u0E44\u0E1B\u0E01\u0E34\u0E19\u0E40\u0E2B\u0E25\u0E49\u0E32\u0E44\u0E2B\u0E21", zh: "\u53BB\u559D\u9152\u5417\uFF1F" },
      ],
      segmented: [
        [
          { text: "\u0E44\u0E1B", pos: "\u52A8\u8BCD", meaning: "\u53BB" },
          { text: "\u0E01\u0E34\u0E19", pos: "\u52A8\u8BCD", meaning: "\u559D" },
          { text: "\u0E40\u0E2B\u0E25\u0E49\u0E32", pos: "\u540D\u8BCD", meaning: "\u9152" },
          { text: "\u0E44\u0E2B\u0E21", pos: "\u52A9\u8BCD", meaning: "\u5417" },
        ],
      ],
      source: "ai",
    },
    {
      sense_id: 3, pos: "\u52A8\u8BCD", meaning: "\u8150\u8680\uFF1B\u4FB5\u8680",
      register: "\u4E66\u9762",
      examples: [
        { th: "\u0E01\u0E23\u0E14\u0E01\u0E34\u0E19\u0E40\u0E2B\u0E25\u0E47\u0E01", zh: "\u9178\u8150\u8680\u94C1" },
      ],
      segmented: [
        [
          { text: "\u0E01\u0E23\u0E14", pos: "\u540D\u8BCD", meaning: "\u9178" },
          { text: "\u0E01\u0E34\u0E19", pos: "\u52A8\u8BCD", meaning: "\u8150\u8680" },
          { text: "\u0E40\u0E2B\u0E25\u0E47\u0E01", pos: "\u540D\u8BCD", meaning: "\u94C1" },
        ],
      ],
      source: "user",
    },
  ],
  freq_tnc: 351980,
  freq_ttc: 46567,
  freq_phupha: 816073594,
  synonyms: [
    { word: "\u0E17\u0E32\u0E19", zh: "\u5403\uFF08\u793C\u8C8C\uFF09" },
    { word: "\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E17\u0E32\u0E19", zh: "\u7528\u9910\uFF08\u6B63\u5F0F\uFF09" },
  ],
  antonyms: [
    { word: "\u0E2D\u0E14", zh: "\u7981\u98DF" },
  ],
  learner_associations: [
    { word: "\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E17\u0E32\u0E19", note: "\u66F4\u6B63\u5F0F\u7684\u201C\u5403\u201D\uFF0C\u4E66\u9762\u8BED\u548C\u6B63\u5F0F\u573A\u5408\u4F7F\u7528" },
    { word: "\u0E02\u0E49\u0E32\u0E27", note: "\u7C73\u996D\uFF0C\u5403+\u0E02\u0E49\u0E32\u0E27 = \u5403\u996D\uFF0C\u6700\u5E38\u7528\u642D\u914D" },
    { word: "\u0E2B\u0E34\u0E27", note: "\u997F\uFF0C\u0E2B\u0E34\u0E27\u0E02\u0E49\u0E32\u0E27 = \u997F\u4E86\uFF08\u60F3\u5403\u996D\uFF09" },
    { word: "\u0E2D\u0E34\u0E48\u0E21", note: "\u9971\uFF0C\u0E01\u0E34\u0E19\u0E2D\u0E34\u0E48\u0E21 = \u5403\u9971\u4E86" },
  ],
  user_sentence_count: 3,
};

export const wordBooks = [
  { name: "\u6CF0\u8BED\u521D\u7EA7 500\u8BCD", count: 500, learned: 287, color: "var(--c-teal)" },
  { name: "\u65E5\u5E38\u4F1A\u8BDD 300\u53E5", count: 300, learned: 124, color: "var(--c-rose)" },
  { name: "\u65C5\u884C\u6CF0\u8BED\u5FC5\u5907", count: 80, learned: 62, color: "var(--c-amber)" },
  { name: "\u5546\u52A1\u6CF0\u8BED\u6838\u5FC3", count: 200, learned: 45, color: "var(--c-gold)" },
];

export const exercises = [
  { name: "\u9605\u8BFB\u7406\u89E3", desc: "\u6CF0\u6587\u9605\u8BFB", count: 18, icon: BookOpen, color: "var(--c-rose)" },
  { name: "\u5199\u4F5C\u7EC3\u4E60", desc: "\u9020\u53E5\u586B\u7A7A", count: 12, icon: PenTool, color: "var(--c-gold)" },
];

export const weekDays = ["\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D", "\u65E5"];
export const weekDone = [true, true, true, true, false, false, false];

export const vocabGrowth = [
  { month: "1\u6708", total: 320, new: 45 },
  { month: "2\u6708", total: 378, new: 58 },
  { month: "3\u6708", total: 445, new: 67 },
  { month: "4\u6708", total: 530, new: 85 },
  { month: "5\u6708", total: 612, new: 82 },
  { month: "6\u6708", total: 680, new: 68 },
];

export const studyTimeData = [
  { day: "\u5468\u4E00", mins: 45 }, { day: "\u5468\u4E8C", mins: 30 },
  { day: "\u5468\u4E09", mins: 60 }, { day: "\u5468\u56DB", mins: 25 },
  { day: "\u5468\u4E94", mins: 50 }, { day: "\u5468\u516D", mins: 15 },
  { day: "\u5468\u65E5", mins: 40 },
];

export const pieData = [
  { name: "\u5DF2\u638C\u63E1", value: 342, color: "var(--c-ok)" },
  { name: "\u5B66\u4E60\u4E2D", value: 198, color: "var(--c-gold)" },
  { name: "\u672A\u5B66", value: 140, color: "var(--c-p200)" },
];

export const morphExamples = [
  { char: "\u0E40\u0E23\u0E35\u0E22\u0E19", meaning: "\u5B66\u4E60", compounds: ["\u0E19\u0E31\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19 (\u5B66\u751F)", "\u0E23\u0E2D\u0E14\u0E40\u0E23\u0E35\u0E22\u0E19 (\u8BFE\u7A0B)", "\u0E40\u0E23\u0E35\u0E22\u0E19\u0E23\u0E39\u0E49 (\u5B66\u4E60)"] },
  { char: "\u0E01\u0E34\u0E19", meaning: "\u5403", compounds: ["\u0E01\u0E34\u0E19\u0E02\u0E49\u0E32\u0E27 (\u5403\u996D)", "\u0E01\u0E34\u0E19\u0E19\u0E49\u0E33 (\u559D\u6C34)", "\u0E01\u0E34\u0E19\u0E1B\u0E25\u0E32 (\u5403\u9C7C)"] },
  { char: "\u0E2B\u0E49\u0E2D\u0E07", meaning: "\u623F\u95F4", compounds: ["\u0E2B\u0E49\u0E2D\u0E07\u0E2A\u0E21\u0E38\u0E14 (\u56FE\u4E66\u9986)", "\u0E2B\u0E49\u0E2D\u0E07\u0E19\u0E2D\u0E19 (\u5367\u5BA4)", "\u0E2B\u0E49\u0E2D\u0E07\u0E04\u0E23\u0E31\u0E27 (\u5BA2\u5385)"] },
];

export const grammarPatterns = [
  { pattern: "\u4E3B\u8BED + \u0E21\u0E35 + \u5BBE\u8BED", example: "\u0E09\u0E31\u0E19\u0E21\u0E35\u0E2B\u0E19\u0E31\u0E07\u0E2A\u0E37\u0E2D", zh: "\u6211\u6709\u4E66" },
  { pattern: "\u4E3B\u8BED + \u0E2D\u0E22\u0E32\u0E01 + \u52A8\u8BCD", example: "\u0E09\u0E31\u0E19\u0E2D\u0E22\u0E32\u0E01\u0E40\u0E23\u0E35\u0E22\u0E19\u0E20\u0E32\u0E29\u0E32\u0E44\u0E17\u0E22", zh: "\u6211\u60F3\u5B66\u6CF0\u8BED" },
  { pattern: "\u4E3B\u8BED + \u0E01\u0E33\u0E25\u0E31\u0E07 + \u52A8\u8BCD", example: "\u0E40\u0E02\u0E32\u0E01\u0E33\u0E25\u0E31\u0E07\u0E01\u0E34\u0E19\u0E02\u0E49\u0E32\u0E27", zh: "\u4ED6\u6B63\u5728\u5403\u996D" },
];

export const heatmapLevels = [0,1,2,3,4,2,1,0,3,4,2,1,3,0,4,2,3,1,0,2,4,3,1,2,0,3,4,2,1,3,0,2,4,3,1];
