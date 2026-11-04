import React, { useCallback, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Mail, MapPin, Pencil, Phone, PhoneCall, RefreshCw, User } from 'lucide-react';
import { CHOICE_TONE, SOLID_TONE } from '../../../components/ui/actionTones';
import { Pager } from '../../../components/ui/Pager';
import { useAccess } from '../../../hooks/useAccess';
import { BusinessFormModal } from '../components/BusinessFormModal';
import { ContactCard } from '../components/ContactCard';
import { ContactFormModal } from '../components/ContactFormModal';
import { useBusiness, useBusinessContacts } from '../hooks/useOutreachData';
import type { OutreachContact } from '../types/outreach.types';
import { INTEREST_LABELS, INTEREST_TONE, OUTREACH_PATH, businessPath, businessTypeLabel, formatDateTime, isOverdue } from '../utils/outreach';

/** One business with its full contact history (newest first); log a contact or edit your own. */
export const OutreachBusinessPage: React.FC = () => {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const businessId = Number.isInteger(id) && id > 0 ? id : null;
  const { can } = useAccess();
  const canLog = can('OUTREACH_LOG');
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const business = useBusiness(businessId);
  const contacts = useBusinessContacts(businessId, page);
  const [editingBusiness, setEditingBusiness] = useState(false);
  // undefined: closed; null: a new contact
  const [contactForm, setContactForm] = useState<OutreachContact | null | undefined>(undefined);

  const { refresh: refreshBusiness } = business;
  const { refresh: refreshContacts } = contacts;
  // A contact changes the business's latest interest, follow-up and counts too
  const afterContactChange = useCallback(() => {
    refreshBusiness();
    if (page === 0) refreshContacts();
    else setPage(0);
  }, [refreshBusiness, refreshContacts, page]);

  const b = business.data;
  const history = contacts.data?.content ?? [];

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <Link to={OUTREACH_PATH} className="inline-flex items-center gap-1 text-xs font-semibold text-[#0071e3]">
        <ArrowLeft className="w-3.5 h-3.5" /> Client Outreach
      </Link>

      {!b && business.isLoading && <p className="text-sm text-gray-500">Loading the business…</p>}
      {!b && !business.isLoading && (
        <p className="text-sm text-gray-500">{businessId === null ? 'This business does not exist.' : 'The business could not be loaded.'}</p>
      )}

      {b && (
        <section aria-label="Business" className="apple-card p-5 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white">{b.name}</h1>
              <p className="text-sm text-gray-500">
                {businessTypeLabel(b.businessType)}
                {b.city && ` · ${b.city}`} · added by {b.createdByName ?? 'unknown'} on {formatDateTime(b.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canLog && (
                <>
                  <button type="button" onClick={() => setEditingBusiness(true)}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer ${CHOICE_TONE.primary.idle}`}>
                    <Pencil className="w-3.5 h-3.5" /> Edit business
                  </button>
                  <button type="button" onClick={() => setContactForm(null)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer ${SOLID_TONE.primary}`}>
                    <PhoneCall className="w-3.5 h-3.5" /> Log contact
                  </button>
                </>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-neutral-300">
            {b.contactPerson && <dd className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {b.contactPerson}</dd>}
            {b.phone && <dd className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {b.phone}</dd>}
            {b.email && <dd className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {b.email}</dd>}
            {b.address && <dd className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {b.address}</dd>}
            {b.googleMapsUrl && (
              <dd>
                <a href={b.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0071e3] hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> Open in Google Maps
                </a>
              </dd>
            )}
          </dl>
          {b.notes && <p className="text-xs text-gray-600 dark:text-neutral-300 whitespace-pre-line">{b.notes}</p>}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-xl border border-black/10 dark:border-white/10 px-3 py-2">
              <dt className="text-gray-500">Contacts</dt>
              <dd className="text-lg font-bold">{b.contactCount}</dd>
            </div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 px-3 py-2">
              <dt className="text-gray-500">Demo requests</dt>
              <dd className="text-lg font-bold">{b.demoRequestCount}</dd>
            </div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 px-3 py-2">
              <dt className="text-gray-500">Latest interest</dt>
              <dd className="pt-1">
                {b.latestInterest ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${INTEREST_TONE[b.latestInterest]}`}>{INTEREST_LABELS[b.latestInterest]}</span>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="rounded-xl border border-black/10 dark:border-white/10 px-3 py-2">
              <dt className="text-gray-500">Next follow-up</dt>
              <dd className={`pt-1 ${isOverdue(b.nextFollowUpAt) ? 'text-amber-700 dark:text-amber-400 font-semibold' : ''}`}>{formatDateTime(b.nextFollowUpAt)}</dd>
            </div>
          </dl>
        </section>
      )}

      {businessId !== null && (
        <section aria-label="Contact history" className="apple-card p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-black dark:text-white">Contact history</h2>
            <button type="button" onClick={contacts.refresh} aria-label="Refresh contact history"
              className="p-2 rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer">
              <RefreshCw className={`w-4 h-4 ${contacts.isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {history.map((contact) => (
            <ContactCard key={contact.id} contact={contact} onEdit={canLog ? setContactForm : undefined} />
          ))}
          {!contacts.isLoading && history.length === 0 && (
            <p className="text-sm text-gray-500 py-4 text-center">
              {contacts.loadFailed ? 'The contact history could not be loaded.' : 'No contacts logged yet.'}
            </p>
          )}
          <Pager page={page} totalPages={contacts.data?.totalPages ?? 0} disabled={contacts.isLoading} onPage={setPage} />
        </section>
      )}

      {editingBusiness && b && (
        <BusinessFormModal
          business={b}
          onClose={() => setEditingBusiness(false)}
          onSaved={() => {
            setEditingBusiness(false);
            refreshBusiness();
          }}
          onOpenExisting={(existing) => {
            setEditingBusiness(false);
            navigate(businessPath(existing));
          }}
        />
      )}

      {contactForm !== undefined && b && (
        <ContactFormModal
          businessId={b.id}
          businessName={b.name}
          contact={contactForm}
          onClose={() => setContactForm(undefined)}
          onSaved={afterContactChange}
        />
      )}
    </div>
  );
};
