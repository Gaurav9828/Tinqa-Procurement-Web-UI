import React, { useCallback, useState } from 'react';
import { Plus, RefreshCw, Search, TicketPercent } from 'lucide-react';
import type { PromoCodeDetail, PromoCodeRequest, PromoCodeSummary, PromoCustomer, PromoStatusFilter } from '../types/promoCode.types';
import { usePromoCodeDetail, usePromoCodes } from '../hooks/usePromoCodes';
import { usePromoCodeActions } from '../hooks/usePromoCodeActions';
import { PromoCodeTable } from '../components/PromoCodeTable';
import { PromoCodeDetailDialog } from '../components/PromoCodeDetailDialog';
import { PromoCodeFormModal } from '../components/PromoCodeFormModal';
import { PROMO_SEARCH_MAX_LENGTH, STATUS_FILTERS } from '../utils/promoCodeForm';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { Pager } from '../../../components/ui/Pager';
import { SOLID_TONE } from '../../../components/ui/actionTones';

type FormState = { kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; detail: PromoCodeDetail };
/** A change waiting to be confirmed: the Super Admin's (switch, delete, restore) or a sharer's (email, storefront). */
interface PendingChange {
  kind: 'switch-off' | 'switch-on' | 'delete' | 'restore' | 'share' | 'storefront-on' | 'storefront-off';
  id: number;
  code: string;
  /** share: who gets the email. */
  customers?: PromoCustomer[];
}
type PromoRef = Pick<PromoCodeSummary, 'id' | 'code' | 'active'>;

const CONFIRM: Record<PendingChange['kind'], { title: string; description: string; label: string; tone: 'danger' | 'approve' | 'warning' }> = {
  'switch-off': {
    title: 'Switch off',
    description: 'Nobody can use it while it is switched off, even within its dates. Orders already placed keep their discount. You can switch it back on.',
    label: 'Switch off',
    tone: 'warning',
  },
  'switch-on': { title: 'Switch on', description: 'Customers it is for can use it again within its dates and limits.', label: 'Switch on', tone: 'approve' },
  delete: {
    title: 'Delete',
    description:
      'It disappears from the list and nobody can use it. Orders already placed keep their discount and its use history stays. Choose "Deleted" in the status filter to find it and restore it.',
    label: 'Delete',
    tone: 'danger',
  },
  restore: { title: 'Restore', description: 'It comes back as it was before it was deleted (switched on or off), and can be edited again.', label: 'Restore', tone: 'approve' },
  share: {
    title: 'Email',
    description: 'Each customer gets an email with the code, its discount, products and dates. Only they can use it, signed in with that email address.',
    label: 'Send email',
    tone: 'approve',
  },
  'storefront-on': {
    title: 'Show on the storefront',
    description: 'Every visitor of the website sees this code and its offer, on every page and at checkout, while it can be used. You can remove it again at any time.',
    label: 'Show it',
    tone: 'approve',
  },
  'storefront-off': {
    title: 'Remove from the storefront',
    description: 'Visitors no longer see it. The code keeps working for anyone who already has it.',
    label: 'Remove',
    tone: 'warning',
  },
};

/** "Email the code to Asha Rao?" / "Email the code to 3 customers?" */
const shareTitle = (customers: PromoCustomer[]) =>
  customers.length === 1 ? `Email the code to ${customers[0].name}?` : `Email the code to ${customers.length} customers?`;

/**
 * Promo Codes: /promo-codes (PROMO_CODE_VIEW). Senior staff look codes up to tell customers which one to use (a code
 * for chosen customers only as TINQA***); sharers (PROMO_CODE_SHARE) email such a code to its customers and show an
 * everyone code on the storefront; only the Super Admin (PROMO_CODE_MANAGE) creates, edits, switches off or on,
 * deletes and restores them and sees every code (docs/promo-codes.md).
 */
