import type { AdminSettableStatus, TicketDetail, TicketMessage } from '../types/supportTicket.types';
import { REPLY_MAX_LENGTH } from '../types/supportTicket.types';
import { sortMessages } from '../utils/supportTicket.utils';
import { detectIntents, hasIntent, type CustomerIntent, type DetectedIntent } from './intents';

/**
 * Local reply assistant: reads the ticket (latest customer message, issue type, status, product)
 * and proposes ready-to-send replies plus a next status. Pure and deterministic — it never sends
 * anything itself; the admin chooses.
 */

export interface ReplySuggestion {
  id: string;
  /** Short button label, e.g. "Thank & close". */
  label: string;
  /** Plain-text reply, ready to send. */
  text: string;
  /** Sending this suggestion should also close the ticket (after confirmation). */
  closesTicket?: boolean;
}

export interface StatusSuggestion {
  status: AdminSettableStatus;
  label: string;
  reason: string;
}

export interface AssistantResult {
  /** Why these suggestions were made, shown to the admin. */
  summary: string;
  intents: DetectedIntent[];
  replies: ReplySuggestion[];
  statusSuggestion: StatusSuggestion | null;
}

const FOLLOW_UP_AFTER_MS = 48 * 60 * 60 * 1000;
const MAX_REPLIES = 3;

interface Context {
  name: string;
  product: string;
  reference: string;
  issueType: string;
  status: string;
  hasSupportReplied: boolean;
}

