import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import alertReducer from '../../store/alertSlice';
import { GlobalAlertContainer } from '../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../store/useAuthStore';
import { signInAsSuperAdmin } from '../../test/access';
import type { ApiResponse, PageResponse } from '../../types/common.types';
import { createEndpointMatcher, ECOMMERCE_ENDPOINTS } from '../../config/endpointAccess';
import { careersApi } from './api/careersApi';
import { ApplicationDetailPage } from './pages/ApplicationDetailPage';
import { CareersPage } from './pages/CareersPage';
import { CareerApprovalsPanel } from './components/CareerApprovalsPanel';
import { resetCareerCategories } from './hooks/useCareersData';
import type { AdminOpeningRow, ApplicationDetail, ApplicationRow } from './types/careers.types';
import { MATCHER_VERSION, NO_TEXT_MESSAGE } from './utils/resumeMatcher';

// Only the network layer is mocked.
vi.mock('./api/careersApi', () => ({
  careersApi: {
    settings: vi.fn(),
    updateSettings: vi.fn(),
    categories: vi.fn(),
    openings: vi.fn(),
    opening: vi.fn(),
    createOpening: vi.fn(),
    updateOpening: vi.fn(),
    publishOpening: vi.fn(),
    closeOpening: vi.fn(),
    applications: vi.fn(),
    application: vi.fn(),
    resume: vi.fn(),
    saveMatch: vi.fn(),
    shortlist: vi.fn(),
    select: vi.fn(),
    reject: vi.fn(),
    withdraw: vi.fn(),
    approve: vi.fn(),
    returnDecision: vi.fn(),
    scheduleInterview: vi.fn(),
    rescheduleInterview: vi.fn(),
    cancelInterview: vi.fn(),
    recordOutcome: vi.fn(),
  },
}));

const api = vi.mocked(careersApi);
const ok = <T,>(data: T, message = 'OK'): ApiResponse<T> => ({ success: true, message, errorCode: null, data, timestamp: '', path: '' });
const page = <T,>(content: T[]): PageResponse<T> => ({
  content, number: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0, first: true, last: true, empty: !content.length,
});

const RESUME_TEXT = `Ravi Kumar, CNC Operator. 5 years running Fanuc VMC and CNC lathe machines.
Skills: CNC programming, GD&T, vernier and micrometer, 5S. ITI Machinist.`;

const detail = (patch: Partial<ApplicationDetail> = {}): ApplicationDetail => ({
  id: 42,
  referenceNumber: 'APP-2026-000042',
  fullName: 'Ravi Kumar',
  email: 'ravi@example.com',
  phone: '+91 9876543210',
  currentLocation: 'Jaipur',
  totalExperienceYears: 5,
  currentTitle: 'CNC Operator',
  currentCompany: 'Shakti Tools',
  noticePeriodDays: 30,
  expectedCtc: 420000,
  status: 'APPLIED',
  match: null,
  opening: {
    id: 7,
    jobCode: 'JOB-2026-0007',
    title: 'CNC Machine Operator',
    skills: ['CNC', 'GD&T', '5S'],
    requirements: ['2+ years on Fanuc VMC machines'],
    niceToHave: [],
    experienceMinYears: 2,
    experienceMaxYears: 6,
    education: 'ITI',
    description: null,
  },
  appliedAt: '2026-10-29T10:00:00',
  updatedAt: null,
  pending: null,
  nextInterviewAt: null,
  currentCtc: 360000,
  linkedinUrl: 'https://linkedin.com/in/ravi',
  portfolioUrl: 'javascript:alert(1)',
  coverLetter: 'I run VMCs.',
  source: 'LinkedIn',
  talentPool: false,
  consentAt: '2026-10-29T10:00:00',
  emailVerifiedAt: '2026-10-29T09:58:00',
  resume: { fileName: 'ravi.pdf', sizeBytes: 120_000, pages: 2, available: true },
  resumeText: RESUME_TEXT,
  interviews: [],
  history: [{ action: 'APPLIED', fromStatus: null, toStatus: 'APPLIED', note: null, actor: null, at: '2026-10-29T10:00:00' }],
  emails: [{ subject: 'We received your application', status: 'SENT', sentAt: '2026-10-29T10:01:00', createdAt: '2026-10-29T10:00:00' }],
  ...patch,
});

