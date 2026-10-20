import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import alertReducer from '../../../store/alertSlice';
import companyProfileReducer from '../../../store/companyProfileSlice';
import { GlobalAlertContainer } from '../../../components/ui/GlobalAlertContainer';
import { useAuthStore } from '../../../store/useAuthStore';
import { companyProfileApi } from '../api/companyProfileApi';
import type { CompanyProfileFields, CompanyProfileVersion, VersionStatus } from '../types/companyProfile.types';
import type { ApiResponse } from '../../../types/common.types';
import { CompanyProfilePage } from './CompanyProfilePage';
import { CompanyProfileEditorPage } from './CompanyProfileEditorPage';
import { CompanyProfileReviewPage } from './CompanyProfileReviewPage';
import { CompanyProfileHistoryPage } from './CompanyProfileHistoryPage';
import { clearPincodeCache } from '../../../utils/pincode';
import { superAdminPermissions } from '../../../test/access';

// Only the network layer is mocked: a small fake of the Ecommerce BE maker-checker rules.
vi.mock('../api/companyProfileApi', () => ({
  companyProfileApi: {
    getOverview: vi.fn(),
    listVersions: vi.fn(),
    getVersion: vi.fn(),
    createDraft: vi.fn(),
    saveDraft: vi.fn(),
    submitDraft: vi.fn(),
    deleteDraft: vi.fn(),
    withdraw: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    uploadAsset: vi.fn(),
  },
}));
const api = vi.mocked(companyProfileApi);

const ok = <T,>(data: T): ApiResponse<T> => ({ success: true, message: '', data } as ApiResponse<T>);
const apiError = (status: number, errorCode: string, message: string, errors: { field: string; message: string }[] = []) => {
  const response = {
    status,
    statusText: String(status),
    data: { success: false, message, errorCode, errors },
    headers: {},
    config: { headers: new AxiosHeaders() },
  } as AxiosResponse;
  return new AxiosError(message, String(status), response.config, {}, response);
};

const FIELDS: CompanyProfileFields = {
  brandName: 'TinQa',
  trademarkMark: 'TM',
  logoUrl: 'https://cdn.tinqa.com/logo.png',
  logoDarkUrl: null,
  faviconUrl: null,
  legalName: 'TinQa Technologies Pvt Ltd',
  gstin: '27AAACT1234A1Z5',
  pan: 'AAACT1234A',
  cin: null,
  headquartersName: 'Pune HQ',
  address: { line1: 'Plot 7, Hinjawadi', line2: null, city: 'Pune', district: 'Pune', state: 'Maharashtra', stateCode: '27', postalCode: '411057', country: 'India' },
  supportEmail: 'help@tinqa.com',
  supportPhone: '+91 20 1234 5678',
  careersEmail: null,
  website: 'https://tinqa.com',
  invoiceTerms: ['Goods once sold are not returnable.', 'Subject to Pune jurisdiction.'],
  shippingRules: [
    { minOrderValue: 0, maxOrderValue: 50000, fee: 500 },
    { minOrderValue: 50000, maxOrderValue: null, fee: 0 },
  ],
  homeVideoEnabled: false,
  homeVideoUrl: null,
};

let versions: CompanyProfileVersion[];

const version = (id: number, status: VersionStatus, patch: Partial<CompanyProfileVersion> = {}): CompanyProfileVersion => ({
  ...structuredClone(FIELDS),
  id,
  versionNo: id,
  status,
  createdBy: 'maker1',
  createdAt: '2026-10-01T10:00:00',
  updatedBy: 'maker1',
  updatedAt: '2026-10-01T10:00:00',
  submittedBy: status === 'DRAFT' ? null : 'maker1',
  submittedAt: status === 'DRAFT' ? null : '2026-10-01T11:00:00',
  reviewedBy: status === 'APPROVED' || status === 'REJECTED' ? 'checker1' : null,
  reviewedAt: status === 'APPROVED' || status === 'REJECTED' ? '2026-10-01T12:00:00' : null,
  reviewComment: null,
  lockVersion: 0,
  ...patch,
});

