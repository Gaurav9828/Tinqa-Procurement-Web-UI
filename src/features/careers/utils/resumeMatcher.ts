import type { MatchLabel, MatchOpening, MatchRequest } from '../types/careers.types';
import { DEGREE_SYNONYMS, SKILL_SYNONYMS } from './skillSynonyms';

/**
 * Résumé match (docs/careers.md › Résumé match): a deterministic, explainable comparison of a résumé's text with the
 * opening, run in the browser. Nothing leaves it except the result, saved with POST /applications/{id}/match.
 *
 * Parts and weights: skills found 50 %, requirement keywords covered 25 %, experience in range 15 %, education 5 %,
 * nice-to-haves 5 %. A part the opening doesn't list (no skills, no education…) is left out and the others are
 * weighted up, so an opening is never scored on what it didn't ask for. Labels: STRONG ≥ 70, WEAK 40–69, NONE < 40.
 *
 * Bump MATCHER_VERSION whenever a change here could change a score: stored results of older versions are then
 * computed again the next time an application is opened.
 */
export const MATCHER_VERSION = 1;

export const NO_TEXT_MESSAGE = 'Résumé has no readable text — review manually';

export const WEIGHTS = { skills: 50, requirements: 25, experience: 15, education: 5, niceToHave: 5 } as const;
export type MatchPart = keyof typeof WEIGHTS;

export type ExperienceFit = 'IN_RANGE' | 'BELOW' | 'ABOVE' | 'UNKNOWN';

export interface ExperienceResult {
  /** Years used for the fit, one decimal; null when neither stated nor found in the résumé. */
  years: number | null;
  source: 'stated' | 'resume' | 'unknown';
  min: number;
  max: number | null;
  fit: ExperienceFit;
  /** 0..1 */
  score: number;
  text: string;
}

export interface PartResult {
  /** 0..1 */
  score: number;
  weight: number;
  /** Whether the opening lists this part at all. */
  applies: boolean;
  /** One line: what was found, e.g. "3 of 4 requirements covered". */
  detail: string;
}

export interface MatchResult {
  label: MatchLabel;
  /** 0..100 */
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
  experience: ExperienceResult;
  parts: Record<MatchPart, PartResult>;
}

// ---------- text ----------