const STORED_MATCH = { label: 'STRONG' as const, score: 88, matchedSkills: [], missingSkills: [], summary: '', matcherVersion: MATCHER_VERSION, computedBy: 'admin', computedAt: '2026-10-29T11:00:00' };

const renderAt = (path: string, element: React.ReactNode, route: string) => {
  const store = configureStore({ reducer: { alert: alertReducer } });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <GlobalAlertContainer />
        <Routes>
          <Route path={route} element={element} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

const openApplication = () => renderAt('/careers/applications/42', <ApplicationDetailPage />, '/careers/applications/:id');

const signInViewer = () =>
  useAuthStore.setState({
    token: 'test-token',
    isAuthenticated: true,
    user: { userId: 3, username: 'viewer', email: 'viewer@tinqa.com', role: 'ADMIN_L1', authClient: 'web', isFirstLogin: false, permissions: ['CAREER_OPENING_VIEW', 'CAREER_APPLICATION_VIEW'] },
  });

beforeEach(() => {
  vi.clearAllMocks();
  resetCareerCategories();
  api.settings.mockResolvedValue(ok({ enabled: true, updatedBy: null, updatedAt: null }));
  api.saveMatch.mockImplementation(async (_id, match) => ok(detail({ match: { ...match, computedBy: 'admin', computedAt: '2026-10-30T09:00:00' } })));
});

describe('application actions by permission', () => {
  it('lets a Level 1 screener shortlist, withdraw and reject, but not approve', async () => {
    signInAsSuperAdmin('ADMIN_L1', 'screener');
    api.application.mockResolvedValue(ok(detail()));
    openApplication();

    const panel = await screen.findByRole('region', { name: 'Next step' });
    expect(within(panel).getByRole('button', { name: 'Shortlist' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Mark withdrawn' })).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Reject' })).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Schedule interview' })).not.toBeInTheDocument();
  });

  it('sends a shortlist for Level 2 approval with the note', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L1', 'screener');
    api.application.mockResolvedValue(ok(detail({ match: STORED_MATCH })));
    api.shortlist.mockResolvedValue(ok(detail({ status: 'SHORTLIST_PENDING', match: STORED_MATCH, pending: { kind: 'SHORTLIST', requestedBy: 'screener', requestedAt: '2026-10-30T09:00:00', note: 'Good fit' } })));
    openApplication();

    await user.click(await screen.findByRole('button', { name: 'Shortlist' }));
    await user.type(screen.getByRole('textbox', { name: /Note for the approver/ }), 'Good fit');
    await user.click(screen.getByRole('button', { name: 'Send for approval' }));

    await waitFor(() => expect(api.shortlist).toHaveBeenCalledWith(42, 'Good fit'));
    expect(await screen.findByText('Shortlist awaiting L2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Shortlist' })).not.toBeInTheDocument();
  });

  it('lets a Level 2 approver confirm someone else’s shortlist', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L2', 'approver');
    const waiting = detail({ status: 'SHORTLIST_PENDING', match: STORED_MATCH, pending: { kind: 'SHORTLIST', requestedBy: 'screener', requestedAt: '2026-10-30T09:00:00', note: 'Good fit' } });
    api.application.mockResolvedValue(ok(waiting));
    api.approve.mockResolvedValue(ok(detail({ status: 'SHORTLISTED', match: STORED_MATCH })));
    openApplication();

    await user.click(await screen.findByRole('button', { name: 'Approve shortlist' }));
    await user.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(api.approve).toHaveBeenCalledWith(42, null));
    expect(await screen.findByRole('button', { name: 'Schedule interview' })).toBeInTheDocument();
  });

  it('hides Approve from the approver who asked for it, and says why', async () => {
    signInAsSuperAdmin('ADMIN_L2', 'Screener');
    api.application.mockResolvedValue(
      ok(detail({ status: 'SELECTION_PENDING', match: STORED_MATCH, pending: { kind: 'SELECTION', requestedBy: 'screener', requestedAt: '2026-10-30T09:00:00', note: null } }))
    );
    openApplication();

    expect(await screen.findByText(/You asked for this selection, so another Level 2 approver confirms or returns it/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Return' })).not.toBeInTheDocument();
  });

  it('keeps Select disabled until an interview is passed', async () => {
    signInAsSuperAdmin('ADMIN_L1', 'screener');
    api.application.mockResolvedValue(ok(detail({ status: 'INTERVIEWING', match: STORED_MATCH })));
    openApplication();
    expect(await screen.findByRole('button', { name: 'Select' })).toBeDisabled();
    expect(screen.getByText('Select: Record a passed interview first.')).toBeInTheDocument();
  });

  it('shows a view-only user no actions and never saves the match', async () => {
    signInViewer();
    api.application.mockResolvedValue(ok(detail()));
    openApplication();

    const panel = await screen.findByRole('region', { name: 'Next step' });
    expect(within(panel).queryAllByRole('button')).toHaveLength(0);
    expect(screen.getByRole('img', { name: /Match score/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Re-run match' })).not.toBeInTheDocument();
    expect(api.saveMatch).not.toHaveBeenCalled();
  });
});

describe('résumé match on the application', () => {
  it('saves the first match once, quietly, with the matcher version', async () => {
    signInAsSuperAdmin('ADMIN_L1', 'screener');
    api.application.mockResolvedValue(ok(detail()));
    openApplication();

    await waitFor(() => expect(api.saveMatch).toHaveBeenCalledTimes(1));
    const [id, match] = api.saveMatch.mock.calls[0];
    expect(id).toBe(42);
    expect(match).toMatchObject({ label: 'STRONG', matcherVersion: MATCHER_VERSION, matchedSkills: ['CNC', 'GD&T', '5S'] });
    expect(await screen.findByText(/Saved: Strong match/)).toBeInTheDocument();
    expect(api.saveMatch).toHaveBeenCalledTimes(1);
  });

  it('does not save again when the stored match is current, but re-runs on request', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L1', 'screener');
    api.application.mockResolvedValue(ok(detail({ match: STORED_MATCH })));
    openApplication();

    await user.click(await screen.findByRole('button', { name: 'Re-run match' }));
    await waitFor(() => expect(api.saveMatch).toHaveBeenCalledTimes(1));
  });

  it('asks for a manual review when the résumé has no text', async () => {
    signInAsSuperAdmin('ADMIN_L1', 'screener');
    api.application.mockResolvedValue(ok(detail({ resumeText: null })));
    openApplication();

    expect(await screen.findByText(NO_TEXT_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Re-run match' })).not.toBeInTheDocument();
    expect(api.saveMatch).not.toHaveBeenCalled();
  });

  it('opens only https links the candidate gave', async () => {
    signInAsSuperAdmin('ADMIN_L1', 'screener');
    api.application.mockResolvedValue(ok(detail({ match: STORED_MATCH })));
    openApplication();
    expect(await screen.findByRole('link', { name: /LinkedIn/ })).toHaveAttribute('href', 'https://linkedin.com/in/ravi');
    expect(screen.queryByRole('link', { name: /Portfolio/ })).not.toBeInTheDocument();
  });
});

describe('résumé preview', () => {
  it('loads the PDF only when shown, and revokes its URL when the page closes', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn(() => 'blob:resume');
    const revokeObjectURL = vi.fn();
    Object.assign(window.URL, { createObjectURL, revokeObjectURL });
    signInAsSuperAdmin('ADMIN_L1', 'screener');
    api.application.mockResolvedValue(ok(detail({ match: STORED_MATCH })));
    api.resume.mockResolvedValue(new Blob(['%PDF-1.7'], { type: 'application/pdf' }));
    const view = openApplication();

    await user.click(await screen.findByRole('button', { name: 'Show résumé' }));
    expect(api.resume).toHaveBeenCalledWith(42);
    expect(await screen.findByTitle('Résumé of Ravi Kumar')).toHaveAttribute('src', 'blob:resume');
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument();

    // Hiding and showing again costs nothing
    await user.click(screen.getByRole('button', { name: 'Hide résumé' }));
    await user.click(screen.getByRole('button', { name: 'Show résumé' }));
    expect(api.resume).toHaveBeenCalledTimes(1);

    view.unmount();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:resume');
  });

  it('never asks for a résumé that is no longer kept', async () => {
    signInAsSuperAdmin('ADMIN_L1', 'screener');
    api.application.mockResolvedValue(ok(detail({ match: STORED_MATCH, resume: { fileName: 'ravi.pdf', sizeBytes: 1, pages: null, available: false } })));
    openApplication();
    expect(await screen.findAllByText(/no longer kept/)).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'Show résumé' })).not.toBeInTheDocument();
    expect(api.resume).not.toHaveBeenCalled();
  });
});

