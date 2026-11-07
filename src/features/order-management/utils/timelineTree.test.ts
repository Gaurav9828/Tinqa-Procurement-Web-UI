import { describe, it, expect } from 'vitest';
import { branchTone, buildTimelineTree } from './timelineTree';
import type { TimelineEvent } from '../types/orderTimeline.types';

const event = (id: string, patch: Partial<TimelineEvent> = {}): TimelineEvent => ({
  id, at: '2026-10-05T10:00:00Z', kind: 'STATUS', title: id, detail: null, actorRole: null, actorName: null, tone: 'DONE',
  branchId: null, branchTitle: null, ...patch,
});

describe('timeline tree', () => {
  it('keeps the main line in order and puts each branch where its first step happened', () => {
    const nodes = buildTimelineTree([
      event('submitted'),
      event('approved'),
      event('payment-7-1', { kind: 'PAYMENT', branchId: 'payment-7', branchTitle: 'Advance payment ₹354.00' }),
      event('shipped'),
      event('payment-7-2', { kind: 'PAYMENT', branchId: 'payment-7', tone: 'WAITING' }),
      event('change-4-1', { kind: 'CHANGE_REQUEST', branchId: 'change-4' }),
    ]);
    expect(nodes.map((n) => (n.type === 'event' ? n.event.id : `branch:${n.branchId}`))).toEqual([
      'submitted', 'approved', 'branch:payment-7', 'shipped', 'branch:change-4',
    ]);
    const payment = nodes[2];
    expect(payment.type === 'branch' && payment.title).toBe('Advance payment ₹354.00');
    expect(payment.type === 'branch' && payment.events.map((e) => e.id)).toEqual(['payment-7-1', 'payment-7-2']);
    // A branch without a title takes its first step's
    const change = nodes[4];
    expect(change.type === 'branch' && change.title).toBe('change-4-1');
  });

  it('keeps each return of failed pieces as its own branch, with its kind', () => {
    const nodes = buildTimelineTree([
      event('status-5'),
      event('return-3-1', { kind: 'RETURN', branchId: 'return-3', branchTitle: 'Return of 2 PCS (failed testing)' }),
      event('return-4-1', { kind: 'RETURN', branchId: 'return-4', branchTitle: 'Return of 1 PCS (failed testing)' }),
      event('return-3-2', { kind: 'RETURN', branchId: 'return-3' }),
    ]);
    expect(nodes.map((n) => (n.type === 'branch' ? `${n.kind}:${n.branchId}:${n.events.length}` : n.event.id))).toEqual([
      'status-5', 'RETURN:return-3:2', 'RETURN:return-4:1',
    ]);
  });

  it('says where a branch stands from its last step', () => {
    expect(branchTone([event('a'), event('b', { tone: 'REJECTED' })])).toBe('REJECTED');
    expect(branchTone([])).toBe('INFO');
  });
});
