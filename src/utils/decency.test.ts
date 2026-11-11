import { describe, expect, it } from 'vitest';
import { containsOffensiveLanguage, decencyError, DECENCY_ERROR } from './decency';

// The same examples are in the storefront's decency.test.ts and the Ecommerce backend's DecencyTest.java
const CLEAN = [
  'This product is great, thank you!',
  'Please assist me with my class booking',
  'I passed the cocktail menu to Dickens',
  'Delivered to Scunthorpe yesterday',
  'The flame retardant casing cracked',
  'Showroom-cum-office address',
  'Section A S S Road, Lucknow',
  '**Important** please call me',
  'Your assessment is pending',
  'Mujhe chot lagi, the box was damaged',
  'Bob bobs his head',
  'Order 1337 and 420 rupees',
  '',
];

const OFFENSIVE = [
  'what the fuck',
  'f*ck this order',
  'this is sh1t!',
  'fuuuuck',
  'bullllshit service',
  'f u c k you',
  'You are a chutiya',
  'madarchod',
  'चूतिया है क्या',
  'a55hole',
  'Bitches',
  'motherfuckers',
  'mother-fucker',
  'a$$',
];

describe('containsOffensiveLanguage', () => {
  it.each(CLEAN)('lets "%s" through', (text) => {
    expect(containsOffensiveLanguage(text)).toBe(false);
  });

  it.each(OFFENSIVE)('catches "%s"', (text) => {
    expect(containsOffensiveLanguage(text)).toBe(true);
  });

  it('gives the field error only for offensive text', () => {
    expect(decencyError('Thanks for your help')).toBe('');
    expect(decencyError('shit')).toBe(DECENCY_ERROR);
    expect(decencyError(null)).toBe('');
  });
});
