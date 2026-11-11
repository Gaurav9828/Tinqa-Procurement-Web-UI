/**
 * The courtesy check on messages people write to each other: support tickets, replies, close reasons, return notes.
 *
 * Mirror of the Ecommerce backend's `common/Decency.java`, which has the final say (it rejects the request with
 * OFFENSIVE_LANGUAGE). The same file is in the storefront (`src/utils/decency.ts`). Change all three together: the
 * word lists and the steps below must stay identical, and each copy's tests share the same examples.
 *
 * Whole words are compared, never parts of words, so "class", "assist", "Scunthorpe" or "flame retardant" pass.
 * A word is also caught when written with symbols for letters (sh1t, a$$), masked (f*ck), stretched (fuuuck),
 * spaced (f u c k), in Hinglish (chutiya) or in Devanagari.
 */

/** Shown under every message box. */
export const DECENCY_HINT =
  'Please keep your message polite and professional. Messages with offensive or abusive words can’t be sent.';

/** Shown when a message contains an offensive word. */
export const DECENCY_ERROR =
  'Please remove the offensive or abusive words and keep your message polite and professional.';

/** The error code the backend answers with. */
export const OFFENSIVE_LANGUAGE = 'OFFENSIVE_LANGUAGE';

/** Offensive as whole words only. */
const WORDS = [
  'arse', 'arsehole', 'ass', 'asses', 'asshole', 'assholes', 'bastard', 'bastards', 'bitch', 'bitches', 'bollocks',
  'boobs', 'bullshit', 'cock', 'cocks', 'cunt', 'cunts', 'dick', 'dickhead', 'dicks', 'dildo', 'douche', 'douchebag',
  'fag', 'faggot', 'fags', 'fuck', 'jackass', 'jerkoff', 'motherfucker', 'nigga', 'nigger', 'piss', 'porn', 'prick',
  'pussy', 'retard', 'retarded', 'retards', 'shit', 'shitty', 'slut', 'sluts', 'tits', 'twat', 'wanker', 'whore',
  // Hinglish
  'bakchod', 'bakchodi', 'behenchod', 'benchod', 'bhenchod', 'bhosadi', 'bhosdi', 'bhosdike', 'bhosdiwale', 'chinal',
  'chod', 'chodu', 'choot', 'chut', 'chutiya', 'chutiye', 'gaand', 'gaandu', 'gandu', 'harami', 'haramkhor', 'jhaat',
  'jhaatu', 'kamina', 'kamine', 'kutiya', 'kutti', 'laude', 'lauda', 'lavda', 'lodu', 'lund', 'madarchod', 'maderchod',
  'randi',
  // Devanagari
  'चूतिया', 'चुतिया', 'मादरचोद', 'बहनचोद', 'भेनचोद', 'भोसड़ी', 'भोसडी', 'भोसड़ीके', 'गांडू', 'गांड', 'लंड', 'लौड़ा', 'लोडू',
  'रंडी', 'हरामी', 'हरामखोर', 'कमीना', 'कमीने', 'कुतिया', 'झाटू', 'चिनाल', 'बकचोद',
];

/** Offensive wherever they appear in a word (fucking, motherfuckers, bhosdiwala). */
const STEMS = ['fuck', 'motherf', 'chutiy', 'madarchod', 'behenchod', 'bhenchod', 'bhosd', 'bakchod', 'चोद', 'चूतिय', 'चुतिय', 'भोसड'];

/** Offensive at the start of a word (shitty, bitching, whores). */
const PREFIXES = ['shit', 'bitch', 'bastard', 'asshole', 'cunt', 'whore', 'slut', 'wank', 'dickhead', 'faggot', 'nigg', 'jerkoff'];

/** Symbols written for letters. */
const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' };

/** Splits words: anything but letters, marks, digits and the symbols above (plus * for masking). */
const SEPARATOR = /[^\p{L}\p{M}\p{Nd}@$!*]+/u;
const LETTER = /\p{L}/u;

/**
 * Stretched words: runs of three or more of a letter shrunk to one and to two ("fuuuck" -> "fuck", "bullllshit" ->
 * "bullshit"). Double letters are left alone, so "boobs" or "choot" never become other words.
 */
const variants = (word: string): string[] => [word, word.replace(/(.)\1{2,}/gu, '$1'), word.replace(/(.)\1{2,}/gu, '$1$1')];

const WORD_SET = new Set(WORDS);

const isOffensiveWord = (word: string): boolean =>
  !!word &&
  variants(word).some(
    (w) => WORD_SET.has(w) || STEMS.some((stem) => w.includes(stem)) || PREFIXES.some((prefix) => w.startsWith(prefix)),
  );

/** One written word, ready to compare: lower case, symbols turned into letters, the rest dropped. */
const normalise = (raw: string): string => {
  const trimmed = raw.replace(/^[!*]+|[!*]+$/g, '');
  if (!LETTER.test(trimmed)) return '';
  return [...trimmed]
    .map((ch) => LEET[ch] ?? ch)
    .join('')
    .replace(/[^\p{L}\p{M}*]/gu, '');
};

/** A masked word (f*ck, s**t) matches an offensive word whose hidden letters fit the stars. */
const isMaskedOffensive = (word: string): boolean => {
  if (!word.includes('*') || word.replace(/\*/g, '').length < 2) return false;
  const pattern = new RegExp(`^${word.split(/\*+/).map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\p{L}+')}$`, 'u');
  return WORDS.some((w) => pattern.test(w));
};

/** True when the text contains an offensive or abusive word. */
export const containsOffensiveLanguage = (text: string | null | undefined): boolean => {
  if (!text) return false;
  const words = text.normalize('NFKC').toLowerCase().split(SEPARATOR).map(normalise).filter(Boolean);
  if (words.some((w) => (w.includes('*') ? isMaskedOffensive(w) : isOffensiveWord(w)))) return true;
  // Spaced-out letters ("f u c k"): runs of three or more single letters, joined, against words of 4+ letters
  let run = '';
  for (const w of [...words, '']) {
    if ([...w].length === 1 && w !== '*') {
      run += w;
      continue;
    }
    if ([...run].length >= 4 && isOffensiveWord(run)) return true;
    run = '';
  }
  return false;
};

/** The field error for a message box, or '' when the text is fine. */
export const decencyError = (text: string | null | undefined): string =>
  containsOffensiveLanguage(text) ? DECENCY_ERROR : '';
