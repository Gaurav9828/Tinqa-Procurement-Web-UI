/** Client outreach (call log): docs/outreach-meetings-roles.md § 2, Procurement /v1/outreach. */
import type { ClientCategory } from '../../client-demos/types/clientDemo.types';

/** Same ClientType codes as client demos. */
export type BusinessType = ClientCategory;

export type ContactChannel = 'CALL' | 'EMAIL' | 'WHATSAPP' | 'IN_PERSON' | 'OTHER';
/** How the conversation went. */
export type ContactRating = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'BAD' | 'WORSE';
export type Interest = 'INTERESTED' | 'MAYBE' | 'LATER' | 'NOT_INTERESTED';
export type NextAction = 'NONE' | 'CALL_BACK' | 'DEMO_REQUESTED' | 'MEETING_REQUESTED';

export interface OutreachBusiness {
  id: number;
  name: string;
  businessType: BusinessType;
  city: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  notes: string | null;
  contactCount: number;
  demoRequestCount: number;
  lastContactAt: string | null;
  lastContactByName: string | null;
  latestInterest: Interest | null;
  latestRating: ContactRating | null;
  nextFollowUpAt: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface BusinessPayload {
  name: string;
  businessType: BusinessType;
  city: string | null;
  address: string | null;
  googleMapsUrl: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  notes: string | null;
}

export interface ContactProof {
  id: number;
  fileName: string;
  contentType: string;
  size: number;
}

export interface OutreachContact {
  id: number;
  businessId: number;
  businessName: string;
  contactedAt: string;
  channel: ContactChannel;
  contactPerson: string | null;
  contactPhone: string | null;
  summary: string;
  response: string | null;
  rating: ContactRating | null;
  interest: Interest | null;
  nextAction: NextAction;
  followUpAt: string | null;
  proofs: ContactProof[];
  loggedById: number;
  loggedByName: string;
  createdAt: string;
  updatedAt: string | null;
  /** The signed-in user logged it: only they edit it or change its proofs. */
  editable: boolean;
}

/** POST /businesses/{id}/contacts and PUT /contacts/{id}; proofs are uploaded separately. */
export interface ContactPayload {
  contactedAt: string;
  channel: ContactChannel;
  contactPerson: string | null;
  contactPhone: string | null;
  summary: string;
  response: string | null;
  rating: ContactRating;
  interest: Interest;
  nextAction: NextAction;
  followUpAt: string | null;
}

export interface OutreachSummary {
  totalContacts: number;
  businessesContacted: number;
  newBusinesses: number;
  demoRequests: number;
  followUpsDue: number;
  byDay: { date: string; contacts: number; businesses: number }[];
  byExecutive: { userId: number; name: string; contacts: number; businesses: number; interested: number }[];
  byChannel: Partial<Record<ContactChannel, number>>;
  byInterest: Partial<Record<Interest, number>>;
}

/** Spring page as the contract sends it. */
export interface OutreachPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface BusinessListParams {
  search: string;
  businessType: BusinessType | '';
  interest: Interest | '';
  followUpDue: boolean;
  page: number;
  size: number;
}