let me = 'maker1';
const find = (id: number) => {
  const v = versions.find((x) => x.id === id);
  if (!v) throw apiError(404, 'VERSION_NOT_FOUND', 'Version not found.');
  return v;
};
const live = () => versions.find((v) => v.status === 'APPROVED') ?? null;
const pending = () => versions.find((v) => v.status === 'PENDING_APPROVAL') ?? null;
const diff = (v: CompanyProfileVersion) => {
  const l = live();
  const changes = [];
  for (const key of Object.keys(FIELDS) as (keyof CompanyProfileFields)[]) {
    if (key === 'address') {
      for (const part of Object.keys(FIELDS.address!) as (keyof NonNullable<CompanyProfileFields['address']>)[]) {
        if (l?.address?.[part] !== v.address?.[part]) changes.push({ field: `address.${part}`, liveValue: l?.address?.[part] ?? null, value: v.address?.[part] ?? null });
      }
    } else if (JSON.stringify(l?.[key] ?? null) !== JSON.stringify(v[key] ?? null)) {
      changes.push({ field: key, liveValue: l?.[key] ?? null, value: v[key] ?? null });
    }
  }
  return changes;
};
const transition = (v: CompanyProfileVersion, status: VersionStatus, patch: Partial<CompanyProfileVersion> = {}) => {
  Object.assign(v, { status, lockVersion: v.lockVersion + 1, ...patch });
  return ok(structuredClone(v));
};

const fieldsOnly = (v: CompanyProfileVersion): CompanyProfileFields => {
  const copy = structuredClone(v) as Partial<CompanyProfileVersion>;
  return Object.fromEntries(Object.keys(FIELDS).map((key) => [key, copy[key as keyof CompanyProfileFields]])) as unknown as CompanyProfileFields;
};

const installBackend = () => {
  api.getOverview.mockImplementation(async () =>
    ok({
      live: structuredClone(live()),
      pending: structuredClone(pending()),
      myDrafts: structuredClone(versions.filter((v) => (v.status === 'DRAFT' || v.status === 'REJECTED') && v.createdBy === me).reverse()),
    })
  );
  api.listVersions.mockImplementation(async () => {
    const content = [...versions].reverse();
    return ok({ content, number: 0, size: 20, totalElements: content.length, totalPages: 1, first: true, last: true, empty: !content.length });
  });
  api.getVersion.mockImplementation(async (id) => {
    const v = find(id);
    return ok({ ...structuredClone(v), changes: diff(v), auditTrail: [{ action: 'CREATED', actor: v.createdBy, fromStatus: null, toStatus: 'DRAFT', comment: null, createdAt: v.createdAt! }] });
  });
  api.createDraft.mockImplementation(async (body) => {
    const fields: CompanyProfileFields = 'copyFromLive' in body ? fieldsOnly(live()!) : body;
    const created = version(Math.max(...versions.map((v) => v.id)) + 1, 'DRAFT', { ...fields, createdBy: me, updatedBy: me, submittedBy: null, submittedAt: null, reviewedBy: null, reviewedAt: null, reviewComment: null, lockVersion: 0 });
    versions.push(created);
    return ok(structuredClone(created));
  });
  api.saveDraft.mockImplementation(async (id, body) => {
    const v = find(id);
    if (v.createdBy !== me) throw apiError(403, 'NOT_VERSION_OWNER', 'Only the creator can edit this draft.');
    if (body.lockVersion !== undefined && body.lockVersion !== v.lockVersion) throw apiError(409, 'CONCURRENT_UPDATE', 'Someone else changed this draft.');
    const { lockVersion: _lock, ...fields } = body;
    void _lock;
    return transition(v, v.status, { ...fields, updatedBy: me });
  });
  api.submitDraft.mockImplementation(async (id) => {
    const v = find(id);
    if (pending()) throw apiError(409, 'PENDING_CHANGE_EXISTS', 'Another change is already waiting for approval.');
    if (!v.legalName) throw apiError(400, 'VALIDATION_FAILED', 'Validation failed', [{ field: 'legalName', message: 'Legal name is required.' }]);
    return transition(v, 'PENDING_APPROVAL', { submittedBy: me, submittedAt: '2026-10-13T10:00:00' });
  });
  api.approve.mockImplementation(async (id) => {
    const v = find(id);
    if (v.createdBy === me || v.submittedBy === me) throw apiError(403, 'APPROVAL_SELF_NOT_ALLOWED', 'You created or submitted this change; another approver must approve it.');
    const previous = live();
    if (previous) previous.status = 'SUPERSEDED';
    return transition(v, 'APPROVED', { reviewedBy: me, reviewedAt: '2026-10-13T11:00:00' });
  });
  api.reject.mockImplementation(async (id, comment) => transition(find(id), 'REJECTED', { reviewedBy: me, reviewedAt: '2026-10-13T11:00:00', reviewComment: comment }));
  api.deleteDraft.mockImplementation(async (id) => {
    const v = find(id);
    const deleteAny = useAuthStore.getState().user?.permissions?.includes('COMPANY_PROFILE_DRAFT_DELETE_ANY');
    if (v.createdBy !== me && !deleteAny) throw apiError(403, 'NOT_VERSION_OWNER', 'Only the admin who created this draft or a Super Admin can delete it.');
    if (v.status !== 'DRAFT' && v.status !== 'REJECTED') throw apiError(409, 'INVALID_STATE_TRANSITION', 'Only DRAFT or REJECTED versions can be deleted.');
    return transition(v, 'DELETED', { updatedBy: me });
  });
  api.withdraw.mockImplementation(async (id) => transition(find(id), 'WITHDRAWN'));
  api.uploadAsset.mockImplementation(async (file, purpose, onProgress) => {
    onProgress?.(100);
    if (file.name.endsWith('.svg') && (await file.text()).includes('<script')) {
      throw apiError(400, 'ASSET_UNSAFE', 'The SVG contains scripts or external content.', [{ field: 'file', message: 'The SVG contains scripts or external content.' }]);
    }
    return ok({ url: `https://assets.tinqa.com/company/${file.name}`, purpose, contentType: file.type, size: file.size });
  });
};

