import { describe, expect, it } from 'vitest';
import type { MatchOpening } from '../types/careers.types';
import {
  MATCHER_VERSION,
  experienceFit,
  isReadable,
  labelFor,
  matchResume,
  needsMatch,
  normaliseText,
  parseExperienceYears,
  resumeHasSkill,
  toMatchRequest,
} from './resumeMatcher';

const NOW = new Date(2026, 9, 30);

const EMBEDDED: MatchOpening = {
  skills: ['Embedded C', 'STM32', 'RTOS', 'PCB design', 'C++'],
  requirements: ['3+ years writing firmware for ARM microcontrollers', 'Hands-on with UART, SPI and I2C', 'Comfortable with oscilloscope debugging'],
  niceToHave: ['Experience with ESP32 and MQTT'],
  experienceMinYears: 3,
  experienceMaxYears: 6,
  education: 'B.E./B.Tech in Electronics',
  description: null,
};

const STRONG_RESUME = `Ravi Kumar — Firmware Engineer, Jaipur
Summary: 5+ years building firmware on STM32 and ESP32 microcontrollers with FreeRTOS.
Skills: C, C/C++, FreeRTOS, KiCad, Altium Designer, UART, SPI, I2C, MQTT, oscilloscope, logic analyser
Experience
Senior Firmware Engineer, Volt Labs   Jan 2021 – Present
Firmware Engineer, Circuitry Pvt Ltd  Jun 2019 – Dec 2020
Education
B.Tech, Electronics and Communication, RTU 2015 - 2019`;

const SALES_RESUME = `Priya Sharma, Area Sales Manager
Handled supplier network, key account management and channel sales across Rajasthan.
Tools: Tally Prime, MS Excel, Zoho CRM. Eight years in FMCG distribution.
MBA Marketing, 2014`;

describe('normaliseText', () => {
  it('keeps the symbols that are part of skill names and drops the rest', () => {
    expect(normaliseText('C++, C#, .NET, Node.js & GD&T!')).toBe(' cpp csharp dotnet nodejs and gdt ');
    expect(normaliseText('')).toBe(' ');
  });
});

describe('skills and synonyms', () => {
  const text = normaliseText('Worked in Auto CAD and SolidWorks; React.js front ends; ISO9001 audits; JS; Tally ERP 9; ladder logic PLCs');

  it.each([
    ['AutoCAD'],
    ['solidworks'],
    ['React'],
    ['ISO 9001'],
    ['JavaScript'],
    ['Tally'],
    ['PLC'],
    ['CAD'],
  ])('finds %s through its synonyms', (skill) => {
    expect(resumeHasSkill(text, skill)).toBe(true);
  });

  it('matches whole words only', () => {
    expect(resumeHasSkill(normaliseText('JavaScript developer'), 'Java')).toBe(false);
    expect(resumeHasSkill(normaliseText('Scandal'), 'CAD')).toBe(false);
  });

  it('looks for a skill outside the table as written', () => {
    expect(resumeHasSkill(normaliseText('Ran the powder coating line'), 'Powder coating')).toBe(true);
    expect(resumeHasSkill(normaliseText('Ran the paint shop'), 'Powder coating')).toBe(false);
  });

  it('knows manufacturing, quality and supply-chain names', () => {
    const shop = normaliseText('VMC and Fanuc setting; surface mount reflow; 6 Sigma green belt; PFMEA; SAP MM purchasing; GST returns');
    for (const skill of ['CNC', 'VMC', 'SMT', 'Six Sigma', 'FMEA', 'SAP MM', 'Procurement', 'GST', 'SAP', 'ERP']) {
      expect(resumeHasSkill(shop, skill), skill).toBe(true);
    }
    expect(resumeHasSkill(shop, 'Kaizen')).toBe(false);
  });
});

describe('experience', () => {
  it('reads an explicit statement', () => {
    expect(parseExperienceYears('Over 5 years of experience', NOW)).toBe(5);
    expect(parseExperienceYears('5+ yrs in CNC', NOW)).toBe(5);
    expect(parseExperienceYears('3.5 years at ABC and 2 years at XYZ', NOW)).toBe(3.5);
  });

  it('does not take an age for experience', () => {
    expect(parseExperienceYears('Age: 28 years\nCNC operator', NOW)).toBeNull();
    expect(parseExperienceYears('I am 28 years old', NOW)).toBeNull();
  });

  it('adds up work date ranges, counting overlaps once and skipping education lines', () => {
    const text = 'Operator, A Ltd  Jan 2019 – Dec 2019\nOperator, B Ltd  Jun 2019 - Dec 2020\nB.Tech 2012 - 2016';
    expect(parseExperienceYears(text, NOW)).toBe(2);
    expect(parseExperienceYears('Supervisor 2016 to 2019', NOW)).toBe(3);
    expect(parseExperienceYears('Engineer 01/2024 - Present', new Date(2026, 0, 15))).toBeCloseTo(2.1, 5);
  });

  it('returns null when the résumé says nothing about it', () => {
    expect(parseExperienceYears('Fresh graduate keen to learn', NOW)).toBeNull();
  });

  it('scores the fit against the range', () => {
    expect(experienceFit(4, 'stated', 3, 6)).toMatchObject({ fit: 'IN_RANGE', score: 1 });
    expect(experienceFit(1.5, 'stated', 3, 6)).toMatchObject({ fit: 'BELOW', score: 0.5 });
    expect(experienceFit(10, 'resume', 3, 6)).toMatchObject({ fit: 'ABOVE', score: 0.7 });
    expect(experienceFit(10, 'resume', 3, null)).toMatchObject({ fit: 'IN_RANGE' });
    expect(experienceFit(null, 'unknown', 3, 6)).toMatchObject({ fit: 'UNKNOWN', score: 0.5 });
    expect(experienceFit(4, 'stated', 3, 6).text).toBe('4 yrs (stated) fits 3–6 yrs');
  });
});

