import React from 'react';
import { Check, RefreshCw, ScanSearch, X } from 'lucide-react';
import type { MatchLabel, StoredMatch } from '../types/careers.types';
import { LABEL_TEXT, NO_TEXT_MESSAGE, WEIGHTS, type MatchPart, type MatchResult } from '../utils/resumeMatcher';
import { MATCH_TONES, formatDateTime } from '../utils/careers';

const RING_COLOR: Record<MatchLabel, string> = { STRONG: '#059669', WEAK: '#d97706', NONE: '#e11d48' };
const PART_LABELS: Record<MatchPart, string> = {
  skills: 'Skills',
  requirements: 'Requirements',
  experience: 'Experience',
  education: 'Education',
  niceToHave: 'Nice to have',
};

/** The score as a ring: the coloured arc is the score out of 100. */
const ScoreRing: React.FC<{ score: number; label: MatchLabel }> = ({ score, label }) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 80 80" className="w-24 h-24 shrink-0" role="img" aria-label={`Match score ${score} of 100`}>
      <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="8" className="stroke-black/10 dark:stroke-white/10" />
      <circle cx="40" cy="40" r={radius} fill="none" strokeWidth="8" stroke={RING_COLOR[label]} strokeLinecap="round"
        strokeDasharray={`${(score / 100) * circumference} ${circumference}`} transform="rotate(-90 40 40)" />
      <text x="40" y="44" textAnchor="middle" className="fill-current text-black dark:text-white" fontSize="18" fontWeight="700">{score}</text>
    </svg>
  );
};

const SkillList: React.FC<{ title: string; skills: string[]; found: boolean }> = ({ title, skills, found }) => (
  <div className="space-y-1">
    <p className="font-semibold text-gray-600 dark:text-gray-300">{title} ({skills.length})</p>
    {skills.length === 0 ? (
      <p className="text-gray-400">None</p>
    ) : (
      <ul className="flex flex-wrap gap-1" aria-label={title}>
        {skills.map((skill) => (
          <li key={skill} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${found ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
            {found ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {skill}
          </li>
        ))}
      </ul>
    )}
  </div>
);

/**
 * The résumé match: computed in the browser from the résumé's text and the opening (utils/resumeMatcher), with its
 * score, label, skills found and missing, how the experience fits and why. The saved copy (what the list and the
 * approver see) is noted with who saved it.
 */
export const MatchPanel: React.FC<{
  result: MatchResult | null;
  stored: StoredMatch | null;
  canRerun: boolean;
  busy: boolean;
  onRerun: () => void;
}> = ({ result, stored, canRerun, busy, onRerun }) => (
  <section aria-label="Résumé match" className="apple-card p-5 space-y-4 text-xs">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-sm font-semibold flex items-center gap-2">
        <ScanSearch className="w-4 h-4 text-[#0071e3]" /> Résumé match
      </h2>
      {canRerun && (
        <button type="button" onClick={onRerun} disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold cursor-pointer disabled:opacity-50">
          <RefreshCw className="w-3.5 h-3.5" /> Re-run match
        </button>
      )}
    </div>

    {result ? (
      <>
        <div className="flex items-center gap-4">
          <ScoreRing score={result.score} label={result.label} />
          <div className="space-y-1.5 min-w-0">
            <span className={`inline-flex px-2.5 py-1 rounded-full border text-xs font-bold ${MATCH_TONES[result.label]}`}>{LABEL_TEXT[result.label]}</span>
            <p className="text-gray-700 dark:text-gray-300 break-words">{result.summary}</p>
            <p className="text-gray-500">Experience: {result.experience.text}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SkillList title="Skills found" skills={result.matchedSkills} found />
          <SkillList title="Skills missing" skills={result.missingSkills} found={false} />
        </div>
        <table className="w-full text-left" aria-label="How the score is made">
          <thead className="text-gray-400 text-[10px] uppercase tracking-wider">
            <tr>
              <th className="pb-1 pr-2 font-semibold">Part</th>
              <th className="pb-1 pr-2 font-semibold">Weight</th>
              <th className="pb-1 pr-2 font-semibold">Found</th>
              <th className="pb-1 font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {(Object.keys(WEIGHTS) as MatchPart[]).map((part) => (
              <tr key={part} className={result.parts[part].applies ? '' : 'text-gray-400'}>
                <td className="py-1 pr-2">{PART_LABELS[part]}</td>
                <td className="py-1 pr-2">{WEIGHTS[part]} %</td>
                <td className="py-1 pr-2">{result.parts[part].applies ? `${Math.round(result.parts[part].score * 100)} %` : 'Not asked'}</td>
                <td className="py-1">{result.parts[part].detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    ) : (
      <p className="px-3 py-2 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300" role="note">{NO_TEXT_MESSAGE}</p>
    )}

    {stored && (
      <p className="text-gray-400">
        Saved: {LABEL_TEXT[stored.label]} ({stored.score}){stored.computedBy ? ` by ${stored.computedBy}` : ''}
        {stored.computedAt ? `, ${formatDateTime(stored.computedAt)}` : ''}. The list, its match filter and the approver see the saved result.
      </p>
    )}
  </section>
);
