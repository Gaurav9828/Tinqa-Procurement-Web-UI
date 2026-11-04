import { describe, expect, it } from 'vitest';
import { addSkill, emptyOpeningForm, toOpeningRequest, validateOpening, type OpeningForm } from './openingForm';
import { emptyInterviewForm, meetingLinkError, nowIn, toInterviewRequest, validateInterview } from './interviewForm';

const TODAY = '2026-10-30';

const valid = (patch: Partial<OpeningForm> = {}): OpeningForm => ({
  ...emptyOpeningForm(),
  title: 'CNC Machine Operator',
  categoryName: 'Manufacturing & Production',
  location: 'Jaipur, Rajasthan',
  summary: 'Run and set up 3-axis CNC machines.',
  description: 'You will run our VMC line.',
  ...patch,
});

describe('opening form validation', () => {
  it('accepts a complete opening', () => {
    expect(validateOpening(valid(), { today: TODAY })).toEqual({});
  });

  it('needs the required fields', () => {
    const errors = validateOpening(emptyOpeningForm(), { today: TODAY });
    expect(Object.keys(errors).sort()).toEqual(['categoryName', 'description', 'location', 'summary', 'title']);
  });

  it('holds the contract limits', () => {
    const errors = validateOpening(
      valid({
        title: 'x'.repeat(121),
        summary: 'x'.repeat(301),
        description: 'x'.repeat(8001),
        skills: Array.from({ length: 31 }, (_, i) => `skill ${i}`),
        requirements: Array.from({ length: 26 }, (_, i) => `req ${i}`),
        benefits: ['x'.repeat(301)],
      }),
      { today: TODAY }
    );
    expect(errors.title).toBe('At most 120 characters.');
    expect(errors.summary).toBe('At most 300 characters.');
    expect(errors.description).toBe('At most 8000 characters.');
    expect(errors.skills).toBe('At most 30 skills.');
    expect(errors.requirements).toMatch(/at most 25 items/);
    expect(errors.benefits).toMatch(/at most 300 characters each/);
    expect(validateOpening(valid({ skills: ['x'.repeat(41)] }), { today: TODAY }).skills).toBe('At most 40 characters per skill.');
  });

  it('checks experience, salary and positions', () => {
    expect(validateOpening(valid({ experienceMinYears: '41' }), { today: TODAY }).experienceMinYears).toBeDefined();
    expect(validateOpening(valid({ experienceMinYears: '5', experienceMaxYears: '3' }), { today: TODAY }).experienceMaxYears).toBe('Must be at least the minimum.');
    expect(validateOpening(valid({ salaryMin: '500000', salaryMax: '300000' }), { today: TODAY }).salaryMax).toBe('Must be at least the minimum.');
    expect(validateOpening(valid({ salaryMin: '3.5' }), { today: TODAY }).salaryMin).toBe('Whole rupees only.');
    expect(validateOpening(valid({ salaryVisible: true }), { today: TODAY }).salaryMin).toMatch(/to show it on the website/);
    expect(validateOpening(valid({ positions: '0' }), { today: TODAY }).positions).toBe('Enter 1 to 500.');
    expect(validateOpening(valid({ positions: '501' }), { today: TODAY }).positions).toBe('Enter 1 to 500.');
    expect(validateOpening(valid({ experienceMinYears: '2', experienceMaxYears: '', salaryMax: '450000' }), { today: TODAY })).toEqual({});
  });

  it('lets a past deadline be saved but not published', () => {
    expect(validateOpening(valid({ applicationDeadline: '2026-10-01' }), { today: TODAY })).toEqual({});
    expect(validateOpening(valid({ applicationDeadline: '2026-10-01' }), { today: TODAY, forPublish: true }).applicationDeadline).toMatch(/has passed/);
  });

  it('builds the request, trimming and dropping empty entries', () => {
    const request = toOpeningRequest(
      valid({ title: '  CNC Operator ', experienceMaxYears: '5', salaryMax: '450000', requirements: [' Fanuc ', ''], education: ' ', positions: '4' }),
      3
    );
    expect(request).toMatchObject({
      title: 'CNC Operator',
      experienceMinYears: 0,
      experienceMaxYears: 5,
      salaryMin: null,
      salaryMax: 450000,
      positions: 4,
      requirements: ['Fanuc'],
      education: null,
      applicationDeadline: null,
      version: 3,
    });
    expect('version' in toOpeningRequest(valid())).toBe(false);
  });

  it('adds a skill once, ignoring case and spaces', () => {
    expect(addSkill(['CNC'], '  GD&T ')).toEqual(['CNC', 'GD&T']);
    const skills = ['CNC'];
    expect(addSkill(skills, 'cnc')).toBe(skills);
    expect(addSkill(skills, '   ')).toBe(skills);
  });
});