export const PromoCodesPage: React.FC = () => {
  const list = usePromoCodes();
  const actions = usePromoCodeActions();
  const [openId, setOpenId] = useState<number | null>(null);
  const detail = usePromoCodeDetail(openId);
  const [form, setForm] = useState<FormState>({ kind: 'closed' });
  const [pending, setPending] = useState<PendingChange | null>(null);
  const toggle = (code: PromoRef) => setPending({ kind: code.active ? 'switch-off' : 'switch-on', id: code.id, code: code.code });
  const askDelete = (code: PromoRef) => setPending({ kind: 'delete', id: code.id, code: code.code });
  const askRestore = (code: PromoRef) => setPending({ kind: 'restore', id: code.id, code: code.code });
  const askShare = (code: PromoRef, customers: PromoCustomer[]) => setPending({ kind: 'share', id: code.id, code: code.code, customers });
  const askStorefront = (code: PromoRef, shown: boolean) =>
    setPending({ kind: shown ? 'storefront-on' : 'storefront-off', id: code.id, code: code.code });

  const closeForm = useCallback(() => {
    actions.clearServerErrors();
    setForm({ kind: 'closed' });
  }, [actions]);

  // After a save only the list and that code's detail change
  const submit = async (body: PromoCodeRequest): Promise<boolean> => {
    const id = form.kind === 'edit' ? form.detail.id : null;
    const saved = await actions.save(id, body);
    if (!saved) return false;
    list.refresh();
    if (id !== null && openId === id) detail.replace(saved);
    return true;
  };

  const confirmPending = async () => {
    if (!pending) return;
    const { kind, id } = pending;
    let saved: PromoCodeDetail | null;
    if (kind === 'delete') saved = await actions.remove(id);
    else if (kind === 'restore') saved = await actions.restore(id);
    else if (kind === 'share') {
      // Everyone listed = all of its customers: sent as "all", so one added meanwhile gets it too
      const everyone = detail.data?.id === id && pending.customers?.length === detail.data.customers.length;
      saved = await actions.share(id, everyone ? [] : (pending.customers ?? []).map((c) => c.id));
    } else if (kind === 'storefront-on' || kind === 'storefront-off') saved = await actions.setShownOnStorefront(id, kind === 'storefront-on');
    else saved = await actions.setActive(id, kind === 'switch-on');
    if (!saved) return;
    // Emailing changes nothing the list shows; only the detail's "last emailed"
    if (kind !== 'share') list.refresh();
    if (openId === id) detail.replace(saved);
    setPending(null);
  };
  const confirm = pending ? CONFIRM[pending.kind] : null;
  let confirmTitle = '';
  if (pending && confirm) confirmTitle = pending.kind === 'share' ? shareTitle(pending.customers ?? []) : `${confirm.title} ${pending.code}?`;

  const renderList = () => {
    if (list.codes.length === 0) {
      let message = list.search || list.status ? 'No promo codes match.' : 'No promo codes yet.';
      if (list.isLoading) message = 'Loading...';
      else if (list.loadFailed) message = 'The promo codes could not be loaded.';
      return (
        <div className="apple-card">
          <p role={list.isLoading ? 'status' : undefined} className="p-6 text-center text-xs text-gray-500 dark:text-neutral-400">{message}</p>
        </div>
      );
    }
    return (
      <>
        <PromoCodeTable
          codes={list.codes}
          isLoading={list.isLoading}
          canManage={actions.canManage}
          onOpen={(code) => setOpenId(code.id)}
          onToggle={toggle}
          onDelete={askDelete}
          onRestore={askRestore}
        />
        <Pager page={list.page} totalPages={list.totalPages} disabled={list.isLoading} onPage={list.setPage} />
      </>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
            <TicketPercent className="w-5 h-5 text-[#0071e3]" /> Promo Codes
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Codes customers type at checkout for a percentage off{list.hasLoaded ? ` (${list.totalElements} codes)` : ''}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => list.refresh()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer bg-[#0071e3]/10 text-[#0071e3] dark:text-blue-300 hover:bg-[#0071e3]/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${list.isLoading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          {actions.canManage && (
            <button
              type="button"
              onClick={() => setForm({ kind: 'create' })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer ${SOLID_TONE.approve}`}
            >
              <Plus className="w-3.5 h-3.5" /> New promo code
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Search promo codes</span>
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={list.search}
            maxLength={PROMO_SEARCH_MAX_LENGTH}
            onChange={(e) => list.setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && list.searchNow()}
            placeholder="Code starts with… (e.g. TINQAhR)"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-gray-500">
          Status
          <select
            value={list.status}
            onChange={(e) => list.setStatus(e.target.value as PromoStatusFilter)}
            className="px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-black dark:text-white cursor-pointer"
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {renderList()}

      {openId !== null && form.kind === 'closed' && (
        <PromoCodeDetailDialog
          id={openId}
          detail={detail.data}
          isLoading={detail.isLoading}
          canManage={actions.canManage}
          canShare={actions.canShare}
          onShare={askShare}
          onStorefront={askStorefront}
          onEdit={(d) => setForm({ kind: 'edit', detail: d })}
          onToggle={toggle}
          onDelete={askDelete}
          onRestore={askRestore}
          onClose={() => setOpenId(null)}
        />
      )}

      {actions.canManage && form.kind !== 'closed' && (
        <PromoCodeFormModal
          detail={form.kind === 'edit' ? form.detail : null}
          busy={actions.isSubmitting}
          serverErrors={actions.serverErrors}
          onSubmit={submit}
          onClose={closeForm}
        />
      )}

      <ConfirmationModal
        isOpen={pending !== null}
        actionType="CONFIRM"
        title={confirmTitle}
        description={confirm?.description ?? ''}
        tone={confirm?.tone ?? 'approve'}
        confirmLabel={confirm?.label}
        isSubmitting={actions.isSubmitting}
        onClose={() => setPending(null)}
        onConfirm={() => void confirmPending()}
      />
    </div>
  );
};
