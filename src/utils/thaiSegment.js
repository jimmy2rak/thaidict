/**
 * Thai word segmentation utility using longest-match algorithm.
 * Thai script doesn't use spaces between words, so we need a
 * dictionary-based approach to split sentences into per-word tokens.
 */

// ── Dictionary: common Thai words organized by category ──
const THAI_WORDS = [
  // ─ Pronouns ─
  "ฉัน","ผม","คุณ","เขา","เธอ","เรา","มัน","เอง","กัน","ผู้",
  // ─ Common verbs ─
  "เรียน","กิน","ไป","มา","ทำ","พูด","เห็น","รู้","อยู่","มี",
  "เป็น","ได้","ให้","ต้อง","ชอบ","อยาก","สามารถ","หา","ซื้อ","ขาย",
  "เขียน","อ่าน","นอน","ตื่น","วิ่ง","เดิน","ขับ","ร้อง","ฟัง","ดู",
  "สวด","ทำบุญ","ไหว้","กราบ","ช่วย","ส่ง","รับ","เลือก","ตัดสิน","คิด",
  "จำ","เข้า","ออก","เปิด","ปิด","รอ","รู้สึก","เชื่อ","จะ","ต้องการ",
  "พบ","ประสบ","เผชิญ","แน่นอน","เกิด","เติบโต","เจริญ","ร่วม","เลิก","เริ่ม",
  "เป็นไหร","ไหล","ไหม","ไร","ไป","ได้","ไหว","ไห้",
  // ─ Common nouns ─
  "ภาษา","คน","หนังสือ","บ้าน","รถ","ประเทศ","เมือง","น้ำ","ข้าว",
  "ปลา","ผลไม้","เพื่อน","ครู","อาจารย์","นักเรียน","โรงเรียน","มหาวิทยาลัย",
  "วัน","เดือน","ปี","เวลา","ชั่วโมง","นาที","เงิน","บาท","ดอลลาร์",
  "อาหาร","ชา","กาแฟ","นม","เสื้อ","รองเท้า","หมวก","กระเป๋า",
  "พระ","บุญ","กรรม","ธรรม","วัด","สงฆ์","พระสงฆ์","เจ้า","นาย",
  "หน้า","หัว","ตา","ปาก","มือ","เท้า","ใจ","กลาง","ท้อง","หลัง",
  "ขวา","ซ้าย","ต้น","ปลาย","ด้าน","ลำ","ตัว","ชีวิต","โลก","สังคม",
  "ที่","ถนน","สาย","ทาง","แม่น้ำ","ดิน","ฟ้า","อากาศ","แสง","เสียง",
  // ─ Buddhism / philosophy ─
  "สบโภ","ประทีป","สังควัตถุ","อนิจจัง","ทุกขัง","อนัตตา","ธรรมะ","นิพพาน",
  "สติ","ปัญญา","วิปัสสนา","สมาธิ","ศีล","ทาน","เมตตา","กรุณา",
  "มุทิตา","อุเบกขา","พรหมวิหาร",
  // ─ Adjectives / modifiers ─
  "มาก","น้อย","ดี","เลว","ใหญ่","เล็ก","สูง","ต่ำ","เร็ว","ช้า",
  "สวย","งาม","หนัก","เบา","ยาว","สั้น","ใกล้","ไกล","ร้อน","เย็น",
  "จริง","แท้","เดิม","ใหม่","เก่า","อื่น","เช่น","เดียว","เหมือน","ต่าง",
  "แล้ว","สุข","ทุกข์","สะอาด","สนุก","เศร้า","โกรธ","กลัว",
  // ─ Common function words ─
  "ไม่","จะ","ก็","ยัง","เพิ่ง","อีก","กำลัง","เคย","เลย","น่า",
  "ครับ","ค่ะ","นะ","น่ะ","นี่","นั่น","อ๋อ","โอ๊ย","ว้าย",
  // ─ Prepositions / conjunctions ─
  "ของ","ใน","บน","ใต้","ข้าง","ระหว่าง","ตาม","จาก","และ",
  "หรือ","แต่","เพราะ","ถ้า","เมื่อ","ว่า","เพื่อ","ตั้ง","แม้","ถึง",
  // ─ Time words ─
  "ทุก","วันนี้","พรุ่งนี้","เมื่อวาน","เดี๋ยว","เมื่อ","ก่อน","หลัง",
  "เช้า","กลางวัน","เย็น","ค่ำ","ตอน","ตลอด","เสมอ","ปัจจุบัน","อดีต","อนาคต",
  // ─ Numbers ─
  "หนึ่ง","สอง","สาม","สี่","ห้า","หก","เจ็ด","แปด","เก้า","สิบ",
  "ร้อย","พัน","หมื่น","แสน","ล้าน",
  // ─ Misc common ─
  "ไทย","จีน","อังกฤษ","ฝรั่งเศส","เยอรมัน","ญี่ปุ่น","เกาหลี","ลาว","เวียดนาม",
  "สวัสดี","ขอบคุณ","ขอโทษ","ช่วย","ยินดี","สบาย","เป็นไร",
  "สุขสันต์","มีความสุข","โชคดี","สำเร็จ","ประสบความสำเร็จ",
  "หมาย","ความหมาย","ความ","ว่า","อย่าง","เรื่อง","เหตุ","ผล","รูปแบบ",
  "อย่า","ให้","ตา","ทำไม","อะไร","ใคร","ที่ไหน","เมื่อไร","อย่างไร",
  "แค่","เท่านั้น","เกิน","พอ","ถึง","ผ่าน","ข้าม","เลย","ต่อ","นำ",
  "สำหรับ","ระบบ","วิธี","หนทาง","โอกาส","ความเป็นไป","เป็นไปได้",
  "จำนวน","ปริมาณ","รายการ","ข้อมูล","ค่า","อัตรา","สถิติ",
  "กล่าว","อ้าง","เรียก","นิยาม","บอก","แสดง","ระบุ","หมายถึง",
  "โดย","ซึ่ง","อัน","ที่","ๆ","ฯ",
];

