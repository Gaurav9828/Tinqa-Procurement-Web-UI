import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../../store/alertSlice';
import { DESIGNATIONS } from '../../config/access';
import { APP_NAVIGATION } from '../../config/permissions.config';
import { useAccess } from '../../hooks/useAccess';
import { RequireNavAccess } from '../../auth/RouteGuards';
import { signInAsSuperAdmin } from '../../test/access';
import { useAuthStore } from '../../store/useAuthStore';
import { EXTERNAL_ACTOR_NAMES, GUIDE_FLOWS, GUIDE_ROLE_IDS, ROLE_GUIDES, flowsFor } from './content/guideContent';
import { buildGuidePdf, guideFileName } from './pdf/exportGuidePdf';
import { UserGuidePage } from './pages/UserGuidePage';

const downloadGuidePdf = vi.fn();
vi.mock('./pdf/exportGuidePdf', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./pdf/exportGuidePdf')>()),
  downloadGuidePdf: (...args: unknown[]) => downloadGuidePdf(...args),
}));

afterEach(() => downloadGuidePdf.mockReset());

const signInWith = (permissions: string[]) =>
  useAuthStore.setState({
    token: 't',
    isAuthenticated: true,
    user: { userId: 2, username: 'u', email: 'u@tinqa.com', role: 'ADMIN_L2', authClient: 'web', isFirstLogin: false, permissions },
  });

// The guide must keep up with the app: these fail when a role, menu item or actor is added without updating it.
describe('guide content', () => {
  it('covers every designation and dealers', () => {
    expect(GUIDE_ROLE_IDS).toEqual(expect.arrayContaining([...DESIGNATIONS, 'DEALER']));
    expect(GUIDE_ROLE_IDS).toHaveLength(DESIGNATIONS.length + 1);
  });

  it('names only real sidebar items', () => {
    const navIds = APP_NAVIGATION.map((item) => item.id);
    for (const id of GUIDE_ROLE_IDS) {
      const guide = ROLE_GUIDES[id];
      expect(navIds, id).toEqual(expect.arrayContaining(guide.menu));
      expect(guide.menu, id).toEqual(expect.arrayContaining(guide.levelTwoMenu ?? []));
    }
  });

  it('gives only Super Admin and Store Manager the User Guide', () => {
    const withGuide = GUIDE_ROLE_IDS.filter((id) => ROLE_GUIDES[id].menu.includes('user-guide'));
    expect(withGuide).toEqual(['SUPER_ADMIN', 'STORE_MANAGER']);
  });

  it('has a flow for every role, with known actors only', () => {
    for (const id of GUIDE_ROLE_IDS) expect(flowsFor(id).length, id).toBeGreaterThan(0);
    const known = new Set<string>([...GUIDE_ROLE_IDS, ...Object.keys(EXTERNAL_ACTOR_NAMES)]);
    for (const flow of GUIDE_FLOWS) {
      for (const step of flow.steps) expect(step.who.every((actor) => known.has(actor)), `${flow.id}: ${step.text}`).toBe(true);
    }
  });
});

describe('user guide access', () => {
  it('is the last sidebar item and needs USER_GUIDE_VIEW', () => {
    expect(APP_NAVIGATION.at(-1)).toMatchObject({ id: 'user-guide', requires: ['USER_GUIDE_VIEW'] });

    signInAsSuperAdmin('ADMIN_L1');
    const { result } = renderHook(() => useAccess());
    expect(result.current.authorizedNavigation().at(-1)?.id).toBe('user-guide');
  });

  it('stays hidden and closed without the permission', () => {
    signInWith(['DEALER_VIEW', 'PROCUREMENT_ORDER_VIEW']);
    const { result } = renderHook(() => useAccess());
    expect(result.current.authorizedNavigation().map((item) => item.id)).not.toContain('user-guide');

    render(
      <MemoryRouter initialEntries={['/user-guide']}>
        <Routes>
          <Route element={<RequireNavAccess navId="user-guide" />}>
            <Route path="/user-guide" element={<p>guide</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText('guide')).not.toBeInTheDocument();
    expect(screen.getByText('Access restricted')).toBeInTheDocument();
  });
});

describe('role PDF', () => {
  it("holds only the Dealer Manager's role and flows", async () => {
    const pdf = (await buildGuidePdf('DEALER_MANAGER')).output();

    expect(pdf).toContain('Dealer Manager guide');
    expect(pdf).toContain('Buying from a dealer');
    expect(pdf).toContain('A dealer changes their quotation');
    for (const other of ['Customer order to the doorstep', 'Support ticket', 'Company profile change', 'Refund for a customer']) {
      expect(pdf).not.toContain(other);
    }
    expect(pdf).not.toContain('Delivers orders to the customer'); // another role's section
    expect(guideFileName('DEALER_MANAGER')).toBe('TinQa-User-Guide-Dealer-Manager.pdf');
  });

  it('holds every role in the full guide', async () => {
    const pdf = (await buildGuidePdf(null)).output();
    for (const id of GUIDE_ROLE_IDS) expect(pdf, id).toContain(ROLE_GUIDES[id].summary.slice(0, 30));
  });
});

describe('UserGuidePage', () => {
  const renderPage = () =>
    render(
      <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
        <UserGuidePage />
      </Provider>
    );

  it('narrows to one role and downloads only that role', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByRole('heading', { name: /Customer order to the doorstep/ })).toBeInTheDocument();

    await user.click(within(screen.getByRole('group', { name: 'Role' })).getByRole('button', { name: 'Dealer Manager' }));
    expect(screen.getByRole('heading', { name: /Buying from a dealer/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Customer order to the doorstep/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Download Dealer Manager guide (PDF)' }));
    await waitFor(() => expect(downloadGuidePdf).toHaveBeenCalledWith('DEALER_MANAGER'));
  });
});
