import type { AdminOpening, EmploymentType, OpeningRequest, SalaryPeriod, WorkMode } from '../types/careers.types';

/** The contract's limits (docs/careers.md › OpeningRequest); the server checks the same. */
export const OPENING_LIMITS = {
  title: 120,
  categoryName: 60,
  location: 120,
  summary: 300,
  description: 8000,
  education: 200,
  skills: 30,
  skillLength: 40,
  listItems: 25,
  itemLength: 300,
  experienceMax: 40,
  positionsMin: 1,
  positionsMax: 500,
} as const;

export type OpeningList = 'responsibilities' | 'requirements' | 'niceToHave' | 'benefits';
export const OPENING_LISTS: { key: OpeningList; label: string; placeholder: string }[] = [
  { key: 'responsibilities', label: 'Responsibilities', placeholder: 'e.g. Set up and run 3-axis CNC machines' },
  { key: 'requirements', label: 'Must-have requirements', placeholder: 'e.g. 2+ years on Fanuc-controlled VMCs' },
  { key: 'niceToHave', label: 'Nice to have', placeholder: 'e.g. Exposure to GD&T' },
  { key: 'benefits', label: 'Benefits', placeholder: 'e.g. Health insurance for the family' },
];

/** Form state: numbers stay text while typed, so an empty box is "not set" rather than 0. */
export interface OpeningForm {
  title: string;
  categoryName: string;
  location: string;
  workMode: WorkMode;
  employmentType: EmploymentType;
  experienceMinYears: string;
  experienceMaxYears: string;
  salaryMin: string;
  salaryMax: string;
  salaryPeriod: SalaryPeriod;
  salaryVisible: boolean;
  positions: string;
  summary: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  niceToHave: string[];
  benefits: string[];
  skills: string[];
  education: string;
  applicationDeadline: string;
}

export type OpeningField = keyof OpeningForm;
export type OpeningErrors = Partial<Record<OpeningField, string>>;

export const emptyOpeningForm = (): OpeningForm => ({
  title: '',
  categoryName: '',
  location: '',
  workMode: 'ON_SITE',
  employmentType: 'FULL_TIME',
  experienceMinYears: '0',
  experienceMaxYears: '',
  salaryMin: '',
  salaryMax: '',
  salaryPeriod: 'ANNUAL',
  salaryVisible: false,
  positions: '1',
  summary: '',
  description: '',
  responsibilities: [],
  requirements: [],
  niceToHave: [],
  benefits: [],
  skills: [],
  education: '',
  applicationDeadline: '',
});

const text = (value: number | null | undefined) => (value === null || value === undefined ? '' : String(value));

export const openingToForm = (opening: AdminOpening): OpeningForm => ({
  title: opening.title,
  categoryName: opening.category?.name ?? opening.categoryName ?? '',
  location: opening.location,
  workMode: opening.workMode,
  employmentType: opening.employmentType,
  experienceMinYears: text(opening.experienceMinYears),
  experienceMaxYears: text(opening.experienceMaxYears),
  salaryMin: text(opening.salaryMin),
  salaryMax: text(opening.salaryMax),
  salaryPeriod: opening.salaryPeriod ?? 'ANNUAL',
  salaryVisible: opening.salaryVisible,
  positions: text(opening.positions),
  summary: opening.summary ?? '',
  description: opening.description ?? '',
  responsibilities: opening.responsibilities ?? [],
  requirements: opening.requirements ?? [],
  niceToHave: opening.niceToHave ?? [],
  benefits: opening.benefits ?? [],
  skills: opening.skills ?? [],
  education: opening.education ?? '',
  applicationDeadline: opening.applicationDeadline ?? '',
});

const WHOLE = /^\d+$/;
const DECIMAL = /^\d+(\.\d)?$/;

/** A whole number in the box, null when empty, NaN when it isn't one. */
const wholeOrNull = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return WHOLE.test(trimmed) ? Number(trimmed) : Number.NaN;
};

const yearsOrNull = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return DECIMAL.test(trimmed) ? Number(trimmed) : Number.NaN;
};

const cleanList = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);

const required = (form: OpeningForm, errors: OpeningErrors) => {
  const labels: [OpeningField, string][] = [
    ['title', 'Title'],
    ['categoryName', 'Category'],
    ['location', 'Location'],
    ['summary', 'Summary'],
    ['description', 'Description'],
  ];
  for (const [field, label] of labels) {
    if (!String(form[field]).trim()) errors[field] = `${label} is required.`;
  }
};

const lengths = (form: OpeningForm, errors: OpeningErrors) => {
  const limits: [OpeningField, number][] = [
    ['title', OPENING_LIMITS.title],
    ['categoryName', OPENING_LIMITS.categoryName],
    ['location', OPENING_LIMITS.location],
    ['summary', OPENING_LIMITS.summary],
    ['description', OPENING_LIMITS.description],
    ['education', OPENING_LIMITS.education],
  ];
  for (const [field, max] of limits) {
    if (!errors[field] && String(form[field]).trim().length > max) errors[field] = `At most ${max} characters.`;
  }
};

