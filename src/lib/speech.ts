'use client';

/* ---------------------------- Speech synthesis --------------------------- */

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Turn rendered markdown into clean prose for reading aloud without annoying syntax characters */
export function stripMarkdown(md: string): string {
  let t = md;
  t = t.replace(/```[\s\S]*?```/g, ' '); // fenced code
  t = t.replace(/`([^`]+)`/g, '$1'); // inline code
  t = t.replace(/\$\$[\s\S]*?\$\$/g, ' '); // block math
  t = t.replace(/\$([^$]+)\$/g, '$1'); // inline math
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' '); // images
  t = t.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'); // links -> text
  t = t.replace(/^\s{0,3}#{1,6}\s+/gm, ''); // headings
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/\*([^*]+)\*/g, '$1');
  t = t.replace(/__([^_]+)__/g, '$1');
  t = t.replace(/_([^_]+)_/g, '$1');
  t = t.replace(/^\s{0,3}>\s?/gm, ''); // blockquotes
  t = t.replace(/^\s*[-*+]\s+/gm, ''); // bullets
  t = t.replace(/^\s*\d+\.\s+/gm, ''); // numbered lists
  t = t.replace(/^\s*\|.*\|\s*$/gm, (row) =>
    row
      .split('|')
      .map((c) => c.trim())
      .filter((c) => c && !/^:?-{2,}:?$/.test(c))
      .join(', ')
  ); // tables -> comma list
  t = t.replace(/^[-|: ]{3,}$/gm, '');
  t = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, ' '); // emoji
  t = t.replace(/\n{2,}/g, '. ');
  t = t.replace(/\s+/g, ' ');
  return t.trim();
}

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null;
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const preferred =
    voices.find(
      (v) =>
        /natural|neural|google|aria|jenny|samantha|zira/i.test(v.name) &&
        v.lang.startsWith('en')
    ) ||
    voices.find((v) => v.lang === 'en-US' || v.lang === 'en-GB' || v.lang === 'en-IN') ||
    voices.find((v) => v.lang.startsWith('en')) ||
    voices[0];
  cachedVoice = preferred ?? null;
  return cachedVoice;
}

/** Warm the voice list (browser loads asynchronously) */
export function primeVoices(): void {
  if (!isSpeechSynthesisSupported()) return;
  pickVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    pickVoice();
  };
}

export function cancelSpeech(): void {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
  onEnd?: () => void;
  onError?: () => void;
}

/** Returns false when speech synthesis is unsupported or text is empty */
export function speakText(text: string, opts: SpeakOptions = {}): boolean {
  if (!isSpeechSynthesisSupported()) return false;
  const clean = stripMarkdown(text).slice(0, 6000);
  if (!clean) return false;

  const synth = window.speechSynthesis;
  cancelSpeech();

  const u = new SpeechSynthesisUtterance(clean);
  u.rate = opts.rate ?? 1.0;
  u.pitch = opts.pitch ?? 1.0;
  if (opts.lang) u.lang = opts.lang;

  const voice = pickVoice();
  if (voice) {
    u.voice = voice;
    if (!opts.lang) u.lang = voice.lang;
  }

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    opts.onEnd?.();
  };

  u.onend = finish;
  u.onerror = () => {
    if (done) return;
    done = true;
    opts.onError?.();
    opts.onEnd?.();
  };

  // Tiny delay fixes Chrome dropping the first utterance
  setTimeout(() => synth.speak(u), 35);
  return true;
}
