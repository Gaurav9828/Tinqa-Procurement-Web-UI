import { describe, it, expect } from 'vitest';
import { detectIntents } from './intents';
import { suggestReplies } from './suggestReplies';
import type { TicketDetail, TicketMessage } from '../types/supportTicket.types';

const NOW = new Date('2026-10-06T12:00:00').getTime();

const msg = (id: number, authorType: string, message: string, createdAt = '2026-10-06T11:00:00', authorName: string | null = 'Asha Rao'): TicketMessage => ({
  id,
  authorType,
  authorName,
  message,
  createdAt,
});

const ticket = (messages: TicketMessage[], overrides: Partial<TicketDetail> = {}): TicketDetail => ({
  id: 7,
  referenceNumber: 'TQ-Q-000007',
  subject: 'LEDs flicker',
  issueType: 'WARRANTY_CLAIM',
  productId: 3,
  productName: 'SummitX',
  status: 'AWAITING_CUSTOMER',
  unreadByCustomer: false,
  createdAt: '2026-10-04T09:00:00',
  customerEmail: 'asha@example.com',
  canReply: true,
  canClose: true,
  messages,
  ...overrides,
});

/** A conversation where support already replied once, ending with `customerText`. */
const withCustomerReply = (customerText: string, overrides: Partial<TicketDetail> = {}) =>
  ticket(
    [
      msg(1, 'CUSTOMER', 'The LEDs flicker after 10 minutes.', '2026-10-04T09:00:00'),
      msg(2, 'SUPPORT', 'Please try a reset.', '2026-10-05T09:00:00', 'TinQa Support - Ravi'),
      msg(3, 'CUSTOMER', customerText),
    ],
    overrides
  );

const intentsOf = (text: string) => detectIntents(text).map((i) => i.intent);

describe('detectIntents', () => {
  it.each([
    ['Thanks a lot!', 'GRATITUDE'],
    ['Thank you so much for the help', 'GRATITUDE'],
    ["It's working now", 'RESOLVED'],
    ['The issue is fixed', 'RESOLVED'],
    ['You can close the ticket', 'CLOSE_REQUEST'],
    ['It still flickers every few minutes', 'STILL_BROKEN'],
    ["The reset didn't work", 'STILL_BROKEN'],
    ['It keeps disconnecting from wifi', 'STILL_BROKEN'],
    ['Any update on this?', 'STATUS_REQUEST'],
    ['Where is my order?', 'STATUS_REQUEST'],
    ['I want a refund', 'REFUND_RETURN'],
    ['This is the worst service ever', 'FRUSTRATION'],
    ['Here is the video you asked for', 'SHARED_INFO'],
  ])('"%s" → %s', (text, intent) => {
    expect(intentsOf(text)).toContain(intent);
  });

  it('treats "thanks, but it is still broken" as a problem, not a sign-off', () => {
    const intents = intentsOf("Thanks, but it's still not working");
    expect(intents[0]).toBe('STILL_BROKEN');
    expect(intents).not.toContain('RESOLVED');
  });

  it('is case- and punctuation-insensitive and handles curly apostrophes', () => {
    expect(intentsOf('IT’S WORKING NOW!!')).toContain('RESOLVED');
  });

  it('returns nothing for empty input', () => {
    expect(detectIntents('')).toEqual([]);
    expect(detectIntents(null)).toEqual([]);
  });
});