const experience = (form: OpeningForm, errors: OpeningErrors) => {
  const min = yearsOrNull(form.experienceMinYears);
  const max = yearsOrNull(form.experienceMaxYears);
  if (min === null || Number.isNaN(min) || min > OPENING_LIMITS.experienceMax) {
    errors.experienceMinYears = `Enter 0 to ${OPENING_LIMITS.experienceMax} years.`;
  }
  if (max !== null && (Number.isNaN(max) || max > OPENING_LIMITS.experienceMax)) {
    errors.experienceMaxYears = `Enter up to ${OPENING_LIMITS.experienceMax} years, or leave empty.`;
  } else if (max !== null && min !== null && !Number.isNaN(min) && max < min) {
    errors.experienceMaxYears = 'Must be at least the minimum.';
  }
};

const salary = (form: OpeningForm, errors: OpeningErrors) => {
  const min = wholeOrNull(form.salaryMin);
  const max = wholeOrNull(form.salaryMax);
  if (Number.isNaN(min)) errors.salaryMin = 'Whole rupees only.';
  if (Number.isNaN(max)) errors.salaryMax = 'Whole rupees only.';
  else if (min !== null && max !== null && !Number.isNaN(min) && max < min) errors.salaryMax = 'Must be at least the minimum.';
  if (form.salaryVisible && min === null && max === null) errors.salaryMin = 'Enter a salary to show it on the website.';
};

const positions = (form: OpeningForm, errors: OpeningErrors) => {
  const value = wholeOrNull(form.positions);
  if (value === null || Number.isNaN(value) || value < OPENING_LIMITS.positionsMin || value > OPENING_LIMITS.positionsMax) {
    errors.positions = `Enter ${OPENING_LIMITS.positionsMin} to ${OPENING_LIMITS.positionsMax}.`;
  }
};

const lists = (form: OpeningForm, errors: OpeningErrors) => {
  for (const { key, label } of OPENING_LISTS) {
    const items = cleanList(form[key]);
    if (items.length > OPENING_LIMITS.listItems) errors[key] = `${label}: at most ${OPENING_LIMITS.listItems} items.`;
    else if (items.some((item) => item.length > OPENING_LIMITS.itemLength)) errors[key] = `${label}: at most ${OPENING_LIMITS.itemLength} characters each.`;
  }
  const skills = cleanList(form.skills);
  if (skills.length > OPENING_LIMITS.skills) errors.skills = `At most ${OPENING_LIMITS.skills} skills.`;
  else if (skills.some((skill) => skill.length > OPENING_LIMITS.skillLength)) errors.skills = `At most ${OPENING_LIMITS.skillLength} characters per skill.`;
};

/**
 * Checks the form against the contract's limits. A deadline in the past may be saved (a draft or a closed opening), but
 * `forPublish` refuses it, as the server would.
 */
export const validateOpening = (form: OpeningForm, { today, forPublish = false }: { today: string; forPublish?: boolean }): OpeningErrors => {
  const errors: OpeningErrors = {};
  required(form, errors);
  lengths(form, errors);
  experience(form, errors);
  salary(form, errors);
  positions(form, errors);
  lists(form, errors);
  if (forPublish && form.applicationDeadline && form.applicationDeadline < today) {
    errors.applicationDeadline = 'The deadline has passed: pick a later date to publish.';
  }
  return errors;
};

/** The request body; call only once validateOpening found nothing. */
export const toOpeningRequest = (form: OpeningForm, version?: number): OpeningRequest => ({
  title: form.title.trim(),
  categoryName: form.categoryName.trim(),
  location: form.location.trim(),
  workMode: form.workMode,
  employmentType: form.employmentType,
  experienceMinYears: yearsOrNull(form.experienceMinYears) ?? 0,
  experienceMaxYears: yearsOrNull(form.experienceMaxYears),
  salaryMin: wholeOrNull(form.salaryMin),
  salaryMax: wholeOrNull(form.salaryMax),
  salaryPeriod: form.salaryPeriod,
  salaryVisible: form.salaryVisible,
  positions: wholeOrNull(form.positions) ?? 1,
  summary: form.summary.trim(),
  description: form.description.trim(),
  responsibilities: cleanList(form.responsibilities),
  requirements: cleanList(form.requirements),
  niceToHave: cleanList(form.niceToHave),
  benefits: cleanList(form.benefits),
  skills: cleanList(form.skills),
  education: form.education.trim() || null,
  applicationDeadline: form.applicationDeadline || null,
  ...(version === undefined ? {} : { version }),
});

/** Adds a skill unless it is empty or already there (case-insensitive); returns the same list when nothing changed. */
export const addSkill = (skills: string[], raw: string): string[] => {
  const skill = raw.trim().replace(/\s+/g, ' ');
  if (!skill || skills.some((existing) => existing.toLowerCase() === skill.toLowerCase())) return skills;
  return [...skills, skill];
};
