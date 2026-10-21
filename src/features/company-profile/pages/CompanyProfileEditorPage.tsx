import React, { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Loader2, RefreshCw, Save, Send, XCircle } from 'lucide-react';
import { usePincodeLookup } from '../../../hooks/usePincodeLookup';
import { PINCODE_MESSAGES, applyPincodeLocation } from '../../../utils/pincode';
import { useCompanyProfileOverview, useCompanyProfileVersion } from '../hooks/useCompanyProfileData';
import { useCompanyProfileAccess } from '../hooks/useCompanyProfileAccess';
import { useCompanyProfileActions, type ActionResult } from '../hooks/useCompanyProfileActions';
import { useUnsavedChangesGuard } from '../hooks/useUnsavedChangesGuard';
import { AssetField, HomeVideoFields, InvoiceTermsEditor, LoginTextFields, ShippingRulesEditor, TextField } from '../components/EditorFields';
import { AuthBrandPanel } from '../../../components/auth/AuthBrandPanel';
import { BrandBadge } from '../../../components/auth/AuthCard';
import { BrandName, SectionBadge, VersionStatusBadge } from '../components/ProfileDisplay';
import { Skeleton, StateMessage } from '../components/Dialogs';
import { DeleteDraftButton } from '../components/DeleteDraftButton';
import { BUTTON } from '../utils/companyProfileUi';
import type { CompanyProfileVersion, ProfileSection } from '../types/companyProfile.types';
import {
  COMPANY_PROFILE_PATH,
  TRADEMARK_OPTIONS,
  companyDraftPath,
  companySectionPath,
  companyVersionPath,
  fieldLabel,
  formatServerTime,
  pendingSubmitBlocked,
} from '../utils/companyProfile.utils';
import { PROFILE_SECTIONS, SECTIONS, blockingPending, errorsInSection, missingInSection, sectionLabel } from '../utils/companyProfileSections';
import {
  LIMITS,
  emptyForm,
  panMismatch,
  sameForm,
  stateCodeFromGstin,
  stateCodeMismatch,
  toBody,
  toForm,
  validateForSave,
  validateForSubmit,
  type CompanyProfileForm,
  type FormErrors,
} from '../utils/companyProfileForm';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <fieldset className="apple-card p-5 space-y-4 min-w-0">
    <legend className="sr-only">{title}</legend>
    <h2 aria-hidden className="text-sm font-bold text-black dark:text-white">
      {title}
    </h2>
    {children}
  </fieldset>
);

const imageUrlsOf = (v: CompanyProfileVersion | null) =>
  [v?.logoUrl, v?.logoDarkUrl, v?.faviconUrl, v?.loginImageUrl].filter((u): u is string => !!u);

/**
 * Draft editor: /settings/company-profile/drafts/:id (or /new when nothing is live yet). Makers only, own DRAFT/REJECTED.
 * A section draft shows only that section; a whole-profile draft (the first profile, older drafts) shows every section.
 */
