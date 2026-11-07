import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * The tabbed modal every larger create, edit and preview window uses (first built for products): the parts in a
 * numbered list (a column on wide screens, a scrolling row on narrow ones), the open part beside it, and Back / Next
 * with the window's own buttons below. A modal with little to show stays a single view instead.
 */

/** One part of a tabbed modal. */
export interface ModalTab<T extends string = string> {
  id: T;
  label: string;
  /** One line under the label saying what the part holds. */
  hint?: string;
}

/** A tab's marker: an error to fix, something still needed to save, all needed filled in, or nothing needed. */
export type TabStatus = 'error' | 'todo' | 'done' | 'optional';

const MARKERS: Record<TabStatus, { label: string; className: string } | null> = {
  error: { label: 'has errors', className: 'bg-rose-500' },
  todo: { label: 'still needed to submit', className: 'bg-amber-500' },
  done: { label: 'done', className: 'bg-emerald-500' },
  optional: null,
};

const ARROW_STEPS: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

/** `complete`: whether a tab with required fields has them all (leave out tabs with none). */
export const statusOfTab = <T extends string>(id: T, errorTabs: ReadonlySet<T>, complete: Partial<Record<T, boolean>> = {}): TabStatus => {
  if (errorTabs.has(id)) return 'error';
  if (complete[id] === undefined) return 'optional';
  return complete[id] ? 'done' : 'todo';
};

/** The first tab (in the modal's order) in this set, or null when it is empty. */
export const firstTabIn = <T extends string>(tabs: readonly ModalTab<T>[], wanted: ReadonlySet<T>): T | null =>
  tabs.find((tab) => wanted.has(tab.id))?.id ?? null;

/** The tab holding a form field (e.g. the one the browser's own check stopped on), or null outside every tab. */
export const tabOfField = <T extends string>(field: EventTarget | null): T | null => {
  const panel = field instanceof Element ? field.closest<HTMLElement>('[data-tab-panel]') : null;
  return (panel?.dataset.tabPanel as T | undefined) ?? null;
};

/** The props of one part's panel: only the active one is shown, the others stay mounted so nothing typed is lost. */
export const modalTabPanelProps = <T extends string>(idPrefix: string, id: T, activeTab: T) => ({
  role: 'tabpanel',
  id: `${idPrefix}-panel-${id}`,
  'aria-labelledby': `${idPrefix}-tab-${id}`,
  'data-tab-panel': id,
  hidden: activeTab !== id,
  className: 'space-y-4',
});

/**
 * The open tab, back on `first` whenever `resetKey` changes (another record opened), adjusted during render rather
 * than in an effect.
 */
export const useModalTab = <T extends string>(first: T, resetKey?: unknown) => {
  const [activeTab, setActiveTab] = useState<T>(first);
  const [shownKey, setShownKey] = useState(resetKey);
  if (shownKey !== resetKey) {
    setShownKey(resetKey);
    setActiveTab(first);
  }
  return [activeTab, setActiveTab] as const;
};

interface ModalTabListProps<T extends string> {
  idPrefix: string;
  label: string;
  tabs: readonly ModalTab<T>[];
  activeTab: T;
  statusOf?: (id: T) => TabStatus;
  onSelect: (id: T) => void;
}