// Build the Set for fast lookup
const DICT_SET = new Set(THAI_WORDS);
const MAX_WORD_LEN = 20;

/**
 * Segment Thai text into per-word tokens using longest-match algorithm.
 * Falls back to syllable-like chunking for unknown sequences.
 *
 * @param {string} text - Thai text to segment
 * @returns {Array<{text: string, pos: string, meaning: string}>}
 */
export function thaiSegment(text) {
  if (!text || typeof text !== "string") return [];
  const results = [];

  // Split on spaces/punctuation first, then segment each chunk
  const chunks = text.split(/[\s\u0E3F\u0E4F\u0E5A\u0E5B.,;:!?\-(){}[\]]+/).filter(Boolean);

  for (const chunk of chunks) {
    let remaining = chunk;
    while (remaining.length > 0) {
      // Try longest dictionary match
      let matched = false;
      for (let len = Math.min(remaining.length, MAX_WORD_LEN); len >= 2; len--) {
        const candidate = remaining.slice(0, len);
        if (DICT_SET.has(candidate)) {
          results.push({ text: candidate, pos: "", meaning: "" });
          remaining = remaining.slice(len);
          matched = true;
          break;
        }
      }
      if (matched) continue;

      // No dictionary match — use Thai syllable heuristic
      const first = remaining[0];
      const isLeadingVowel = /^[เแโใไ]/.test(first);
      let syllableLen = 0;
      let i = 0;

      if (isLeadingVowel) {
        // Pattern: leading vowel + consonant [+ vowel/tone/final consonant]
        syllableLen = 1; i = 1; // take leading vowel
        if (i < remaining.length && /^[\u0E01-\u0E2E]/.test(remaining[i])) {
          syllableLen++; i++; // take initial consonant
        } else {
          // Leading vowel alone — unlikely as a word, take it
          results.push({ text: remaining.slice(0, 1), pos: "", meaning: "" });
          remaining = remaining.slice(1);
          continue;
        }
        // Extend through vowel signs, tone marks, sara-am, final consonant
        while (i < remaining.length) {
          const ch = remaining[i];
          // Dependent vowel signs
          if (/^[\u0E30-\u0E39\u0E47\u0E31]$/.test(ch)) { syllableLen++; i++; continue; }
          // Tone marks
          if (/^[\u0E48-\u0E4B]$/.test(ch)) { syllableLen++; i++; continue; }
          // sara-am (ำ)
          if (ch === "\u0E33") { syllableLen++; i++; continue; }
          // Final consonant — end of syllable
          if (/^[\u0E01-\u0E2E]$/.test(ch)) { syllableLen++; i++; break; }
          // Any other character — end syllable here
          break;
        }
      } else if (/^[\u0E01-\u0E2E]/.test(first)) {
        // Pattern: consonant [+ vowel/tone/final consonant]
        syllableLen = 1; i = 1; // take initial consonant
        // Extend through vowel signs, tone marks, sara-am, final consonant
        while (i < remaining.length) {
          const ch = remaining[i];
          // Dependent vowel signs
          if (/^[\u0E30-\u0E39\u0E47\u0E31]$/.test(ch)) { syllableLen++; i++; continue; }
          // Tone marks
          if (/^[\u0E48-\u0E4B]$/.test(ch)) { syllableLen++; i++; continue; }
          // sara-am (ำ)
          if (ch === "\u0E33") { syllableLen++; i++; continue; }
          // Final consonant
          if (/^[\u0E01-\u0E2E]$/.test(ch)) {
            // Check if next char starts a new syllable
            const nextCh = remaining[i + 1];
            const nextIsNewSyllable = nextCh && /^[\u0E01-\u0E2Eเแโใไ]$/.test(nextCh);
            syllableLen++; i++;
            if (nextIsNewSyllable) break;
            // If next char is a vowel/tone sign, this consonant is NOT final
            if (nextCh && /^[\u0E30-\u0E39\u0E47\u0E31\u0E48-\u0E4B\u0E33]$/.test(nextCh)) continue;
            // Otherwise, this consonant is likely a final consonant
            break;
          }
          // Any other character — end syllable
          break;
        }
      } else {
        // Non-Thai character (Latin, number, etc.) — take 1 char
        syllableLen = 1;
      }

      // Minimum length 1, cap at 8
      syllableLen = Math.max(syllableLen, 1);
      syllableLen = Math.min(syllableLen, 8, remaining.length);

      results.push({ text: remaining.slice(0, syllableLen), pos: "", meaning: "" });
      remaining = remaining.slice(syllableLen);
    }
  }

  return results;
}