export const CompanyProfileEditorPage: React.FC = () => {
  const { id: idParam = '' } = useParams<{ id: string }>();
  const isNew = idParam === 'new';
  const id = isNew ? null : Number(idParam) || null;
  const navigate = useNavigate();
  const location = useLocation();
  const access = useCompanyProfileAccess();

  const { version, isLoading, errorKind, reload, set: setVersion } = useCompanyProfileVersion(id);
  const { overview, reload: reloadOverview } = useCompanyProfileOverview();
  const actions = useCompanyProfileActions();

  // Form state follows the loaded version (initial load, after save, after "Reload").
  const [syncedVersion, setSyncedVersion] = useState<CompanyProfileVersion | null>(null);
  const [form, setForm] = useState<CompanyProfileForm | null>(() => (isNew ? emptyForm() : null));
  const [baseline, setBaseline] = useState<CompanyProfileForm | null>(() => (isNew ? emptyForm() : null));
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  if (version && version !== syncedVersion) {
    setSyncedVersion(version);
    setForm(toForm(version));
    setBaseline(toForm(version));
  }

  const [attempt, setAttempt] = useState<'save' | 'submit' | null>(() =>
    (location.state as { submitIntent?: boolean } | null)?.submitIntent ? 'submit' : null
  );
  const [serverErrors, setServerErrors] = useState<FormErrors>({});
  const [conflict, setConflict] = useState(false);
  const [uploads, setUploads] = useState(0);

  const dirty = !!form && !!baseline && !sameForm(form, baseline);
  const confirmLeave = useUnsavedChangesGuard(dirty);

  // City, district and state follow the PIN code for Indian addresses.
  const country = form?.address.country.trim().toLowerCase() ?? '';
  const pincode = usePincodeLookup(form?.address.postalCode ?? '', {
    enabled: !!form && (!country || country === 'india'),
    onFound: (location, pin) => {
      // The PIN the version was saved with only fills blanks, in the baseline too, so opening a draft doesn't dirty it.
      const keepExisting = pin === (baseline?.address.postalCode ?? '').trim();
      const apply = (f: CompanyProfileForm | null) => (f ? { ...f, address: { ...f.address, ...applyPincodeLocation(f.address, location, keepExisting) } } : f);
      setForm(apply);
      if (keepExisting) setBaseline(apply);
    },
  });
  const pincodeError = pincode.status === 'notFound' ? PINCODE_MESSAGES.notFound : undefined;

  // A section draft answers only for its own fields; the rest is a copy of the live profile.
  const section = version?.section ?? null;
  const knownImageUrls = useMemo(() => new Set([...imageUrlsOf(version), ...uploadedUrls]), [version, uploadedUrls]);
  const clientErrors = useMemo<FormErrors>(() => {
    if (!form || !attempt) return {};
    return errorsInSection(section, attempt === 'submit' ? validateForSubmit(form, { knownImageUrls }) : validateForSave(form, { knownImageUrls }));
  }, [form, attempt, knownImageUrls, section]);
  const errors: FormErrors = { ...serverErrors, ...errorsInSection(section, pincodeError ? { 'address.postalCode': pincodeError } : {}), ...clientErrors };

  // Gate: only the maker's own DRAFT / REJECTED version is editable; anything else opens read-only.
  if (!isNew && !id) return <StateMessage variant="notFound" />;
  if (!access.isMaker) return isNew ? <Navigate to={COMPANY_PROFILE_PATH} replace /> : <Navigate to={companyVersionPath(id!)} replace />;
  if (!isNew && !version) {
    if (isLoading) return <Skeleton lines={10} label="Loading draft" />;
    return <StateMessage variant={errorKind ?? 'unknown'} onRetry={reload} />;
  }
  if (version && !access.canEdit(version)) return <Navigate to={companyVersionPath(version.id)} replace />;
  if (!form) return <Skeleton lines={10} label="Loading draft" />;

  const blocker = blockingPending(overview?.pendingChanges ?? [], section, version?.id);
  const backPath = section ? companySectionPath(SECTIONS[section].slug) : COMPANY_PROFILE_PATH;
  const busy = !!actions.busy || uploads > 0 || pincode.status === 'loading';

  const update = (patch: Partial<CompanyProfileForm>) => setForm((f) => (f ? { ...f, ...patch } : f));
  const updateAddress = (patch: Partial<CompanyProfileForm['address']>) =>
    setForm((f) => (f ? { ...f, address: { ...f.address, ...patch } } : f));
  const setGstin = (gstin: string) =>
    setForm((f) => {
      if (!f) return f;
      // Fill the state code from the GSTIN while it's empty (or still the previously auto-filled value).
      const previousAuto = stateCodeFromGstin(f.gstin);
      const auto = stateCodeFromGstin(gstin);
      const stateCode = auto && (!f.address.stateCode || f.address.stateCode === previousAuto) ? auto : f.address.stateCode;
      return { ...f, gstin, address: { ...f.address, stateCode } };
    });

  const handleFailure = (result: ActionResult) => {
    if (result.code === 'CONCURRENT_UPDATE') setConflict(true);
    if (result.code === 'PENDING_CHANGE_EXISTS' || result.code === 'INVALID_STATE_TRANSITION') {
      void reloadOverview();
      void reload();
    }
    if (result.fieldErrors && Object.keys(result.fieldErrors).length) setServerErrors(result.fieldErrors);
  };

  const save = async (thenSubmit: boolean) => {
    // Saving a draft needs an edit; "Save & submit" may submit an unchanged draft.
    if (busy || (!thenSubmit && !dirty)) return;
    const mode = thenSubmit ? 'submit' : 'save';
    setAttempt(mode);
    setServerErrors({});
    const found = errorsInSection(section, thenSubmit ? validateForSubmit(form, { knownImageUrls }) : validateForSave(form, { knownImageUrls }));
    if (pincodeError && (!section || section === 'LEGAL_ADDRESS')) found['address.postalCode'] ??= pincodeError;
    if (Object.keys(found).length) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }

    const body = toBody(form);
    const saved = isNew
      ? await actions.createDraft(body)
      : await actions.saveDraft(id!, { ...body, lockVersion: version!.lockVersion }, thenSubmit ? '' : 'Draft saved.');
    if (!saved.ok || !saved.version) return handleFailure(saved);

    // Server values (normalised, new lockVersion) replace the form.
    setBaseline(toForm(saved.version));
    setForm(toForm(saved.version));
    setVersion(saved.version);
    setAttempt(null);
    if (isNew) navigate(companyDraftPath(saved.version.id), { replace: true });
    if (!thenSubmit) return;

    const submitted = await actions.submitDraft(saved.version.id);
    if (submitted.ok) navigate(backPath);
    else handleFailure(submitted);
  };

  const reloadDiscarding = () => {
    if (dirty && !window.confirm('Discard your changes and load the latest saved version?')) return;
    setConflict(false);
    setServerErrors({});
    void reload();
  };

  const missing = attempt === 'submit' ? missingInSection(section, form) : [];
  const videoIncomplete = (!section || section === 'HOME_VIDEO') && form.homeVideoEnabled && !form.homeVideoUrl.trim();
  const submitReady = missingInSection(section, form).length === 0 && !videoIncomplete;
  const otherErrors = Object.keys(errors).filter((key) => !missing.some((m) => m.key === key));
  const panHint = panMismatch(form.gstin, form.pan);
  const stateCodeHint = stateCodeMismatch(form.gstin, form.address.stateCode);

  // Each section's inputs; a section draft shows only its own, a whole-profile draft all of them.
  const sectionBodies: Record<ProfileSection, React.ReactNode> = {
    BRAND: (
      <>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4">
            <TextField label="Brand name" required counter maxLength={LIMITS.brandName} value={form.brandName} onChange={(brandName) => update({ brandName })} error={errors.brandName} />
            <div>
              <label htmlFor="trademark-mark" className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Trademark mark
              </label>
              <select
                id="trademark-mark"
                value={form.trademarkMark}
                onChange={(e) => update({ trademarkMark: e.target.value as CompanyProfileForm['trademarkMark'] })}
                className="w-full px-3 py-2 rounded-xl border border-black/15 dark:border-white/15 bg-white dark:bg-neutral-900 text-black dark:text-white"
              >
                {TRADEMARK_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-gray-500">
            Preview: <BrandName name={form.brandName.trim() || null} mark={form.trademarkMark} className="text-base font-semibold text-black dark:text-white" />
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {(
              [
                ['Logo', 'LOGO', 'logo', 'logoUrl'],
                ['Dark-mode logo', 'LOGO_DARK', 'logoDark', 'logoDarkUrl'],
                ['Favicon', 'FAVICON', 'favicon', 'faviconUrl'],
              ] as const
            ).map(([label, purpose, variant, key]) => (
              <AssetField
                key={key}
                label={label}
                purpose={purpose}
                variant={variant}
                value={form[key]}
                onChange={(url) => update({ [key]: url })}
                onUploaded={(url) => setUploadedUrls((urls) => [...urls, url])}
                onBusyChange={(b) => setUploads((n) => n + (b ? 1 : -1))}
                error={errors[key]}
                disabled={!!actions.busy}
              />
            ))}
          </div>
      </>
    ),
    LEGAL_ADDRESS: (
      <>
        <div role="group" aria-label="Legal & tax" className="space-y-3">
          <h3 className="font-semibold text-black dark:text-white">Legal & tax</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField className="md:col-span-2" label="Legal name" counter maxLength={LIMITS.legalName} value={form.legalName} onChange={(legalName) => update({ legalName })} error={errors.legalName} />
              <TextField label="GSTIN" upperCase maxLength={15} placeholder="27AAACT1234A1Z5" value={form.gstin} onChange={setGstin} error={errors.gstin} />
              <TextField label="PAN" upperCase maxLength={10} placeholder="AAACT1234A" value={form.pan} onChange={(pan) => update({ pan })} error={errors.pan} hint={panHint} />
              <TextField label="CIN" upperCase maxLength={21} value={form.cin} onChange={(cin) => update({ cin })} error={errors.cin} />
            </div>
        </div>
        <div role="group" aria-label="Address" className="space-y-3">
          <h3 className="font-semibold text-black dark:text-white">Address</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField className="md:col-span-2" label="Headquarters name" counter maxLength={LIMITS.headquartersName} value={form.headquartersName} onChange={(headquartersName) => update({ headquartersName })} error={errors.headquartersName} />
              <TextField className="md:col-span-2" label="Address line 1" maxLength={LIMITS.addressLine} value={form.address.line1} onChange={(line1) => updateAddress({ line1 })} error={errors['address.line1']} />
              <TextField className="md:col-span-2" label="Address line 2" maxLength={LIMITS.addressLine} value={form.address.line2} onChange={(line2) => updateAddress({ line2 })} error={errors['address.line2']} />
              <TextField
                label="Postal code"
                maxLength={10}
                inputMode="numeric"
                value={form.address.postalCode}
                onChange={(postalCode) => updateAddress({ postalCode })}
                error={errors['address.postalCode']}
                adornment={pincode.status === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" aria-hidden /> : null}
                description={
                  pincode.status === 'error' ? (
                    <p className="text-amber-700 dark:text-amber-400">
                      {PINCODE_MESSAGES.error}{' '}
                      <button type="button" onClick={pincode.retry} className="font-semibold underline cursor-pointer">
                        Retry
                      </button>
                    </p>
                  ) : pincode.status === 'loading' ? (
                    PINCODE_MESSAGES.loading
                  ) : pincode.location?.areas.length ? (
                    `Areas: ${pincode.location.areas.slice(0, 4).join(', ')}${pincode.location.areas.length > 4 ? '…' : ''}`
                  ) : pincode.locked ? (
                    'City, district and state are filled from the PIN code.'
                  ) : null
                }
              />
              <TextField label="Country" maxLength={LIMITS.place} value={form.address.country} onChange={(country) => updateAddress({ country })} error={errors['address.country']} />
              <TextField label="City" maxLength={LIMITS.place} readOnly={pincode.locked} value={form.address.city} onChange={(city) => updateAddress({ city })} error={errors['address.city']} />
              <TextField label="District" maxLength={LIMITS.place} readOnly={pincode.locked} value={form.address.district} onChange={(district) => updateAddress({ district })} error={errors['address.district']} />
              <TextField label="State" maxLength={LIMITS.place} readOnly={pincode.locked} value={form.address.state} onChange={(state) => updateAddress({ state })} error={errors['address.state']} />
              <TextField label="State code" maxLength={2} placeholder="27" value={form.address.stateCode} onChange={(stateCode) => updateAddress({ stateCode })} error={errors['address.stateCode']} hint={stateCodeHint} />
            </div>
        </div>
      </>
    ),
    CONTACT: (
      <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Support email" type="email" value={form.supportEmail} onChange={(supportEmail) => update({ supportEmail })} error={errors.supportEmail} />
            <TextField label="Support phone" type="tel" maxLength={20} value={form.supportPhone} onChange={(supportPhone) => update({ supportPhone })} error={errors.supportPhone} />
            <TextField label="Careers email" type="email" value={form.careersEmail} onChange={(careersEmail) => update({ careersEmail })} error={errors.careersEmail} />
            <TextField label="Website" type="url" placeholder="https://" value={form.website} onChange={(website) => update({ website })} error={errors.website} />
          </div>
      </>
    ),
    HOME_VIDEO: (
      <>
          <HomeVideoFields
            enabled={form.homeVideoEnabled}
            url={form.homeVideoUrl}
            onEnabledChange={(homeVideoEnabled) => update({ homeVideoEnabled })}
            onUrlChange={(homeVideoUrl) => update({ homeVideoUrl })}
            error={errors.homeVideoUrl}
            disabled={!!actions.busy}
          />
          <p className="text-gray-500">Goes live on the storefront only after an approver approves this change.</p>
      </>
    ),
    SIGN_IN: (
      <>
          <p className="text-gray-500">
            Both sign-in pages (this admin portal and the storefront) have the same layout: the form on one half, and on the other this image covering the
            whole half with each portal's own headline, tagline and points over it. Without an image the blue background is shown. Goes live only after an
            approver approves this change.
          </p>
          <AssetField
            label="Sign-in image"
            purpose="LOGIN_IMAGE"
            variant="loginImage"
            value={form.loginImageUrl}
            onChange={(loginImageUrl) => update({ loginImageUrl })}
            onUploaded={(url) => setUploadedUrls((urls) => [...urls, url])}
            onBusyChange={(b) => setUploads((n) => n + (b ? 1 : -1))}
            error={errors.loginImageUrl}
            disabled={!!actions.busy}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(
              [
                ['adminLogin', 'Admin portal (staff & dealers)'],
                ['storeLogin', 'Storefront (customers)'],
              ] as const
            ).map(([portal, title]) => (
              <div key={portal} role="group" aria-label={`${title} sign-in`} className="space-y-3 min-w-0">
                <h3 className="font-semibold text-black dark:text-white">{title}</h3>
                <LoginTextFields portal={portal} value={form[portal]} onChange={(text) => update({ [portal]: text })} errors={errors} disabled={!!actions.busy} />
                <div>
                  <span className="block text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-1">Preview</span>
                  <AuthBrandPanel
                    compact
                    className="flex aspect-[4/5] max-w-xs rounded-2xl"
                    content={{
                      imageUrl: form.loginImageUrl.trim() || null,
                      headline: form[portal].headline.trim(),
                      tagline: form[portal].tagline.trim(),
                      highlights: form[portal].highlights.map((h) => h.trim()).filter(Boolean),
                    }}
                    brand={
                      portal === 'adminLogin' ? (
                        <BrandBadge compact />
                      ) : (
                        <BrandName name={form.brandName.trim() || null} mark={form.trademarkMark} className="text-sm font-semibold" />
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
      </>
    ),
    SHIPPING: (
      <>
          <p className="text-gray-500">
            The shipping fee customers pay, by order value (the bag's subtotal). Add a rule for each price band; the last rule covers every larger order.
            Goes live only after an approver approves this change.
          </p>
          <ShippingRulesEditor rows={form.shippingRules} onChange={(shippingRules) => update({ shippingRules })} errors={errors} disabled={!!actions.busy} />
      </>
    ),
    INVOICE_TERMS: (
      <>
          <InvoiceTermsEditor terms={form.invoiceTerms} onChange={(invoiceTerms) => update({ invoiceTerms })} errors={errors} disabled={!!actions.busy} />
      </>
    ),
  };

  return (
    <form
      aria-label={section ? `Edit ${SECTIONS[section].label}` : 'Edit company profile'}
      className="p-6 space-y-6 text-xs max-w-5xl"
      onSubmit={(e) => {
        e.preventDefault();
        void save(false);
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => confirmLeave() && navigate(backPath)}
            className="p-2 rounded-xl bg-black/5 dark:bg-white/10 cursor-pointer"
            aria-label="Back to company profile"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-black dark:text-white flex items-center gap-2">
              {isNew ? 'New company profile' : section ? `Edit ${SECTIONS[section].label} · version ${version!.versionNo}` : `Edit version ${version!.versionNo}`}
              {version && <VersionStatusBadge status={version.status} />}
              {version && !section && <SectionBadge section={null} />}
            </h1>
            <p className="text-gray-500">
              {dirty ? 'Unsaved changes' : version ? `Saved ${formatServerTime(version.updatedAt ?? version.createdAt)}` : 'Not saved yet'}
            </p>
          </div>
        </div>
      </div>

      {version?.status === 'REJECTED' && (
        <div role="note" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <XCircle className="w-4 h-4" /> Rejected by {version.reviewedBy ?? 'an approver'} on {formatServerTime(version.reviewedAt)}
          </p>
          {version.reviewComment && <p className="break-words whitespace-pre-line">{version.reviewComment}</p>}
          <p>Make the requested changes, then save and submit again.</p>
        </div>
      )}

      {conflict && (
        <div role="alert" className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" /> Someone else saved this draft after you opened it. Reload to continue (your unsaved edits will be discarded).
          </p>
          <button type="button" onClick={reloadDiscarding} className={BUTTON.secondary}>
            <RefreshCw className="w-3.5 h-3.5" /> Reload
          </button>
        </div>
      )}

      {blocker && (
        <p role="note" className="p-3 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-300">
          {pendingSubmitBlocked(sectionLabel(blocker.section))} You can still save this draft.
        </p>
      )}

      {(missing.length > 0 || (attempt && otherErrors.length > 0)) && (
        <div role="alert" aria-label="Fix before saving" className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 space-y-1">
          {missing.length > 0 && (
            <>
              <p className="font-semibold">Required to submit:</p>
              <ul className="list-disc pl-5" aria-label="Missing fields">
                {missing.map((m) => (
                  <li key={m.key}>{m.label}</li>
                ))}
              </ul>
            </>
          )}
          {otherErrors.length > 0 && <p>Fix {otherErrors.map(fieldLabel).join(', ')}.</p>}
        </div>
      )}

      {section ? (
        <Section title={SECTIONS[section].label}>
          <p className="text-gray-500">{SECTIONS[section].description} Only this section changes; the rest of the profile stays as it is live.</p>
          {sectionBodies[section]}
        </Section>
      ) : (
        PROFILE_SECTIONS.map((key) => (
          <Section key={key} title={SECTIONS[key].label}>
            {sectionBodies[key]}
          </Section>
        ))
      )}

      <div className="sticky bottom-0 py-3 bg-[#f5f5f7]/90 dark:bg-black/90 backdrop-blur flex flex-wrap justify-end gap-2">
        {version && (
          // Unsaved edits go with the draft; the dialog says it can't be undone.
          <DeleteDraftButton version={version} access={access} onStale={reload} onDeleted={() => navigate(backPath)} className="mr-auto" />
        )}
        <button type="submit" disabled={busy || !dirty} title={!dirty ? 'No changes to save.' : undefined} className={BUTTON.secondary}>
          {actions.busy === 'save' || actions.busy === 'create' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save draft
        </button>
        <button
          type="button"
          disabled={busy || !!blocker || !submitReady}
          title={blocker ? pendingSubmitBlocked(sectionLabel(blocker.section)) : !submitReady ? 'Fill in all required fields to submit.' : undefined}
          onClick={() => void save(true)}
          className={BUTTON.primary}
        >
          {actions.busy === 'submit' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Save &amp; submit for approval
        </button>
      </div>
    </form>
  );
};