/** The numbered parts, each with a marker of what it still needs; the arrow keys move between them. */
export const ModalTabList = <T extends string>({ idPrefix, label, tabs, activeTab, statusOf, onSelect }: ModalTabListProps<T>) => {
  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const step = ARROW_STEPS[e.key];
    if (!step) return;
    e.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    onSelect(next.id);
    document.getElementById(`${idPrefix}-tab-${next.id}`)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation="vertical"
      className="shrink-0 md:w-60 flex md:flex-col gap-1 p-3 overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]"
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === activeTab;
        const marker = MARKERS[statusOf?.(tab.id) ?? 'optional'];
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={`shrink-0 flex items-start gap-2.5 px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
              selected
                ? 'bg-white dark:bg-neutral-800 shadow-sm text-black dark:text-white'
                : 'text-gray-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <span
              className={`mt-0.5 shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                selected ? 'bg-[#0071e3] text-white' : 'bg-black/10 dark:bg-white/15'
              }`}
            >
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-medium whitespace-nowrap">
                {tab.label}
                {marker && <span role="img" aria-label={marker.label} className={`w-2 h-2 rounded-full ${marker.className}`} />}
              </span>
              {tab.hint && <span className="hidden md:block text-[10px] text-gray-400">{tab.hint}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
};

const navButtonClassName =
  'flex items-center gap-1 px-3 py-2 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-black dark:text-white rounded-xl font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';

const SIZES = {
  md: 'max-w-3xl h-[80vh]',
  lg: 'max-w-4xl h-[86vh]',
  xl: 'max-w-6xl h-[92vh]',
} as const;

export interface TabbedModalProps<T extends string> {
  /** Ids of the tabs and panels (`{idPrefix}-tab-{id}`, `{idPrefix}-panel-{id}`); unique per modal. */
  idPrefix: string;
  /** The tablist's accessible name, e.g. "Quotation sections". */
  tabsLabel: string;
  heading: React.ReactNode;
  /** One line under the heading. */
  subheading?: React.ReactNode;
  /** The dialog's accessible name when the heading is not plain text. */
  ariaLabel?: string;
  onClose: () => void;
  /** Given, the body is a form and the actions' submit button submits it; left out, the body is read-only. */
  onSubmit?: (e: React.FormEvent) => void;
  tabs: readonly ModalTab<T>[];
  activeTab: T;
  onSelectTab: (id: T) => void;
  statusOf?: (id: T) => TabStatus;
  /** Shown above every part (e.g. an approval or rejection note). */
  notes?: React.ReactNode;
  /** Above the footer's buttons on every tab (e.g. the form's errors or a running total). */
  footer?: React.ReactNode;
  /** Next to the actions: what still stops the save. */
  status?: React.ReactNode;
  /** Cancel, save and submit buttons. */
  actions: React.ReactNode;
  size?: keyof typeof SIZES;
  /** Disables the close button (e.g. while saving). */
  closeDisabled?: boolean;
  /** One `<section {...modalTabPanelProps(idPrefix, id, activeTab)}>` per tab. */
  children: React.ReactNode;
}

export const TabbedModal = <T extends string>({
  idPrefix,
  tabsLabel,
  heading,
  subheading,
  ariaLabel,
  onClose,
  onSubmit,
  tabs,
  activeTab,
  onSelectTab,
  statusOf,
  notes,
  footer,
  status,
  actions,
  size = 'xl',
  closeDisabled,
  children,
}: TabbedModalProps<T>) => {
  const tabIndex = Math.max(0, tabs.findIndex((tab) => tab.id === activeTab));
  const current = tabs[tabIndex];
  const titleId = `${idPrefix}-title`;

  const body = (
    <>
      <div className="flex-1 min-h-0 flex flex-col md:flex-row">
        <ModalTabList idPrefix={idPrefix} label={tabsLabel} tabs={tabs} activeTab={activeTab} statusOf={statusOf} onSelect={onSelectTab} />

        <div className="flex-1 min-w-0 overflow-y-auto p-6 space-y-4">
          {notes}
          {current && (
            <div>
              <h3 className="text-sm font-semibold text-black dark:text-white">{current.label}</h3>
              {current.hint && <p className="text-gray-400">{current.hint}</p>}
            </div>
          )}
          {children}
        </div>
      </div>

      {/* Footer: the same on every tab */}
      <div className="px-6 py-4 space-y-3 border-t border-black/10 dark:border-white/10">
        {footer}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => onSelectTab(tabs[tabIndex - 1].id)} disabled={tabIndex === 0} className={navButtonClassName}>
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>
            <button type="button" onClick={() => onSelectTab(tabs[tabIndex + 1].id)} disabled={tabIndex >= tabs.length - 1} className={navButtonClassName}>
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <span className="text-gray-400">
              Step {tabIndex + 1} of {tabs.length}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {status}
            {actions}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        {...(ariaLabel ? { 'aria-label': ariaLabel } : { 'aria-labelledby': titleId })}
        className={`bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full ${SIZES[size]} max-h-[96vh] flex flex-col overflow-hidden shadow-xl text-xs`}
      >
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-black/10 dark:border-white/10">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-bold text-black dark:text-white">
              {heading}
            </h2>
            {subheading && <p className="text-gray-500 dark:text-neutral-400 mt-0.5">{subheading}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            aria-label="Close"
            className="p-1 text-gray-400 hover:text-black dark:hover:text-white rounded-lg cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {onSubmit ? (
          // The browser's own checks (e.g. a quantity over the limit) stop on a hidden field: show its tab first
          <form
            onSubmit={onSubmit}
            onInvalidCapture={(e) => onSelectTab(tabOfField<T>(e.target) ?? activeTab)}
            className="flex-1 min-h-0 flex flex-col"
          >
            {body}
          </form>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">{body}</div>
        )}
      </div>
    </div>
  );
};
