import React from 'react';
import type { RoleGuide } from '../content/guideContent';
import { menuLabel } from '../utils/guideLabels';

const List: React.FC<{ title: string; items: string[]; marker: string }> = ({ title, items, marker }) => (
  <div className="space-y-2">
    <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500">{title}</h3>
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2.5 text-sm text-gray-800 dark:text-gray-100">
          <span className={`mt-1.5 w-2 h-2 rounded-sm shrink-0 ${marker}`} aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  </div>
);

/** What one role sees and does: its menu, its work, and what it approves at Level 2. */
export const RoleCard: React.FC<{ guide: RoleGuide }> = ({ guide }) => (
  <section className="apple-card p-6 space-y-5" aria-label={`${guide.name} role`}>
    <div>
      <h2 className="text-xl font-bold text-black dark:text-white">{guide.name}</h2>
      <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">{guide.summary}</p>
    </div>

    <div className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500">Menu</h3>
      <div className="flex flex-wrap gap-1.5">
        {[...guide.menu, 'profile'].map((nav) => (
          <span key={nav} className="text-xs font-medium px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-200">
            {nav === 'profile' ? 'My Profile' : menuLabel(nav)}
            {guide.levelTwoMenu?.includes(nav) && <span className="ml-1 text-emerald-700 dark:text-emerald-400">· Level 2</span>}
          </span>
        ))}
      </div>
    </div>

    <div className="grid gap-5 md:grid-cols-2">
      <List title="Does" items={guide.does} marker="bg-blue-600" />
      {guide.approves.length > 0 ? (
        <List title="Approves at Level 2" items={guide.approves} marker="bg-emerald-600" />
      ) : (
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-neutral-500">Approvals</h3>
          <p className="text-sm text-gray-600 dark:text-neutral-300">
            {guide.id === 'SUPPLIER'
              ? 'Every change a supplier requests is checked by a Supplier Manager.'
              : 'None. This role works at Level 1; what it prepares is approved by a manager.'}
          </p>
        </div>
      )}
    </div>

    {guide.tips.length > 0 && <List title="Good to know" items={guide.tips} marker="bg-amber-500" />}
  </section>
);
