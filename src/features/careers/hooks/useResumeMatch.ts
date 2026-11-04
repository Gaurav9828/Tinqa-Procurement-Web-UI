import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAccess } from '../../../hooks/useAccess';
import type { ApplicationDetail, MatchRequest } from '../types/careers.types';
import { matchResume, needsMatch, toMatchRequest, type MatchResult } from '../utils/resumeMatcher';

/**
 * The résumé match of an application, worked out in the browser from `resumeText` and the opening it came with.
 *
 * The first time a screener opens it (no stored match, or one from an older matcher) the result is saved, once, with
 * POST /match, so the list can show and filter its badge and the L2 approver sees it. Re-running saves it again.
 * People without CAREER_APPLICATION_SCREEN see the result but never save it. Nothing is saved for a résumé without
 * readable text.
 */
export const useResumeMatch = (
  application: ApplicationDetail | null,
  save: (id: number, match: MatchRequest, quiet: boolean) => Promise<unknown>
) => {
  const canSave = useAccess().can('CAREER_APPLICATION_SCREEN');
  const result: MatchResult | null = useMemo(
    () => (application ? matchResume(application.resumeText, application.opening, application.totalExperienceYears ?? null) : null),
    [application]
  );
  const savedFor = useRef<number | null>(null);
  const id = application?.id ?? null;
  const stale = !!application && needsMatch(application.match);

  useEffect(() => {
    if (!canSave || id === null || !result || !stale || savedFor.current === id) return;
    savedFor.current = id;
    void save(id, toMatchRequest(result), true);
  }, [canSave, id, result, stale, save]);

  const rerun = useCallback(() => {
    if (id !== null && result) void save(id, toMatchRequest(result), false);
  }, [id, result, save]);

  return { result, readable: result !== null, canRerun: canSave && result !== null, rerun };
};
