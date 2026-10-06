/**
 * Local intent detection for customer messages (English). Rule-based and deterministic:
 * no model, no network — nothing leaves the browser.
 */

export type CustomerIntent =
  | 'GRATITUDE'
  | 'RESOLVED'
  | 'CLOSE_REQUEST'
  | 'STILL_BROKEN'
  | 'STATUS_REQUEST'
  | 'REFUND_RETURN'
  | 'FRUSTRATION'
  | 'SHARED_INFO'
  | 'GREETING'
  | 'QUESTION';

interface IntentRule {
  intent: CustomerIntent;
  patterns: RegExp[];
  weight: number;
}

// Word-boundary patterns; the input is lower-cased and whitespace-normalised first.
const RULES: IntentRule[] = [
  {
    intent: 'CLOSE_REQUEST',
    weight: 3,
    patterns: [/\b(you can|please|pls|go ahead and|feel free to)\s+close\b/, /\bclose (the|this|my) (ticket|query|request|case)\b/, /\bno (further|more) (help|assistance|support) (needed|required)\b/],
  },
  {
    intent: 'RESOLVED',
    weight: 3,
    patterns: [
      /\b(it|this|that|everything|all)\s*('s|is)?\s*(working|works) (now|fine|again|perfectly|great)\b/,
      /\b(working|works) (now|fine|again)\b/,
      /\b(issue|problem|it)\s*('s|is|has been|got)?\s*(fixed|resolved|solved|sorted|gone)\b/,
      /\b(fixed|resolved|solved|sorted) (it|now)\b/,
      /\ball good( now)?\b/,
      /\bproblem solved\b/,
    ],
  },
  {
    intent: 'GRATITUDE',
    weight: 2,
    patterns: [/\b(thanks|thank you|thank u|thx|ty|tysm|appreciate (it|your help|the help)|grateful|cheers)\b/, /\b(great|awesome|amazing|excellent|helpful) (help|support|service)\b/],
  },
  {
    intent: 'STILL_BROKEN',
    weight: 4,
    patterns: [
      /\bstill (not|isn't|isnt|doesn't|doesnt|having|getting|the same|broken|happening|an issue|a problem|dead|stuck|faulty)\b/,
      /\bstill (flicker|crash|fail|freez|disconnect|overheat|restart|reboot|beep|blink|leak|drop|lag|stop)\w*/,
      /\bkeeps? (flicker|crash|fail|freez|disconnect|overheat|restart|reboot|turning off|switching off|stopping)\w*/,
      /\b(not|isn't|isnt|doesn't|doesnt|didn't|didnt|won't|wont|can't|cant) (work|working|help|fix|fixed|solve|solved|resolve|resolved|turn on|charge|connect)\b/,
      /\b(same|the) (issue|problem) (again|persists|continues|is back)\b/,
      /\b(happened|happening|started|came back) again\b/,
      /\bno luck\b/,
      /\bstopped working\b/,
    ],
  },
  {
    intent: 'STATUS_REQUEST',
    weight: 2,
    patterns: [
      /\b(any|an) (update|news|progress)\b/,
      /\bwhen (will|can|do|does|is|would)\b/,
      /\bhow long\b/,
      /\b(eta|status|timeline)\b/,
      /\bwhere is my\b/,
      /\bstill waiting\b/,
      /\bhaven't (heard|received)\b/,
    ],
  },
  {
    intent: 'REFUND_RETURN',
    weight: 3,
    patterns: [/\b(refund|money back|reimburse|chargeback)\b/, /\b(return|replace|replacement|exchange)\b/],
  },
  {
    intent: 'FRUSTRATION',
    weight: 2,
    patterns: [
      /\b(worst|terrible|horrible|awful|useless|pathetic|ridiculous|unacceptable|disgusting)\b/,
      /\b(angry|furious|frustrat\w*|disappoint\w*|fed up)\b/,
      /!{2,}/,
    ],
  },
  {
    intent: 'SHARED_INFO',
    weight: 2,
    patterns: [/\b(attached|attaching|uploaded|sharing|sent you|here is|here's|please find)\b/, /\b(video|photo|picture|pic|screenshot|recording|invoice|receipt)\b/],
  },
  {
    intent: 'GREETING',
    weight: 1,
    patterns: [/^(hi|hello|hey|good (morning|afternoon|evening))\b/],
  },
];

export interface DetectedIntent {
  intent: CustomerIntent;
  score: number;
}

const normalise = (text: string) => text.toLowerCase().replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim();

/** Ranked intents for a customer message (highest score first). */
export const detectIntents = (text: string | null | undefined): DetectedIntent[] => {
  const input = normalise(text ?? '');
  if (!input) return [];

  const scores = new Map<CustomerIntent, number>();
  for (const rule of RULES) {
    const hits = rule.patterns.filter((pattern) => pattern.test(input)).length;
    if (hits > 0) scores.set(rule.intent, rule.weight + (hits - 1));
  }
  if (input.includes('?')) scores.set('QUESTION', 1);

  // "Thanks, but it's still flickering" is a problem report, not a sign-off.
  if (scores.has('STILL_BROKEN')) {
    scores.delete('RESOLVED');
    scores.delete('CLOSE_REQUEST');
    if (scores.has('GRATITUDE')) scores.set('GRATITUDE', 0.5);
  }

  return [...scores.entries()]
    .map(([intent, score]) => ({ intent, score }))
    .sort((a, b) => b.score - a.score);
};

export const hasIntent = (intents: DetectedIntent[], intent: CustomerIntent) => intents.some((i) => i.intent === intent);
