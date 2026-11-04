import { describe, expect, it } from 'vitest';
import { composeDescription, emptyDescriptionSections, isTemplated, missingSections, parseDescription } from './productDescription';

const TEMPLATED = [
    '## Overview',
    'A miniature of Kedarnath Temple at dawn.',
    '',
    '## The Story',
    'One of the twelve Jyotirlingas.',
    'Rebuilt by Adi Shankara.',
    '',
    '## Highlights',
    '- Sunrise LED cycle',
    '• AI motion wake',
].join('\n');

describe('productDescription', () => {
    it('parses each known section, and highlights one point per line', () => {
        const sections = parseDescription(TEMPLATED);
        expect(sections.overview).toBe('A miniature of Kedarnath Temple at dawn.');
        expect(sections.story).toBe('One of the twelve Jyotirlingas.\nRebuilt by Adi Shankara.');
        expect(sections.highlights).toBe('Sunrise LED cycle\nAI motion wake');
        expect(sections.technology).toBe('');
    });

    it('composes filled sections only, in template order, with bullets', () => {
        const sections = { ...emptyDescriptionSections(), highlights: 'Sunrise LED cycle\n\n- AI motion wake\n', overview: 'Dawn at Kedarnath.' };
        expect(composeDescription(sections)).toBe('## Overview\nDawn at Kedarnath.\n\n## Highlights\n- Sunrise LED cycle\n- AI motion wake');
        expect(composeDescription(emptyDescriptionSections())).toBe('');
    });

    it('round-trips', () => {
        const once = composeDescription(parseDescription(TEMPLATED));
        expect(composeDescription(parseDescription(once))).toBe(once);
    });

    it('keeps a description written before the template, in Overview', () => {
        const legacy = 'A diorama of Everest.\n\nPlug in and enjoy.';
        expect(isTemplated(legacy)).toBe(false);
        expect(parseDescription(legacy).overview).toBe(legacy);
    });

    it('matches headings ignoring case and spacing; text under an unknown heading stays where it was', () => {
        const sections = parseDescription('## perfect for\nGifts\n## Notes\nfragile');
        expect(isTemplated('## perfect for\nGifts')).toBe(true);
        expect(sections.perfectFor).toBe('Gifts\n## Notes\nfragile');
    });

    it('lists the sections still empty', () => {
        expect(missingSections(parseDescription(TEMPLATED)).map((s) => s.key)).toEqual(['technology', 'craftsmanship', 'perfectFor']);
    });
});