const firstName = (authorName: string | null | undefined) => {
  const first = (authorName ?? '').trim().split(/\s+/)[0];
  // Only use plausible names (letters, apostrophes, hyphens).
  return first && /^[\p{L}'-]{2,30}$/u.test(first) ? first : 'there';
};

const productPhrase = (productName: string | null | undefined) => (productName ? `your ${productName}` : 'your device');

const reply = (id: string, label: string, text: string, closesTicket = false): ReplySuggestion => ({
  id,
  label,
  text: text.slice(0, REPLY_MAX_LENGTH),
  closesTicket,
});

// ---------- templates ----------

const closingReplies = (c: Context): ReplySuggestion[] => [
  reply(
    'thank-and-close',
    'Thank & close',
    `You're welcome, ${c.name}! Glad everything is sorted. I'll close this ticket now — just reply here if anything comes up again.`,
    true
  ),
  reply(
    'confirm-before-close',
    'Ask before closing',
    `Happy to help, ${c.name}! Is there anything else I can do for you, or shall I go ahead and close this ticket?`
  ),
];

const stillBrokenReplies = (c: Context): ReplySuggestion[] => {
  const byIssue: Record<string, ReplySuggestion> = {
    WARRANTY_CLAIM: reply(
      'warranty-next-step',
      'Start warranty check',
      `Sorry the issue is still there, ${c.name}. Since ${c.product} is covered for this, we'll take it forward as a warranty claim. Could you share the order number and a short video showing the problem? We'll arrange a repair or replacement.`
    ),
    TECHNICAL_SUPPORT: reply(
      'troubleshoot',
      'Next troubleshooting step',
      `Sorry that didn't fix it, ${c.name}. Could you try a full reset of ${c.product} (switch it off at the power for 30 seconds, then on again) and let me know if the problem returns? If it does, a short video would help us diagnose it.`
    ),
    ORDER_SHIPPING: reply(
      'shipping-escalate',
      'Escalate with courier',
      `Sorry this still isn't resolved, ${c.name}. I'm escalating it with our logistics team now and will update you on this ticket as soon as I hear back.`
    ),
  };
  return [
    byIssue[c.issueType] ??
      reply('investigate', 'Investigating', `Sorry the problem is still there, ${c.name}. I'm looking into this further and will get back to you shortly.`),
    reply('ask-details', 'Ask for details', `Thanks for letting us know, ${c.name}. Could you describe exactly what happens and when it started, and share a photo or short video if possible? That will help us fix it faster.`),
  ];
};

const statusReplies = (c: Context): ReplySuggestion[] => [
  c.issueType === 'ORDER_SHIPPING'
    ? reply('shipping-update', 'Shipping update', `Hi ${c.name}, I'm checking the latest status of your order with our logistics team and will update you here shortly. Thanks for your patience!`)
    : reply('progress-update', 'Progress update', `Hi ${c.name}, thanks for your patience. Your request (${c.reference}) is being worked on and I'll update you here as soon as there's progress.`),
  reply('eta', 'Give a timeline', `Hi ${c.name}, we expect to have an update for you within 1–2 business days. I'll post it here as soon as we do.`),
];

const refundReplies = (c: Context): ReplySuggestion[] => [
  reply(
    'refund-process',
    'Explain return/refund',
    `Hi ${c.name}, I can help with that. Please share your order number and the reason for the return, and I'll check eligibility and the next steps for a replacement or refund.`
  ),
  reply('refund-review', 'Under review', `Thanks, ${c.name}. I've passed your request to our returns team for review and will confirm the outcome here.`),
];

const frustrationReplies = (c: Context): ReplySuggestion[] => [
  reply(
    'apologise',
    'Apologise & take ownership',
    `I'm really sorry for the trouble, ${c.name}, and I understand how frustrating this is. I'm personally looking into it now and will keep you updated here until it's resolved.`
  ),
];

const sharedInfoReplies = (c: Context): ReplySuggestion[] => [
  reply('thanks-reviewing', 'Thanks, reviewing', `Thanks for sharing that, ${c.name}. I'm reviewing it now and will get back to you shortly.`),
];

const firstResponseReplies = (c: Context): ReplySuggestion[] => {
  const byIssue: Record<string, string> = {
    WARRANTY_CLAIM: `Hi ${c.name}, thanks for reaching out about ${c.product}. Could you share your order number and a short video of the issue? We'll check the warranty and arrange the next steps.`,
    TECHNICAL_SUPPORT: `Hi ${c.name}, thanks for reaching out. Sorry you're having trouble with ${c.product}. Could you tell me when the issue started and whether a restart changes anything?`,
    ORDER_SHIPPING: `Hi ${c.name}, thanks for getting in touch. I'm checking your order status now and will update you here shortly.`,
    COMPLAINT: `Hi ${c.name}, thank you for telling us about this, and I'm sorry for your experience. I'm looking into it and will get back to you as soon as possible.`,
  };
  return [
    reply('acknowledge', 'Acknowledge', byIssue[c.issueType] ?? `Hi ${c.name}, thanks for reaching out. I'm looking into your request (${c.reference}) and will get back to you shortly.`),
  ];
};

const genericReplies = (c: Context): ReplySuggestion[] => [
  reply('looking-into-it', 'Looking into it', `Thanks, ${c.name}. I'm looking into this and will get back to you shortly.`),
  reply('more-info', 'Ask for more info', `Thanks for the details, ${c.name}. Could you share a little more information so I can help you faster?`),
];

const followUpReplies = (c: Context): ReplySuggestion[] => [
  reply('follow-up', 'Follow up', `Hi ${c.name}, just checking in — did the steps above help? Let me know if you still need anything.`),
  reply('follow-up-close', 'Follow up & offer close', `Hi ${c.name}, we haven't heard back in a while, so I'll assume everything is fine. Feel free to reply here if you still need help.`),
];

// ---------- status suggestion ----------

const statusFor = (intents: DetectedIntent[], current: string): StatusSuggestion | null => {
  const wantsClose = !hasIntent(intents, 'STILL_BROKEN') && (hasIntent(intents, 'CLOSE_REQUEST') || hasIntent(intents, 'RESOLVED') || hasIntent(intents, 'GRATITUDE'));
  const pick = (status: AdminSettableStatus, label: string, reason: string): StatusSuggestion | null =>
    status === current ? null : { status, label, reason };

  if (wantsClose) {
    return hasIntent(intents, 'CLOSE_REQUEST') || hasIntent(intents, 'RESOLVED')
      ? pick('CLOSED', 'Close the ticket?', 'The customer says the issue is resolved.')
      : pick('RESOLVED', 'Mark as resolved?', 'The customer thanked support.');
  }
  if (['STILL_BROKEN', 'STATUS_REQUEST', 'REFUND_RETURN', 'SHARED_INFO', 'FRUSTRATION'].some((i) => hasIntent(intents, i as CustomerIntent))) {
    return pick('IN_PROGRESS', 'Mark in progress?', 'The customer needs further action from support.');
  }
  return null;
};

const summaryFor = (intents: DetectedIntent[]): string => {
  const top = intents[0]?.intent;
  const map: Partial<Record<CustomerIntent, string>> = {
    CLOSE_REQUEST: 'The customer asked to close the ticket.',
    RESOLVED: 'The customer says the issue is resolved.',
    GRATITUDE: 'The customer is thanking support.',
    STILL_BROKEN: 'The customer says the problem is not fixed.',
    STATUS_REQUEST: 'The customer is asking for an update.',
    REFUND_RETURN: 'The customer is asking about a return, replacement or refund.',
    FRUSTRATION: 'The customer sounds frustrated.',
    SHARED_INFO: 'The customer shared information or media.',
  };
  return (top && map[top]) || 'Suggested replies for the latest customer message.';
};

// ---------- entry point ----------

const latest = (messages: TicketMessage[], authorType: string) => [...messages].reverse().find((m) => m.authorType === authorType) ?? null;

/** Suggestions for the ticket's current state, or null when nothing should be suggested. */
export const suggestReplies = (ticket: TicketDetail, now: number = Date.now()): AssistantResult | null => {
  if (!ticket.canReply) return null;

  const messages = sortMessages(ticket.messages);
  const conversation = messages.filter((m) => m.authorType !== 'SYSTEM');
  const lastCustomer = latest(conversation, 'CUSTOMER');
  const lastMessage = conversation[conversation.length - 1] ?? null;

  const context: Context = {
    name: firstName(lastCustomer?.authorName),
    product: productPhrase(ticket.productName),
    reference: ticket.referenceNumber,
    issueType: String(ticket.issueType),
    status: String(ticket.status),
    hasSupportReplied: conversation.some((m) => m.authorType === 'SUPPORT'),
  };

  // Support spoke last: only suggest a follow-up once the customer has been quiet for a while.
  if (lastMessage && lastMessage.authorType === 'SUPPORT') {
    const quietFor = now - new Date(lastMessage.createdAt).getTime();
    if (!(quietFor >= FOLLOW_UP_AFTER_MS)) return null;
    return {
      summary: 'No reply from the customer for over 2 days.',
      intents: [],
      replies: followUpReplies(context),
      statusSuggestion: ticket.status === 'RESOLVED' ? null : { status: 'RESOLVED', label: 'Mark as resolved?', reason: 'The customer has not replied for over 2 days.' },
    };
  }

  if (!lastCustomer) return null;

  const intents = detectIntents(lastCustomer.message);
  const replies: ReplySuggestion[] = [];
  const add = (items: ReplySuggestion[]) => items.forEach((item) => !replies.some((r) => r.id === item.id) && replies.push(item));

  if (hasIntent(intents, 'FRUSTRATION')) add(frustrationReplies(context));
  if (hasIntent(intents, 'STILL_BROKEN')) add(stillBrokenReplies(context));
  else if (hasIntent(intents, 'CLOSE_REQUEST') || hasIntent(intents, 'RESOLVED') || hasIntent(intents, 'GRATITUDE')) add(closingReplies(context));
  if (hasIntent(intents, 'REFUND_RETURN')) add(refundReplies(context));
  if (hasIntent(intents, 'STATUS_REQUEST')) add(statusReplies(context));
  if (hasIntent(intents, 'SHARED_INFO')) add(sharedInfoReplies(context));
  if (!context.hasSupportReplied) add(firstResponseReplies(context));
  if (replies.length === 0) add(genericReplies(context));

  return {
    summary: summaryFor(intents),
    intents,
    replies: replies.slice(0, MAX_REPLIES),
    statusSuggestion: ticket.canClose ? statusFor(intents, context.status) : null,
  };
};
