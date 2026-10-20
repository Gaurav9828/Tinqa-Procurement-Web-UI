import React from 'react';
import { APP_NAVIGATION } from '../../../config/permissions.config';
import { GUIDE_ROLE_IDS, ROLE_GUIDES } from '../content/guideContent';

/** Which sidebar items each role opens, as a table. */
export const AccessMatrix: React.FC = () => {
  const columns = APP_NAVIGATION.filter((nav) => GUIDE_ROLE_IDS.some((id) => ROLE_GUIDES[id].menu.includes(nav.id)));
  return (
    <section className="apple-card p-5 space-y-3" aria-labelledby="access-matrix">
      <div>
        <h2 id="access-matrix" className="text-lg font-semibold text-black dark:text-white">Who opens what</h2>
        <p className="text-sm text-gray-500 dark:text-neutral-400">● in the menu · L2 only at Level 2 · — not in the menu</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[880px]">
          <thead>
            <tr className="text-gray-500 dark:text-neutral-400">
              <th scope="col" className="text-left font-semibold p-2 sticky left-0 bg-[var(--bg-secondary)]">Role</th>
              {columns.map((nav) => (
                <th key={nav.id} scope="col" className="font-medium p-2 align-bottom">{nav.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GUIDE_ROLE_IDS.map((id) => {
              const guide = ROLE_GUIDES[id];
              return (
                <tr key={id} className="border-t border-black/5 dark:border-white/10">
                  <th scope="row" className="text-left font-semibold p-2 whitespace-nowrap sticky left-0 bg-[var(--bg-secondary)]">{guide.name}</th>
                  {columns.map((nav) => (
                    <td key={nav.id} className="text-center p-2">
                      {!guide.menu.includes(nav.id) ? (
                        <span className="text-gray-300 dark:text-neutral-600">—</span>
                      ) : guide.levelTwoMenu?.includes(nav.id) ? (
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">L2</span>
                      ) : (
                        <span className="text-[#0071e3]" aria-label="yes">●</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};