describe('suggestReplies', () => {
  it('after "thanks, it works now" suggests thank-and-close (closes the ticket) and proposes closing', () => {
    const result = suggestReplies(withCustomerReply('Thanks a lot, it works now!'), NOW)!;
    expect(result.summary).toMatch(/resolved/i);
    expect(result.replies[0]).toMatchObject({ id: 'thank-and-close', closesTicket: true });
    expect(result.replies[0].text).toContain("You're welcome, Asha!");
    expect(result.replies.map((r) => r.id)).toContain('confirm-before-close');
    expect(result.statusSuggestion).toMatchObject({ status: 'CLOSED' });
  });

  it('after a plain "thank you" offers closing replies but only suggests marking resolved', () => {
    const result = suggestReplies(withCustomerReply('Thank you!'), NOW)!;
    expect(result.replies[0].id).toBe('thank-and-close');
    expect(result.statusSuggestion).toMatchObject({ status: 'RESOLVED' });
  });

  it('honours an explicit close request', () => {
    const result = suggestReplies(withCustomerReply('All sorted, you can close the ticket.'), NOW)!;
    expect(result.statusSuggestion?.status).toBe('CLOSED');
  });

  it('never suggests closing when the problem persists, and picks an issue-specific next step', () => {
    const result = suggestReplies(withCustomerReply('Thanks, but it still flickers.'), NOW)!;
    expect(result.replies.some((r) => r.closesTicket)).toBe(false);
    expect(result.replies[0].id).toBe('warranty-next-step');
    expect(result.replies[0].text).toContain('your SummitX');
    expect(result.statusSuggestion).toMatchObject({ status: 'IN_PROGRESS' });
  });

  it('uses issue-type specific troubleshooting for technical tickets', () => {
    const result = suggestReplies(withCustomerReply("The reset didn't work", { issueType: 'TECHNICAL_SUPPORT' }), NOW)!;
    expect(result.replies[0].id).toBe('troubleshoot');
  });

  it('answers status questions on shipping tickets with a shipping update', () => {
    const result = suggestReplies(withCustomerReply('Any update on my order?', { issueType: 'ORDER_SHIPPING' }), NOW)!;
    expect(result.replies[0].id).toBe('shipping-update');
  });

  it('leads with an apology when the customer is frustrated, then the refund path', () => {
    const result = suggestReplies(withCustomerReply('This is unacceptable!! I want a refund.'), NOW)!;
    expect(result.replies.map((r) => r.id).slice(0, 2)).toEqual(['apologise', 'refund-process']);
  });

  it('acknowledges shared media', () => {
    const result = suggestReplies(withCustomerReply('Here is the video'), NOW)!;
    expect(result.replies[0].id).toBe('thanks-reviewing');
  });

  it('suggests an issue-specific acknowledgement as the first response', () => {
    const result = suggestReplies(ticket([msg(1, 'CUSTOMER', 'The LEDs flicker after 10 minutes.')], { status: 'OPEN' }), NOW)!;
    expect(result.replies.map((r) => r.id)).toContain('acknowledge');
    expect(result.replies.find((r) => r.id === 'acknowledge')!.text).toMatch(/order number and a short video/);
  });

  it('falls back to generic replies when nothing specific is detected', () => {
    const result = suggestReplies(withCustomerReply('ok'), NOW)!;
    expect(result.replies.map((r) => r.id)).toEqual(['looking-into-it', 'more-info']);
    expect(result.statusSuggestion).toBeNull();
  });

  it('suggests nothing right after support replied, but a follow-up once the customer is quiet for 2+ days', () => {
    const t = ticket([msg(1, 'CUSTOMER', 'Help', '2026-10-06T09:00:00'), msg(2, 'SUPPORT', 'Try a reset', '2026-10-06T10:00:00', 'Support')]);
    expect(suggestReplies(t, NOW)).toBeNull();

    const quiet = ticket([msg(1, 'CUSTOMER', 'Help', '2026-10-03T09:00:00'), msg(2, 'SUPPORT', 'Try a reset', '2026-10-03T10:00:00', 'Support')]);
    const result = suggestReplies(quiet, NOW)!;
    expect(result.replies[0].id).toBe('follow-up');
    expect(result.statusSuggestion?.status).toBe('RESOLVED');
  });

  it('ignores system notes when deciding who spoke last', () => {
    const t = ticket([msg(1, 'CUSTOMER', 'Thanks, all good now'), msg(2, 'SYSTEM', 'Marked as in progress by support', '2026-10-06T11:30:00', 'TinQa Support')]);
    expect(suggestReplies(t, NOW)!.replies[0].id).toBe('thank-and-close');
  });

  it('suggests nothing for a closed (read-only) ticket', () => {
    expect(suggestReplies(withCustomerReply('Thanks!', { canReply: false, canClose: false, status: 'CLOSED' }), NOW)).toBeNull();
  });

  it('does not suggest the status the ticket already has', () => {
    const result = suggestReplies(withCustomerReply('Still broken', { status: 'IN_PROGRESS' }), NOW)!;
    expect(result.statusSuggestion).toBeNull();
  });

  it('falls back to "there" for missing or implausible names', () => {
    expect(suggestReplies(ticket([msg(1, 'CUSTOMER', 'Thanks!', undefined, null)]), NOW)!.replies[0].text).toContain('there!');
    expect(suggestReplies(ticket([msg(1, 'CUSTOMER', 'Thanks!', undefined, '<script>x')]), NOW)!.replies[0].text).not.toContain('<script>');
  });

  it('returns at most 3 replies, each within the 2000-character limit', () => {
    const result = suggestReplies(withCustomerReply('Unacceptable!! Still not working, any update? I want a refund. Here is a video.'), NOW)!;
    expect(result.replies.length).toBeLessThanOrEqual(3);
    for (const r of result.replies) expect(r.text.length).toBeLessThanOrEqual(2000);
  });
});
