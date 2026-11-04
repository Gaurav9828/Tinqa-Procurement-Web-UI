import type { SpecificationDTO } from '../types/product.types';
import { DESCRIPTION_SECTIONS, type DescriptionSections } from './productDescription';

/**
 * Description suggestions: three ready-to-edit versions of the template (utils/productDescription), written from the
 * product's name, tagline, category and specifications plus, when found, the facts of a Wikipedia article on what the
 * miniature shows (GET /products/description-reference, one call per subject). Built here, in the browser: no paid
 * service and no further calls. They are drafts: the catalog specialist checks every claim and rewrites in their own
 * words before saving.
 */

/** Ecommerce BE ProductDescriptionReferenceDTO: Wikipedia facts about a subject. */
export interface DescriptionReference {
    subject: string;
    /** Article title, e.g. "Kedarnath Temple". */
    title: string;
    /** Wikipedia's short description, e.g. "Hindu temple in Uttarakhand, India". */
    description: string | null;
    /** Plain-text introduction, parentheses removed. */
    summary: string;
    url: string;
    source: string;
}

export interface DescriptionContext {
    title: string;
    tagline?: string;
    categoryName?: string;
    specifications?: SpecificationDTO[];
}

export type SuggestionStyle = 'heritage' | 'technology' | 'gift';

export interface DescriptionSuggestion {
    style: SuggestionStyle;
    label: string;
    /** What this version leads with. */
    angle: string;
    sections: DescriptionSections;
}

/** Subject lookups: at least this many characters (Ecommerce BE limit 2–100). */
export const REFERENCE_SUBJECT_MIN = 2;
export const REFERENCE_SUBJECT_MAX = 100;

type Theme = 'devotional' | 'nature' | 'landmark' | 'general';

/** Words that set the theme; a trailing `*` matches any ending (pilgrim*, himalaya*). */
const THEME_WORDS: [Theme, string[]][] = [
    ['devotional', ['temple', 'mandir', 'jyotirlinga', 'dham', 'shrine', 'church', 'cathedral', 'mosque', 'masjid', 'gurudwara',
        'gurdwara', 'monastery', 'stupa', 'pagoda', 'pilgrim*', 'shiva', 'vishnu', 'krishna', 'ram', 'rama', 'ganesh*', 'hanuman',
        'buddha', 'devi', 'deity', 'sacred', 'holy']],
    ['nature', ['mountain', 'peak', 'summit', 'himalaya*', 'everest', 'glacier', 'valley', 'lake', 'river', 'waterfall', 'forest',
        'island', 'beach', 'desert', 'volcano', 'canyon', 'national park']],
    ['landmark', ['fort', 'palace', 'tower', 'monument', 'minaret', 'gate', 'bridge', 'castle', 'museum', 'city', 'skyline', 'mahal',
        'heritage site']],
];

const TECH_WORDS = ['led', 'leds', 'light*', 'lamp', 'ai', 'artificial', 'sensor*', 'motion', 'voice', 'sound', 'audio', 'music', 'app',
    'smart', 'bluetooth', 'wifi', 'wi fi', 'remote', 'control*', 'timer', 'mode*', 'scene*', 'power', 'battery', 'usb', 'adapter', 'rgb',
    'brightness'];
const CRAFT_WORDS = ['material*', 'finish', 'scale', 'size', 'dimension*', 'height', 'width', 'length', 'depth', 'weight', 'base',
    'paint*', 'hand painted', 'resin', 'wood*', 'metal', 'acrylic', 'frame', 'color', 'colour', 'handmade', 'handcrafted', 'hand crafted'];

/** Whether the text holds any of the words (whole words, ignoring case and punctuation). */
const hasWord = (text: string, words: string[]): boolean => {
    const padded = ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
    return words.some((word) => (word.endsWith('*') ? padded.includes(` ${word.slice(0, -1)}`) : padded.includes(` ${word} `)));
};

/** "Guide - …" rows are the product's user guide, not specifications. */
const GUIDE_SPEC = /^guide\s*-/i;

const LIMITS = Object.fromEntries(DESCRIPTION_SECTIONS.map((s) => [s.key, s.guideChars])) as Record<keyof DescriptionSections, number>;