const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.s`;
// Default permissions are a Super Admin's at those levels; pass them explicitly for a narrower designation
const signIn = (username: string, roles: ('ADMIN_L1' | 'ADMIN_L2')[], permissions: string[] = superAdminPermissions(...roles)) => {
  me = username;
  useAuthStore.setState({
    token: jwt({ sub: username, roles: roles.map((r) => `ROLE_${r}`) }),
    isAuthenticated: true,
    user: { userId: 1, username, email: `${username}@tinqa.com`, role: roles[0], authClient: 'web', isFirstLogin: false, permissions },
  });
};

const renderAt = (path: string) => {
  const store = configureStore({ reducer: { alert: alertReducer, companyProfile: companyProfileReducer } });
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <Provider store={store}>
        <GlobalAlertContainer />
        <Routes>
          <Route path="/settings/company-profile" element={<CompanyProfilePage />} />
          <Route path="/settings/company-profile/history" element={<CompanyProfileHistoryPage />} />
          <Route path="/settings/company-profile/drafts/:id" element={<CompanyProfileEditorPage />} />
          <Route path="/settings/company-profile/versions/:id" element={<CompanyProfileReviewPage />} />
        </Routes>
      </Provider>
    </MemoryRouter>
  );
  return { user };
};

const OVERVIEW = '/settings/company-profile';
const brandInput = () => screen.getByLabelText(/^Brand name/);

beforeEach(() => {
  vi.clearAllMocks();
  versions = [version(1, 'APPROVED', { reviewedBy: 'checker1' })];
  installBackend();
  signIn('maker1', ['ADMIN_L1']);
});

describe('Maker proposes a change (acceptance 1)', () => {
  it('copies the live profile, edits brand + logo, saves the full form and submits', async () => {
    const { user } = renderAt(OVERVIEW);
    const liveCard = await screen.findByRole('region', { name: 'Live profile' });
    expect(within(liveCard).getByText(/Version 1, approved by checker1/)).toBeInTheDocument();
    expect(within(liveCard).getByText('™')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Propose a change' }));
    expect(api.createDraft).toHaveBeenCalledWith({ copyFromLive: true });
    await waitFor(() => expect(brandInput()).toHaveValue('TinQa'));

    await user.clear(brandInput());
    await user.type(brandInput(), 'TinQa Plus');
    await user.upload(screen.getByTestId('asset-input-LOGO'), new File(['png'], 'new-logo.png', { type: 'image/png' }));
    await waitFor(() => expect(api.uploadAsset).toHaveBeenCalledWith(expect.any(File), 'LOGO', expect.any(Function)));
    expect(await screen.findByText('https://assets.tinqa.com/company/new-logo.png')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save & submit for approval' }));
    await waitFor(() => expect(api.submitDraft).toHaveBeenCalledWith(2));
    const body = api.saveDraft.mock.calls[0][1];
    expect(body).toMatchObject({ brandName: 'TinQa Plus', logoUrl: 'https://assets.tinqa.com/company/new-logo.png', lockVersion: 0, legalName: FIELDS.legalName });
    expect(Object.keys(body)).toHaveLength(20); // every field + lockVersion (PUT is a full replacement)

    const panel = await screen.findByRole('region', { name: 'Pending change' });
    expect(within(panel).getByText(/Version 2 submitted by maker1/)).toBeInTheDocument();
    // The live profile is unchanged until approval.
    expect(within(screen.getByRole('region', { name: 'Live profile' })).getByText('TinQa')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument(); // makers never approve (acceptance 6)
  });
});

describe('Checker reviews (acceptance 2, 3, 6)', () => {
  beforeEach(() => {
    versions.push(version(2, 'PENDING_APPROVAL', { brandName: 'TinQa Plus', logoUrl: 'https://assets.tinqa.com/company/new-logo.png' }));
    // An approver whose designation doesn't include drafting
    signIn('checker1', ['ADMIN_L2'], ['COMPANY_PROFILE_VIEW', 'COMPANY_PROFILE_APPROVE']);
  });

  it('sees the changes vs live and approves; the old version becomes superseded', async () => {
    const { user } = renderAt('/settings/company-profile/versions/2');
    const table = await screen.findByRole('table', { name: 'Changes vs live' });
    expect(within(table).getByTestId('change-brandName')).toHaveTextContent('TinQa Plus');
    expect(within(table).getByTestId('change-logoUrl')).toBeInTheDocument();
    expect(within(table).getAllByRole('row')).toHaveLength(3); // header + 2 changes
    expect(screen.queryByRole('link', { name: /Edit draft/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    const dialog = screen.getByRole('dialog', { name: 'Approve this change?' });
    expect(dialog).toHaveTextContent('This will replace the live company profile on the storefront.');
    await user.click(within(dialog).getByRole('button', { name: 'Approve' }));

    expect(await screen.findByText('Approved. The new company profile is live.')).toBeInTheDocument();
    const liveCard = await screen.findByRole('region', { name: 'Live profile' });
    expect(within(liveCard).getByText('TinQa Plus')).toBeInTheDocument();
    expect(versions[0].status).toBe('SUPERSEDED');
    expect(screen.queryByRole('button', { name: 'Propose a change' })).not.toBeInTheDocument(); // no COMPANY_PROFILE_EDIT
  });

  it('rejects with a required comment', async () => {
    const { user } = renderAt(OVERVIEW);
    await user.click(await screen.findByRole('button', { name: 'Reject' }));
    const dialog = screen.getByRole('dialog', { name: 'Reject change' });
    await user.type(within(dialog).getByLabelText(/Comment/), 'x');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    expect(within(dialog).getByText('Enter at least 3 characters.')).toBeInTheDocument();
    expect(api.reject).not.toHaveBeenCalled();

    await user.type(within(dialog).getByLabelText(/Comment/), 'Use the registered logo');
    await user.click(within(dialog).getByRole('button', { name: 'Reject' }));
    await waitFor(() => expect(api.reject).toHaveBeenCalledWith(2, 'xUse the registered logo'));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Pending change' })).not.toBeInTheDocument());
  });
});

describe('Maker after a rejection (acceptance 3)', () => {
  it('sees the comment, edits and resubmits', async () => {
    versions.push(version(2, 'REJECTED', { brandName: 'TinQa Plus', reviewComment: 'Use the registered logo' }));
    const { user } = renderAt(OVERVIEW);
    const draft = await screen.findByTestId('draft-2');
    expect(draft).toHaveTextContent('Rejected by checker1: Use the registered logo');

    await user.click(within(draft).getByRole('link', { name: 'Edit version 2' }));
    expect(await screen.findByRole('note')).toHaveTextContent('Use the registered logo');
    await user.type(brandInput(), '!');
    await user.click(screen.getByRole('button', { name: 'Save & submit for approval' }));
    await waitFor(() => expect(api.submitDraft).toHaveBeenCalledWith(2));
    expect(await screen.findByRole('region', { name: 'Pending change' })).toBeInTheDocument();
  });
});

describe('Only one pending change (acceptance 4)', () => {
  beforeEach(() => {
    versions.push(version(2, 'PENDING_APPROVAL', { createdBy: 'maker2', submittedBy: 'maker2' }));
    versions.push(version(3, 'DRAFT'));
  });

  it('disables Submit while another change is pending', async () => {
    renderAt(OVERVIEW);
    const draft = await screen.findByTestId('draft-3');
    expect(within(draft).getByRole('button', { name: 'Submit version 3' })).toBeDisabled();
    expect(screen.getByText(/You can keep editing drafts but can't submit/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Withdraw request' })).not.toBeInTheDocument(); // not the submitter
  });

  it('still saves the draft', async () => {
    const { user } = renderAt('/settings/company-profile/drafts/3');
    await waitFor(() => expect(brandInput()).toHaveValue('TinQa'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save & submit for approval' })).toBeDisabled());
    // Nothing to save until something is edited.
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
    await user.type(brandInput(), ' ');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled(); // whitespace alone isn't a change
    await user.type(brandInput(), 'X');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Draft saved.')).toBeInTheDocument();
    expect(api.saveDraft).toHaveBeenCalledWith(3, expect.objectContaining({ lockVersion: 0 }));
  });

  it('a submit that races another admin shows the conflict and then disables Submit', async () => {
    versions = versions.filter((v) => v.id !== 2); // nothing pending when the editor opens
    const { user } = renderAt('/settings/company-profile/drafts/3');
    await waitFor(() => expect(brandInput()).toHaveValue('TinQa'));
    const submit = screen.getByRole('button', { name: 'Save & submit for approval' });
    await waitFor(() => expect(submit).toBeEnabled());

    versions.push(version(2, 'PENDING_APPROVAL', { createdBy: 'maker2', submittedBy: 'maker2' })); // another maker submits
    await user.click(submit);
    expect(await screen.findByText('Another change is already waiting for approval.')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save & submit for approval' })).toBeDisabled());
    expect(versions.find((v) => v.id === 3)?.status).toBe('DRAFT');
  });
});

describe('Self-approval (acceptance 5)', () => {
  it('an admin with both roles does not see Approve on their own change', async () => {
    versions.push(version(2, 'PENDING_APPROVAL', { createdBy: 'both1', submittedBy: 'both1' }));
    signIn('both1', ['ADMIN_L1', 'ADMIN_L2']);
    renderAt('/settings/company-profile/versions/2');
    expect(await screen.findByTestId('own-change-note')).toHaveTextContent("You can't approve a change you made.");
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Withdraw request' })).toBeInTheDocument();
    await expect(api.approve(2)).rejects.toMatchObject({ response: { status: 403, data: { errorCode: 'APPROVAL_SELF_NOT_ALLOWED' } } });
  });
});

describe('Editor validation (acceptance 7, 8)', () => {
  it('shows PAN and state-code mismatches inline', async () => {
    versions.push(version(2, 'DRAFT'));
    const { user } = renderAt('/settings/company-profile/drafts/2');
    const pan = await screen.findByLabelText('PAN');
    await user.clear(pan);
    await user.type(pan, 'bbbct1234a');
    expect(pan).toHaveValue('BBBCT1234A');
    expect(screen.getByText('PAN must match characters 3–12 of the GSTIN (AAACT1234A).')).toBeInTheDocument();
    const stateCode = screen.getByLabelText('State code');
    await user.clear(stateCode);
    await user.type(stateCode, '29');
    expect(screen.getByText('State code must be 27 to match the GSTIN.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(api.saveDraft).not.toHaveBeenCalled();
    expect(screen.getByLabelText('PAN')).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps submit disabled while required fields are missing', async () => {
    versions.push(version(2, 'DRAFT', { legalName: null, address: { line1: null, line2: null, city: null, district: null, state: null, stateCode: null, postalCode: null, country: 'India' }, gstin: null }));
    const { user } = renderAt('/settings/company-profile/drafts/2');
    const submit = await screen.findByRole('button', { name: 'Save & submit for approval' });
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('title', 'Fill in all required fields to submit.');
    await user.click(submit);
    expect(api.saveDraft).not.toHaveBeenCalled();
    expect(api.submitDraft).not.toHaveBeenCalled();
  });
});

describe('Uploads (acceptance 9)', () => {
  beforeEach(() => {
    versions.push(version(2, 'DRAFT'));
  });

  it.each([
    ['a JPG', new File(['jpg'], 'logo.jpg', { type: 'image/jpeg' }), 'Only PNG, SVG, WEBP or ICO images are allowed.'],
    ['a 2 MB PNG', new File([new Uint8Array(2 * 1024 * 1024)], 'big.png', { type: 'image/png' }), 'The image is larger than 1 MB.'],
    ['an SVG with a script', new File(['<svg><script>alert(1)</script></svg>'], 'evil.svg', { type: 'image/svg+xml' }), 'The SVG contains scripts or external content.'],
  ])('rejects %s and keeps the current logo', async (_name, file, message) => {
    renderAt('/settings/company-profile/drafts/2');
    const input = await screen.findByTestId('asset-input-LOGO');
    // A drop or "All files" picker can deliver any type, so bypass the accept filter.
    fireEvent.change(input, { target: { files: [file] } });
    const group = screen.getByRole('group', { name: 'Logo' });
    expect(await within(group).findByText(message)).toBeInTheDocument();
    expect(within(group).getByText(FIELDS.logoUrl!)).toBeInTheDocument();
    expect(api.saveDraft).not.toHaveBeenCalled();
  });
});

describe('Concurrent edits (acceptance 10)', () => {
  it('offers Reload after CONCURRENT_UPDATE', async () => {
    versions.push(version(2, 'DRAFT'));
    const { user } = renderAt('/settings/company-profile/drafts/2');
    await waitFor(() => expect(brandInput()).toHaveValue('TinQa'));
    versions[1].lockVersion = 5; // someone else saved meanwhile
    versions[1].brandName = 'TinQa Other';
    await user.type(brandInput(), ' Mine');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    const banner = await screen.findByText(/Someone else saved this draft/);

    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(within(banner.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Reload' }));
    expect(confirm).toHaveBeenCalled();
    await waitFor(() => expect(brandInput()).toHaveValue('TinQa Other'));
    confirm.mockRestore();
  });
});

describe('Withdraw and history (acceptance 11)', () => {
  it('withdraws a pending request; it shows as Withdrawn and can seed a new draft', async () => {
    versions.push(version(2, 'PENDING_APPROVAL', { brandName: 'TinQa Plus' }));
    const { user } = renderAt(OVERVIEW);
    await user.click(await screen.findByRole('button', { name: 'Withdraw request' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Withdraw request' }));
    await waitFor(() => expect(api.withdraw).toHaveBeenCalledWith(2));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Pending change' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('link', { name: /History/ }));
    const row = await screen.findByTestId('version-row-2');
    expect(within(row).getByTestId('version-status')).toHaveTextContent('Withdrawn');
    expect(within(screen.getByTestId('version-row-1')).getByTestId('version-status')).toHaveTextContent('Live');

    await user.click(within(row).getByRole('button', { name: 'Start new draft from version 2' }));
    await waitFor(() => expect(api.createDraft).toHaveBeenCalledWith(expect.objectContaining({ brandName: 'TinQa Plus', legalName: FIELDS.legalName })));
    await waitFor(() => expect(brandInput()).toHaveValue('TinQa Plus'));
  });

  it('a withdrawn version opens read-only', async () => {
    versions.push(version(2, 'WITHDRAWN'));
    renderAt('/settings/company-profile/drafts/2');
    expect(await screen.findByRole('region', { name: 'Changes vs live' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save draft' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument();
  });
});

describe('Deleting a draft', () => {
  it("the creator deletes their own draft from My drafts after confirming", async () => {
    versions.push(version(2, 'DRAFT'));
    const { user } = renderAt(OVERVIEW);
    const row = await screen.findByTestId('draft-2');
    await user.click(within(row).getByRole('button', { name: 'Delete version 2' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete version 2?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete draft' }));

    await waitFor(() => expect(api.deleteDraft).toHaveBeenCalledWith(2));
    expect(await screen.findByText('Draft deleted.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('draft-2')).not.toBeInTheDocument());
    expect(screen.getByText('No drafts yet.')).toBeInTheDocument();
  });

  it('the creator can delete from the editor and lands back on the overview', async () => {
    versions.push(version(2, 'REJECTED', { reviewComment: 'Wrong GSTIN' }));
    const { user } = renderAt('/settings/company-profile/drafts/2');
    await user.click(await screen.findByRole('button', { name: 'Delete version 2' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete draft' }));
    expect(await screen.findByRole('region', { name: 'Live profile' })).toBeInTheDocument();
    expect(versions.find((v) => v.id === 2)?.status).toBe('DELETED');
  });

  it("another maker can't delete someone else's draft", async () => {
    versions.push(version(2, 'DRAFT'));
    signIn('maker2', ['ADMIN_L1']);
    renderAt('/settings/company-profile/history');
    await screen.findByTestId('version-row-2');
    expect(screen.queryByRole('button', { name: 'Delete version 2' })).not.toBeInTheDocument();
  });

  it("a Super Admin deletes another admin's draft from the history; it stays listed as Deleted", async () => {
    versions.push(version(2, 'DRAFT'), version(3, 'PENDING_APPROVAL'));
    signIn('admin', ['ADMIN_L2']);
    const { user } = renderAt('/settings/company-profile/history');
    const row = await screen.findByTestId('version-row-2');
    // Pending and live versions can't be deleted
    expect(within(screen.getByTestId('version-row-3')).queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
    expect(within(screen.getByTestId('version-row-1')).queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();

    await user.click(within(row).getByRole('button', { name: 'Delete version 2' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete version 2?' });
    expect(dialog).toHaveTextContent('This draft was created by maker1.');
    await user.click(within(dialog).getByRole('button', { name: 'Delete draft' }));

    await waitFor(() => expect(within(screen.getByTestId('version-row-2')).getByText('Deleted')).toBeInTheDocument());
    expect(api.deleteDraft).toHaveBeenCalledWith(2);
    expect(screen.getByRole('heading', { name: 'Company profile history' })).toBeInTheDocument(); // the dialog's clicks didn't open the row
  });
});

describe('Shipping charges', () => {
  it('edits price bands: each starts where the previous ends and the last covers larger orders', async () => {
    versions.push(version(2, 'DRAFT'));
    const { user } = renderAt('/settings/company-profile/drafts/2');
    const editor = await screen.findByRole('list', { name: 'Shipping rules editor' });
    expect(within(editor).getByText('₹50,000')).toBeInTheDocument();
    expect(within(editor).getByText('and above')).toBeInTheDocument();

    // Below 10,000 → 1,000; 10,000 to below 15,000 → 800; 15,000 and above → free
    await user.clear(screen.getByLabelText('Rule 1 up to'));
    await user.type(screen.getByLabelText('Rule 1 up to'), '10000');
    await user.clear(screen.getByLabelText('Rule 1 fee'));
    await user.type(screen.getByLabelText('Rule 1 fee'), '1000');
    await user.click(screen.getByRole('button', { name: 'Add rule' }));
    await user.type(screen.getByLabelText('Rule 2 up to'), '9000');
    await user.type(screen.getByLabelText('Rule 2 fee'), '800');
    await user.type(screen.getByLabelText('Rule 3 fee'), '0');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Must be more than 10000, where this rule starts.')).toBeInTheDocument();
    expect(api.saveDraft).not.toHaveBeenCalled();

    await user.clear(screen.getByLabelText('Rule 2 up to'));
    await user.type(screen.getByLabelText('Rule 2 up to'), '15000');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(api.saveDraft).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          shippingRules: [
            { minOrderValue: 0, maxOrderValue: 10000, fee: 1000 },
            { minOrderValue: 10000, maxOrderValue: 15000, fee: 800 },
            { minOrderValue: 15000, maxOrderValue: null, fee: 0 },
          ],
        })
      )
    );
  });

  it('the live profile lists the price bands', async () => {
    renderAt(OVERVIEW);
    const table = await screen.findByRole('table', { name: 'Shipping charges' });
    expect(within(table).getByText('Below ₹50,000')).toBeInTheDocument();
    expect(within(table).getByText('₹500')).toBeInTheDocument();
    expect(within(table).getByText('₹50,000 and above')).toBeInTheDocument();
    expect(within(table).getByText('Free')).toBeInTheDocument();
  });
});

describe('Home page video', () => {
  const LINK = 'https://youtu.be/dQw4w9WgXcQ';

  it('toggling the switch and entering a link sends both fields; the preview appears for a valid link', async () => {
    versions.push(version(2, 'DRAFT'));
    const { user } = renderAt('/settings/company-profile/drafts/2');
    const toggle = await screen.findByRole('switch', { name: 'Show background video on the home page' });
    expect(toggle).not.toBeChecked();
    await user.click(toggle);
    expect(toggle).toBeChecked();

    const link = screen.getByLabelText('YouTube link');
    expect(link).toHaveAccessibleDescription(/Plays muted and on loop/);
    await user.type(link, 'https://vimeo.com/1');
    expect(screen.queryByAltText('Video preview')).not.toBeInTheDocument();
    await user.clear(link);
    await user.type(link, LINK);
    expect(screen.getByAltText('Video preview')).toHaveAttribute('src', 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
    expect(screen.getByRole('link', { name: /Watch on YouTube/ })).toHaveAttribute('rel', 'noopener noreferrer');

    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(api.saveDraft).toHaveBeenCalledWith(2, expect.objectContaining({ homeVideoEnabled: true, homeVideoUrl: LINK })));
  });

  it('keeps the link while off and blocks submitting "on" without a link', async () => {
    versions.push(version(2, 'DRAFT', { homeVideoEnabled: true, homeVideoUrl: LINK }));
    const { user } = renderAt('/settings/company-profile/drafts/2');
    const toggle = await screen.findByRole('switch', { name: 'Show background video on the home page' });
    await waitFor(() => expect(toggle).toBeChecked());
    await user.click(toggle);
    expect(screen.getByLabelText('YouTube link')).toHaveValue(LINK);
    expect(screen.getByText('Saved, but not shown while the video is off.')).toBeInTheDocument();

    await user.click(toggle);
    await user.clear(screen.getByLabelText('YouTube link'));
    expect(screen.getByRole('button', { name: 'Save & submit for approval' })).toBeDisabled();
    expect(api.saveDraft).not.toHaveBeenCalled();
  });

  it('shows a server error on the link input', async () => {
    versions.push(version(2, 'DRAFT'));
    api.saveDraft.mockRejectedValueOnce(apiError(400, 'VALIDATION_FAILED', 'Validation failed', [{ field: 'homeVideoUrl', message: 'This video can’t be embedded.' }]));
    const { user } = renderAt('/settings/company-profile/drafts/2');
    await user.type(await screen.findByLabelText('YouTube link'), LINK);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(screen.getByLabelText('YouTube link')).toHaveAttribute('aria-invalid', 'true'));
    expect(screen.getByLabelText('YouTube link')).toHaveAccessibleDescription(/This video can’t be embedded\./);
  });

  it('change rows show Off → On, and the checker is told approval changes the live video', async () => {
    versions.push(version(2, 'PENDING_APPROVAL', { homeVideoEnabled: true, homeVideoUrl: LINK }));
    signIn('checker1', ['ADMIN_L2']);
    const { user } = renderAt('/settings/company-profile/versions/2');
    const row = await screen.findByTestId('change-homeVideoEnabled');
    expect(within(row).getByRole('rowheader')).toHaveTextContent('Home page video');
    expect(within(row).getAllByRole('cell').map((c) => c.textContent)).toEqual(['Off', 'On']);
    const urlRow = screen.getByTestId('change-homeVideoUrl');
    expect(within(urlRow).getByRole('link', { name: LINK })).toHaveAttribute('href', LINK);
    expect(screen.getByTestId('home-video-approval-note')).toHaveTextContent('Approving changes the video on the live home page.');

    await user.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByRole('dialog', { name: 'Approve this change?' })).toHaveTextContent('Approving changes the video on the live home page.');
  });

  it('no approval note when only the link changes while the video stays off', async () => {
    versions.push(version(2, 'PENDING_APPROVAL', { homeVideoUrl: LINK }));
    signIn('checker1', ['ADMIN_L2']);
    const { user } = renderAt(OVERVIEW);
    await user.click(await screen.findByRole('button', { name: 'Approve' }));
    expect(screen.getByRole('dialog', { name: 'Approve this change?' })).not.toHaveTextContent('Approving changes the video');
  });

  it('the live profile shows the video status, link and thumbnail', async () => {
    Object.assign(versions[0], { homeVideoEnabled: true, homeVideoUrl: LINK });
    renderAt(OVERVIEW);
    const group = await screen.findByRole('group', { name: 'Home page video' });
    expect(within(group).getByText('On')).toBeInTheDocument();
    expect(within(group).getByRole('link', { name: LINK })).toBeInTheDocument();
    expect(within(group).getByAltText('Video preview')).toBeInTheDocument();
  });
});

describe('Address from PIN code', () => {
  beforeEach(() => {
    clearPincodeCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        new Response(
          JSON.stringify([
            url.endsWith('/411057')
              ? { Status: 'Success', PostOffice: [{ Name: 'Hinjawadi', District: 'Pune', State: 'Maharashtra' }] }
              : { Status: 'Error', PostOffice: null },
          ])
        )
      )
    );
  });

  it('fills a missing district on open without marking the draft as changed; city/district/state are read-only', async () => {
    versions.push(version(2, 'DRAFT', { address: { ...FIELDS.address!, district: null } }));
    renderAt('/settings/company-profile/drafts/2');
    await waitFor(() => expect(screen.getByLabelText('District')).toHaveValue('Pune'));
    expect(screen.getByLabelText('City')).toHaveAttribute('readonly');
    expect(screen.getByLabelText('State')).toHaveAttribute('readonly');
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
  });

  it('blocks saving with an unknown PIN code', async () => {
    versions.push(version(2, 'DRAFT'));
    const { user } = renderAt('/settings/company-profile/drafts/2');
    const postal = await screen.findByLabelText('Postal code');
    await user.clear(postal);
    await user.type(postal, '999999');
    await waitFor(() => expect(postal).toHaveAccessibleDescription(/PIN code not found/));
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(api.saveDraft).not.toHaveBeenCalled();
  });
});

describe('Permission errors are not logouts', () => {
  it('shows the 403 message and keeps the page', async () => {
    versions.push(version(2, 'DRAFT'));
    api.saveDraft.mockRejectedValueOnce(apiError(403, 'NOT_VERSION_OWNER', 'Only the creator can edit this draft.'));
    const { user } = renderAt('/settings/company-profile/drafts/2');
    await waitFor(() => expect(brandInput()).toHaveValue('TinQa'));
    await user.type(brandInput(), ' Mine');
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Only the creator can edit this draft.')).toBeInTheDocument();
    expect(brandInput()).toBeInTheDocument();
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});
