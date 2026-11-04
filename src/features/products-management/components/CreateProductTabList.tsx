import React from 'react';
import type { CREATE_PRODUCT_TABS, CreateProductTab, TabStatus } from '../utils/createProductTabs';

const MARKERS: Record<TabStatus, { label: string; className: string } | null> = {
    error: { label: 'has errors', className: 'bg-rose-500' },
    todo: { label: 'still needed to submit', className: 'bg-amber-500' },
    done: { label: 'done', className: 'bg-emerald-500' },
    optional: null,
};

const ARROW_STEPS: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

interface CreateProductTabListProps {
    tabs: typeof CREATE_PRODUCT_TABS;
    activeTab: CreateProductTab;
    statusOf: (id: CreateProductTab) => TabStatus;
    onSelect: (id: CreateProductTab) => void;
}

/**
 * The parts of the product form, numbered in fill-in order, each with a marker of what it still needs. A column on
 * wide screens, a scrolling row on narrow ones; the arrow keys move between them.
 */
export const CreateProductTabList: React.FC<CreateProductTabListProps> = ({ tabs, activeTab, statusOf, onSelect }) => {
    const onKeyDown = (e: React.KeyboardEvent, index: number) => {
        const step = ARROW_STEPS[e.key];
        if (!step) return;
        e.preventDefault();
        const next = tabs[(index + step + tabs.length) % tabs.length];
        onSelect(next.id);
        document.getElementById(`create-product-tab-${next.id}`)?.focus();
    };

    return (
        <div
            role="tablist"
            aria-label="Product form sections"
            aria-orientation="vertical"
            className="shrink-0 md:w-60 flex md:flex-col gap-1 p-3 overflow-x-auto md:overflow-y-auto border-b md:border-b-0 md:border-r border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]"
        >
            {tabs.map((tab, index) => {
                const selected = tab.id === activeTab;
                const marker = MARKERS[statusOf(tab.id)];
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        id={`create-product-tab-${tab.id}`}
                        aria-selected={selected}
                        aria-controls={`create-product-panel-${tab.id}`}
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
                            <span className="hidden md:block text-[10px] text-gray-400">{tab.hint}</span>
                        </span>
                    </button>
                );
            })}
        </div>
    );
};