describe('interview form', () => {
  const NOW = new Date('2026-10-30T04:30:00Z'); // 10:00 in India

  it('takes any https link for an online mode', () => {
    expect(meetingLinkError('TEAMS', 'https://teams.microsoft.com/l/meetup-join/abc')).toBeNull();
    expect(meetingLinkError('TEAMS', 'https://teams.cloud.microsoft/meet/123')).toBeNull();
    expect(meetingLinkError('GOOGLE_MEET', 'https://meet.google.com/abc-defg-hij')).toBeNull();
    expect(meetingLinkError('ZOOM', 'https://us02web.zoom.us/j/123')).toBeNull();
    // eslint-disable-next-line sonarjs/no-clear-text-protocols -- the point of the test: a clear-text link is refused
    expect(meetingLinkError('TEAMS', 'http://teams.microsoft.com/l/x')).toBe('The link must start with https://');
    expect(meetingLinkError('TEAMS', '')).toBe('Paste the meeting link.');
    expect(meetingLinkError('TEAMS', 'not a link')).toBe('That is not a link.');
    expect(meetingLinkError('PHONE', '')).toBeNull();
  });

  it('needs a location in person and a future start', () => {
    const form = { ...emptyInterviewForm(), mode: 'IN_PERSON' as const, date: '2026-10-30', time: '09:30' };
    const errors = validateInterview(form, NOW);
    expect(errors.location).toBeDefined();
    expect(errors.time).toBe('The interview must be in the future.');
    expect(validateInterview({ ...form, location: 'Plant 2, Sitapura', time: '10:30' }, NOW)).toEqual({});
  });

  it('reads the time in the chosen time zone', () => {
    expect(nowIn('Asia/Kolkata', NOW)).toBe('2026-10-30T10:00');
    expect(nowIn('UTC', NOW)).toBe('2026-10-30T04:30');
    // 09:30 is past in India but still ahead in London (04:30 UTC, 04:30 GMT on 30 Oct)
    const london = { ...emptyInterviewForm(), mode: 'PHONE' as const, date: '2026-10-30', time: '09:30', timeZone: 'Europe/London' };
    expect(validateInterview(london, NOW)).toEqual({});
  });

  it('checks the duration', () => {
    const form = { ...emptyInterviewForm(), mode: 'PHONE' as const, date: '2026-11-02', time: '11:00' };
    expect(validateInterview({ ...form, durationMinutes: '10' }, NOW).durationMinutes).toBe('15 to 480 minutes.');
    expect(validateInterview({ ...form, durationMinutes: '481' }, NOW).durationMinutes).toBe('15 to 480 minutes.');
  });

  it('sends only the fields of its mode', () => {
    const request = toInterviewRequest({
      ...emptyInterviewForm(2),
      meetingLink: ' https://meet.google.com/abc ',
      mode: 'GOOGLE_MEET',
      location: 'ignored',
      date: '2026-11-02',
      time: '11:00',
    });
    expect(request).toEqual({
      roundName: 'Round 2',
      mode: 'GOOGLE_MEET',
      meetingLink: 'https://meet.google.com/abc',
      location: null,
      startsAt: '2026-11-02T11:00:00',
      durationMinutes: 45,
      timeZone: 'Asia/Kolkata',
      interviewers: null,
      candidateNotes: null,
    });
  });
});
