import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import alertReducer from '../store/alertSlice';
import { GlobalAlertContainer } from '../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../store/useAuthStore';
import { useAccess } from '../hooks/useAccess';
import { accessService } from '../api/services/accessService';
import { HomeRedirect, RequireNavAccess } from './RouteGuards';
import { useAccessSync } from './useAccessSync';
import { HasAccess } from './HasAccess';
import { getTokenPermissions } from './adminIdentity';
import type { MyAccess } from '../config/access';

const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.s`;

const signIn = (permissions: string[] | undefined, extra: Record<string, unknown> = {}) =>
  useAuthStore.setState({
    token: jwt({ sub: 'u', perms: permissions ?? [] }),
    isAuthenticated: true,
    user: {
      userId: 1,
      username: 'u',
      email: 'u@tinqa.com',
      role: 'ADMIN_L1',
      authClient: 'web',
      isFirstLogin: false,
      permissions,
      ...extra,
    },
  });

afterEach(() => vi.restoreAllMocks());

describe('useAccess', () => {
  it('answers from the permissions the server sent', () => {
    signIn(['ITEM_VIEW', 'STOCK_VIEW'], { permissionGroups: ['CATALOG_READ'], designation: 'CATALOG_SPECIALIST', designationLabel: 'Catalog Specialist' });
    const { result } = renderHook(() => useAccess());

    expect(result.current.can('ITEM_VIEW')).toBe(true);
    expect(result.current.can('ITEM_CREATE')).toBe(false);
    expect(result.current.canAny('SUPPLIER_VIEW', 'STOCK_VIEW')).toBe(true);
    expect(result.current.canAll('ITEM_VIEW', 'SUPPLIER_VIEW')).toBe(false);
    expect(result.current.inGroup('CATALOG_READ')).toBe(true);
    expect(result.current.designationLabel).toBe('Catalog Specialist');
    expect(result.current.accessLoaded).toBe(true);
  });

  it('opens only the modules the permissions allow', () => {
    signIn(['CUSTOMER_ORDER_VIEW', 'CUSTOMER_ORDER_TRACKING_UPDATE']);
    const { result } = renderHook(() => useAccess());
    expect(result.current.authorizedNavigation().map((item) => item.id)).toEqual(['order-tracking']);
  });

  it('treats a session from before permissions existed as not loaded, not as an error', () => {
    signIn(undefined);
    const { result } = renderHook(() => useAccess());
    expect(result.current.accessLoaded).toBe(false);
    expect(result.current.can('ITEM_VIEW')).toBe(false);
  });
});

describe('route guards', () => {
  const renderAt = (path: string) =>
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/" element={<HomeRedirect />} />
          <Route path="/profile" element={<p>Profile page</p>} />
          <Route element={<RequireNavAccess navId="suppliers" />}>
            <Route path="/suppliers" element={<p>Suppliers page</p>} />
          </Route>
          <Route element={<RequireNavAccess navId="order-tracking" />}>
            <Route path="/order-tracking" element={<p>Tracking page</p>} />
          </Route>
          <Route element={<RequireNavAccess navId="items" requires={['STOCK_VIEW']} />}>
            <Route path="/item/stocks" element={<p>Stock page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

  it('blocks a module the designation does not include and says why', () => {
    signIn(['CUSTOMER_ORDER_VIEW'], { designationLabel: 'Delivery Rider / Courier' });
    renderAt('/suppliers');
    expect(screen.getByText('Access restricted')).toBeInTheDocument();
    expect(screen.getByText(/Delivery Rider \/ Courier/)).toBeInTheDocument();
  });

  it('lets a permitted user in', () => {
    signIn(['SUPPLIER_VIEW']);
    renderAt('/suppliers');
    expect(screen.getByText('Suppliers page')).toBeInTheDocument();
  });

  it('narrows a sub-route with its own permission', () => {
    signIn(['ITEM_VIEW']);
    renderAt('/item/stocks');
    expect(screen.getByText('Access restricted')).toBeInTheDocument();
  });

  it('lands on the first module the user may open', () => {
    signIn(['CUSTOMER_ORDER_VIEW']);
    renderAt('/');
    expect(screen.getByText('Tracking page')).toBeInTheDocument();
  });

  it('lands on the profile when no module is open to the user', () => {
    signIn([]);
    renderAt('/');
    expect(screen.getByText('Profile page')).toBeInTheDocument();
  });
});

describe('HasAccess', () => {
  it('renders children for the permission, the fallback otherwise', () => {
    signIn(['REFUND_VIEW']);
    render(
      <>
        <HasAccess permission="REFUND_VIEW"><span>can view</span></HasAccess>
        <HasAccess permission="REFUND_APPROVE" fallback={<span>no approve</span>}>
          <span>can approve</span>
        </HasAccess>
        <HasAccess anyOf={['SUPPLIER_VIEW', 'REFUND_VIEW']}><span>any of</span></HasAccess>
      </>
    );
    expect(screen.getByText('can view')).toBeInTheDocument();
    expect(screen.getByText('no approve')).toBeInTheDocument();
    expect(screen.queryByText('can approve')).not.toBeInTheDocument();
    expect(screen.getByText('any of')).toBeInTheDocument();
  });
});

describe('useAccessSync', () => {
  const Sync: React.FC = () => {
    useAccessSync();
    return null;
  };
  const renderSync = () =>
    render(
      <Provider store={configureStore({ reducer: { alert: alertReducer } })}>
        <Sync />
        <GlobalAlertContainer />
      </Provider>
    );
  const access = (permissions: string[]): MyAccess => ({
    role: 'ADMIN_L2',
    designation: 'STORE_MANAGER',
    designationLabel: 'Store Manager',
    permissionGroups: ['CATALOG_READ'],
    permissions,
  });

  beforeEach(() => signIn(['ITEM_VIEW']));

  it('stores what the server reports now', async () => {
    vi.spyOn(accessService, 'getMyAccess').mockResolvedValue(access(['ITEM_VIEW']));
    renderSync();
    await waitFor(() => expect(useAuthStore.getState().user?.designationLabel).toBe('Store Manager'));
    expect(useAuthStore.getState().user?.role).toBe('ADMIN_L2');
    expect(screen.queryByText(/Your access has changed/)).not.toBeInTheDocument();
  });

  it('asks the user to sign in again when the token lags behind', async () => {
    vi.spyOn(accessService, 'getMyAccess').mockResolvedValue(access(['ITEM_VIEW', 'ITEM_CREATE']));
    renderSync();
    expect(await screen.findByText(/Your access has changed/)).toBeInTheDocument();
    expect(useAuthStore.getState().user?.permissions).toEqual(['ITEM_VIEW', 'ITEM_CREATE']);
  });

  it('keeps the stored permissions when the refresh fails', async () => {
    vi.spyOn(accessService, 'getMyAccess').mockRejectedValue(new Error('offline'));
    renderSync();
    await waitFor(() => expect(accessService.getMyAccess).toHaveBeenCalled());
    expect(useAuthStore.getState().user?.permissions).toEqual(['ITEM_VIEW']);
  });
});

describe('getTokenPermissions', () => {
  it('reads the perms claim, or null without one', () => {
    expect(getTokenPermissions(jwt({ perms: ['A', 'B', 3] }))).toEqual(['A', 'B']);
    expect(getTokenPermissions(jwt({ sub: 'x' }))).toBeNull();
    expect(getTokenPermissions('not-a-jwt')).toBeNull();
  });
});