/** Lower case, symbols to spaces, with the few symbols that are part of a skill's name kept as words. */
export const normaliseText = (text: string): string => {
  const words = text
    .toLowerCase()
    .replace(/c\+\+/g, ' cpp ')
    .replace(/c#/g, ' csharp ')
    .replace(/\.net\b/g, ' dotnet ')
    .replace(/node\.js/g, ' nodejs ')
    .replace(/gd\s*&\s*t/g, ' gdt ')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return words ? ` ${words} ` : ' ';
};

/** A whole-word (or whole-phrase) check on normalised text. */
const hasPhrase = (normalised: string, phrase: string): boolean => normalised.includes(` ${phrase} `);

const STOPWORDS = new Set(
  (
    'and or the with for of in on to an as at be is are by from good strong knowledge experience years year yrs ability ' +
    'able work working must should have has having understanding skills skill basic hands proficient proficiency familiar ' +
    'familiarity plus preferred minimum least using use etc well excellent team candidate required requirement including ' +
    'like such other various related relevant field based into will can who that this your our you we within across new ' +
    'high level any all per day days month months good very also more than less only one two three both their them its ' +
    'it not get make sure ensure handle handling'
  ).split(' ')
);

/** "machines" and "machine" are the same word for this purpose. */
const stem = (word: string): string => (word.length > 4 && word.endsWith('s') && !word.endsWith('ss') ? word.slice(0, -1) : word);

const wordSet = (normalised: string): Set<string> => new Set(normalised.trim().split(' ').filter(Boolean).map(stem));

// ---------- skills ----------

/** The synonym group of a skill as an opening names it, or null when it has none. */
export const skillGroup = (skill: string): readonly string[] | null => {
  const key = normaliseText(skill).trim();
  if (!key) return null;
  if (SKILL_SYNONYMS[key]) return SKILL_SYNONYMS[key];
  const entry = Object.entries(SKILL_SYNONYMS).find(([, aliases]) => aliases.includes(key));
  return entry ? entry[1] : null;
};

/** Whether the résumé (normalised) shows the skill, under its own name or any synonym. */
export const resumeHasSkill = (normalisedResume: string, skill: string): boolean => {
  const key = normaliseText(skill).trim();
  if (!key) return false;
  const aliases = skillGroup(skill) ?? [key];
  return aliases.some((alias) => hasPhrase(normalisedResume, alias)) || hasPhrase(normalisedResume, key);
};

const uniqueSkills = (skills: string[]): string[] => {
  const seen = new Set<string>();
  return skills.filter((skill) => {
    const key = normaliseText(skill).trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ---------- keyword coverage (requirements, nice-to-haves) ----------

/** The known skills a line names, and its other meaningful words. */
const keywordsOf = (line: string): { skills: string[]; words: string[] } => {
  let rest = normaliseText(line);
  const skills: string[] = [];
  // Longest aliases first, so "sap mm" is taken before "sap"
  const aliases = [...new Set(Object.values(SKILL_SYNONYMS).flat())].sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (hasPhrase(rest, alias)) {
      skills.push(alias);
      rest = rest.replace(` ${alias} `, ' ');
    }
  }
  const words = [...new Set(rest.trim().split(' ').filter((word) => word.length >= 3 && !/^\d+$/.test(word) && !STOPWORDS.has(word)))];
  return { skills, words };
};

/** Share (0..1) of a line's keywords the résumé has. A line with no keywords counts as covered. */
const lineCoverage = (line: string, normalisedResume: string, resumeWords: Set<string>): number => {
  const { skills, words } = keywordsOf(line);
  const total = skills.length + words.length;
  if (total === 0) return 1;
  const found =
    skills.filter((alias) => resumeHasSkill(normalisedResume, alias)).length + words.filter((word) => resumeWords.has(stem(word))).length;
  return found / total;
};

/** A line is covered when the résumé has at least half of its keywords. */
const COVERED_AT = 0.5;

const coveragePart = (lines: string[], normalisedResume: string, resumeWords: Set<string>, noun: string, weight: number): PartResult => {
  const listed = lines.map((line) => line.trim()).filter(Boolean);
  if (listed.length === 0) return { score: 0, weight, applies: false, detail: `No ${noun} listed` };
  const covered = listed.filter((line) => lineCoverage(line, normalisedResume, resumeWords) >= COVERED_AT).length;
  return { score: covered / listed.length, weight, applies: true, detail: `${covered} of ${listed.length} ${noun} covered` };
};

// ---------- experience ----------

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// Lines about studies, whose years are not work ("B.Tech 2012 - 2016"), as normalised phrases
const EDUCATION_WORDS = [
  'b tech', 'btech', 'b e', 'm tech', 'mtech', 'diploma', 'degree', 'university', 'college', 'school', 'bachelor', 'master',
  'cgpa', 'gpa', 'percentage', '10th', '12th', 'ssc', 'hsc', 'iti', 'polytechnic', 'graduate', 'graduation',
];
const SEPARATORS = new Set(['-', 'to', 'till', 'until']);
// "till date" ends on "date" once "till" was read as the separator
const ONGOING = new Set(['present', 'current', 'now', 'today', 'date']);
const YEAR = /^(19|20)\d{2}$/;
const NUMERIC_MONTH = /(\d{1,2})[/.](\d{4})/g;

interface Point {
  month: number | null;
  year: number | null;
  /** Ongoing ("present"). */
  open: boolean;
  /** Its first and last word in the line. */
  first: number;
  last: number;
}

/** A line as words: "Jan 2019 – Present" → jan 2019 - present; "03/2019" → m03 2019. */
const lineWords = (line: string): string[] =>
  line
    .toLowerCase()
    .replace(/[–—‒]/g, '-')
    .replace(NUMERIC_MONTH, ' m$1 $2 ')
    .replace(/-/g, ' - ')
    .replace(/[^a-z0-9-]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

const monthOf = (word: string | undefined): number | null => {
  if (!word) return null;
  if (/^m\d{1,2}$/.test(word)) {
    const month = Number(word.slice(1));
    return month >= 1 && month <= 12 ? month - 1 : null;
  }
  const key = word.slice(0, 3);
  return word.length >= 3 && key in MONTHS ? MONTHS[key] : null;
};

/** The dates in a line: a year with its month before it when there is one, or "present". */
const pointsOf = (words: string[]): Point[] => {
  const points: Point[] = [];
  words.forEach((word, index) => {
    if (ONGOING.has(word)) {
      points.push({ month: null, year: null, open: true, first: index, last: index });
    } else if (YEAR.test(word)) {
      const month = monthOf(words[index - 1]);
      points.push({ month, year: Number(word), open: false, first: month === null ? index : index - 1, last: index });
    }
  });
  return points;
};

/** Month index (year × 12 + month) of a range's start or end; a bare year starts in January. */
const monthIndex = (point: Point, now: Date): number | null => {
  if (point.open) return now.getFullYear() * 12 + now.getMonth();
  if (point.year === null) return null;
  return point.year * 12 + (point.month ?? 0);
};

/** One "from – to" range in months, [start, end), or null when the two dates don't make one. */
const rangeOf = (from: Point, to: Point, words: string[], now: Date): [number, number] | null => {
  const between = words.slice(from.last + 1, to.first);
  if (from.open || between.length !== 1 || !SEPARATORS.has(between[0])) return null;
  const start = monthIndex(from, now);
  const end = monthIndex(to, now);
  if (start === null || end === null) return null;
  // Month-precise ends include their own month ("Jan – Dec 2019" is 12 months)
  const endExclusive = to.month !== null || to.open ? end + 1 : end;
  return endExclusive > start && endExclusive - start <= 50 * 12 ? [start, endExclusive] : null;
};

/** Ranges of work in months from "Jan 2019 – Present" style lines; lines about studies are skipped. */
const workRanges = (resumeText: string, now: Date): [number, number][] =>
  resumeText
    .split(/\r?\n/)
    .filter((line) => !EDUCATION_WORDS.some((word) => hasPhrase(normaliseText(line), word)))
    .flatMap((line) => {
      const words = lineWords(line);
      const points = pointsOf(words);
      return points.slice(1).map((to, i) => rangeOf(points[i], to, words, now));
    })
    .filter((range): range is [number, number] => range !== null);

/** Total months covered by the ranges, overlaps counted once. */
const coveredMonths = (ranges: [number, number][]): number => {
  let total = 0;
  let reach = -Infinity;
  for (const [from, to] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const start = Math.max(from, reach);
    if (to > start) total += to - start;
    reach = Math.max(reach, to);
  }
  return total;
};

const STATED_YEARS = /\b(\d{1,2}(?:\.\d)?)\+?\s?(?:years?|yrs?)\b/g;
// "Age: 28 years" and "28 years old" are not experience
const AGE_BEFORE = /\bage\b\W*$/;
const AGE_AFTER = /^\s*old\b/;

const statedYearsIn = (text: string): number[] =>
  [...text.matchAll(STATED_YEARS)]
    .filter((m) => {
      const at = m.index ?? 0;
      return !AGE_BEFORE.test(text.slice(Math.max(0, at - 12), at)) && !AGE_AFTER.test(text.slice(at + m[0].length, at + m[0].length + 6));
    })
    .map((m) => Number(m[1]))
    .filter((years) => years <= 45);

/**
 * Years of experience read from the résumé: an explicit "5 years" / "5+ yrs" (the largest up to 45) wins; otherwise the
 * work date ranges ("Jan 2019 – Present", "2016 - 2019") added up. Null when the résumé says neither.
 */
export const parseExperienceYears = (resumeText: string, now: Date = new Date()): number | null => {
  const stated = statedYearsIn(resumeText.toLowerCase());
  if (stated.length) return Math.max(...stated);
  const months = coveredMonths(workRanges(resumeText, now));
  return months > 0 ? Math.round((months / 12) * 10) / 10 : null;
};

const yearsText = (years: number) => `${years} ${years === 1 ? 'yr' : 'yrs'}`;

export const rangeText = (min: number, max: number | null): string => (max === null ? `${min}+ yrs` : `${min}–${max} yrs`);

/** In range: full. Below: the share of the minimum reached. Above: 0.7 (able, but maybe overqualified). */
export const experienceFit = (years: number | null, source: ExperienceResult['source'], minYears: number | null, maxYears: number | null): ExperienceResult => {
  const min = minYears ?? 0;
  const max = maxYears;
  const asked = rangeText(min, max);
  if (years === null) return { years, source, min, max, fit: 'UNKNOWN', score: 0.5, text: `Experience not stated (needs ${asked})` };
  const from = source === 'stated' ? 'stated' : 'from résumé';
  if (years < min) {
    return { years, source, min, max, fit: 'BELOW', score: min > 0 ? years / min : 0, text: `${yearsText(years)} (${from}) is below ${asked}` };
  }
  if (max !== null && years > max) return { years, source, min, max, fit: 'ABOVE', score: 0.7, text: `${yearsText(years)} (${from}) is above ${asked}` };
  return { years, source, min, max, fit: 'IN_RANGE', score: 1, text: `${yearsText(years)} (${from}) fits ${asked}` };
};

// ---------- education ----------

const educationPart = (education: string | null, normalisedResume: string, resumeWords: Set<string>, weight: number): PartResult => {
  const asked = normaliseText(education ?? '');
  if (!asked.trim()) return { score: 0, weight, applies: false, detail: 'No education listed' };
  const degrees = Object.entries(DEGREE_SYNONYMS).filter(([, aliases]) => aliases.some((alias) => hasPhrase(asked, alias)));
  const degreeFound = degrees.find(([, aliases]) => aliases.some((alias) => hasPhrase(normalisedResume, alias)));
  // The subject ("Electronics", "Mechanical"): the remaining words, without those of the degrees' names
  const degreeWords = new Set(degrees.flatMap(([, aliases]) => aliases.flatMap((alias) => alias.split(' '))));
  const fields = [...new Set(asked.trim().split(' '))].filter((word) => word.length >= 3 && !STOPWORDS.has(word) && !degreeWords.has(word));
  const fieldShare = fields.length ? fields.filter((word) => resumeWords.has(stem(word))).length / fields.length : 1;
  const degreeShare = degreeFound ? 1 : 0;
  const score = degrees.length ? (degreeShare + fieldShare) / 2 : fieldShare;
  let detail = 'Education keywords checked';
  if (degrees.length) detail = degreeFound ? `${degreeFound[0].toUpperCase()} found` : 'Asked-for degree not found';
  return { score, weight, applies: true, detail };
};

// ---------- the match ----------

export const labelFor = (score: number): MatchLabel => {
  if (score >= 70) return 'STRONG';
  if (score >= 40) return 'WEAK';
  return 'NONE';
};

export const LABEL_TEXT: Record<MatchLabel, string> = { STRONG: 'Strong match', WEAK: 'Weak match', NONE: 'No match' };

/** Whether text has enough words to be read; a scanned PDF has none. */
export const isReadable = (resumeText: string | null | undefined): resumeText is string =>
  !!resumeText && normaliseText(resumeText).trim().split(' ').filter((word) => /[a-z]/.test(word)).length >= 5;

const summaryOf = (label: MatchLabel, score: number, parts: Record<MatchPart, PartResult>, experience: ExperienceResult): string => {
  const bits: string[] = [];
  if (parts.skills.applies) bits.push(parts.skills.detail.toLowerCase());
  if (parts.requirements.applies) bits.push(parts.requirements.detail.toLowerCase());
  bits.push(experience.text.charAt(0).toLowerCase() + experience.text.slice(1));
  return `${LABEL_TEXT[label]} (${score}): ${bits.join('; ')}.`;
};

/**
 * Compares a résumé with an opening. Returns null when the résumé has no readable text (show NO_TEXT_MESSAGE and
 * review it by hand). `statedYears` (the applicant's own total experience) is preferred over years read from the
 * résumé. `now` makes "Present" in date ranges deterministic in tests.
 */
export const matchResume = (
  resumeText: string | null | undefined,
  opening: MatchOpening,
  statedYears: number | null = null,
  now: Date = new Date()
): MatchResult | null => {
  if (!isReadable(resumeText)) return null;
  const normalised = normaliseText(resumeText);
  const words = wordSet(normalised);

  const skills = uniqueSkills(opening.skills ?? []);
  const matchedSkills = skills.filter((skill) => resumeHasSkill(normalised, skill));
  const missingSkills = skills.filter((skill) => !matchedSkills.includes(skill));

  const parsedYears = statedYears === null ? parseExperienceYears(resumeText, now) : null;
  const years = statedYears ?? parsedYears;
  let source: ExperienceResult['source'] = 'unknown';
  if (statedYears !== null) source = 'stated';
  else if (parsedYears !== null) source = 'resume';
  const experience = experienceFit(years, source, opening.experienceMinYears, opening.experienceMaxYears);

  const parts: Record<MatchPart, PartResult> = {
    skills: skills.length
      ? { score: matchedSkills.length / skills.length, weight: WEIGHTS.skills, applies: true, detail: `${matchedSkills.length} of ${skills.length} skills found` }
      : { score: 0, weight: WEIGHTS.skills, applies: false, detail: 'No skills listed' },
    requirements: coveragePart(opening.requirements ?? [], normalised, words, 'requirements', WEIGHTS.requirements),
    experience: { score: experience.score, weight: WEIGHTS.experience, applies: true, detail: experience.text },
    education: educationPart(opening.education, normalised, words, WEIGHTS.education),
    niceToHave: coveragePart(opening.niceToHave ?? [], normalised, words, 'nice-to-haves', WEIGHTS.niceToHave),
  };

  const applying = Object.values(parts).filter((part) => part.applies);
  const totalWeight = applying.reduce((sum, part) => sum + part.weight, 0);
  const score = Math.round((100 * applying.reduce((sum, part) => sum + part.weight * part.score, 0)) / totalWeight);
  const label = labelFor(score);
  return { label, score, matchedSkills, missingSkills, summary: summaryOf(label, score, parts, experience), experience, parts };
};

/** The body of POST /applications/{id}/match. */
export const toMatchRequest = (result: MatchResult): MatchRequest => ({
  label: result.label,
  score: result.score,
  matchedSkills: result.matchedSkills,
  missingSkills: result.missingSkills,
  summary: result.summary,
  matcherVersion: MATCHER_VERSION,
});

/** Whether a stored result should be computed again: none yet, or made by an older matcher. */
export const needsMatch = (stored: { matcherVersion: number | string } | null | undefined): boolean => {
  if (!stored) return true;
  const version = Number(stored.matcherVersion);
  return !Number.isFinite(version) || version < MATCHER_VERSION;
};
