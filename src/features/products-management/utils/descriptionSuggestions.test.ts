import { describe, expect, it } from 'vitest';
import { buildDescriptionSuggestions, fitSentences, toSentences, type DescriptionReference } from './descriptionSuggestions';
import { DESCRIPTION_SECTIONS } from './productDescription';

const KEDARNATH: DescriptionReference = {
    subject: 'Kedarnath',
    title: 'Kedarnath Temple',
    description: 'Hindu temple in Uttarakhand, India',
    summary:
        'Kedarnath Temple is a Hindu temple dedicated to Shiva. It is on the Garhwal Himalayan range near the Mandakini river. ' +
        'It is one of the twelve Jyotirlingas. The temple opens only between April and November.',
    url: 'https://en.wikipedia.org/wiki/Kedarnath_Temple',
    source: 'Wikipedia',
};

const CONTEXT = {
    title: 'Kedarnath',
    tagline: 'Where the Himalaya bows',
    categoryName: 'Temples',
    specifications: [
        { specKey: 'LED', specValue: 'Warm-white sunrise cycle' },
        { specKey: 'AI sensor', specValue: 'Motion wake' },
        { specKey: 'Material', specValue: 'Hand-painted resin' },
        { specKey: 'Guide - Setup', specValue: 'Plug in' },
    ],
};

describe('descriptionSuggestions', () => {
    it('writes three distinct versions from the reference, the tagline and the specifications', () => {
        const suggestions = buildDescriptionSuggestions(CONTEXT, KEDARNATH);
        expect(suggestions.map((s) => s.style)).toEqual(['heritage', 'technology', 'gift']);
        const [heritage, technology, gift] = suggestions.map((s) => s.sections);

        expect(heritage.overview).toContain('Kedarnath Temple (Hindu temple in Uttarakhand, India)');
        expect(heritage.overview).toContain('Where the Himalaya bows.');
        expect(heritage.story).toContain('one of the twelve Jyotirlingas');
        expect(technology.story.length).toBeLessThan(heritage.story.length);
        expect(heritage.technology).toBe('It features LED (warm-white sunrise cycle) and AI sensor (motion wake). The light is tuned to honour the scene, never to overpower it.');
        expect(heritage.craftsmanship).toBe('Made with hand-painted resin.');
        // A temple suits devotees; the user-guide rows are never treated as specifications
        expect(heritage.perfectFor).toMatch(/devotees/i);
        expect(JSON.stringify(suggestions)).not.toContain('Plug in');
        expect(heritage.highlights.split('\n')).toEqual(['Inspired by Kedarnath Temple', 'Where the Himalaya bows', 'LED: Warm-white sunrise cycle', 'AI sensor: Motion wake', 'Material: Hand-painted resin']);
        expect(new Set([heritage.overview, technology.overview, gift.overview]).size).toBe(3);
    });

    it('stays within each section guide', () => {
        const long = { ...KEDARNATH, summary: Array.from({ length: 30 }, (_, i) => `Fact number ${i} about the temple is here.`).join(' ') };
        for (const { sections } of buildDescriptionSuggestions(CONTEXT, long)) {
            for (const { key, guideChars } of DESCRIPTION_SECTIONS) {
                if (key !== 'highlights') expect(sections[key].length).toBeLessThanOrEqual(guideChars);
            }
        }
    });

    it('without a reference leaves The Story empty and never repeats the name as its own subject', () => {
        const [heritage, technology, gift] = buildDescriptionSuggestions({ title: 'SummitX', specifications: [] }, null).map((s) => s.sections);
        expect(heritage.story).toBe('');
        expect(heritage.overview).toBe('SummitX is a hand-finished miniature that holds its character.');
        expect(technology.overview).not.toContain('SummitX is SummitX');
        expect(gift.overview).not.toContain('Bring SummitX home');
        expect(heritage.technology).toMatch(/LED lighting and smart AI/);
    });

    it('splits sentences and fits whole ones only', () => {
        const sentences = toSentences('One two. Three four! Five?');
        expect(sentences).toEqual(['One two.', 'Three four!', 'Five?']);
        expect(fitSentences(sentences, 21)).toBe('One two. Three four!');
        expect(fitSentences(sentences, 5)).toBe('');
    });
});