const OPENING_ROW: AdminOpeningRow = {
  id: 7, jobCode: 'JOB-2026-0007', title: 'CNC Machine Operator', category: { id: 1, name: 'Manufacturing & Production', slug: 'manufacturing-production' },
  location: 'Jaipur', workMode: 'ON_SITE', employmentType: 'FULL_TIME', status: 'DRAFT', positions: 4, applicationDeadline: '2099-12-15',
  publishedAt: null, updatedAt: null, applications: { total: 5, fresh: 3, inProgress: 1, selected: 1 },
};

describe('openings page', () => {
  it('loads the openings and the categories once, and nothing else', async () => {
    signInAsSuperAdmin('ADMIN_L1', 'screener');
    api.openings.mockResolvedValue(ok(page([OPENING_ROW])));
    api.categories.mockResolvedValue(ok([{ id: 1, name: 'Manufacturing & Production', slug: 'manufacturing-production', openings: 1 }]));
    renderAt('/careers', <CareersPage />, '/careers');

    expect(await screen.findByRole('link', { name: 'CNC Machine Operator' })).toBeInTheDocument();
    expect(screen.getByLabelText('3 new, 1 in progress, 1 selected')).toBeInTheDocument();
    expect(api.openings).toHaveBeenCalledTimes(1);
    expect(api.categories).toHaveBeenCalledTimes(1);
    expect(api.settings).toHaveBeenCalledTimes(1);
    expect(api.applications).not.toHaveBeenCalled();
  });

  it('publishes a draft and reloads only the list', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L1', 'screener');
    api.openings.mockResolvedValue(ok(page([OPENING_ROW])));
    api.categories.mockResolvedValue(ok([]));
    api.publishOpening.mockResolvedValue(ok({ ...OPENING_ROW, status: 'PUBLISHED' } as never));
    renderAt('/careers', <CareersPage />, '/careers');

    await user.click(await screen.findByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(api.publishOpening).toHaveBeenCalledWith(7));
    await waitFor(() => expect(api.openings).toHaveBeenCalledTimes(2));
    expect(api.categories).toHaveBeenCalledTimes(1);
  });

  it('hides posting from those who may only view', async () => {
    signInViewer();
    api.openings.mockResolvedValue(ok(page([OPENING_ROW])));
    api.categories.mockResolvedValue(ok([]));
    renderAt('/careers', <CareersPage />, '/careers');
    await screen.findByRole('link', { name: 'CNC Machine Operator' });
    expect(screen.queryByRole('link', { name: /New opening/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Publish' })).not.toBeInTheDocument();
  });
});

describe('Careers tab on the website', () => {
  const openPage = () => {
    api.openings.mockResolvedValue(ok(page([OPENING_ROW])));
    api.categories.mockResolvedValue(ok([]));
    renderAt('/careers', <CareersPage />, '/careers');
  };

  it('lets only a Level 2 Super Admin hide it (after confirming) and show it again', async () => {
    const user = userEvent.setup();
    signInAsSuperAdmin('ADMIN_L2', 'owner');
    api.updateSettings
      .mockResolvedValueOnce(ok({ enabled: false, updatedBy: 'owner', updatedAt: '2026-10-30T12:00:00' }, 'The Careers tab is hidden from the website'))
      .mockResolvedValueOnce(ok({ enabled: true, updatedBy: 'owner', updatedAt: '2026-10-30T12:05:00' }, 'The Careers tab is back on the website'));
    openPage();

    const card = await screen.findByRole('region', { name: 'Careers tab on the website' });
    await within(card).findByText('Shown');
    await user.click(within(card).getByRole('button', { name: 'Hide Careers tab' }));
    // Nothing changes until the confirmation
    expect(api.updateSettings).not.toHaveBeenCalled();
    expect(await screen.findByText('Hide the Careers tab?')).toBeInTheDocument();
    // The modal's own confirm button (the card's button opened it)
    const hideButtons = screen.getAllByRole('button', { name: 'Hide Careers tab' });
    await user.click(hideButtons[hideButtons.length - 1]);
    await waitFor(() => expect(api.updateSettings).toHaveBeenCalledWith(false));
    expect(await within(card).findByText('Hidden')).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'Show Careers tab again' }));
    await waitFor(() => expect(api.updateSettings).toHaveBeenLastCalledWith(true));
    expect(await within(card).findByText('Shown')).toBeInTheDocument();
    // Only the setting changed: the openings were not reloaded
    expect(api.openings).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a Level 1 Super Admin', () => signInAsSuperAdmin('ADMIN_L1', 'screener')],
    ['a viewer', () => signInViewer()],
  ])('shows %s the state but no switch', async (_who, signIn) => {
    signIn();
    api.settings.mockResolvedValue(ok({ enabled: false, updatedBy: 'owner', updatedAt: '2026-10-30T12:00:00' }));
    openPage();
    const card = await screen.findByRole('region', { name: 'Careers tab on the website' });
    expect(await within(card).findByText('Hidden')).toBeInTheDocument();
    expect(within(card).getByText(/Only a Super Admin \(Level 2\)/)).toBeInTheDocument();
    expect(within(card).queryByRole('button')).not.toBeInTheDocument();
  });
});

