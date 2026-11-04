/**
 * The product description template. Every description is written in the same six sections, so the storefront can
 * lay them out alike and Aura can compare products by theme, technology and who they suit.
 *
 * Stored as plain text in the existing `description` column (no schema change), one `## Heading` line per section:
 *
 *   ## Overview
 *   A 1:500 miniature of Kedarnath Temple ...
 *
 *   ## Highlights
 *   - Warm-white LED sunrise cycle
 *
 * The storefront parses the same format (TinQa_Ecommerce_FE src/services/productDescription.ts); change both together.
 * A description with no known heading (written before the template) is shown as it is.
 */

/** Ecommerce BE ProductSecurityValidator limit for the whole description, headings included. */
export const DESCRIPTION_MAX = 2000;

export type DescriptionSectionKey = 'overview' | 'story' | 'technology' | 'craftsmanship' | 'perfectFor' | 'highlights';

export interface DescriptionSectionDef {
    key: DescriptionSectionKey;
    heading: string;
    /** What the section is for, shown above its box. */
    hint: string;
    placeholder: string;
    /** Suggested length: a guide shown with the counter, not enforced (only DESCRIPTION_MAX is). */
    guideChars: number;
    /** One point per line, stored as `- point`. */
    bullets?: boolean;
}

export const DESCRIPTION_SECTIONS: readonly DescriptionSectionDef[] = [
    {
        key: 'overview',
        heading: 'Overview',
        hint: 'The theme: what the miniature shows and its mood, in 1–2 sentences.',
        placeholder: 'A hand-finished miniature of Kedarnath Temple at dawn, framed by the snow peaks of the Garhwal Himalaya.',
        guideChars: 280,
    },
    {
        key: 'story',
        heading: 'The Story',
        hint: 'Why the subject matters: its history, culture or significance.',
        placeholder: 'One of the twelve Jyotirlingas, Kedarnath has drawn pilgrims for over a thousand years…',
        guideChars: 480,
    },
    {
        key: 'technology',
        heading: 'Technology',
        hint: 'How LED lighting and AI bring it to life: light scenes, sensors, voice, app or controls.',
        placeholder: 'Programmable warm-white LEDs recreate sunrise to evening aarti; an AI motion sensor wakes the scene as you walk by.',
        guideChars: 380,
    },
    {
        key: 'craftsmanship',
        heading: 'Craftsmanship',
        hint: 'Materials, scale, finish and the details worth a closer look.',
        placeholder: 'Hand-painted resin at 1:500 scale, with carved stone textures and a solid wood base.',
        guideChars: 280,
    },
    {
        key: 'perfectFor',
        heading: 'Perfect For',
        hint: 'Who it suits and where it fits: gifting, home décor, devotion, collectors, offices.',
        placeholder: 'A meaningful gift for devotees and travellers, and a calm centrepiece for a home temple or desk.',
        guideChars: 200,
    },
    {
        key: 'highlights',
        heading: 'Highlights',
        hint: '3–5 short points, one per line. Aura uses them to compare products.',
        placeholder: 'Sunrise-to-aarti LED cycle\nAI motion wake\n1:500 hand-painted resin',
        guideChars: 280,
        bullets: true,
    },
];

export type DescriptionSections = Record<DescriptionSectionKey, string>;

export const emptyDescriptionSections = (): DescriptionSections => ({
    overview: '',
    story: '',
    technology: '',
    craftsmanship: '',
    perfectFor: '',
    highlights: '',
});

/** The heading of a `## Heading` line, else null. */
const headingOf = (line: string): string | null => (/^##\s/.test(line) ? line.slice(2).trim() : null);
const BULLET = /^\s*(?:[-•*])\s+/;
const headingKey = (heading: string) => heading.toLowerCase().replace(/[^a-z]/g, '');
const KEY_BY_HEADING = new Map(DESCRIPTION_SECTIONS.map((section) => [headingKey(section.heading), section.key]));

/** Whether the text uses the template (has at least one known section heading). */
export const isTemplated = (description: string | null | undefined): boolean =>
    !!description && description.split('\n').some((line) => KEY_BY_HEADING.has(headingKey(headingOf(line) ?? '')));

/**
 * Splits a description into its sections. Text before the first heading, under an unknown heading, or a description
 * written before the template, goes into Overview so nothing is lost. Highlights come back one point per line.
 */
export const parseDescription = (description: string | null | undefined): DescriptionSections => {
    const sections = emptyDescriptionSections();
    if (!description?.trim()) return sections;
    if (!isTemplated(description)) {
        sections.overview = description.trim();
        return sections;
    }
    const lines: Record<DescriptionSectionKey, string[]> = { overview: [], story: [], technology: [], craftsmanship: [], perfectFor: [], highlights: [] };
    let current: DescriptionSectionKey = 'overview';
    for (const line of description.split('\n')) {
        const heading = headingOf(line);
        const key = heading ? KEY_BY_HEADING.get(headingKey(heading)) : undefined;
        if (key) {
            current = key;
            continue;
        }
        lines[current].push(current === 'highlights' ? line.replace(BULLET, '') : line);
    }
    for (const { key } of DESCRIPTION_SECTIONS) {
        sections[key] = lines[key].join('\n').replace(/\n{3,}/g, '\n\n').trim();
    }
    return sections;
};

/** The stored text: filled sections only, in template order. Empty when nothing is filled. */
export const composeDescription = (sections: DescriptionSections): string =>
    DESCRIPTION_SECTIONS.flatMap(({ key, heading, bullets }) => {
        const body = sections[key].trim();
        if (!body) return [];
        const text = bullets
            ? body.split('\n').map((line) => line.replace(BULLET, '').trim()).filter(Boolean).map((line) => `- ${line}`).join('\n')
            : body;
        return [`## ${heading}\n${text}`];
    }).join('\n\n');

/** Sections still empty, for the "not filled yet" note (drafts may save with gaps). */
export const missingSections = (sections: DescriptionSections): DescriptionSectionDef[] =>
    DESCRIPTION_SECTIONS.filter(({ key }) => !sections[key].trim());