describe('matchResume', () => {
  it('rates a firmware résumé against a firmware opening as strong', () => {
    const result = matchResume(STRONG_RESUME, EMBEDDED, null, NOW)!;
    expect(result.label).toBe('STRONG');
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.matchedSkills).toEqual(['Embedded C', 'STM32', 'RTOS', 'PCB design', 'C++']);
    expect(result.missingSkills).toEqual([]);
    expect(result.experience).toMatchObject({ years: 5, source: 'resume', fit: 'IN_RANGE' });
    expect(result.parts.requirements.detail).toBe('3 of 3 requirements covered');
    expect(result.parts.education).toMatchObject({ score: 1, detail: 'B TECH found' });
    expect(result.summary).toMatch(/^Strong match \(\d+\): 5 of 5 skills found; 3 of 3 requirements covered; 5 yrs \(from résumé\) fits 3–6 yrs\.$/);
  });

  it('prefers the experience the applicant stated', () => {
    const result = matchResume(STRONG_RESUME, EMBEDDED, 2, NOW)!;
    expect(result.experience).toMatchObject({ years: 2, source: 'stated', fit: 'BELOW' });
  });

  it('rates an unrelated résumé as no match, listing what is missing', () => {
    const result = matchResume(SALES_RESUME, EMBEDDED, 8, NOW)!;
    expect(result.label).toBe('NONE');
    expect(result.score).toBeLessThan(40);
    expect(result.matchedSkills).toEqual([]);
    expect(result.missingSkills).toHaveLength(5);
  });

  it('rates a partial fit as weak', () => {
    const partial = 'Embedded engineer with STM32 and Embedded C. Built UART and SPI drivers. 2 years at Volt Labs. Diploma in Electronics.';
    const result = matchResume(partial, EMBEDDED, null, NOW)!;
    expect(result.label).toBe('WEAK');
    expect(result.matchedSkills).toEqual(['Embedded C', 'STM32']);
    expect(result.missingSkills).toEqual(['RTOS', 'PCB design', 'C++']);
    // A diploma in the right subject is half the education part
    expect(result.parts.education).toMatchObject({ score: 0.5, detail: 'Asked-for degree not found' });
  });

  it('leaves out parts the opening does not list', () => {
    const bare: MatchOpening = { skills: ['Tally', 'GST'], requirements: [], niceToHave: [], experienceMinYears: 0, experienceMaxYears: null, education: null };
    const result = matchResume('Accountant: Tally Prime, GST returns, TDS and bank reconciliation for 4 years.', bare, null, NOW)!;
    expect(result.parts.requirements.applies).toBe(false);
    expect(result.parts.education.applies).toBe(false);
    expect(result.score).toBe(100);
    expect(result.label).toBe('STRONG');
  });

  it('is deterministic', () => {
    expect(matchResume(STRONG_RESUME, EMBEDDED, null, NOW)).toEqual(matchResume(STRONG_RESUME, EMBEDDED, null, NOW));
  });

  it('returns null for a résumé without readable text', () => {
    expect(matchResume(null, EMBEDDED)).toBeNull();
    expect(matchResume('', EMBEDDED)).toBeNull();
    expect(matchResume('   \n  ', EMBEDDED)).toBeNull();
    expect(matchResume('%PDF 1 2', EMBEDDED)).toBeNull();
    expect(isReadable(STRONG_RESUME)).toBe(true);
  });
});

describe('labels, saving and versions', () => {
  it('labels by the thresholds', () => {
    expect(labelFor(70)).toBe('STRONG');
    expect(labelFor(69)).toBe('WEAK');
    expect(labelFor(40)).toBe('WEAK');
    expect(labelFor(39)).toBe('NONE');
  });

  it('builds the save request with the matcher version', () => {
    const request = toMatchRequest(matchResume(STRONG_RESUME, EMBEDDED, null, NOW)!);
    expect(request).toMatchObject({ label: 'STRONG', matcherVersion: MATCHER_VERSION });
    expect(Object.keys(request).sort()).toEqual(['label', 'matchedSkills', 'matcherVersion', 'missingSkills', 'score', 'summary']);
  });

  it('asks for a new match when none is stored or an older matcher made it', () => {
    expect(needsMatch(null)).toBe(true);
    expect(needsMatch({ matcherVersion: MATCHER_VERSION - 1 })).toBe(true);
    expect(needsMatch({ matcherVersion: 'v0' })).toBe(true);
    expect(needsMatch({ matcherVersion: MATCHER_VERSION })).toBe(false);
    expect(needsMatch({ matcherVersion: String(MATCHER_VERSION) })).toBe(false);
  });
});