const WAITING_ROW: ApplicationRow = {
  ...detail({ status: 'SHORTLIST_PENDING', match: null, pending: { kind: 'SHORTLIST', requestedBy: 'screener', requestedAt: '2026-10-30T09:00:00', note: 'Strong CNC' } }),
  match: { label: 'WEAK', score: 55 },
  opening: { id: 7, jobCode: 'JOB-2026-0007', title: 'CNC Machine Operator' },
};

describe('Approvals Hub careers panel', () => {
  const renderPanel = (enabled: boolean, onChanged = vi.fn()) =>
    renderAt('/approvals', <CareerApprovalsPanel enabled={enabled} onChanged={onChanged} />, '/approvals');

  it('loads nothing while its tab is closed', () => {
    signInAsSuperAdmin('ADMIN_L2', 'approver');
    renderPanel(false);
    expect(api.applications).not.toHaveBeenCalled();
  });

  it('lists waiting shortlists and selections oldest first, and refreshes only itself and the summary after a decision', async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    signInAsSuperAdmin('ADMIN_L2', 'approver');
    api.applications.mockResolvedValue(ok(page([WAITING_ROW])));
    api.returnDecision.mockResolvedValue(ok(detail({ status: 'APPLIED' })));
    renderPanel(true, onChanged);

    const row = await screen.findByRole('row', { name: /Ravi Kumar/ });
    expect(api.applications).toHaveBeenCalledWith(expect.objectContaining({ status: ['SHORTLIST_PENDING', 'SELECTION_PENDING'], sort: 'OLDEST' }));
    expect(within(row).getByText('Strong CNC')).toBeInTheDocument();
    expect(within(row).getByText(/Weak match/)).toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: 'Return' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Return' }));
    expect(await within(dialog).findByText('Note is required.')).toBeInTheDocument();
    await user.type(within(dialog).getByRole('textbox', { name: 'Note' }), 'Check notice period');
    await user.click(within(dialog).getByRole('button', { name: 'Return' }));

    await waitFor(() => expect(api.returnDecision).toHaveBeenCalledWith(42, 'Check notice period'));
    await waitFor(() => expect(api.applications).toHaveBeenCalledTimes(2));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('shows the requester no decision buttons', async () => {
    signInAsSuperAdmin('ADMIN_L2', 'screener');
    api.applications.mockResolvedValue(ok(page([WAITING_ROW])));
    renderPanel(true);
    const row = await screen.findByRole('row', { name: /Ravi Kumar/ });
    expect(within(row).queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(within(row).getByText(/You asked for it/)).toBeInTheDocument();
  });
});

describe('careers endpoints', () => {
  const ecommerce = createEndpointMatcher(ECOMMERCE_ENDPOINTS);
  it('maps each staff endpoint to its permission', () => {
    expect(ecommerce('get', '/admin/careers/openings?status=DRAFT')).toBe('CAREER_OPENING_VIEW');
    expect(ecommerce('post', '/admin/careers/openings/7/publish')).toBe('CAREER_OPENING_MANAGE');
    expect(ecommerce('get', '/admin/careers/applications/42/resume')).toBe('CAREER_APPLICATION_VIEW');
    expect(ecommerce('post', '/admin/careers/applications/42/match')).toBe('CAREER_APPLICATION_SCREEN');
    expect(ecommerce('post', '/admin/careers/applications/42/decision/return')).toBe('CAREER_DECISION_APPROVE');
    expect(ecommerce('put', '/admin/careers/applications/42/interviews/3')).toBe('CAREER_APPLICATION_SCREEN');
    expect(ecommerce('get', '/careers/openings')).toBeNull();
  });
});
