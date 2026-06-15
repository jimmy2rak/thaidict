/* ── Global TTS utility using Web Speech API ── */

let _currentUtterance = null;

export const speak = (text, lang = "th-TH", rate = 0.9) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.rate = rate;
  _currentUtterance = utt;
  window.speechSynthesis.speak(utt);
};

export const stopSpeak = () => {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  _currentUtterance = null;
};
