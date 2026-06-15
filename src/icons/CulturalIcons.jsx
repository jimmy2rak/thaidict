export const IW = 1.5;

// 首页 — 黎明寺 Wat Arun (主塔 + 左右小塔 + 多层内部线)
export const Logo = ({ size = 28, color = "var(--c-p600)" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 主塔轮廓 */}
    <path d="M20 3 L18 9 L17 15 L15.5 21 L13.5 26 L11 30 L9 34.5 L31 34.5 L29 30 L26.5 26 L24.5 21 L23 15 L22 9 Z" />
    {/* 左侧小塔 */}
    <path d="M8 18 L6.5 24 L5 30 L3.5 34.5 L12.5 34.5 L11 30 L9.5 24 Z" />
    {/* 右侧小塔 */}
    <path d="M32 18 L30.5 24 L29 30 L27.5 34.5 L36.5 34.5 L35 30 L33.5 24 Z" />
    {/* 内部线条：4 条平台线 + 拱门 + 塔身窗纹 */}
    <line x1="15.5" y1="21" x2="24.5" y2="21" />
    <line x1="13.5" y1="26" x2="26.5" y2="26" />
    <line x1="11" y1="30" x2="29" y2="30" />
    <line x1="9" y1="34.5" x2="31" y2="34.5" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <circle cx="20" cy="16" r="1" />
    <path d="M18 34.5 L18 31.5 Q20 29.5 22 31.5 L22 34.5" />
  </svg>
);

// 单词本 — 贝叶经 Palm Leaf Manuscript (展开扇形 + 叶脉线)
export const PalmLeafBook = ({ size = 22, color = "var(--c-p600)" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 外轮廓：扇形展开 */}
    <path d="M7 9 Q20 3 33 9 L20 36 Z" />
    {/* 内部线条：2 条折叶纹 + 绳结 */}
    <line x1="13" y1="8" x2="20" y2="36" />
    <line x1="27" y1="8" x2="20" y2="36" />
    <circle cx="20" cy="35" r="1.5" />
  </svg>
);

// 学习 — 莲花油灯 Lotus Oil Lamp (火焰 + 灯碗 + 莲瓣弧)
export const LotusLamp = ({ size = 22, color = "var(--c-p600)" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 火焰 */}
    <path d="M20 3 Q18 8 18.5 12 L21.5 12 Q22 8 20 3 Z" />
    {/* 灯碗轮廓 */}
    <path d="M10 15 L30 15 L27 25 Q20 30 13 25 Z" />
    {/* 莲瓣底座 */}
    <path d="M14 34 Q17 32 20 34 Q23 32 26 34" />
  </svg>
);

// 我的 — 佛头 Buddha Head (圆润轮廓 + 宽眼距 + 小肉髻)
export const BuddhaHead = ({ size = 22, color = "var(--c-p600)" }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {/* 外轮廓：小肉髻 → 圆润额 → 耳 → 圆颊 → 下巴 */}
    <path d="M20 5 C22 5 22.5 6.5 22 8.5 C25 9.5 28 13 28.5 17 C29.5 21 28.5 25 26.5 28 C24.5 31 22 33 20 34 C18 33 15.5 31 13.5 28 C11.5 25 10.5 21 11.5 17 C12 13 15 9.5 18 8.5 C17.5 6.5 18 5 20 5 Z" />
    {/* 半闭眼（宽间距）+ 鼻梁 */}
    <path d="M13 19 Q15.5 21 17.5 19" />
    <path d="M22.5 19 Q24.5 21 27 19" />
    <line x1="20" y1="22" x2="20" y2="26" />
  </svg>
);