const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();
const endSentence = (text: string) => (/[.!?…]$/.test(text) ? text : `${text}.`);

/** Splits prose into sentences, keeping abbreviations like "St." mostly intact by requiring a capital after. */
export const toSentences = (text: string): string[] =>
    clean(text).split(/(?<=[.!?])\s+(?=[A-Z0-9"'“(])/).map((s) => s.trim()).filter(Boolean);

/** As many whole sentences (from `start`, at most `count`) as fit in `max` characters. */
export const fitSentences = (sentences: string[], max: number, start = 0, count = sentences.length): string => {
    let text = '';
    for (const sentence of sentences.slice(start, start + count)) {
        const next = text ? `${text} ${sentence}` : sentence;
        if (next.length > max) break;
        text = next;
    }
    return text;
};

const detectTheme = (context: DescriptionContext, reference: DescriptionReference | null): Theme => {
    const haystack = [context.title, context.tagline, context.categoryName, reference?.title, reference?.description, reference?.summary]
        .map(clean)
        .join(' ');
    return THEME_WORDS.find(([, words]) => hasWord(haystack, words))?.[0] ?? 'general';
};

const specRows = (specifications: SpecificationDTO[] = []) =>
    specifications
        .map((s) => ({ label: clean(s.specKey), value: clean(s.specValue) }))
        .filter((s) => s.label && s.value && !GUIDE_SPEC.test(s.label));

/** Lower-cases the first letter of ordinary words only ("Hand-painted" → "hand-painted", "USB-C" stays). */
const lowerFirst = (text: string) => (/^[A-Z][a-z]/.test(text) ? text[0].toLowerCase() + text.slice(1) : text);
/** Labels that add nothing in a sentence: "Material: Resin" reads as "resin". */
const GENERIC_LABEL = /^(material|materials|finish|colou?r|type|features?|details?)$/i;

/** One specification in a sentence: "LED (warm-white sunrise cycle)", or just "hand-painted resin". */
const specPhrase = ({ label, value }: { label: string; value: string }) =>
    GENERIC_LABEL.test(label) || value.toLowerCase().includes(label.toLowerCase()) ? lowerFirst(value) : `${label} (${lowerFirst(value)})`;

const list = (items: string[]) =>
    items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const PERFECT_FOR: Record<Theme, [string, string, string]> = {
    devotional: [
        'Devotees, pilgrims and anyone who keeps a quiet corner for prayer at home.',
        'Spiritual homes and modern desks alike: a sacred place lit by smart, gentle light.',
        'A heartfelt gift for parents, housewarmings and festivals, and a calm centrepiece for a home temple.',
    ],
    nature: [
        'Travellers, trekkers and anyone who carries a favourite landscape in their heart.',
        'Tech lovers who want a living, glowing scene on the desk or bookshelf.',
        'A memorable gift for adventurers and nature lovers, and a calming piece for any room.',
    ],
    landmark: [
        'History lovers, travellers and collectors of the world’s great places.',
        'Design-minded homes and offices that want a landmark that lights up on its own.',
        'A thoughtful gift for someone who loves this place, and a striking talking point for a living room or office.',
    ],
    general: [
        'Collectors and anyone who loves stories told in fine detail.',
        'Tech lovers who want art that lights up and responds to them.',
        'A unique gift for birthdays, anniversaries and housewarmings, and a warm accent for any room.',
    ],
};

const MOOD: Record<Theme, string> = {
    devotional: 'its sacred calm',
    nature: 'its scale and stillness',
    landmark: 'its grandeur',
    general: 'its character',
};

/**
 * Three versions of the template: Heritage (leads with the story), Technology (leads with LED and AI) and Gift &
 * décor (leads with who it is for). `reference` is null when nothing was found: The Story is then left for the
 * specialist to write.
 */
export const buildDescriptionSuggestions = (
    context: DescriptionContext,
    reference: DescriptionReference | null,
): DescriptionSuggestion[] => {
    const title = clean(context.title) || 'This miniature';
    const tagline = clean(context.tagline);
    const subject = clean(reference?.title) || title;
    const about = clean(reference?.description);
    const theme = detectTheme(context, reference);
    const facts = toSentences(reference?.summary ?? '');
    const specs = specRows(context.specifications);
    const tech = specs.filter((s) => hasWord(`${s.label} ${s.value}`, TECH_WORDS));
    const craft = specs.filter((s) => !tech.includes(s) && hasWord(`${s.label} ${s.value}`, CRAFT_WORDS));

    // No article found (or it has the product's own name): no "X recreates X"
    const sameName = subject.toLowerCase() === title.toLowerCase();
    const subjectWithAbout = about ? `${subject} (${about})` : subject;
    const taglineSentence = tagline ? ` ${endSentence(tagline)}` : '';
    const bringHome = sameName ? '' : `Bring ${subject} home. `;

    const techSentence = tech.length
        ? endSentence(`It features ${list(tech.slice(0, 3).map(specPhrase))}`)
        : 'Integrated LED lighting and smart AI features bring the scene to life, so it changes with the moment.';
    const craftSentence = craft.length
        ? endSentence(`Made with ${list(craft.slice(0, 3).map(specPhrase))}`)
        : 'Every surface is shaped and finished by hand, so the details reward a closer look.';

    const highlights = (lead: string[]) =>
        Array.from(new Set([
            ...lead,
            ...tech.slice(0, 2).map((s) => `${s.label}: ${s.value}`),
            ...craft.slice(0, 1).map((s) => `${s.label}: ${s.value}`),
        ].map(clean).filter(Boolean)))
            .slice(0, 5)
            .join('\n');

    const fit = (sections: DescriptionSections): DescriptionSections => {
        // Generated text stays within each section's guide (whole sentences already; this trims a long spec list)
        const out = { ...sections };
        for (const key of Object.keys(out) as (keyof DescriptionSections)[]) {
            if (key !== 'highlights' && out[key].length > LIMITS[key]) {
                out[key] = fitSentences(toSentences(out[key]), LIMITS[key]) || `${out[key].slice(0, LIMITS[key] - 1).trimEnd()}…`;
            }
        }
        return out;
    };

    const heritage: DescriptionSections = {
        overview: sameName
            ? `${title} is a hand-finished miniature that holds ${MOOD[theme]}.${taglineSentence}`
            : `${title} recreates ${subjectWithAbout} as a hand-finished miniature that holds ${MOOD[theme]}.${taglineSentence}`,
        story: fitSentences(facts, LIMITS.story, 0, 4),
        technology: `${techSentence} The light is tuned to honour the scene, never to overpower it.`,
        craftsmanship: craftSentence,
        perfectFor: PERFECT_FOR[theme][0],
        highlights: highlights([sameName ? '' : `Inspired by ${subject}`, tagline]),
    };

    const technology: DescriptionSections = {
        overview: `${title} is ${sameName ? 'a miniature' : subject} reimagined with LED light and artificial intelligence: it lights up and responds to you.${taglineSentence}`,
        story: fitSentences(facts, LIMITS.story, 0, 2),
        technology: `${techSentence} Light scenes shift the mood from day to night, and the smart features wake the scene when you are near.`,
        craftsmanship: `${craftSentence} The electronics are hidden inside, so only the scene shows.`,
        perfectFor: PERFECT_FOR[theme][1],
        highlights: highlights(['LED lighting with AI features', sameName ? '' : `Miniature of ${subject}`]),
    };

    const gift: DescriptionSections = {
        overview: `${bringHome}${title} is a glowing miniature made to be given, kept and admired.${taglineSentence}`,
        story: fitSentences(facts, LIMITS.story, 0, 3),
        technology: `${techSentence} Simple to set up: place it, power it on and let the light do the rest.`,
        craftsmanship: `${craftSentence} It arrives ready to display.`,
        perfectFor: PERFECT_FOR[theme][2],
        highlights: highlights([tagline, 'Ready to gift, ready to display']),
    };

    return [
        { style: 'heritage', label: 'Heritage', angle: 'Leads with the story and why it matters', sections: fit(heritage) },
        { style: 'technology', label: 'Technology', angle: 'Leads with the LED and AI experience', sections: fit(technology) },
        { style: 'gift', label: 'Gift & décor', angle: 'Leads with who it is for and where it fits', sections: fit(gift) },
    ];
};
